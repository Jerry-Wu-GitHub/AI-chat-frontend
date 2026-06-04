<script setup>
/**
 * @file src/components/chat/messages/UserMessage.vue
 * 用户消息行(只读态)。气泡靠右,悬停显示操作按钮。
 */

import { computed } from 'vue';

import MessageFiles   from './MessageFiles.vue';
import MessageActions from './MessageActions.vue';

import { useSessionsStore } from '@/stores/sessions.js';
import { useChatStream }    from '@/composables/useChatStream.js';
import { useToast }         from '@/composables/useToast.js';

const props = defineProps({
    message:   { type: Object, required: true },
    sessionId: { type: String, required: true },
});

const emit = defineEmits(['edit']);

const sessionsStore = useSessionsStore();
const { runCompletion } = useChatStream();
const { showToast }     = useToast();

/**
 * 操作按钮配置。
 */
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
        label:   '回溯',
        icon:    'truncate',
        danger:  true,
        onClick: truncateFromHere,
    },
    {
        label:   '删除',
        icon:    'trash',
        danger:  true,
        onClick: deleteSelf,
    },
]);

/**
 * 复制消息内容到剪贴板。
 *
 * @returns {Promise<void>}
 */
async function copyContent() {
    try {
        await navigator.clipboard.writeText(props.message.content || '');
    } catch {
        showToast('复制失败', 'error');
    }
}

/**
 * 回溯:删除本条之后的所有消息。
 *
 * @returns {void}
 */
function truncateFromHere() {
    sessionsStore.truncateMessagesFrom(props.sessionId, props.message.id, false);
}

/**
 * 删除本条消息。
 *
 * @returns {void}
 */
function deleteSelf() {
    sessionsStore.deleteMessage(props.sessionId, props.message.id);
}
</script>

<template>
    <MessageFiles
        v-if="message.files && message.files.length > 0"
        :files="message.files"
        :message-id="message.id"
        :session-id="sessionId"
    />

    <div class="msg-user">
        <div class="bubble">{{ message.content }}</div>
    </div>

    <MessageActions :actions="actions" align="end" />
</template>