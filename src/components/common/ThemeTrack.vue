<script setup>
/**
 * @file src/components/common/ThemeTrack.vue
 * 主题切换的三段式滑动条:浅色 / 系统 / 深色。
 *
 * 用法:
 *   <ThemeTrack v-model="currentTheme" />
 *
 * v-model 绑定 'light' | 'system' | 'dark'。
 */

import { computed } from 'vue';

const props = defineProps({
    /** v-model:modelValue,主题选项之一。 */
    modelValue: {
        type: String,
        required: true,
        validator: (value) => ['light', 'system', 'dark'].includes(value),
    },
});

const emit = defineEmits(['update:modelValue']);

/** 三个主题选项的顺序固定;索引用于定位滑块。 */
const THEME_OPTIONS = [
    { value: 'light',  label: '浅色' },
    { value: 'system', label: '系统' },
    { value: 'dark',   label: '深色' },
];

/**
 * 当前选项在数组中的索引(1-based,对应 CSS 的 pos-1/2/3 类)。
 */
const thumbPositionClass = computed(() => {
    const index = THEME_OPTIONS.findIndex(option => option.value === props.modelValue);
    return `theme-track__thumb--pos-${Math.max(0, index) + 1}`;
});

/**
 * 切换主题。
 *
 * @param {string} value
 * @returns {void}
 */
function selectTheme(value) {
    emit('update:modelValue', value);
}
</script>

<template>
    <div class="theme-track" role="radiogroup" aria-label="主题选择">
        <button
            v-for="option in THEME_OPTIONS"
            :key="option.value"
            type="button"
            role="radio"
            class="theme-track__option"
            :class="{ 'theme-track__option--active': option.value === modelValue }"
            :aria-checked="option.value === modelValue"
            @click="selectTheme(option.value)"
        >
            {{ option.label }}
        </button>
        <span class="theme-track__thumb" :class="thumbPositionClass" />
    </div>
</template>

<style scoped>
.theme-track {
    display: flex;
    align-items: center;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: 99px;
    padding: 3px;
    position: relative;
    min-width: 240px;
}

.theme-track__option {
    position: relative;
    z-index: 1;
    flex: 1;
    padding: 5px 16px;
    font-size: 12.5px;
    font-family: inherit;
    color: var(--text-secondary);
    background: transparent;
    border: none;
    border-radius: 99px;
    cursor: pointer;
    user-select: none;
    transition: color var(--transition-base);
    white-space: nowrap;
}

.theme-track__option--active {
    color: var(--text-primary);
    font-weight: 500;
}

.theme-track__thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: calc(33.333% - 2px);
    height: calc(100% - 6px);
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 99px;
    box-shadow: var(--shadow-sm);
    transition: transform var(--transition-base) cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
}

.theme-track__thumb--pos-1 { transform: translateX(0); }
.theme-track__thumb--pos-2 { transform: translateX(100%); }
.theme-track__thumb--pos-3 { transform: translateX(200%); }
</style>
