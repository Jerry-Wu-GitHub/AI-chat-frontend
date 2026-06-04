<script setup>
/**
 * @file src/components/chat/messages/AssistantMessage.vue
 * AI 助手消息。包含可选思考块 + 正文 + 模型标签 + 操作按钮。
 *
 * 流式状态由 chatStore.isStreaming + (本组件是会话最后一条 assistant) 决定。
 * 不过流式期间的 DOM 由 AssistantMessageStreaming 组件管理,
 * 这里仅渲染"已完成"的 assistant 消息。
 */

import { computed } from 'vue';

import MessageActions from './MessageActions.vue';
import ThinkingBlock  from './ThinkingBlock.vue';
import MarkdownBody   from './MarkdownBody.vue';

import { useSessionsStore } from '@/stores/sessions.js';
import { useChatStore }     from '@/stores/chat.js';
import { useToast }         from '@/composables/useToast.js';

const props = defineProps({
    message:   { type: Object, required: true },
    sessionId: { type: String, required: true },
});

const emit = defineEmits(['edit']);

const sessionsStore = useSessionsStore();
const chatStore     = useChatStore();
const { showToast } = useToast();

/** 该消息使用的模型名(优先消息上的,回退到会话的)。 */
const modelName = computed(() => {
    const session = sessionsStore.findSessionById(props.sessionId);
    return sessionsStore.getMessageModelName(props.message, session);
});

const actions = computed(() => [
    {
        label:    '复制',
        icon:     'copy',
        feedback: { label: '已复制', durationMs: 1500 },
        onClick:  copyContent,
    },
    {
        label:   '编辑',
        icon:    'edit',
        onClick: () => emit('edit'),
    },
    {
        label:   '继续说',
        icon:    'continue',
        onClick: () => chatStore.requestStream(props.sessionId),
    },
    {
        label:   '重新生成',
        icon:    'regenerate',
        onClick: regenerate,
    },
    {
        label:   '回溯',
        icon:    'truncate',
        danger:  true,
        onClick: () => sessionsStore.truncateMessagesFrom(props.sessionId, props.message.id, false),
    },
    {
        label:   '删除',
        icon:    'trash',
        danger:  true,
        onClick: () => sessionsStore.deleteMessage(props.sessionId, props.message.id),
    },
]);

async function copyContent() {
    try {
        await navigator.clipboard.writeText(props.message.content || '');
    } catch {
        showToast('复制失败', 'error');
    }
}

/**
 * 重新生成:删除本条及之后,触发新一轮流式回复。
 *
 * @returns {void}
 */
function regenerate() {
    sessionsStore.truncateMessagesFrom(props.sessionId, props.message.id, true);
    chatStore.requestStream(props.sessionId);
}
</script>

<template>
    <div class="msg-ai">
        <div class="ai-avatar">AI</div>
        <div class="ai-content">
            <ThinkingBlock
                v-if="message.reasoning"
                :raw-text="message.reasoning"
                :message-id="message.id"
                :model-name="modelName"
                :streaming="false"
            />

            <MarkdownBody
                :raw-text="message.content"
                :message-id="message.id"
                :model-name="modelName"
            />

            <div v-if="modelName" class="ai-model-tag">{{ modelName }}</div>
        </div>
    </div>

    <MessageActions :actions="actions" align="start" />
</template>