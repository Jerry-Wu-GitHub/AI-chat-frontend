<script setup>
/**
 * @file src/components/preview/PreviewText.vue
 * 文本文件预览:fetch 内容后用 <pre> 显示。
 */

import { ref, watch, onMounted } from 'vue';

const props = defineProps({
    file: {
        type: Object,
        required: true,
    },
});

/**
 * 文本内容。null 表示加载中,字符串(可空)表示加载完成。
 * @type {import('vue').Ref<string | null>}
 */
const textContent = ref(null);

/** 加载是否失败。 */
const hasError = ref(false);

/**
 * 加载指定文件的文本内容。
 *
 * @param {string} url
 * @returns {Promise<void>}
 */
async function loadTextContent(url) {
    textContent.value = null;
    hasError.value = false;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        textContent.value = await response.text();
    } catch (fetchError) {
        console.warn('文本预览加载失败:', fetchError);
        hasError.value = true;
        textContent.value = '';
    }
}

onMounted(() => {
    loadTextContent(props.file.url);
});

// 切换文件时重新加载
watch(() => props.file.url, (newUrl) => {
    if (newUrl) loadTextContent(newUrl);
});
</script>

<template>
    <p v-if="hasError" class="preview-text__status">加载失败</p>
    <p v-else-if="textContent === null" class="preview-text__status">加载中…</p>
    <pre v-else class="preview-text">{{ textContent }}</pre>
</template>

<style scoped>
.preview-text {
    width: 100%;
    margin: 0;
    padding: var(--space-4);
    background: var(--code-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: 12.5px;
    line-height: 1.65;
    color: var(--text-primary);
    white-space: pre-wrap;
    word-break: break-all;
    overflow-x: auto;
}

.preview-text::-webkit-scrollbar { width: 6px; height: 6px; }
.preview-text::-webkit-scrollbar-track { background: transparent; }
.preview-text::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 99px;
    transition: background var(--transition-fast);
}
.preview-text:hover::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
}
.preview-text {
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
}
.preview-text:hover {
    scrollbar-color: var(--scrollbar-thumb) transparent;
}

.preview-text__status {
    margin: auto;
    font-size: 13px;
    color: var(--text-muted);
}
</style>
