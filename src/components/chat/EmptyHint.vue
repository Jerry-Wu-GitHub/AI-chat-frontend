<script setup>
/**
 * @file src/components/chat/EmptyHint.vue
 * 会话还没有消息时显示的空态提示。
 */

import BaseIcon from '@/components/common/BaseIcon.vue';
</script>

<template>
    <div class="empty-hint">
        <BaseIcon name="chat-bubble" :size="48" class="empty-hint__icon" />
        <p class="empty-hint__text">开始新的对话</p>
    </div>
</template>

<style scoped>
.empty-hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: var(--space-3);
    color: var(--text-muted);
    user-select: none;
    padding-top: 10vh;
    margin-top: var(--space-6);
}

.empty-hint__icon {
    opacity: 0.35;
}

.empty-hint__text {
    font-size: 16px;
    font-weight: 500;
    margin: 0;
}
</style>
