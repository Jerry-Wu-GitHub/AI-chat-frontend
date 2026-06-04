<script setup>
/**
 * @file src/components/chat/messages/InheritedSystemMessage.vue
 * 顶部的"继承系统提示词"气泡。
 *
 * 这种气泡不在 session.messages 中,是从祖先会话组的 systemPrompt
 * 派生出来的虚拟内容。因此只允许复制,不能编辑/删除/回溯。
 */

import { computed } from 'vue';

import MessageActions from './MessageActions.vue';
import { useToast }   from '@/composables/useToast.js';

const props = defineProps({
    /** 继承提示词条目:{ id, type, name, content } */
    prompt: {
        type: Object,
        required: true,
    },
});

const { showToast } = useToast();

const actions = computed(() => [
    {
        label:   '复制',
        icon:    'copy',
        feedback: { label: '已复制', durationMs: 1500 },
        onClick: copyContent,
    },
]);

async function copyContent() {
    try {
        await navigator.clipboard.writeText(props.prompt.content || '');
    } catch {
        showToast('复制失败', 'error');
    }
}
</script>

<template>
    <div
        class="message-row message-row-inherited-system"
        data-virtual="true"
        :data-msg-id="`inherited-system-${prompt.type}-${prompt.id}`"
        data-role="system-inherited"
    >
        <div class="message-wrapper">
            <div class="msg-system msg-system-inherited">
                <div
                    class="system-bubble system-bubble-inherited"
                    :title="prompt.name"
                >{{ prompt.content }}</div>
            </div>

            <div class="msg-actions msg-system-actions msg-inherited-system-actions">
                <MessageActions :actions="actions" align="center" />
            </div>
        </div>
    </div>
</template>
