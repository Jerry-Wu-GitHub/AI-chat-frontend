<script setup>
/**
 * @file src/components/chat/messages/MessageActionButton.vue
 * 单个消息操作按钮。
 *
 * 特性:
 *   - danger=true:启用二次确认(useConfirmAction)。
 *   - feedback 对象(可选,例如 { label: '已复制', durationMs: 1500 }):
 *     点击后短暂显示 feedback.label 作为反馈,期间隐藏图标 + 加强调色。
 *
 * 把它单独成组件的原因:useConfirmAction 依赖响应式状态,
 * 在 v-for 里直接用会导致每个按钮共享同一份状态。
 */

import { computed, ref, onBeforeUnmount } from 'vue';

import BaseIcon from '@/components/common/BaseIcon.vue';
import { useConfirmAction } from '@/composables/useConfirmAction.js';

const props = defineProps({
    label: {
        type: String,
        required: true,
    },
    icon: {
        type: String,
        required: true,
    },
    /** 是否为危险操作,启用二次确认。 */
    danger: {
        type: Boolean,
        default: false,
    },
    /**
     * 点击成功后的反馈配置。形如 { label: '已复制', durationMs: 1500 }。
     * 不传则点击后不显示反馈。
     */
    feedback: {
        type: Object,
        default: null,
    },
});

const emit = defineEmits(['click']);

const {
    isArmed,
    armedLabel,
    handleClick: handleConfirmClick,
    handleMouseLeave,
} = useConfirmAction(props.label, () => emitWithFeedback());

/** 是否正在显示反馈文字。 */
const isShowingFeedback = ref(false);

/** @type {ReturnType<typeof setTimeout> | null} */
let feedbackTimerId = null;

/**
 * 触发外部 click,并(若配置了 feedback)进入反馈态。
 */
function emitWithFeedback() {
    emit('click');
    if (props.feedback) {
        isShowingFeedback.value = true;
        if (feedbackTimerId !== null) clearTimeout(feedbackTimerId);
        feedbackTimerId = setTimeout(() => {
            isShowingFeedback.value = false;
            feedbackTimerId = null;
        }, props.feedback.durationMs ?? 1500);
    }
}

/**
 * 显示的文字:反馈态 > 已确认态 > 原 label。
 */
const displayLabel = computed(() => {
    if (isShowingFeedback.value) return props.feedback.label;
    if (isArmed.value) return armedLabel.value;
    return props.label;
});

/**
 * 处理点击。
 *
 * @param {MouseEvent} event
 * @returns {void}
 */
function onClick(event) {
    if (props.danger) {
        handleConfirmClick(event);
    } else {
        event.stopPropagation();
        emitWithFeedback();
    }
}

onBeforeUnmount(() => {
    if (feedbackTimerId !== null) clearTimeout(feedbackTimerId);
});
</script>

<template>
    <button
        type="button"
        class="msg-action-btn"
        :class="{
            danger,
            armed: isArmed,
            'msg-action-btn--feedback': isShowingFeedback,
        }"
        :title="label"
        @click="onClick"
        @mouseleave="handleMouseLeave"
    >
        <!-- 反馈态隐藏图标,只显示文字 -->
        <BaseIcon v-if="!isShowingFeedback" :name="icon" :size="12" />
        <span>{{ displayLabel }}</span>
    </button>
</template>

<style scoped>
.msg-action-btn--feedback {
    color: var(--accent) !important;
    font-weight: 500;
}
</style>
