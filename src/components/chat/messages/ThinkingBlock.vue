<script setup>
/**
 * @file src/components/chat/messages/ThinkingBlock.vue
 * AI 消息的"思考过程"折叠块。
 *
 * 两种使用模式:
 *   - 非流式(只读已完成的消息):rawText 不变,折叠+懒渲染。
 *     用户首次展开时立即触发渲染。
 *   - 流式(正在接收):父组件持有 ref,通过 streamUpdate(newRaw) 反复调用。
 *     内部根据"是否展开 + 是否在视口"决定是否渲染 Markdown,否则用纯文本占位。
 */

import { ref, computed, watch } from 'vue';

import BaseIcon     from '@/components/common/BaseIcon.vue';
import MarkdownBody from './MarkdownBody.vue';

import { useThinkingStream } from '@/composables/useThinkingStream.js';

const props = defineProps({
    /** 思考文本 */
    rawText: {
        type: String,
        default: '',
    },
    /** 消息 id(用于代码块下载) */
    messageId: {
        type: String,
        default: '',
    },
    /** 模型名 */
    modelName: {
        type: String,
        default: 'unknown',
    },
    /** 是否正在流式接收(影响渲染策略) */
    streaming: {
        type: Boolean,
        default: false,
    },
    /** 初始是否展开(流式时通常 true,只读时通常 false) */
    initiallyOpen: {
        type: Boolean,
        default: false,
    },
});

/** @type {import('vue').Ref<HTMLElement | null>} */
const blockRef = ref(null);
/** @type {import('vue').Ref<InstanceType<typeof MarkdownBody> | null>} */
const markdownBodyRef = ref(null);

const isOpen = ref(props.initiallyOpen);

const {
    scheduleRender,
    renderImmediately,
    clearSchedule,
} = useThinkingStream();

/**
 * 切换展开。流式时第一次展开要立即渲染一次。
 *
 * @returns {void}
 */
function toggle() {
    const willOpen = !isOpen.value;
    isOpen.value = willOpen;
    if (!willOpen) return;

    if (props.streaming) {
        // 流式期间:立即渲染当前已收到的内容
        const element = markdownBodyRef.value?.getElement();
        if (blockRef.value && element) {
            renderImmediately(
                blockRef.value,
                element,
                props.rawText,
                props.messageId,
            );
        }
    } else {
        // 只读模式:走标准懒渲染
        markdownBodyRef.value?.renderNow();
    }
}

/**
 * 暴露给父组件的方法:
 *   - streamUpdate:流式增量到来时调用
 *   - finalize:流式结束时调用(做最终全量渲染)
 *   - collapse:折叠
 */
defineExpose({
    /**
     * 流式更新:把最新文本写入 data 占位,并按节流策略尝试渲染。
     *
     * @returns {void}
     */
    streamUpdate() {
        const element = markdownBodyRef.value?.getElement();
        if (!element) return;

        // 没渲染过 Markdown 时,用 textContent 占位
        if (element.dataset.streamingRendered !== 'true'
            && element.dataset.mdRendered !== 'true') {
            element.classList.add('streaming-plain');
            element.textContent = props.rawText;
        }

        if (blockRef.value) {
            scheduleRender(
                blockRef.value,
                element,
                props.rawText,
                props.messageId,
            );
        }
    },

    /**
     * 流式结束:清节流;如果已渲染过则做最终全量渲染,否则保持 textContent,
     * 等用户展开时再走懒渲染。
     *
     * @returns {void}
     */
    finalize() {
        if (blockRef.value) clearSchedule(blockRef.value);
        const element = markdownBodyRef.value?.getElement();
        if (!element) return;

        if (element.dataset.streamingRendered === 'true') {
            markdownBodyRef.value?.finalizeStreamRender();
            element.classList.remove('streaming-plain');
            delete element.dataset.streamingRendered;
        }
        // 流结束默认折叠
        isOpen.value = false;
    },

    /**
     * @returns {void}
     */
    collapse() {
        isOpen.value = false;
    },
});

/**
 * 在 streaming 由 true 变 false(其它情况下)时,确保清掉节流定时器。
 */
watch(() => props.streaming, (newValue) => {
    if (!newValue && blockRef.value) {
        clearSchedule(blockRef.value);
    }
});
</script>

<template>
    <div
        ref="blockRef"
        class="thinking-block"
        :class="{ open: isOpen }"
    >
        <div class="thinking-header" @click="toggle">
            <BaseIcon name="chevron-down" :size="13" class="thinking-chevron" />
            思考过程
        </div>
        <div class="thinking-body">
            <MarkdownBody
                ref="markdownBodyRef"
                :raw-text="rawText"
                :message-id="messageId"
                :model-name="modelName"
                :lazy="!streaming"
            />
        </div>
    </div>
</template>