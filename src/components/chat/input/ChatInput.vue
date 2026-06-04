<script setup>
/**
 * @file src/components/chat/input/ChatInput.vue
 * 底部输入区。整合:
 *   - 待发送附件预览
 *   - 自动伸缩 textarea
 *   - 工具按钮行(InputControls)
 *   - 发送 / 系统提示添加(两种模式)
 *   - 快捷键发送(由 prefs.sendShortcut 决定)
 *   - 鼠标移开自动收起工具栏(由 prefs.autoCollapseControls 决定)
 *
 * 发送流程:
 *   1. 写入用户(或 system)消息到 sessions store
 *   2. 把会话置顶(sessions 列表 + 所属组的 childIds)
 *   3. 清空输入
 *   4. 普通模式下:调用 chatStore.requestStream() 让 MessageList 挂载流式组件
 */

import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

import BaseTextarea from '@/components/common/BaseTextarea.vue';
import PendingFiles from './PendingFiles.vue';
import InputControls from './InputControls.vue';

import { useModelsStore }   from '@/stores/models.js';
import { useChatStore }     from '@/stores/chat.js';
import { useSessionsStore } from '@/stores/sessions.js';
import { useGroupsStore }   from '@/stores/groups.js';
import { usePrefsStore }    from '@/stores/prefs.js';
import { useToast }         from '@/composables/useToast.js';

const modelsStore   = useModelsStore();
const chatStore     = useChatStore();
const sessionsStore = useSessionsStore();
const groupsStore   = useGroupsStore();
const prefsStore    = usePrefsStore();
const { showToast } = useToast();

const inputText = ref('');

/** @type {import('vue').Ref<InstanceType<typeof BaseTextarea> | null>} */
const textareaRef = ref(null);

/** @type {import('vue').Ref<HTMLElement | null>} */
const areaRef = ref(null);

/* ============================================================
   工具栏 hover 展开 / 收起
   ============================================================ */

/** 是否手动强制展开(输入框聚焦或有内容时)。 */
const isMouseNearby = ref(false);
/** @type {ReturnType<typeof setTimeout> | null} */
let hideTimerId = null;

/** 工具栏是否展开。 */
const controlsVisible = computed(() => {
    if (!prefsStore.preferences.autoCollapseControls) return true;
    if (inputText.value.trim().length > 0) return true;
    return isMouseNearby.value;
});

/**
 * 鼠标移动:计算到输入区的距离,在 72px 内视为"靠近"。
 *
 * @param {MouseEvent} event
 * @returns {void}
 */
function onDocumentMouseMove(event) {
    if (!areaRef.value) return;
    const rect = areaRef.value.getBoundingClientRect();
    const dx = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right);
    const dy = Math.max(rect.top  - event.clientY, 0, event.clientY - rect.bottom);
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= 72) {
        if (hideTimerId !== null) {
            clearTimeout(hideTimerId);
            hideTimerId = null;
        }
        isMouseNearby.value = true;
    } else if (isMouseNearby.value) {
        if (hideTimerId === null) {
            hideTimerId = setTimeout(() => {
                isMouseNearby.value = false;
                hideTimerId = null;
            }, 200);
        }
    }
}

onMounted(() => {
    document.addEventListener('mousemove', onDocumentMouseMove);
});

onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onDocumentMouseMove);
    if (hideTimerId !== null) clearTimeout(hideTimerId);
});

/* ============================================================
   占位文本和样式跟随系统提示模式变化
   ============================================================ */

const placeholderText = computed(() => {
    return chatStore.isSystemPromptMode ? '添加系统提示词...' : '发消息...';
});

/* ============================================================
   键盘发送
   ============================================================ */

/**
 * 根据 prefs.sendShortcut 判断按键是否触发发送。
 *
 * @param {KeyboardEvent} event
 * @returns {boolean}
 */
function shouldSendByShortcut(event) {
    if (event.key !== 'Enter') return false;
    const shortcut = prefsStore.preferences.sendShortcut;

    if (shortcut === 'enter') {
        return !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;
    }
    if (shortcut === 'ctrl-enter') {
        return event.ctrlKey && !event.shiftKey && !event.metaKey && !event.altKey;
    }
    if (shortcut === 'shift-enter') {
        return event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey;
    }
    return false;
}

/**
 * @param {KeyboardEvent} event
 * @returns {void}
 */
function onKeyDown(event) {
    if (!shouldSendByShortcut(event)) return;
    event.preventDefault();
    onSend();
}

/* ============================================================
   发送
   ============================================================ */

/**
 * 主发送动作。根据系统提示模式分流。
 *
 * @returns {void}
 */
function onSend() {
    if (chatStore.isStreaming) return;
    if (!chatStore.currentSessionId) return;

    if (chatStore.isSystemPromptMode) {
        addSystemPromptMessage();
    } else {
        sendUserMessage();
    }
}

/**
 * 发送普通用户消息并触发 AI 回复。
 *
 * @returns {void}
 */
function sendUserMessage() {
    if (!modelsStore.selectedModelId) {
        showToast('请先选择模型', 'error');
        return;
    }

    const text = inputText.value.trim();
    if (!text && chatStore.pendingFiles.length === 0) return;

    const sessionId = chatStore.currentSessionId;

    /** @type {import('@/stores/sessions.js').Message} */
    const userMessage = {
        id:        crypto.randomUUID(),
        role:      'user',
        content:   text,
        files:     chatStore.pendingFiles.length > 0 ? [...chatStore.pendingFiles] : undefined,
        createdAt: Date.now(),
    };

    // 第一条消息时,把文本作为会话标题
    const session = sessionsStore.findSessionById(sessionId);
    if (session && session.messages.length === 0 && text) {
        sessionsStore.updateSession(sessionId, { title: text.slice(0, 60) });
    }

    sessionsStore.addMessage(sessionId, userMessage);
    groupsStore.moveSessionToTopOfItsGroup(sessionId);
    sessionsStore.moveSessionToTop(sessionId);

    clearComposer();

    // 让 MessageList 挂载 StreamingAssistantMessage 真正发起请求
    chatStore.requestStream(sessionId);
}

/**
 * 把输入内容作为 system 消息追加(不触发 AI 回复)。
 *
 * @returns {void}
 */
function addSystemPromptMessage() {
    const text = inputText.value.trim();
    if (!text) return;
    if (chatStore.pendingFiles.length > 0) {
        showToast('系统提示词不支持附件,请先移除待发送文件', 'info');
        return;
    }

    const sessionId = chatStore.currentSessionId;

    /** @type {import('@/stores/sessions.js').Message} */
    const systemMessage = {
        id:        crypto.randomUUID(),
        role:      'system',
        content:   text,
        createdAt: Date.now(),
    };

    const session = sessionsStore.findSessionById(sessionId);
    if (session && session.messages.length === 0) {
        sessionsStore.updateSession(sessionId, {
            title: `系统提示:${text.slice(0, 52)}`,
        });
    }

    sessionsStore.addMessage(sessionId, systemMessage);
    groupsStore.moveSessionToTopOfItsGroup(sessionId);
    sessionsStore.moveSessionToTop(sessionId);

    clearComposer();
    showToast('已添加系统提示词', 'success', 1600);
}

/**
 * 清空输入文本和待发送文件。
 *
 * @returns {void}
 */
function clearComposer() {
    inputText.value = '';
    chatStore.clearPendingFiles();
    textareaRef.value?.resize();
}

/**
 * 切换会话时,如果之前停留在系统提示模式,自动复位。
 */
watch(() => chatStore.currentSessionId, () => {
    chatStore.setSystemPromptMode(false);
});
</script>

<template>
    <div
        ref="areaRef"
        class="chat-input"
        :class="{ 'chat-input--system-mode': chatStore.isSystemPromptMode }"
    >
        <PendingFiles />

        <div class="chat-input__textarea-wrapper">
            <BaseTextarea
                ref="textareaRef"
                v-model="inputText"
                :placeholder="placeholderText"
                :max-height="280"
                :min-height="96"
                class="chat-input__textarea"
                @keydown="onKeyDown"
            />
        </div>

        <InputControls
            :visible="controlsVisible"
            :has-input-text="inputText.trim().length > 0"
            @send="onSend"
        />
    </div>
</template>

<style scoped>
.chat-input {
    flex-shrink: 0;
    padding: var(--space-3) var(--space-4) var(--space-4);
    position: relative;
}

.chat-input__textarea-wrapper {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    transition: border var(--transition-fast), box-shadow var(--transition-fast);
    overflow: hidden;
}

.chat-input__textarea-wrapper:focus-within {
    border-color: var(--border-strong);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 10%, transparent),
                var(--shadow-sm);
}

/* 系统提示模式下整体强调主题色 */
.chat-input--system-mode .chat-input__textarea-wrapper {
    border-color: color-mix(in srgb, var(--accent) 62%, var(--border));
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent);
}

.chat-input--system-mode .chat-input__textarea :deep(.base-textarea)::placeholder {
    color: color-mix(in srgb, var(--accent) 72%, var(--text-muted));
}
</style>
