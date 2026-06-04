<script setup>
/**
 * @file src/components/chat/messages/MessageRow.vue
 * 消息行调度器。根据消息的 role 渲染对应的子组件,
 * 并维护"是否处于编辑态"的本地状态。
 */

import { ref } from 'vue';

import UserMessage         from './UserMessage.vue';
import AssistantMessage    from './AssistantMessage.vue';
import SystemMessage       from './SystemMessage.vue';
import UserMessageEditor       from './editors/UserMessageEditor.vue';
import AssistantMessageEditor  from './editors/AssistantMessageEditor.vue';
import SystemMessageEditor     from './editors/SystemMessageEditor.vue';

const props = defineProps({
    /** 消息对象。 */
    message: {
        type: Object,
        required: true,
    },
    /** 所属会话 id。 */
    sessionId: {
        type: String,
        required: true,
    },
});

/** 是否正在编辑这条消息。 */
const isEditing = ref(false);

/**
 * 进入编辑态。
 *
 * @returns {void}
 */
function enterEditMode() {
    isEditing.value = true;
}

/**
 * 退出编辑态(用户取消或保存后调用)。
 *
 * @returns {void}
 */
function exitEditMode() {
    isEditing.value = false;
}
</script>

<template>
    <div
        class="message-row"
        :data-msg-id="message.id"
        :data-role="message.role"
    >
        <div class="message-wrapper">
            <!-- ============ 用户消息 ============ -->
            <UserMessageEditor
                v-if="message.role === 'user' && isEditing"
                :message="message"
                :session-id="sessionId"
                @done="exitEditMode"
            />
            <UserMessage
                v-else-if="message.role === 'user'"
                :message="message"
                :session-id="sessionId"
                @edit="enterEditMode"
            />

            <!-- ============ AI 消息 ============ -->
            <AssistantMessageEditor
                v-else-if="message.role === 'assistant' && isEditing"
                :message="message"
                :session-id="sessionId"
                @done="exitEditMode"
            />
            <AssistantMessage
                v-else-if="message.role === 'assistant'"
                :message="message"
                :session-id="sessionId"
                @edit="enterEditMode"
            />

            <!-- ============ 系统提示消息 ============ -->
            <SystemMessageEditor
                v-else-if="message.role === 'system' && isEditing"
                :message="message"
                :session-id="sessionId"
                @done="exitEditMode"
            />
            <SystemMessage
                v-else-if="message.role === 'system'"
                :message="message"
                :session-id="sessionId"
                @edit="enterEditMode"
            />
        </div>
    </div>
</template>
