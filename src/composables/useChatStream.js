/**
 * @file src/composables/useChatStream.js
 * 聊天补全的流式控制。
 *
 * 这个 composable 不直接操作 DOM,只负责:
 *   - 构建 API messages 数组(包含继承的系统提示)。
 *   - 在 chat store 中维护流式状态。
 *   - 通过 onContentDelta / onReasoningDelta / onComplete / onError 回调
 *     把数据流给组件,让组件决定怎么渲染(写到流式容器、更新光标等)。
 *
 * 这样组件只关心 DOM,数据流逻辑在这里统一。
 */

import { streamChatCompletion } from '@/utils/api.js';
import { useChatStore }     from '@/stores/chat.js';
import { useSessionsStore } from '@/stores/sessions.js';
import { useGroupsStore }   from '@/stores/groups.js';
import { useModelsStore }   from '@/stores/models.js';
import { useToast }         from './useToast.js';

/**
 * 构造发送给后端的 messages 数组。
 *
 * 来源:
 *   - 祖先会话组(从外到内)的非空 systemPrompt
 *   - 会话自身的 systemPrompt
 *   - 会话消息历史(user / assistant / system)
 *
 * @param {import('@/stores/sessions.js').Session} session
 * @param {ReturnType<typeof useGroupsStore>} groupsStore
 * @returns {Array<object>}
 */
function buildApiMessages(session, groupsStore) {
    const messages = [];

    // 继承的系统提示。
    const ancestorGroups = groupsStore.getSessionAncestorGroups(session.id);
    const systemTexts = [
        ...ancestorGroups.map(group => group.systemPrompt).filter(Boolean),
        session.systemPrompt,
    ].filter(Boolean);

    for (const text of systemTexts) {
        messages.push({ role: 'system', content: text });
    }

    // 会话消息。
    for (const message of session.messages) {
        if (message.role === 'system') {
            if (message.content) {
                messages.push({ role: 'system', content: message.content });
            }
            continue;
        }

        if (message.role === 'user') {
            const parts = [];
            if (message.content) {
                parts.push({ type: 'text', text: message.content });
            }
            for (const fileRef of message.files || []) {
                parts.push({
                    type:      'file',
                    mediaType: fileRef.mediaType,
                    url:       fileRef.url,
                    filename:  fileRef.name,
                });
            }
            messages.push({
                role: 'user',
                content: (parts.length === 1 && parts[0].type === 'text')
                    ? parts[0].text
                    : parts,
            });
            continue;
        }

        if (message.role === 'assistant') {
            messages.push({ role: 'assistant', content: message.content });
        }
    }

    return messages;
}

/**
 * 提供"运行一次聊天补全"的方法。
 *
 * @returns {{
 *   runCompletion: (
 *       sessionId: string,
 *       callbacks: {
 *           onContentDelta?:   (delta: string, fullContent: string) => void,
 *           onReasoningDelta?: (delta: string, fullReasoning: string) => void,
 *           onComplete?:       (result: { messageId: string, content: string, reasoning: string|null, modelName: string }) => void,
 *           onError?:          (error: Error) => void,
 *       }
 *   ) => Promise<void>,
 * }}
 */
export function useChatStream() {
    const chatStore     = useChatStore();
    const sessionsStore = useSessionsStore();
    const groupsStore   = useGroupsStore();
    const modelsStore   = useModelsStore();
    const { showToast } = useToast();

    /**
     * 基于当前会话历史,请求一次 AI 回复,并通过回调把流式数据交给组件。
     * 完成时会把最终消息写入 sessions store。
     *
     * @param {string} sessionId
     * @param {object} callbacks
     * @returns {Promise<void>}
     */
    async function runCompletion(sessionId, callbacks = {}) {
        const {
            onContentDelta,
            onReasoningDelta,
            onComplete,
            onError,
        } = callbacks;

        if (chatStore.isStreaming) return;

        const session = sessionsStore.findSessionById(sessionId);
        if (!session) return;

        const modelName = modelsStore.selectedModelId;
        const service = modelsStore.selectedService;

        const apiMessages = buildApiMessages(session, groupsStore);
        const abortController = chatStore.beginStreaming();

        let fullContent = '';
        let fullReasoning = '';
        let hasReasoning = false;

        await streamChatCompletion({
            base_url: service?.base_url || '',
            api_key:  service?.api_key  || '',
            model:    modelName,
            messages: apiMessages,
            enable_capabilities: modelsStore.enabledCapabilities,
            signal: abortController.signal,

            onChunk(chunk) {
                const choice = chunk?.choices?.[0];
                if (!choice) return;
                const delta = choice.delta || {};

                if (delta.content) {
                    fullContent += delta.content;
                    onContentDelta?.(delta.content, fullContent);
                }
                if (delta.reasoning_content) {
                    fullReasoning += delta.reasoning_content;
                    hasReasoning = true;
                    onReasoningDelta?.(delta.reasoning_content, fullReasoning);
                }
            },

            onDone() {
                finalizeStream();
            },

            onError(streamError) {
                if (streamError?.name !== 'AbortError') {
                    showToast(`请求出错:${streamError.message || '未知错误'}`, 'error');
                    onError?.(streamError);
                }
                finalizeStream();
            },
        });

        /**
         * 结束流:写入最终消息、刷新模型记录、调用 onComplete。
         */
        function finalizeStream() {
            chatStore.endStreaming();

            const messageId = crypto.randomUUID();
            /** @type {import('@/stores/sessions.js').Message} */
            const assistantMessage = {
                id:        messageId,
                role:      'assistant',
                content:   fullContent,
                reasoning: hasReasoning ? fullReasoning : null,
                model:     modelName,
                createdAt: Date.now(),
            };

            sessionsStore.addMessage(sessionId, assistantMessage);
            sessionsStore.updateSession(sessionId, { model: modelName });

            onComplete?.({
                messageId,
                content:   fullContent,
                reasoning: hasReasoning ? fullReasoning : null,
                modelName,
            });
        }
    }

    return { runCompletion };
}
