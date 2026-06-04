<script setup>
import { ref } from 'vue';

import ChatToolbar from './ChatToolbar.vue';
import MessageList from './MessageList.vue';
import ChatInput   from './input/ChatInput.vue';
import DropOverlay from './DropOverlay.vue';
import NavRail     from './NavRail.vue';

import { useDragDrop }   from '@/composables/useDragDrop.js';
import { useFileUpload } from '@/composables/useFileUpload.js';
import { useChatStore }  from '@/stores/chat.js';
import { useSessionsStore } from '@/stores/sessions.js';
import { computed } from 'vue';

const chatStore      = useChatStore();
const sessionsStore  = useSessionsStore();
const { uploadManyAndAddToPending } = useFileUpload();

/** @type {import('vue').Ref<HTMLElement | null>} */
const chatAreaRef = ref(null);

/** @type {import('vue').Ref<InstanceType<typeof MessageList> | null>} */
const messageListRef = ref(null);

/**
 * 当前会话的真实消息(供 NavRail 使用)。
 */
const realMessages = computed(() => {
    return chatStore.currentSession?.messages ?? [];
});

/**
 * 给 NavRail 用的 scroller ref:封装成一个 .value 指向真实 DOM 的对象。
 */
const scrollerRef = computed(() => ({
    get value() {
        return messageListRef.value?.getScrollerElement?.() ?? null;
    },
}));

/**
 * 拖放接收回调:上传所有文件,成功的加入待发送列表。
 *
 * @param {File[]} files
 * @returns {Promise<void>}
 */
async function onFilesDropped(files) {
    await uploadManyAndAddToPending(files);
}

const { isDragActive } = useDragDrop(chatAreaRef, {
    onDropFiles: onFilesDropped,
});
</script>

<template>
    <main ref="chatAreaRef" class="chat-area" id="chat-area">
        <ChatToolbar />
        <MessageList ref="messageListRef" />
        <ChatInput />

        <DropOverlay :active="isDragActive" />

        <!-- 导航栏放在 ChatArea 下,不会跟随 MessageList 滚动 -->
        <NavRail :scroller-ref="scrollerRef" :messages="realMessages" />
    </main>
</template>

<style scoped>
.chat-area {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background: var(--bg-base);
    position: relative;
}
</style>
