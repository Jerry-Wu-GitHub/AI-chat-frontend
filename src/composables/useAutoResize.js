/**
 * @file src/composables/useAutoResize.js
 * 让 textarea 随内容自动伸缩(在最大高度内)。
 *
 * 用法:
 *   const textareaRef = ref(null);
 *   useAutoResize(textareaRef, { maxHeight: 280 });
 */

import { watch, onMounted, onBeforeUnmount, nextTick } from 'vue';

/**
 * 为一个 textarea 自动管理高度。
 *
 * @param {import('vue').Ref<HTMLTextAreaElement | null>} textareaRef
 * @param {object} [options]
 * @param {number} [options.maxHeight=280] 最大高度(像素),超过则出现滚动条
 * @returns {{ resize: () => void }} 暴露 resize() 供外部主动调用(例如清空后)
 */
export function useAutoResize(textareaRef, options = {}) {
    const maxHeight = options.maxHeight ?? 280;

    /**
     * 根据内容调整 textarea 高度。
     */
    function resize() {
        const textarea = textareaRef.value;
        if (!textarea) return;
        textarea.style.height = 'auto';

        // 读取 CSS 中的 min-height,确保 scrollHeight 不会让 textarea 比初始高度还矮。
        const computedStyle = window.getComputedStyle(textarea);
        const minHeight = parseFloat(computedStyle.minHeight) || 0;
        const scrollH = textarea.scrollHeight;

        textarea.style.height = `${Math.min(maxHeight, Math.max(minHeight, scrollH))}px`;
    }

    /**
     * input 事件触发自动调整。
     */
    function onInput() {
        resize();
    }

    onMounted(() => {
        const textarea = textareaRef.value;
        if (!textarea) return;
        textarea.addEventListener('input', onInput);
        // 首次挂载后也调整一次,处理 v-model 初始值。
        nextTick(resize);
    });

    onBeforeUnmount(() => {
        const textarea = textareaRef.value;
        textarea?.removeEventListener('input', onInput);
    });

    // textarea 元素本身可能在条件渲染下被替换,重新绑定一次。
    watch(textareaRef, (newElement, oldElement) => {
        oldElement?.removeEventListener('input', onInput);
        if (newElement) {
            newElement.addEventListener('input', onInput);
            nextTick(resize);
        }
    });

    return { resize };
}
