<script setup>
/**
 * @file src/components/chat/DropOverlay.vue
 * 拖放文件时盖在聊天区上方的半透明遮罩。
 */

import BaseIcon from '@/components/common/BaseIcon.vue';

const props = defineProps({
    /** 是否激活(由 useDragDrop 的 isDragActive 控制) */
    active: {
        type: Boolean,
        default: false,
    },
});
</script>

<template>
    <div class="drop-overlay" :class="{ 'drop-overlay--active': active }">
        <div class="drop-overlay__hint">
            <BaseIcon name="upload" :size="40" />
            <p>松开以上传文件</p>
        </div>
    </div>
</template>

<style scoped>
.drop-overlay {
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, var(--accent) 12%, var(--bg-surface));
    border: 2px dashed var(--accent);
    border-radius: var(--radius-xl);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--transition-base);
}

.drop-overlay--active {
    opacity: 1;
    pointer-events: auto;
}

.drop-overlay__hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    color: var(--accent-text);
    font-weight: 500;
}

.drop-overlay__hint p {
    margin: 0;
}
</style>
