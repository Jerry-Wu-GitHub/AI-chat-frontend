<script setup>
/**
 * @file src/components/preview/PreviewHeader.vue
 * 预览面板顶部:文件名 + 下载按钮 + 关闭按钮。
 */

import BaseIcon from '@/components/common/BaseIcon.vue';

import { usePreviewStore } from '@/stores/preview.js';
import { forceDownload } from '@/utils/format.js';

const props = defineProps({
    /** 当前预览的文件 */
    file: {
        type: Object,
        required: true,
    },
});

const previewStore = usePreviewStore();

/**
 * 下载当前文件。
 *
 * @returns {void}
 */
function onDownload() {
    forceDownload(props.file.url, props.file.name);
}

/**
 * 关闭预览面板。
 *
 * @returns {void}
 */
function onClose() {
    previewStore.closePreview();
}
</script>

<template>
    <header class="preview-header">
        <span class="preview-header__filename" :title="file.name">
            {{ file.name }}
        </span>

        <div class="preview-header__actions">
            <button
                type="button"
                class="preview-header__download-btn"
                title="下载"
                @click="onDownload"
            >
                <BaseIcon name="download" :size="13" />
                下载
            </button>

            <button
                type="button"
                class="preview-header__close-btn"
                title="关闭预览"
                aria-label="关闭预览"
                @click="onClose"
            >
                <BaseIcon name="close" :size="16" />
            </button>
        </div>
    </header>
</template>

<style scoped>
.preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: 10px var(--space-3) 9px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    min-height: 48px;
    background: var(--bg-elevated);
}

.preview-header__filename {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.preview-header__actions {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    flex-shrink: 0;
}

.preview-header__download-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
    border-radius: 99px;
    font-size: 12.5px;
    font-weight: 500;
    font-family: inherit;
    color: var(--accent-text);
    background: var(--accent-subtle);
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast);
}
.preview-header__download-btn:hover {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
}
.preview-header__download-btn:active {
    transform: scale(0.96);
}

.preview-header__close-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--text-muted);
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast);
}
.preview-header__close-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}
</style>
