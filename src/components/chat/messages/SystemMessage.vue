<script setup>
/**
 * @file src/components/chat/messages/SystemMessage.vue
 * 用户手动添加的 system 消息。居中显示。
 */

import { computed } from 'vue';

import MessageActions from './MessageActions.vue';

import { useSessionsStore } from '@/stores/sessions.js';
import { useChatStore }     from '@/stores/chat.js';
import { useToast }         from '@/composables/useToast.js';

const props = defineProps({
    message:   { type: Object, required: true },
    sessionId: { type: String, required: true },
});

const emit = defineEmits(['edit']);

const sessionsStore = useSessionsStore();
const chatStore     = useChatStore();
const { showToast } = useToast();

const actions = computed(() => [
    {
        label:   '复制',
        icon:    'copy',
        feedback: { label: '已复制', durationMs: 1500 },
        onClick: copyContent,
    },
    {
        label:   '编辑',
        icon:    'edit',
        onClick: () => emit('edit'),
    },
    {
        label:   '继续说',
        icon:    'continue',
        onClick: () => chatStore.requestStream(props.sessionId),
    },
    {
        label:   '回溯',
        icon:    'truncate',
        danger:  true,
        onClick: () => sessionsStore.truncateMessagesFrom(props.sessionId, props.message.id, false),
    },
    {
        label:   '删除',
        icon:    'trash',
        danger:  true,
        onClick: () => sessionsStore.deleteMessage(props.sessionId, props.message.id),
    },
]);

async function copyContent() {
    try {
        await navigator.clipboard.writeText(props.message.content || '');
    } catch {
        showToast('复制失败', 'error');
    }
}
</script>

<template>
    <div class="msg-system">
        <div class="system-bubble">{{ message.content }}</div>
    </div>

    <MessageActions :actions="actions" align="center" />
</template>
