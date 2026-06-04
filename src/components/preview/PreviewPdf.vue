<script setup>
/**
 * @file src/components/preview/PreviewPdf.vue
 * PDF 文件预览。
 *
 * 用 <iframe> 嵌入浏览器自带的 PDF 阅读器,支持翻页、缩放、文字选中。
 * 把文件 URL 直接作为 iframe.src;浏览器对 application/pdf 类型会自动
 * 启用阅读器。
 */

const props = defineProps({
    file: {
        type: Object,
        required: true,
    },
});
</script>

<template>
    <iframe
        class="preview-pdf"
        :src="file.url"
        :title="file.name"
    />
</template>

<style scoped>
.preview-pdf {
    width: 100%;
    height: 100%;
    min-height: 70vh;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--bg-surface);
    flex: 1;
}
</style>
