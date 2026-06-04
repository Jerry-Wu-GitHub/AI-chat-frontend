<script setup>
/**
 * @file src/components/chat/input/ShortcutToggle.vue
 * 发送快捷键选择器。
 *
 * 触发按钮放在发送按钮下方。点击展开三选一面板。
 *
 * 面板用 <Teleport to="body"> 挂到 body,避免被父级的 overflow: hidden
 * 裁剪(InputControls 用 overflow: hidden 实现折叠动画)。
 */

import { ref, computed, watch, nextTick } from 'vue';

import BaseIcon from '@/components/common/BaseIcon.vue';
import { useDropdown } from '@/composables/useDropdown.js';
import { usePrefsStore } from '@/stores/prefs.js';

const prefsStore = usePrefsStore();

/** @type {import('vue').Ref<HTMLElement | null>} */
const triggerRef = ref(null);
/** @type {import('vue').Ref<HTMLElement | null>} */
const panelRef = ref(null);

const { isOpen, toggle, close } = useDropdown(triggerRef, panelRef);

const SHORTCUT_OPTIONS = [
    { value: 'enter',        label: 'Enter 发送'        },
    { value: 'ctrl-enter',   label: 'Ctrl + Enter 发送' },
    { value: 'shift-enter',  label: 'Shift + Enter 发送' },
];

/** 当前快捷键。 */
const currentValue = computed(() => prefsStore.preferences.sendShortcut);

/** 面板 fixed 定位坐标。 */
const panelPosition = ref({ top: 0, left: 0 });

const panelStyle = computed(() => ({
    top:  `${panelPosition.value.top}px`,
    left: `${panelPosition.value.left}px`,
}));

/**
 * 选中一个快捷键。
 *
 * @param {string} value
 * @returns {void}
 */
function onSelect(value) {
    prefsStore.updatePreferences({ sendShortcut: value });
    close();
}

/**
 * 展开后定位到 trigger 上方,右边对齐。
 */
watch(isOpen, async (newValue) => {
    if (!newValue) return;
    await nextTick();
    const triggerRect = triggerRef.value?.getBoundingClientRect();
    const panelRect   = panelRef.value?.getBoundingClientRect();
    if (!triggerRect || !panelRect) return;

    panelPosition.value = {
        top:  triggerRect.top - panelRect.height - 6,
        left: triggerRect.right - panelRect.width,
    };
});
</script>

<template>
    <div class="shortcut-toggle-wrap">
        <button
            ref="triggerRef"
            type="button"
            class="btn-shortcut-toggle"
            title="发送快捷键"
            @click="toggle"
        >
            <BaseIcon name="chevron-down" :size="10" />
        </button>

        <Teleport to="body">
            <div
                v-if="isOpen"
                ref="panelRef"
                class="shortcut-panel"
                :style="panelStyle"
            >
                <label
                    v-for="option in SHORTCUT_OPTIONS"
                    :key="option.value"
                    class="shortcut-option"
                >
                    <input
                        type="radio"
                        name="send-shortcut"
                        :value="option.value"
                        :checked="currentValue === option.value"
                        @change="onSelect(option.value)"
                    />
                    {{ option.label }}
                </label>
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
.shortcut-toggle-wrap {
    position: relative;
}

.btn-shortcut-toggle {
    width: 36px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    cursor: pointer;
    border-radius: 99px;
    padding: 0;
    transition: color var(--transition-fast),
                background var(--transition-fast),
                border-color var(--transition-fast);
}

.btn-shortcut-toggle:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
    border-color: var(--border-strong);
}
</style>

<style>
/*
 * 注意:面板用 Teleport 挂到 body,不再是 ShortcutToggle 的后代,
 * scoped 样式不会作用到它。所以这里用全局 style(不带 scoped),
 * 由 .shortcut-panel 这个唯一 class 自我限定作用域。
 */
.shortcut-panel {
    position: fixed;
    z-index: 9000;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 170px;
    animation: shortcut-slide-up 120ms ease;
}

.shortcut-option {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    color: var(--text-primary);
    cursor: pointer;
    transition: background var(--transition-fast);
    white-space: nowrap;
}

.shortcut-option:hover {
    background: var(--bg-hover);
}

.shortcut-option input[type="radio"] {
    accent-color: var(--accent);
}

@keyframes shortcut-slide-up {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
}
</style>
