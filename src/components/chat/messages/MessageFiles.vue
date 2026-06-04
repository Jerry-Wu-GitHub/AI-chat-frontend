<script setup>
/**
 * @file src/components/chat/messages/MessageFiles.vue
 * 已发送用户消息中的附件列表。
 *
 * 每个 chip:
 *   - 图片显示缩略图,其它显示文件图标
 *   - 文件名展示
 *   - 悬停时显示右上角删除按钮(允许删除已发送消息中的某个附件)
 *   - 点击 chip(非删除按钮)打开预览面板
 */

import BaseIcon from '@/components/common/BaseIcon.vue';

import { usePreviewStore }  from '@/stores/preview.js';
import { useSessionsStore } from '@/stores/sessions.js';

const props = defineProps({
    /** 附件列表 */
    files: {
        type: Array,
        required: true,
    },
    /** 所属消息 id */
    messageId: {
        type: String,
        required: true,
    },
    /** 所属会话 id */
    sessionId: {
        type: String,
        required: true,
    },
});

const previewStore  = usePreviewStore();
const sessionsStore = useSessionsStore();

/**
 * 打开预览面板。
 *
 * @param {object} fileRef
 * @returns {void}
 */
function onPreview(fileRef) {
    previewStore.openPreview(fileRef);
}

/**
 * 删除该消息中的某个附件。
 *
 * @param {number} fileIndex
 * @returns {void}
 */
function onDelete(fileIndex) {
    const session = sessionsStore.findSessionById(props.sessionId);
    const message = session?.messages.find(item => item.id === props.messageId);
    if (!message || !message.files) return;

    const newFiles = message.files.filter((_, index) => index !== fileIndex);
    sessionsStore.updateMessage(props.sessionId, props.messageId, { files: newFiles });
}
</script>

<template>
    <div v-if="files.length > 0" class="msg-files">
        <div
            v-for="(file, index) in files"
            :key="`${file.url}-${index}`"
            class="msg-file-chip"
            @click="onPreview(file)"
        >
            <img
                v-if="file.isImage"
                class="msg-file-chip__thumb"
                :src="file.url"
                :alt="file.name"
            />
            <BaseIcon
                v-else
                name="file-text"
                :size="16"
                class="msg-file-chip__icon"
            />
            <span class="msg-file-chip__name">{{ file.name }}</span>

            <button
                type="button"
                class="msg-file-chip__delete"
                title="删除附件"
                @click.stop="onDelete(index)"
            >×</button>
        </div>
    </div>
</template>

<style scoped>
.msg-files {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
    justify-content: flex-end;
}

.msg-file-chip {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: color-mix(in srgb, var(--user-bubble-bg) 15%, var(--bg-surface));
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 5px 8px;
    font-size: 12.5px;
    color: var(--text-secondary);
    max-width: 180px;
    cursor: pointer;
}

.msg-file-chip__thumb {
    width: 36px;
    height: 36px;
    object-fit: cover;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
}

.msg-file-chip__icon {
    flex-shrink: 0;
}

.msg-file-chip__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 110px;
}

.msg-file-chip__delete {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 16px;
    height: 16px;
    background: var(--danger);
    color: #fff;
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
.msg-file-chip:hover .msg-file-chip__delete {
    opacity: 1;
}
</style>
