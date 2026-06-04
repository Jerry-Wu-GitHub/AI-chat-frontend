/**
 * @file src/stores/preview.js
 * 文件预览面板 store。维护"当前正在预览什么文件"。
 *
 * 实际的"图片/文本/不可预览"分类逻辑在 utils/format.js;
 * 不可预览的文件不会进入本 store,直接触发下载即可。
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const usePreviewStore = defineStore('preview', () => {
    /**
     * 当前预览的文件引用。null 表示预览面板关闭。
     * @type {import('vue').Ref<import('./sessions.js').FileRef | null>}
     */
    const currentFile = ref(null);

    /** 预览面板是否可见。 */
    const isVisible = computed(() => currentFile.value !== null);

    /**
     * 打开预览面板并显示指定文件。
     *
     * @param {import('./sessions.js').FileRef} fileRef
     * @returns {void}
     */
    function openPreview(fileRef) {
        currentFile.value = fileRef;
    }

    /**
     * 关闭预览面板。
     *
     * @returns {void}
     */
    function closePreview() {
        currentFile.value = null;
    }

    return {
        currentFile,
        isVisible,
        openPreview,
        closePreview,
    };
});
