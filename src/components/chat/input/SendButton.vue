<script setup>
/**
 * @file src/components/chat/input/SendButton.vue
 * 发送按钮。
 *
 * 两种模式:
 *   - 普通发送(图标 send)
 *   - 系统提示添加(图标 plus-circle,通过 isAddMode 切换)
 */

import BaseIcon from '@/components/common/BaseIcon.vue';

const props = defineProps({
    /** 是否处于"添加系统提示"模式 */
    isAddMode: {
        type: Boolean,
        default: false,
    },
    /** 是否禁用 */
    disabled: {
        type: Boolean,
        default: false,
    },
});

defineEmits(['click']);
</script>

<template>
    <button
        type="button"
        class="btn-send"
        :class="{ 'btn-send--add-mode': isAddMode }"
        :title="isAddMode ? '添加' : '发送'"
        :disabled="disabled"
        @click="$emit('click')"
    >
        <BaseIcon :name="isAddMode ? 'plus-circle' : 'send'" :size="16" />
    </button>
</template>

<style scoped>
.btn-send {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--accent);
    color: #fff;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background var(--transition-fast),
                transform var(--transition-fast),
                box-shadow var(--transition-fast);
    box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 35%, transparent);
}

.btn-send:hover:not(:disabled) {
    background: var(--accent-hover);
    box-shadow: 0 4px 14px color-mix(in srgb, var(--accent) 45%, transparent);
}

.btn-send:active:not(:disabled) {
    transform: scale(0.92);
}

.btn-send:disabled {
    background: var(--bg-subtle);
    color: var(--text-muted);
    box-shadow: none;
    cursor: not-allowed;
}
</style>
