<script setup>
/**
 * @file src/components/settings/AccentColorPicker.vue
 * 主题强调色选择器。固定的预设色块 + 一个自定义颜色按钮(原生 color input)。
 */

import { computed } from 'vue';

import BaseIcon  from '@/components/common/BaseIcon.vue';
import { useTheme } from '@/composables/useTheme.js';
import { usePrefsStore } from '@/stores/prefs.js';

const prefsStore = usePrefsStore();
const { setAccentColor } = useTheme();

/** 预设强调色。 */
const PRESET_COLORS = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#6366f1', // indigo (默认)
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#64748b', // slate
];

/** 当前强调色。 */
const currentColor = computed(() => prefsStore.preferences.accentColor.toLowerCase());

/**
 * 判断某个预设色是否激活。
 *
 * @param {string} hex
 * @returns {boolean}
 */
function isActive(hex) {
    return currentColor.value === hex.toLowerCase();
}

/**
 * 选中预设色。
 *
 * @param {string} hex
 * @returns {void}
 */
function onPickPreset(hex) {
    setAccentColor(hex);
}

/**
 * 自定义颜色 input 变化时。
 *
 * @param {Event} event
 * @returns {void}
 */
function onCustomColorInput(event) {
    setAccentColor(event.target.value);
}
</script>

<template>
    <div class="accent-color-picker">
        <button
            v-for="color in PRESET_COLORS"
            :key="color"
            type="button"
            class="accent-color-picker__swatch"
            :class="{ 'accent-color-picker__swatch--active': isActive(color) }"
            :style="{ '--swatch': color }"
            :title="color"
            @click="onPickPreset(color)"
        />

        <label
            class="accent-color-picker__swatch accent-color-picker__swatch--custom"
            title="自定义颜色"
        >
            <BaseIcon name="pencil" :size="14" />
            <input
                type="color"
                class="accent-color-picker__custom-input"
                :value="currentColor"
                @input="onCustomColorInput"
            />
        </label>
    </div>
</template>

<style scoped>
.accent-color-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: var(--space-2);
}

.accent-color-picker__swatch {
    position: relative;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--swatch, #6366f1);
    border: 2px solid transparent;
    cursor: pointer;
    padding: 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    transition: transform var(--transition-fast),
                border-color var(--transition-fast),
                box-shadow var(--transition-fast);
}

.accent-color-picker__swatch:hover {
    transform: scale(1.1);
}

.accent-color-picker__swatch--active {
    border-color: var(--text-primary);
    box-shadow: 0 0 0 2px var(--bg-surface),
                0 0 0 4px var(--swatch, var(--accent));
}

.accent-color-picker__swatch--active::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'/%3E%3C/svg%3E") center/14px no-repeat;
}

/* 自定义色按钮:用彩虹渐变背景覆盖 */
.accent-color-picker__swatch--custom {
    background: conic-gradient(
        from 0deg,
        #ef4444, #f59e0b, #eab308, #10b981,
        #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444
    );
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    overflow: hidden;
}

.accent-color-picker__swatch--custom :deep(.base-icon) {
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.4));
    pointer-events: none;
}

.accent-color-picker__custom-input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
    border: none;
    padding: 0;
}
</style>
