<script setup>
/**
 * @file src/components/common/BaseTextarea.vue
 * 自动伸缩的 textarea。封装 v-model + useAutoResize。
 *
 * 用法:
 *   <BaseTextarea v-model="text" :max-height="280" :min-height="96" placeholder="..." />
 */

import { ref, onMounted, computed } from 'vue';
import { useAutoResize } from '@/composables/useAutoResize.js';

const props = defineProps({
    /** v-model 绑定值 */
    modelValue: {
        type: String,
        default: '',
    },
    /** 最大高度(像素),超过会出现滚动条 */
    maxHeight: {
        type: Number,
        default: 280,
    },
    /** 最小高度(像素)。useAutoResize 会读 CSS min-height,所以这里通过内联样式设置。 */
    minHeight: {
        type: Number,
        default: 24,
    },
    placeholder: {
        type: String,
        default: '',
    },
    rows: {
        type: Number,
        default: 1,
    },
    /** 是否在挂载后自动聚焦 */
    autofocus: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['update:modelValue', 'keydown']);

/** @type {import('vue').Ref<HTMLTextAreaElement | null>} */
const textareaRef = ref(null);

const { resize } = useAutoResize(textareaRef, { maxHeight: props.maxHeight });

/**
 * 内联样式:把 min-height 写到元素上,这样 useAutoResize 用
 * window.getComputedStyle 能读出来,而且不受 scoped 样式特异性影响。
 */
const inlineStyle = computed(() => ({
    minHeight: `${props.minHeight}px`,
}));

/**
 * 处理输入事件,触发 v-model 更新。
 *
 * @param {Event} event
 * @returns {void}
 */
function onInput(event) {
    emit('update:modelValue', event.target.value);
}

/**
 * 让外部能通过 ref 获取到内部 textarea(用于 focus、selection 等)。
 */
defineExpose({
    /** 获取内部 textarea 元素。 */
    getElement: () => textareaRef.value,
    /** 主动触发一次高度调整(例如清空内容后)。 */
    resize,
    /** 聚焦。 */
    focus: () => textareaRef.value?.focus(),
});

onMounted(() => {
    if (props.autofocus) {
        textareaRef.value?.focus();
    }
});
</script>

<template>
    <textarea
        ref="textareaRef"
        class="base-textarea"
        :value="modelValue"
        :placeholder="placeholder"
        :rows="rows"
        :style="inlineStyle"
        @input="onInput"
        @keydown="$emit('keydown', $event)"
    />
</template>

<style scoped>
.base-textarea {
    /* 由父组件控制具体 padding;给一个默认值避免文字贴边。 */
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    font-family: inherit;
    font-size: 15px;
    color: var(--text-primary);
    resize: none;
    line-height: 1.65;
    overflow-y: auto;
    padding: 14px 18px;
    box-sizing: border-box;
    display: block;
}

.base-textarea::placeholder {
    color: var(--text-muted);
}
</style>
