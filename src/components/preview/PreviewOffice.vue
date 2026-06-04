<script setup>
/**
 * @file src/components/preview/PreviewOffice.vue
 * Office 文件(PPT / PPTX / DOC / DOCX / XLS / XLSX)预览。
 *
 * 浏览器原生不支持渲染 Office 文件,这里用 Microsoft Office Online Viewer
 * 通过 iframe 嵌入。**要求文件 URL 公网可达**:微软服务器需要能 GET 到该 URL,
 * 因此 localhost / 局域网无法工作。
 *
 * 检测策略很简单:如果 location.hostname 不是公网(localhost / 127.0.0.1
 * / 内网段),直接提示用户下载。
 */

import { computed } from 'vue';

import BaseIcon from '@/components/common/BaseIcon.vue';
import { forceDownload } from '@/utils/format.js';

const props = defineProps({
    file: {
        type: Object,
        required: true,
    },
});

/** 当前页面 host 是否公网可达(粗略判断)。 */
const isHostPubliclyAccessible = computed(() => {
    const host = window.location.hostname;
    if (!host) return false;
    if (host === 'localhost') return false;
    if (host === '127.0.0.1') return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^10\./.test(host)) return false;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return false;
    return true;
});

/**
 * 构造 Office Online Viewer 的嵌入 URL。
 *
 * @returns {string}
 */
const viewerUrl = computed(() => {
    const absoluteUrl = new URL(props.file.url, window.location.href).toString();
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}`;
});

/**
 * 触发文件下载。
 *
 * @returns {void}
 */
function onDownload() {
    forceDownload(props.file.url, props.file.name);
}
</script>

<template>
    <iframe
        v-if="isHostPubliclyAccessible"
        class="preview-office"
        :src="viewerUrl"
        :title="file.name"
    />

    <div v-else class="preview-office__fallback">
        <BaseIcon name="file-text" :size="40" />
        <p class="preview-office__fallback-title">无法预览此 Office 文件</p>
        <p class="preview-office__fallback-hint">
            本地或内网部署下,浏览器原生无法渲染 Office 文档。
            请下载到本地后打开。
        </p>
        <button
            type="button"
            class="preview-office__download-btn"
            @click="onDownload"
        >
            <BaseIcon name="download" :size="13" />
            下载
        </button>
    </div>
</template>

<style scoped>
.preview-office {
    width: 100%;
    height: 100%;
    min-height: 70vh;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--bg-surface);
    flex: 1;
}

.preview-office__fallback {
    margin: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-5);
    text-align: center;
    color: var(--text-secondary);
}

.preview-office__fallback-title {
    font-size: 15px;
    font-weight: 500;
    color: var(--text-primary);
    margin: 0;
}

.preview-office__fallback-hint {
    font-size: 13px;
    color: var(--text-muted);
    margin: 0;
    line-height: 1.6;
    max-width: 280px;
}

.preview-office__download-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 7px 18px;
    border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
    border-radius: 99px;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    color: var(--accent-text);
    background: var(--accent-subtle);
    cursor: pointer;
    transition: background var(--transition-fast);
}
.preview-office__download-btn:hover {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
}
</style>
