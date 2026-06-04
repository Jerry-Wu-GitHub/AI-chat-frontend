<script setup>
/**
 * @file src/components/chat/messages/StreamingAssistantMessage.vue
 * 流式 AI 消息行。
 *
 * 与 AssistantMessage 的差异:
 *   - 不读取已保存的消息(它还不存在),由 useChatStream 通过回调写入。
 *   - 显示流式光标。
 *   - 思考块默认展开,流式结束后折叠。
 *   - 流式结束后,这个组件会被 MessageList 替换为标准 AssistantMessage。
 *
 * 使用方式:MessageList 在 chatStore.isStreaming === true 时
 * 把这个组件挂到列表末尾,并通过 ref 拿到 startStream/onContentDelta 等方法。
 */

import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

import ThinkingBlock from './ThinkingBlock.vue';
import MarkdownBody  from './MarkdownBody.vue';

import { renderMarkdownToHtml } from '@/utils/markdown.js';

import { useChatStream } from '@/composables/useChatStream.js';
import { useChatStore }  from '@/stores/chat.js';
import { useModelsStore } from '@/stores/models.js';

const props = defineProps({
    sessionId: { type: String, required: true },
});

const emit = defineEmits(['finish']);

const chatStore   = useChatStore();
const modelsStore = useModelsStore();
const { runCompletion } = useChatStream();

/** 累积的正文。 */
const fullContent = ref('');
/** 累积的思考。 */
const fullReasoning = ref('');
/** 是否有任何思考内容。 */
const hasReasoning = ref(false);

const modelName = computed(() => modelsStore.selectedModelId || 'unknown');

/** @type {import('vue').Ref<InstanceType<typeof MarkdownBody> | null>} */
const markdownBodyRef = ref(null);
/** @type {import('vue').Ref<InstanceType<typeof ThinkingBlock> | null>} */
const thinkingBlockRef = ref(null);

/**
 * 启动流式:调用 useChatStream 并把回调连到本组件的渲染。
 *
 * @returns {Promise<void>}
 */
async function startStream() {
    await runCompletion(props.sessionId, {
        onContentDelta(_delta, fullText) {
            fullContent.value = fullText;
            // 直接把当前累积文本渲染并写入容器
            const html = renderMarkdownToHtml(fullText, '');
            markdownBodyRef.value?.setStreamHtml(html);
            scrollToBottomIfNeeded();
        },

        onReasoningDelta(_delta, fullText) {
            hasReasoning.value = true;
            fullReasoning.value = fullText;
            thinkingBlockRef.value?.streamUpdate();
            scrollToBottomIfNeeded();
        },

        onComplete() {
            thinkingBlockRef.value?.finalize();
            emit('finish');
        },

        onError() {
            thinkingBlockRef.value?.finalize();
            emit('finish');
        },
    });
}

/**
 * 自动滚到底部(仅当用户已经在底部附近时)。
 */
function scrollToBottomIfNeeded() {
    const scroller = document.getElementById('message-list');
    if (!scroller) return;
    const isNearBottom =
        scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= 80;
    if (isNearBottom) {
        scroller.scrollTop = scroller.scrollHeight;
    }
}

onMounted(() => {
    startStream();
});

onBeforeUnmount(() => {
    // 若组件提前卸载(例如用户切换会话),中断流。
    if (chatStore.isStreaming) {
        chatStore.abortStreaming();
    }
});
</script>

<template>
    <div class="message-row" data-role="assistant" data-streaming="true">
        <div class="message-wrapper">
            <div class="msg-ai">
                <div class="ai-avatar">AI</div>
                <div class="ai-content">
                    <ThinkingBlock
                        v-show="hasReasoning"
                        ref="thinkingBlockRef"
                        :raw-text="fullReasoning"
                        :message-id="''"
                        :model-name="modelName"
                        :streaming="true"
                        :initially-open="true"
                    />

                    <MarkdownBody
                        ref="markdownBodyRef"
                        :raw-text="fullContent"
                        :message-id="''"
                        :model-name="modelName"
                        :lazy="false"
                    />

                    <span class="streaming-cursor" />
                </div>
            </div>
        </div>
    </div>
</template>
