<script setup>
/**
 * @file src/components/chat/messages/editors/AssistantMessageEditor.vue
 * AI 消息的内联编辑。仅编辑 content(不动 reasoning)。
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
    sessionsStore.updateMessage(props.sessionId, props.message.id, {
        content: editedText.value,
    });
    emit('done');
}
</script>

<template>
    <div class="ai-edit-wrap">
        <BaseTextarea
            v-model="editedText"
            :max-height="600"
            autofocus
            class="ai-edit-textarea"
        />
        <div class="ai-edit-actions">
            <BaseButton variant="secondary" @click="onCancel">取消</BaseButton>
            <BaseButton variant="primary"   @click="onSave">完成</BaseButton>
        </div>
    </div>
</template>

<style scoped>
.ai-edit-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.ai-edit-textarea {
    background: var(--bg-surface) !important;
    border: 1.5px solid var(--accent) !important;
    border-radius: var(--radius-md) !important;
    padding: 10px 14px !important;
    min-height: 80px !important;
    line-height: 1.65 !important;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent) !important;
    resize: vertical !important;
}

.ai-edit-actions {
    display: flex;
    gap: var(--space-2);
}
</style>
