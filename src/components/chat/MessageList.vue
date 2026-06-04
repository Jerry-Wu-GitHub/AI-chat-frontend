<script setup>
/**
 * @file src/components/chat/MessageList.vue
 * 消息列表容器。
 *
 * 责任:
 *   - 展示空态或消息行。
 *   - 暴露滚动容器(NavRail 等需要监听它的 scroll)。
 *
 * 具体消息行渲染由 components/chat/messages/MessageRow.vue 完成
 * (下一轮迁移)。
 */

import { ref, computed, watch, nextTick } from 'vue';

import EmptyHint from './EmptyHint.vue';

import { useChatStore }     from '@/stores/chat.js';
import { useSessionsStore } from '@/stores/sessions.js';
import { useGroupsStore }   from '@/stores/groups.js';
import { usePrefsStore }    from '@/stores/prefs.js';

import MessageRow                 from './messages/MessageRow.vue';
import InheritedSystemMessage     from './messages/InheritedSystemMessage.vue';
import StreamingAssistantMessage  from './messages/StreamingAssistantMessage.vue';

const chatStore     = useChatStore();
const sessionsStore = useSessionsStore();
const groupsStore   = useGroupsStore();
const prefsStore    = usePrefsStore();

/** @type {import('vue').Ref<HTMLElement | null>} */
const listRef = ref(null);

/** 暴露给父组件拿到滚动 DOM(NavRail 需要它来计算位置)。 */
defineExpose({
    getScrollerElement: () => listRef.value,
});

/** 当前会话。 */
const session = computed(() => chatStore.currentSession);

/** 真实聊天消息(不含继承的系统提示)。 */
const realMessages = computed(() => session.value?.messages ?? []);

/**
 * 顶部要显示的"继承系统提示词"列表。
 * 受 prefs.showInheritedPrompts 控制。
 */
const inheritedPrompts = computed(() => {
    if (!session.value) return [];
    if (prefsStore.preferences.showInheritedPrompts === false) return [];
    return groupsStore.getSessionSystemPromptChain(session.value.id);
});

/**
 * 是否显示空态(没有真实消息也没有继承提示)。
 */
const showEmptyHint = computed(() => {
    return realMessages.value.length === 0
        && inheritedPrompts.value.length === 0;
});

/**
 * 本组件正在挂载流式组件所对应的会话 id。
 * 当 pendingStreamSessionId 出现 → 把它复制到这里 → 渲染流式组件;
 * StreamingAssistantMessage 完成 / 失败时 emit('finish'),清空这里。
 *
 * 这样 chatStore 的信号只用一次,不影响后续生命周期。
 *
 * @type {import('vue').Ref<string | null>}
 */
const activeStreamingSessionId = ref(null);

/**
 * 当 chatStore 发出 pendingStreamSessionId 信号时,接管它。
 */
watch(() => chatStore.pendingStreamSessionId, (newSessionId) => {
    if (newSessionId) {
        activeStreamingSessionId.value = newSessionId;
        chatStore.consumePendingStream();
    }
});

/**
 * 是否应该挂载流式组件:本会话有 activeStreamingSessionId 时挂载。
 */
const shouldShowStreaming = computed(() => {
    if (!session.value) return false;
    return activeStreamingSessionId.value === session.value.id;
});

/**
 * 流式完成后:清掉 activeStreamingSessionId,组件自然卸载。
 *
 * @returns {void}
 */
function onStreamFinish() {
    activeStreamingSessionId.value = null;
}

/**
 * 把消息列表滚动容器滚到最底部。
 *
 * @returns {void}
 */
function scrollToBottom() {
    const scroller = listRef.value;
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
}

/**
 * 切换到新会话时,等 DOM 渲染完成后滚到底部,
 * 让用户从对话的最新位置开始浏览。
 *
 * 用 immediate: true 处理"首次挂载就有 currentSessionId"的情况
 * (例如刷新页面时恢复上次会话)。
 */
watch(
    () => chatStore.currentSessionId,
    async () => {
        await nextTick();
        // 再等一帧,确保 Markdown / 思考块等异步渲染也已布局完成。
        requestAnimationFrame(() => {
            scrollToBottom();
        });
    },
    { immediate: true },
);
</script>

<template>
    <div ref="listRef" id="message-list" class="message-list">
        <InheritedSystemMessage
            v-for="prompt in inheritedPrompts"
            :key="`inherited-${prompt.type}-${prompt.id}`"
            :prompt="prompt"
        />

        <MessageRow
            v-for="message in realMessages"
            :key="message.id"
            :message="message"
            :session-id="session.id"
        />

        <!-- 流式期间挂载一条流式消息,完成后自动消失 -->
        <StreamingAssistantMessage
            v-if="shouldShowStreaming"
            :session-id="session.id"
            @finish="onStreamFinish"
        />

        <EmptyHint v-if="showEmptyHint && !shouldShowStreaming" />
    </div>
</template>

<style scoped>
.message-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 0 var(--space-4);
    display: flex;
    flex-direction: column;
    gap: 0;
    position: relative;
}

/* 滚动条:平时透明,hover 显示 */
.message-list::-webkit-scrollbar { width: 6px; }
.message-list::-webkit-scrollbar-track { background: transparent; }
.message-list::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 99px;
    transition: background var(--transition-fast);
}
.message-list:hover::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
}
.message-list:hover::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-thumb-hover);
}
.message-list {
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
}
.message-list:hover {
    scrollbar-color: var(--scrollbar-thumb) transparent;
}
</style>
