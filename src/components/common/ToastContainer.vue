<script setup>
/**
 * @file src/components/common/ToastContainer.vue
 * 全局 Toast 容器。挂载在 App.vue 根部,从 useToast() 共享列表渲染。
 *
 * 因为它本身是全局浮层,这里直接定位 fixed。
 */

import { useToast } from '@/composables/useToast.js';

const { toastList, dismissToast } = useToast();
</script>

<template>
    <div class="toast-container" aria-live="polite">
        <div
            v-for="toast in toastList"
            :key="toast.id"
            class="toast"
            :class="[
                `toast--${toast.type}`,
                { 'toast--fading': toast.fadingOut },
            ]"
            role="status"
            @click="dismissToast(toast.id)"
        >
            {{ toast.message }}
        </div>
    </div>
</template>

<style scoped>
.toast-container {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    z-index: 9999;
    pointer-events: none;
}

.toast {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    padding: 9px 18px;
    font-size: 13.5px;
    color: var(--text-primary);
    animation: toast-slide-up var(--transition-base) ease;
    white-space: nowrap;
    pointer-events: auto;
    cursor: pointer;
}

.toast--error   { border-color: var(--danger);  color: var(--danger);  }
.toast--success { border-color: var(--success); color: var(--success); }

.toast--fading {
    animation: toast-fade-out var(--transition-slow) ease forwards;
}

@keyframes toast-slide-up {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
}

@keyframes toast-fade-out {
    from { opacity: 1; }
    to   { opacity: 0; }
}
</style>
