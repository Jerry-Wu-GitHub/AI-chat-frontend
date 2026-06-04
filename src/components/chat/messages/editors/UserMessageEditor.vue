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
 */

import { ref, computed } from 'vue';

import BaseButton   from '@/components/common/BaseButton.vue';
import BaseTextarea from '@/components/common/BaseTextarea.vue';

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
const { uploadMany }    = useFileUpload();
const chatStore         = useChatStore();

const editedText = ref(props.message.content || '');

/** @type {import('vue').Ref<HTMLElement | null>} */
const wrapRef = ref(null);

/**
 * 拖放接收:把上传成功的文件追加到本条消息的 files 中。
 *
 * @param {File[]} files
 * @returns {Promise<void>}
 */
async function onFilesDropped(files) {
    const results = await uploadMany(files);
    const successful = results.filter(item => item !== null);
    if (successful.length === 0) return;

    const session = sessionsStore.findSessionById(props.sessionId);
    const current = session?.messages.find(item => item.id === props.message.id);
    const existingFiles = current?.files || [];
    sessionsStore.updateMessage(props.sessionId, props.message.id, {
        files: [...existingFiles, ...successful],
    });
}

const { isDragActive } = useDragDrop(wrapRef, {
    onDropFiles: onFilesDropped,
    stopPropagation: true,
});

/** 当前消息上的附件(用于在编辑态下展示)。 */
const currentFiles = computed(() => {
    const session = sessionsStore.findSessionById(props.sessionId);
    return session?.messages.find(item => item.id === props.message.id)?.files || [];
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
</script>

<template>
    <div
        ref="wrapRef"
        class="user-edit-wrap"
        :class="{ 'drop-active': isDragActive }"
    >
        <div v-if="currentFiles.length > 0" class="user-edit-files">
            <span
                v-for="file in currentFiles"
                :key="file.url"
                class="user-edit-file-name"
            >{{ file.name }}</span>
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

.user-edit-file-name {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 99px;
    background: var(--bg-subtle);
    color: var(--text-secondary);
}

.user-edit-textarea {
    width: 720px !important;
    max-width: 90% !important;
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
