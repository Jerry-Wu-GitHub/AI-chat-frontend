<script setup>
/**
 * @file src/App.vue
 * 根组件。承担三件事:
 *   1. 渲染三栏布局骨架(侧边栏 / 聊天区 / 预览面板)及其分界条。
 *   2. 渲染全局浮层(Toast / Modal / SettingsPanel / ConflictModal)。
 *   3. 业务级初始化(默认服务、模型列表、数据迁移、恢复会话)。
 *   4. 监听消息列表宽度:当消息气泡被压缩时自动折叠侧边栏。
 */

import { onMounted, onBeforeUnmount, watch } from 'vue';

import TheSidebar    from '@/components/sidebar/TheSidebar.vue';
import ChatArea      from '@/components/chat/ChatArea.vue';
import PreviewPanel  from '@/components/preview/PreviewPanel.vue';
import ResizerBar    from '@/components/common/ResizerBar.vue';
import ToastContainer from '@/components/common/ToastContainer.vue';
import BaseModal     from '@/components/common/BaseModal.vue';
import SettingsPanel from '@/components/settings/SettingsPanel.vue';
import ConflictModal from '@/components/import-export/ConflictModal.vue';

import { useServicesStore } from '@/stores/services.js';
import { useModelsStore }   from '@/stores/models.js';
import { useSessionsStore } from '@/stores/sessions.js';
import { useChatStore }     from '@/stores/chat.js';
import { useGroupsStore }   from '@/stores/groups.js';
import { useToast }         from '@/composables/useToast.js';
import { usePrefsStore }    from '@/stores/prefs.js';

const servicesStore = useServicesStore();
const modelsStore   = useModelsStore();
const sessionsStore = useSessionsStore();
const groupsStore   = useGroupsStore();
const chatStore     = useChatStore();
const { showToast } = useToast();
const prefsStore    = usePrefsStore();

/**
 * 业务级初始化。
 *
 * 顺序与并发:
 *   1. 同步运行数据迁移(本地操作,瞬时)。
 *   2. 同步恢复上次会话 → 消息立即开始渲染。
 *   3. 后台并行:确保默认服务 → 加载模型列表;
 *      这两步不阻塞会话渲染,只影响"模型选择器何时显示模型"。
 *
 * @returns {Promise<void>}
 */
async function initializeApplication() {
    // 1. 数据迁移:同步、瞬时,先做完。
    groupsStore.runMigration();

    // 2. 立即恢复上次会话或新建,让消息开始渲染。
    const allSessions = sessionsStore.allSessions;
    if (allSessions.length > 0) {
        chatStore.switchToSession(allSessions[0].id);
    } else {
        chatStore.createAndSwitchSession();
    }

    // 3. 后台并行处理服务和模型,不 await。
    //    这里不能直接 .catch 后什么都不做,
    //    封一个独立函数让错误处理也清晰。
    loadServicesAndModelsInBackground();
}

/**
 * 后台串行执行"确保默认服务 → 加载模型列表"。
 * 与会话渲染并行运行,出错时弹 toast 但不影响主流程。
 *
 * @returns {Promise<void>}
 */
async function loadServicesAndModelsInBackground() {
    try {
        await servicesStore.ensureDefaultService();
    } catch (serviceError) {
        showToast('获取默认服务失败,请在设置中手动添加', 'error');
        console.warn('ensureDefaultService failed:', serviceError);
    }

    try {
        await modelsStore.loadAllModels();
    } catch (modelError) {
        showToast('加载模型列表失败', 'error');
        console.warn('loadAllModels failed:', modelError);
    }
}


/**
 * 当模型列表从空变成非空(后台加载完成)时,如果当前会话记着一个模型名,
 * 尝试切到那个模型。让"刷新页面后自动选中上次用的模型"在异步加载完成
 * 后也能生效。
 */
watch(
    () => modelsStore.models.length,
    (modelCount, previousCount) => {
        if (modelCount > 0 && previousCount === 0) {
            const session = chatStore.currentSession;
            if (session?.model) {
                modelsStore.selectModel(session.model);
            }
        }
    },
);


/* ============================================================
   自动折叠侧边栏(当消息列表宽度不足以完整展示气泡时)
   ============================================================ */

/**
 * 消息气泡(.message-wrapper)的最大宽度 780px,加上左右各 20px 内边距,
 * 总共 820px。当 .message-list 的可用宽度 < 此值时,气泡就开始被压缩。
 */
const BUBBLE_FULL_WIDTH_PX = 780 + 20 * 2;

/**
 * 用户手动展开侧边栏后,需要给布局一段宽限期完成过渡。
 * 在这段时间内,ResizeObserver 触发的"侧边栏占走宽度导致变窄"不算用户意图,
 * 不要因此把侧边栏折叠回去。
 */
const SIDEBAR_OPEN_GRACE_PERIOD_MS = 500;

/** @type {ResizeObserver | null} */
let messageListResizeObserver = null;

/**
 * 上一次观察到的"消息列表是否足够宽"的状态。
 * 用来判断"从够宽变到不够宽"的瞬间(只在这一刻折叠侧边栏)。
 *
 * @type {boolean | null}
 */
let wasMessageListWideEnough = null;

/**
 * 用户最近一次手动展开侧边栏的时间戳(ms)。
 * 用来识别"宽度变化是侧边栏展开引起的副作用",在此期间忽略折叠逻辑。
 */
let lastSidebarOpenTimestamp = 0;

/**
 * 处理 #message-list 的尺寸变化。
 *
 * 折叠规则:
 *   - 仅当"上次够宽 → 这次不够宽 + 侧边栏当前展开 + 不在展开宽限期内"才折叠。
 *   - 任何其它情况都只更新本地状态,不触发折叠。
 *
 * @param {number} currentWidth 当前消息列表的可视宽度(像素)
 * @returns {void}
 */
function handleMessageListWidthChange(currentWidth) {
    const isWideEnough = currentWidth >= BUBBLE_FULL_WIDTH_PX;

    const isInOpenGracePeriod =
        Date.now() - lastSidebarOpenTimestamp < SIDEBAR_OPEN_GRACE_PERIOD_MS;

    if (wasMessageListWideEnough === null) {
        wasMessageListWideEnough = isWideEnough;
        // 首次观察:若一开始就不够宽且侧边栏开着,直接折叠(此时不会处于宽限期)。
        if (!isWideEnough && prefsStore.preferences.sidebarOpen && !isInOpenGracePeriod) {
            prefsStore.updatePreferences({ sidebarOpen: false });
        }
        return;
    }

    if (
        wasMessageListWideEnough === true
        && isWideEnough === false
        && prefsStore.preferences.sidebarOpen
        && !isInOpenGracePeriod
    ) {
        prefsStore.updatePreferences({ sidebarOpen: false });
    }

    wasMessageListWideEnough = isWideEnough;
}

/**
 * 监听消息列表的尺寸变化。
 *
 * 用 requestAnimationFrame 包一层回调,避免在同一帧内同步改 store
 * 引发布局回流,从而触发浏览器的
 * "ResizeObserver loop completed with undelivered notifications" 警告。
 *
 * @returns {void}
 */
function startObservingMessageListWidth() {
    if (typeof ResizeObserver === 'undefined') return;

    /** 防止同一帧重复调度。 */
    let isFrameScheduled = false;
    /** 最近一次观察到的宽度,在 rAF 回调里读取。 */
    let latestObservedWidth = 0;

    const tryAttach = () => {
        const element = document.getElementById('message-list');
        if (!element) {
            requestAnimationFrame(tryAttach);
            return;
        }

        messageListResizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                latestObservedWidth = entry.contentRect.width;
            }
            if (isFrameScheduled) return;
            isFrameScheduled = true;
            requestAnimationFrame(() => {
                isFrameScheduled = false;
                handleMessageListWidthChange(latestObservedWidth);
            });
        });
        messageListResizeObserver.observe(element);
    };

    tryAttach();
}

/**
 * 监听用户对 sidebarOpen 的修改:在它由 false 变 true 时记下时间戳,
 * 让随后的 resize 通知在宽限期内被忽略。
 */
watch(
    () => prefsStore.preferences.sidebarOpen,
    (isOpen, wasOpen) => {
        if (isOpen && !wasOpen) {
            lastSidebarOpenTimestamp = Date.now();
        }
    },
);

onMounted(() => {
    initializeApplication();
    startObservingMessageListWidth();
});

onBeforeUnmount(() => {
    messageListResizeObserver?.disconnect();
    messageListResizeObserver = null;
});

/**
 * 预览面板可拖动的上限。
 *
 * 窗口宽度 − 侧边栏当前宽度 − 聊天区最小宽度 − 两根分界条预留 − 一点余量。
 * 这样用户可以一直拖到撞上侧边栏(留给聊天区一个最低可用宽度)。
 *
 * @returns {number}
 */
function computePreviewMaxWidth() {
    const sidebar = document.getElementById('the-sidebar');
    const sidebarWidth = sidebar ? sidebar.getBoundingClientRect().width : 0;

    const chatAreaMinWidth = 200;   // 聊天区至少保留这么多
    const resizerBarsTotal = 16;    // 两根分界条命中区域大约各 8px

    return Math.max(
        260,
        window.innerWidth - sidebarWidth - chatAreaMinWidth - resizerBarsTotal,
    );
}

</script>

<template>
    <div id="app-root">
        <TheSidebar />

        <ResizerBar
            kind="sidebar"
            :min-width="180"
            :max-width="480"
            storage-key="ai_chat_sidebar_width"
        />

        <ChatArea />

        <ResizerBar
            kind="preview"
            :min-width="200"
            :max-width="computePreviewMaxWidth"
            storage-key="ai_chat_preview_width"
        />

        <PreviewPanel />

        <BaseModal />
        <SettingsPanel />
        <ConflictModal />
        <ToastContainer />
    </div>
</template>

<style scoped>
#app-root {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    position: relative;
}
</style>
