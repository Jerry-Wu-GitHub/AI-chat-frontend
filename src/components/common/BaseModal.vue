<script setup>
/**
 * @file src/components/common/BaseModal.vue
 * 全局模态框容器。配合 useModal() 使用。
 *
 * 设计要点:
 *   - 用 <Teleport to="body"> 保证 z-index 不被其它布局容器限制。
 *   - 点击遮罩 / 按 Esc / 点关闭按钮都视为"取消",resolve null。
 *   - body 内容支持 v-html(模态框内容由调用方拼好 HTML),
 *     并提供 onMounted 钩子让调用方挂载完之后拿到 DOM 做事件绑定
 *     (例如在 body 里 input 的 v-model 绑定,在 onMounted 中通过原生事件实现)。
 */

import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useModal } from '@/composables/useModal.js';
import BaseIcon from './BaseIcon.vue';

const { currentModal, closeModal } = useModal();

/** @type {import('vue').Ref<HTMLElement | null>} */
const bodyRef = ref(null);

/**
 * 监听 modal 数据变化:每当弹出新 modal,等 DOM 渲染完调用 onMounted 钩子。
 */
watch(currentModal, async (newModal) => {
    if (!newModal) return;
    await nextTick();
    if (bodyRef.value && typeof newModal.onMounted === 'function') {
        newModal.onMounted(bodyRef.value);
    }
});

/**
 * 处理按钮点击。
 *
 * @param {{ value: any }} button
 * @returns {void}
 */
function onButtonClick(button) {
    closeModal(button.value);
}

/**
 * 点击遮罩区域(非 modal-box 内部)关闭。
 *
 * @param {MouseEvent} event
 * @returns {void}
 */
function onOverlayClick(event) {
    if (event.target === event.currentTarget) {
        closeModal(null);
    }
}

/**
 * Esc 关闭。
 *
 * @param {KeyboardEvent} event
 * @returns {void}
 */
function onKeyDown(event) {
    if (event.key === 'Escape' && currentModal.value) {
        closeModal(null);
    }
}

onMounted(() => {
    document.addEventListener('keydown', onKeyDown);
});
onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
    <Teleport to="body">
        <div
            v-if="currentModal"
            class="modal-overlay"
            role="dialog"
            aria-modal="true"
            @click="onOverlayClick"
        >
            <div class="modal-box">
                <header class="modal-header">
                    <h3 class="modal-title">{{ currentModal.title }}</h3>
                    <button
                        type="button"
                        class="modal-close"
                        title="关闭"
                        aria-label="关闭"
                        @click="closeModal(null)"
                    >
                        <BaseIcon name="close" :size="16" />
                    </button>
                </header>

                <!-- bodyHtml 是调用方传入的 HTML 字符串,由 useModal API 文档约定其内容可信。 -->
                <div ref="bodyRef" class="modal-body" v-html="currentModal.bodyHtml" />

                <footer class="modal-footer">
                    <button
                        v-for="(button, index) in currentModal.buttons"
                        :key="index"
                        type="button"
                        :class="['modal-action-btn', button.className || 'btn-secondary']"
                        @click="onButtonClick(button)"
                    >
                        {{ button.label }}
                    </button>
                </footer>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9700;
    animation: modal-fade-in var(--transition-fast) ease;
}

.modal-box {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    width: min(480px, calc(100vw - 32px));
    animation: modal-slide-up var(--transition-base) ease;
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 64px);
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
}

.modal-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.modal-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-md);
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast);
}
.modal-close:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}

.modal-body {
    padding: var(--space-4) var(--space-5);
    overflow-y: auto;
    flex: 1;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-5) var(--space-4);
    border-top: 1px solid var(--border);
    flex-shrink: 0;
}

/* footer 里按钮的复合 class:这里只定义 layout-level 样式,
   颜色/边框走全局 .btn-primary / .btn-secondary / .btn-danger。 */
.modal-action-btn {
    padding: 7px 18px;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: background var(--transition-fast), transform var(--transition-fast);
}
.modal-action-btn:active { transform: scale(0.97); }

@keyframes modal-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
}
@keyframes modal-slide-up {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
}
</style>
