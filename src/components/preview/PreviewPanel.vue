<script setup>
/**
 * @file src/components/preview/PreviewPanel.vue
 * 文件预览面板的总容器。
 *
 * 显隐由 previewStore.isVisible 控制(currentFile 不为 null)。
 * 内容根据 mediaType 分发到 PreviewImage / PreviewText / PreviewPdf 子组件。
 * 不可预览的文件不会进入 previewStore,由调用方直接走 triggerDownload。
 *
 * 面板自身的宽度由 ResizerBar 拖动控制并写入 inline style。
 */

import { computed } from 'vue';

import PreviewHeader from './PreviewHeader.vue';
import PreviewImage  from './PreviewImage.vue';
import PreviewText   from './PreviewText.vue';
import PreviewPdf    from './PreviewPdf.vue';
import PreviewOffice from './PreviewOffice.vue';

import { usePreviewStore } from '@/stores/preview.js';
import { classifyPreviewKind } from '@/utils/format.js';

const previewStore = usePreviewStore();

const previewKind = computed(() => {
    if (!previewStore.currentFile) return null;
    return classifyPreviewKind(previewStore.currentFile.mediaType);
});
</script>

<template>
    <aside
        id="the-preview-panel"
        class="preview-panel"
        :class="{ 'preview-panel--hidden': !previewStore.isVisible }"
    >
        <template v-if="previewStore.currentFile">
            <PreviewHeader :file="previewStore.currentFile" />

            <div
                class="preview-panel__body"
                :class="{ 'preview-panel__body--fluid': previewKind === 'pdf' || previewKind === 'office' }"
            >
                <PreviewImage
                    v-if="previewKind === 'image'"
                    :file="previewStore.currentFile"
                />
                <PreviewText
                    v-else-if="previewKind === 'text'"
                    :file="previewStore.currentFile"
                />
                <PreviewPdf
                    v-else-if="previewKind === 'pdf'"
                    :file="previewStore.currentFile"
                />
                <PreviewOffice
                    v-else-if="previewKind === 'office'"
                    :file="previewStore.currentFile"
                />
                <p v-else class="preview-panel__status">
                    无法在面板内预览此类型
                </p>
            </div>
        </template>
    </aside>
</template>

<style scoped>
.preview-panel {
    width: 360px;
    min-width: 200px;
    height: 100vh;
    background: var(--bg-elevated);
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
    transition: width var(--transition-slow) cubic-bezier(0.4, 0, 0.2, 1),
                min-width var(--transition-slow) cubic-bezier(0.4, 0, 0.2, 1),
                opacity var(--transition-base);
}

.preview-panel--hidden {
    width: 0 !important;
    min-width: 0 !important;
    opacity: 0;
    pointer-events: none;
}

.preview-panel__body {
    flex: 1;
    overflow: auto;
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    align-items: center;
}

/*
 * PDF 模式下,body 改为占满高度的弹性容器,
 * 让 iframe 能撑开到 panel 全高;同时去掉默认 padding,iframe 自带留白。
 */
.preview-panel__body--fluid {
    padding: var(--space-2);
    align-items: stretch;
    overflow: hidden;
}

.preview-panel__body::-webkit-scrollbar { width: 6px; }
.preview-panel__body::-webkit-scrollbar-track { background: transparent; }
.preview-panel__body::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 99px;
    transition: background var(--transition-fast);
}
.preview-panel__body:hover::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
}
.preview-panel__body {
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
}
.preview-panel__body:hover {
    scrollbar-color: var(--scrollbar-thumb) transparent;
}

.preview-panel__status {
    margin: auto;
    font-size: 13px;
    color: var(--text-muted);
}
</style>
