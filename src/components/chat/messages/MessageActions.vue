<script setup>
/**
 * @file src/components/chat/messages/MessageActions.vue
 * 通用消息操作按钮栏。被三种消息组件共用。
 *
 * action 结构:
 *   {
 *       label:    string,
 *       icon:     string,          // BaseIcon 名
 *       danger?:  boolean,         // true → 加 danger 样式 + 启用二次确认
 *       onClick:  () => void,
 *   }
 */

import MessageActionButton from './MessageActionButton.vue';

const props = defineProps({
    /** 操作项数组 */
    actions: {
        type: Array,
        required: true,
    },
    /** 整体对齐方式 */
    align: {
        type: String,
        default: 'start',
        validator: (value) => ['start', 'center', 'end'].includes(value),
    },
});
</script>

<template>
    <div
        class="msg-actions"
        :class="[
            align === 'end'    && 'msg-user-actions',
            align === 'center' && 'msg-system-actions',
        ]"
    >
        <MessageActionButton
            v-for="(action, index) in actions"
            :key="index"
            :label="action.label"
            :icon="action.icon"
            :danger="action.danger"
            :feedback="action.feedback"
            @click="action.onClick"
        />
    </div>
</template>
