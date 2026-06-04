<script setup>
/**
 * @file src/components/preview/PreviewImage.vue
 * 图片预览。
 */

const props = defineProps({
    file: {
        type: Object,
        required: true,
    },
});
</script>

<template>
    <img
        class="preview-image"
        :src="file.url"
        :alt="file.name"
    />
</template>

<style scoped>
.preview-image {
    max-width: 100%;
    height: auto;
    object-fit: contain;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
}
</style>
