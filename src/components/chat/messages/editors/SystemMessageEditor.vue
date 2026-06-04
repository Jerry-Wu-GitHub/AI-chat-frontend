<script setup>
/**
 * @file src/components/chat/messages/editors/SystemMessageEditor.vue
 * 用户添加的 system 消息的内联编辑。
 */

import { ref } from 'vue';

import BaseButton   from '@/components/common/BaseButton.vue';
import BaseTextarea from '@/components/common/BaseTextarea.vue';

import { useSessionsStore } from '@/stores/sessions.js';

const props = defineProps({
    message:   { type: Object, required: true },
    sessionId: { type: String, required: true },
});

const emit = defineEmits(['done']);

const sessionsStore = useSessionsStore();
const editedText = ref(props.message.content || '');

function onCancel() {
    emit('done');
}

function onSave() {
    const newText = editedText.value.trim();
    if (!newText) return;
    sessionsStore.updateMessage(props.sessionId, props.message.id, {
        content: newText,
    });
    emit('done');
}
</script>

<template>
    <div class="system-edit-wrap">
        <BaseTextarea
            v-model="editedText"
            :max-height="420"
            autofocus
            class="system-edit-textarea"
        />
        <div class="system-edit-actions">
            <BaseButton variant="secondary" @click="onCancel">取消</BaseButton>
            <BaseButton variant="primary"   @click="onSave">完成</BaseButton>
        </div>
    </div>
</template>

<style scoped>
.system-edit-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
}

.system-edit-textarea {
    width: min(620px, 86%);
    background: var(--bg-surface) !important;
    border: 1.5px solid color-mix(in srgb, var(--accent) 70%, var(--border)) !important;
    border-radius: var(--radius-lg) !important;
    padding: 10px 16px !important;
    font-size: 14.5px !important;
    line-height: 1.7 !important;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent) !important;
}

.system-edit-actions {
    display: flex;
    gap: var(--space-2);
    justify-content: center;
}
</style>
