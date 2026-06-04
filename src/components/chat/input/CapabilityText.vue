<script setup>
/**
 * @file src/components/chat/input/CapabilityText.vue
 * 文本输入型能力控件。
 *
 * display_name 可能含 SVG,作为左侧图标渲染;placeholder 用纯文本。
 */

import { computed } from 'vue';

import { stripHtmlTags } from '@/utils/escape.js';

const props = defineProps({
    capability: {
        type: Object,
        required: true,
    },
    /** 当前值 */
    value: {
        type: String,
        default: '',
    },
});

const emit = defineEmits(['change']);

const displayName = computed(() => props.capability.display_name || props.capability.id);
const placeholderText = computed(() => stripHtmlTags(displayName.value));
const tooltipText = computed(() => stripHtmlTags(props.capability.description || displayName.value));
const hasValue = computed(() => Boolean(props.value));

/**
 * @param {Event} event
 * @returns {void}
 */
function onInput(event) {
    emit('change', event.target.value);
}
</script>

<template>
    <div class="cap-text-wrap" :title="tooltipText">
        <span class="cap-text-label" v-html="displayName" />
        <input
            type="text"
            class="cap-text-input"
            :data-has-value="hasValue"
            :placeholder="placeholderText"
            :value="value"
            @input="onInput"
        />
    </div>
</template>

<style scoped>
.cap-text-wrap {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0 10px;
    border-radius: 99px;
    border: 1px solid var(--border);
    background: transparent;
    transition: border var(--transition-fast), box-shadow var(--transition-fast);
}

.cap-text-wrap:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 15%, transparent);
}

.cap-text-label {
    display: inline-flex;
    align-items: center;
    color: var(--text-secondary);
    flex-shrink: 0;
}
.cap-text-label :deep(svg) {
    flex-shrink: 0;
}

.cap-text-input {
    padding: 5px 0;
    background: transparent;
    border: none;
    outline: none;
    font-family: inherit;
    font-size: 12.5px;
    color: var(--text-primary);
    width: 120px;
}

.cap-text-input::placeholder {
    color: var(--text-muted);
}

.cap-text-input[data-has-value="true"] {
    color: var(--accent-text);
}
</style>