<script setup>
/**
 * @file src/components/chat/input/PendingFileChip.vue
 * 单个待发送附件的小卡片。
 *
 * 三种状态:
 *   - 上传中:旋转图标 + "上传中..." 文字
 *   - 已就绪:缩略图(图片)或文件图标 + 文件名 + 大小
 *   - 任意时刻:右上角悬停显示删除按钮
 */

import BaseIcon from '@/components/common/BaseIcon.vue';
import { formatFileSize } from '@/utils/format.js';
import { usePreviewStore } from '@/stores/preview.js';

const props = defineProps({
    /**
     * 文件信息。
     * 已就绪时是 FileRef;上传中时形如 { name, size, uploading: true }。
     */
    file: {
        type: Object,
        required: true,
    },
});

const emit = defineEmits(['remove']);

const previewStore = usePreviewStore();

/**
 * 点击 chip(非删除按钮)→ 打开预览(仅在已就绪时)。
 *
 * @returns {void}
 */
function onClickChip() {
    if (props.file.uploading) return;
    previewStore.openPreview(props.file);
}

/**
 * 点击删除按钮。
 *
 * @param {MouseEvent} event
 * @returns {void}
 */
function onClickRemove(event) {
    event.stopPropagation();
    emit('remove');
}
</script>

<template>
    <div
        class="pending-chip"
        :class="{ 'pending-chip--uploading': file.uploading }"
        @click="onClickChip"
    >
        <BaseIcon
            v-if="file.uploading"
            name="spinner"
            :size="16"
            spinning
        />
        <img
            v-else-if="file.isImage"
            class="pending-chip__thumb"
            :src="file.url"
            :alt="file.name"
        />
        <BaseIcon
            v-else
            name="file-text"
            :size="16"
        />

        <div class="pending-chip__info">
            <span class="pending-chip__name">{{ file.name }}</span>
            <span class="pending-chip__size">
                {{ formatFileSize(file.size) }}
                <template v-if="file.uploading"> 上传中…</template>
            </span>
        </div>

        <button
            v-if="!file.uploading"
            type="button"
            class="pending-chip__delete"
            title="移除"
            @click="onClickRemove"
        >×</button>
    </div>
</template>

<style scoped>
.pending-chip {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 5px 8px;
    font-size: 12.5px;
    color: var(--text-secondary);
    max-width: 200px;
    cursor: pointer;
    transition: background var(--transition-fast);
}

.pending-chip:hover {
    background: var(--bg-hover);
}

.pending-chip--uploading {
    cursor: default;
    opacity: 0.85;
}

.pending-chip__thumb {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
}

.pending-chip__info {
    min-width: 0;
    display: flex;
    flex-direction: column;
    line-height: 1.3;
}

.pending-chip__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 120px;
    font-size: 12.5px;
}

.pending-chip__size {
    font-size: 11px;
    color: var(--text-muted);
}

.pending-chip__delete {
    position: absolute;
    top: -7px;
    right: -7px;
    width: 17px;
    height: 17px;
    background: var(--text-secondary);
    color: var(--text-inverse);
    border: none;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
    transition: opacity var(--transition-fast);
}

.pending-chip:hover .pending-chip__delete {
    opacity: 1;
}
</style>
