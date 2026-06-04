<script setup>
/**
 * @file src/components/chat/messages/editors/UserMessageEditor.vue
 * 用户消息的内联编辑器。
 *
 * 三个动作:
 *   - 取消:放弃改动,退出编辑态
 *   - 完成:仅保存,不重新生成
 *   - 发送:保存 + 截断后续 + 重新触发 AI 回复
 *
 * 拖入文件:把附件追加到该消息的 files。useDragDrop 在编辑框上单独绑,
 * stopPropagation 阻止冒泡到 ChatArea(避免文件被加进底部 pendingFiles)。
 *
 * 上传中的占位 chip 维护在本组件的 uploadingFiles 中(不写入 store),
 * 上传成功后再追加到消息的 files。
 */

import { ref, computed, onBeforeUnmount } from 'vue';

import BaseButton   from '@/components/common/BaseButton.vue';
import BaseTextarea from '@/components/common/BaseTextarea.vue';
import BaseIcon     from '@/components/common/BaseIcon.vue';

import { useSessionsStore } from '@/stores/sessions.js';
import { useDragDrop }      from '@/composables/useDragDrop.js';
import { useFileUpload }    from '@/composables/useFileUpload.js';
import { useChatStore }     from '@/stores/chat.js';

const props = defineProps({
    message:   { type: Object, required: true },
    sessionId: { type: String, required: true },
});

const emit = defineEmits(['done']);

const sessionsStore     = useSessionsStore();
const { uploadOne }     = useFileUpload();
const chatStore         = useChatStore();

const editedText = ref(props.message.content || '');

/** @type {import('vue').Ref<HTMLElement | null>} */
const wrapRef = ref(null);

/**
 * 本组件维护的"上传中"占位列表(不写入 store)。
 * 每项形如 { id, name, size }。
 *
 * @type {import('vue').Ref<Array<{ id: string, name: string, size: number }>>}
 */
const uploadingFiles = ref([]);

/**
 * 当前消息上的真实附件。
 */
const currentFiles = computed(() => {
    const session = sessionsStore.findSessionById(props.sessionId);
    return session?.messages.find(item => item.id === props.message.id)?.files || [];
});

/**
 * 拖放接收:为每个文件先插入占位 chip,上传完成后追加到 store。
 *
 * @param {File[]} files
 * @returns {Promise<void>}
 */
async function onFilesDropped(files) {
    const tasks = files.map(async (file) => {
        const placeholderId = `placeholder-${crypto.randomUUID()}`;
        uploadingFiles.value = [
            ...uploadingFiles.value,
            { id: placeholderId, name: file.name, size: file.size },
        ];

        const fileRef = await uploadOne(file);

        // 移除占位
        uploadingFiles.value = uploadingFiles.value.filter(
            item => item.id !== placeholderId,
        );

        // 成功则追加到消息的 files
        if (fileRef) {
            const session = sessionsStore.findSessionById(props.sessionId);
            const current = session?.messages.find(item => item.id === props.message.id);
            const existingFiles = current?.files || [];
            sessionsStore.updateMessage(props.sessionId, props.message.id, {
                files: [...existingFiles, fileRef],
            });
        }
    });

    await Promise.all(tasks);
}

const { isDragActive } = useDragDrop(wrapRef, {
    onDropFiles: onFilesDropped,
    stopPropagation: true,
});

/**
 * 取消编辑。
 */
function onCancel() {
    emit('done');
}

/**
 * 仅保存。
 */
function onSaveOnly() {
    const newText = editedText.value.trim();
    if (!newText) return;
    sessionsStore.updateMessage(props.sessionId, props.message.id, { content: newText });
    emit('done');
}

/**
 * 保存并重新发送。
 *
 * @returns {Promise<void>}
 */
async function onSaveAndResend() {
    const newText = editedText.value.trim();
    if (!newText) return;
    sessionsStore.updateMessage(props.sessionId, props.message.id, { content: newText });
    sessionsStore.truncateMessagesFrom(props.sessionId, props.message.id, false);
    emit('done');
    chatStore.requestStream(props.sessionId);
}

onBeforeUnmount(() => {
    // 组件卸载时清空占位(实际文件已经在 onFilesDropped 内追加到 store)
    uploadingFiles.value = [];
});
</script>

<template>
    <div
        ref="wrapRef"
        class="user-edit-wrap"
        :class="{ 'drop-active': isDragActive }"
    >
        <div
            v-if="currentFiles.length > 0 || uploadingFiles.length > 0"
            class="user-edit-files"
        >
            <span
                v-for="file in currentFiles"
                :key="file.url"
                class="user-edit-file-chip"
            >{{ file.name }}</span>

            <span
                v-for="file in uploadingFiles"
                :key="file.id"
                class="user-edit-file-chip user-edit-file-chip--uploading"
            >
                <BaseIcon name="spinner" :size="12" spinning />
                {{ file.name }} 上传中…
            </span>
        </div>

        <BaseTextarea
            v-model="editedText"
            :max-height="320"
            autofocus
            class="user-edit-textarea"
        />

        <div v-if="isDragActive" class="user-edit-drop-hint">
            松开以添加附件到此消息
        </div>

        <div class="user-edit-actions">
            <BaseButton variant="secondary" @click="onCancel">取消</BaseButton>
            <BaseButton variant="secondary" @click="onSaveOnly">完成</BaseButton>
            <BaseButton variant="primary"   @click="onSaveAndResend">发送</BaseButton>
        </div>
    </div>
</template>

<style scoped>
.user-edit-wrap {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-2);
    width: 100%;
    border-radius: var(--radius-lg);
    transition: box-shadow var(--transition-fast);
}

.user-edit-wrap.drop-active {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent);
}

.user-edit-files {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: flex-end;
}

.user-edit-file-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 99px;
    background: var(--bg-subtle);
    color: var(--text-secondary);
}

.user-edit-file-chip--uploading {
    background: color-mix(in srgb, var(--accent) 12%, var(--bg-subtle));
    color: var(--accent-text);
}

.user-edit-textarea {
    width: 480px !important;
    max-width: 100% !important;
    background: var(--bg-surface) !important;
    border: 1.5px solid var(--accent) !important;
    border-radius: var(--radius-xl) var(--radius-xl) var(--radius-sm) var(--radius-xl) !important;
    padding: 10px 16px !important;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent) !important;
}

.user-edit-drop-hint {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--accent) 12%, var(--bg-surface));
    border: 2px dashed var(--accent);
    border-radius: var(--radius-lg);
    color: var(--accent-text);
    font-size: 13.5px;
    font-weight: 500;
    pointer-events: none;
    z-index: 5;
}

.user-edit-actions {
    display: flex;
    gap: var(--space-2);
}
</style>
