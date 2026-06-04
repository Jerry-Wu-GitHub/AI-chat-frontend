<script setup>
/**
 * @file src/components/settings/ShortcutPicker.vue
 * 设置面板里的发送快捷键三选一列表(纵向卡片式)。
 *
 * 与底部输入栏的 ShortcutToggle 共享同一个偏好键 sendShortcut。
 */

import { computed } from 'vue';

import { usePrefsStore } from '@/stores/prefs.js';

const prefsStore = usePrefsStore();

const OPTIONS = [
    { value: 'enter',        label: 'Enter 发送'         },
    { value: 'ctrl-enter',   label: 'Ctrl + Enter 发送'  },
    { value: 'shift-enter',  label: 'Shift + Enter 发送' },
];

const currentValue = computed(() => prefsStore.preferences.sendShortcut);

/**
 * @param {string} value
 * @returns {void}
 */
function onSelect(value) {
    prefsStore.updatePreferences({ sendShortcut: value });
}
</script>

<template>
    <div class="shortcut-picker">
        <label
            v-for="option in OPTIONS"
            :key="option.value"
            class="shortcut-picker__option"
        >
            <input
                type="radio"
                name="settings-send-shortcut"
                :value="option.value"
                :checked="currentValue === option.value"
                @change="onSelect(option.value)"
            />
            {{ option.label }}
        </label>
    </div>
</template>

<style scoped>
.shortcut-picker {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    width: 100%;
}

.shortcut-picker__option {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 8px 10px;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    cursor: pointer;
    font-size: 13.5px;
    color: var(--text-primary);
    transition: background var(--transition-fast),
                border-color var(--transition-fast),
                color var(--transition-fast);
}

.shortcut-picker__option:hover {
    background: var(--bg-hover);
}

.shortcut-picker__option input[type="radio"] {
    accent-color: var(--accent);
}

.shortcut-picker__option:has(input[type="radio"]:checked) {
    background: var(--accent-subtle);
    border-color: color-mix(in srgb, var(--accent) 35%, transparent);
    color: var(--accent-text);
}
</style>
