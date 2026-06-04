<script setup>
/**
 * @file src/components/chat/input/CapabilityBool.vue
 * 布尔型能力控件。是个胶囊按钮,激活态由 active prop 控制。
 *
 * display_name 可能包含 HTML(后端常量,受信任),用 v-html 渲染;
 * title 用纯文本(剥掉 HTML 标签)。
 */

import { computed } from 'vue';

import { stripHtmlTags } from '@/utils/escape.js';

const props = defineProps({
    /** Capability 定义对象 */
    capability: {
        type: Object,
        required: true,
    },
    /** 当前是否启用 */
    active: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['toggle']);

/** 展示名(允许含 SVG)。 */
const displayName = computed(() => props.capability.display_name || props.capability.id);

/** 鼠标悬停提示(纯文本)。 */
const tooltipText = computed(() => {
    return stripHtmlTags(props.capability.description || displayName.value);
});
</script>

<template>
    <button
        type="button"
        class="btn-toggle cap-bool-btn"
        :data-active="active"
        :title="tooltipText"
        @click="emit('toggle')"
        v-html="displayName"
    />
</template>

<style scoped>
.btn-toggle {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 11px;
    border-radius: 99px;
    font-size: 12.5px;
    color: var(--text-secondary);
    border: 1px solid var(--border);
    background: transparent;
    cursor: pointer;
    font-family: inherit;
    transition: all var(--transition-fast);
}

.btn-toggle:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}

.btn-toggle[data-active="true"] {
    background: var(--accent-subtle);
    color: var(--accent-text);
    border-color: color-mix(in srgb, var(--accent) 30%, transparent);
}

/* 让 v-html 注入的 SVG 与文字对齐 */
.btn-toggle :deep(svg) {
    display: inline-block;
    vertical-align: middle;
    flex-shrink: 0;
}
</style>
