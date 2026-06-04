<script setup>
/**
 * @file src/components/chat/input/PendingFiles.vue
 * 待发送附件预览列表。
 */

import PendingFileChip from './PendingFileChip.vue';
import { useChatStore } from '@/stores/chat.js';

const chatStore = useChatStore();

/**
 * 移除指定索引的待发送文件。
 *
 * @param {number} index
 * @returns {void}
 */
function onRemove(index) {
    chatStore.removePendingFileAt(index);
}
</script>

<template>
    <div v-if="chatStore.pendingFiles.length > 0" class="pending-files">
        <PendingFileChip
            v-for="(file, index) in chatStore.pendingFiles"
            :key="`${file.url}-${index}`"
            :file="file"
            @remove="onRemove(index)"
        />
    </div>
</template>

<style scoped>
.pending-files {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
}
</style>
