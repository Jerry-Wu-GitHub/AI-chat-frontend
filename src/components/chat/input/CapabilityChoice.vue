<script setup>
/**
 * @file src/components/chat/input/CapabilityChoice.vue
 * 单选 / 多选下拉能力控件。
 *
 * - capability.type === 'choice' :单选,value 为 string
 * - capability.type === 'choices':多选,value 为 string[]
 */

import { ref, computed } from 'vue';

import BaseIcon from '@/components/common/BaseIcon.vue';
import { useDropdown } from '@/composables/useDropdown.js';
import { stripHtmlTags } from '@/utils/escape.js';

const props = defineProps({
    capability: {
        type: Object,
        required: true,
    },
    /** 当前值:string 或 string[](choices 模式) */
    value: {
        type: [String, Array, null],
        default: null,
    },
});

const emit = defineEmits(['change']);

/** @type {import('vue').Ref<HTMLElement | null>} */
const triggerRef = ref(null);
/** @type {import('vue').Ref<HTMLElement | null>} */
const panelRef = ref(null);

const { isOpen, toggle, close } = useDropdown(triggerRef, panelRef);

/** 是否多选模式。 */
const isMultiple = computed(() => props.capability.type === 'choices');

/** 选项列表。 */
const options = computed(() => {
    return Array.isArray(props.capability.options) ? props.capability.options : [];
});

/** 当前选中的集合(统一为 Set,便于查询)。 */
const selectedSet = computed(() => {
    if (isMultiple.value) {
        return new Set(Array.isArray(props.value) ? props.value : []);
    }
    return new Set(props.value ? [props.value] : []);
});

/** 触发按钮上展示的"当前值"文字。 */
const valueLabel = computed(() => {
    if (selectedSet.value.size === 0) return '';
    if (isMultiple.value) return `: ${[...selectedSet.value].join(', ')}`;
    return `: ${[...selectedSet.value][0]}`;
});

/** 触发按钮是否处于"已设置值"的强调态。 */
const hasValue = computed(() => selectedSet.value.size > 0);

/** 显示名(含 SVG)。 */
const displayName = computed(() => props.capability.display_name || props.capability.id);
/** 鼠标悬停提示。 */
const tooltipText = computed(() => stripHtmlTags(props.capability.description || displayName.value));

/**
 * 选中或取消选中一个选项。
 *
 * @param {string} optionValue
 * @returns {void}
 */
function onPick(optionValue) {
    if (isMultiple.value) {
        const next = new Set(selectedSet.value);
        if (next.has(optionValue)) {
            next.delete(optionValue);
        } else {
            next.add(optionValue);
        }
        emit('change', [...next]);
    } else {
        emit('change', optionValue);
        close();
    }
}

/**
 * 清除当前选择(选择"不启用")。
 *
 * @returns {void}
 */
function onClear() {
    emit('change', isMultiple.value ? [] : '');
    if (!isMultiple.value) close();
}
</script>

<template>
    <div ref="triggerRef" class="cap-select-wrap">
        <button
            type="button"
            class="cap-select-trigger"
            :data-has-value="hasValue"
            :title="tooltipText"
            @click="toggle"
        >
            <span class="cap-select-name" v-html="displayName" />
            <span v-if="hasValue" class="cap-select-value">{{ valueLabel }}</span>
            <BaseIcon name="chevron-down" :size="10" class="cap-chevron" />
        </button>

        <div
            v-if="isOpen"
            ref="panelRef"
            class="cap-select-panel"
        >
            <div class="cap-option cap-option-clear" @click="onClear">
                <BaseIcon name="check" :size="12" class="cap-option-check" />
                <span>不启用</span>
            </div>

            <div
                v-for="option in options"
                :key="option"
                class="cap-option"
                :class="{ selected: selectedSet.has(option) }"
                @click="onPick(option)"
            >
                <BaseIcon name="check" :size="12" class="cap-option-check" />
                <span>{{ option }}</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.cap-select-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
}

.cap-select-trigger {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: 99px;
    font-size: 12.5px;
    font-family: inherit;
    color: var(--text-secondary);
    border: 1px solid var(--border);
    background: transparent;
    cursor: pointer;
    transition: all var(--transition-fast);
    max-width: 200px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.cap-select-trigger:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}
.cap-select-trigger[data-has-value="true"] {
    background: var(--accent-subtle);
    color: var(--accent-text);
    border-color: color-mix(in srgb, var(--accent) 30%, transparent);
}

.cap-select-name {
    display: inline-flex;
    align-items: center;
    gap: 5px;
}
.cap-select-name :deep(svg) {
    flex-shrink: 0;
}

.cap-chevron {
    flex-shrink: 0;
    opacity: 0.6;
}

.cap-select-panel {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 0;
    z-index: 200;
    min-width: 160px;
    max-height: 260px;
    overflow-y: auto;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    padding: 4px;
    animation: cap-slide-up 120ms ease;
}

.cap-option {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    color: var(--text-primary);
    cursor: pointer;
    transition: background var(--transition-fast);
    white-space: nowrap;
}
.cap-option:hover {
    background: var(--bg-hover);
}
.cap-option.selected {
    color: var(--accent);
}

.cap-option-check {
    flex-shrink: 0;
    visibility: hidden;
}
.cap-option.selected .cap-option-check {
    visibility: visible;
}

.cap-option-clear {
    color: var(--text-muted);
    font-style: italic;
    border-bottom: 1px solid var(--border);
    margin-bottom: 2px;
    padding-bottom: 6px;
}

@keyframes cap-slide-up {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
}
</style>
