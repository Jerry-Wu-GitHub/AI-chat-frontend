/**
 * @file src/stores/chat.js
 * 聊天总控 store。
 *
 * 维护当前会话 id、流式状态、待发送的文件列表,以及"系统提示输入模式"
 * 这种跨组件的 UI 状态。它本身基本不存数据,主要把多个 store
 * 的操作组合成业务级动作(切换会话、新建会话、发送消息后置顶等)。
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

import { useSessionsStore } from './sessions.js';
import { useGroupsStore, ROOT_GROUP_ID } from './groups.js';
import { useModelsStore } from './models.js';

export const useChatStore = defineStore('chat', () => {
    /** 当前激活的会话 id。 */
    const currentSessionId = ref(/** @type {string|null} */ (null));

    /** 是否正在流式接收 AI 回复。 */
    const isStreaming = ref(false);

    /** 当前流式请求的 AbortController,用于中断。 */
    let abortController = /** @type {AbortController|null} */ (null);

    /**
     * 待发送的文件列表(已上传完成、等待随下一条用户消息发送)。
     * @type {import('vue').Ref<import('./sessions.js').FileRef[]>}
     */
    const pendingFiles = ref([]);

    /**
     * 是否处于"系统提示输入"模式。
     * 开启后,点击发送会把输入内容作为 system 消息插入而非触发 AI 回复。
     */
    const isSystemPromptMode = ref(false);

    /** 当前会话对象。 */
    const currentSession = computed(() => {
        if (!currentSessionId.value) return null;
        return useSessionsStore().findSessionById(currentSessionId.value);
    });

    /** 待启动流式的会话 id。MessageList 监听它来挂载 StreamingAssistantMessage。 */
    const pendingStreamSessionId = ref(/** @type {string|null} */ (null));


    /* ============================================================
       会话切换 / 新建
       ============================================================ */

    /**
     * 切换到指定会话。会中断进行中的流,并在选中模型存在时同步到 models store。
     *
     * @param {string} sessionId
     * @returns {void}
     */
    function switchToSession(sessionId) {
        if (isStreaming.value) {
            abortController?.abort();
            isStreaming.value = false;
        }

        currentSessionId.value = sessionId;

        const session = useSessionsStore().findSessionById(sessionId);
        if (session?.model) {
            useModelsStore().selectModel(session.model);
        }
    }

    /**
     * 在指定父组下新建一个空会话并切到它。
     * 如果该组下已经有一个空的"未命名会话",直接复用而不重复创建。
     *
     * @param {string} [parentGroupId=ROOT_GROUP_ID]
     * @returns {void}
     */
    function createAndSwitchSession(parentGroupId = ROOT_GROUP_ID) {
        const sessionsStore = useSessionsStore();
        const groupsStore   = useGroupsStore();

        // 复用已有的空未命名会话(避免列表里堆一堆空会话)。
        const children = groupsStore.getGroupChildren(parentGroupId);
        const reusableEmpty = children.find(child => {
            if (child.type !== 'session') return false;
            const session = sessionsStore.findSessionById(child.id);
            return session
                && session.title === '未命名会话'
                && session.messages.length === 0;
        });

        if (reusableEmpty) {
            groupsStore.moveSessionToTopOfItsGroup(reusableEmpty.id);
            sessionsStore.moveSessionToTop(reusableEmpty.id);
            switchToSession(reusableEmpty.id);
            return;
        }

        const newSession = sessionsStore.createSession({ parentGroupId });

        // 把会话挂到父组的 childIds 最前面。
        const parentGroup = groupsStore.findGroupById(parentGroupId);
        if (parentGroup && !parentGroup.childIds.includes(newSession.id)) {
            parentGroup.childIds.unshift(newSession.id);
        }

        switchToSession(newSession.id);
    }

    /**
     * 删除当前会话(由侧边栏菜单触发后的善后)。
     * 删除后:有别的会话就切第一个,否则新建一个。
     *
     * @param {string} sessionId
     * @returns {void}
     */
    function deleteSessionAndPickNext(sessionId) {
        const sessionsStore = useSessionsStore();
        const groupsStore   = useGroupsStore();

        // 先从父组的 childIds 中移除。
        for (const group of groupsStore.allGroups) {
            const childIndex = group.childIds.indexOf(sessionId);
            if (childIndex !== -1) {
                group.childIds.splice(childIndex, 1);
                break;
            }
        }
        sessionsStore.deleteSession(sessionId);

        // 如果删的是当前会话,挑一个新的或新建。
        if (currentSessionId.value === sessionId) {
            const remaining = sessionsStore.allSessions;
            if (remaining.length > 0) {
                switchToSession(remaining[0].id);
            } else {
                createAndSwitchSession(ROOT_GROUP_ID);
            }
        }
    }


    /* ============================================================
       流式状态管理(供 useChatStream composable 调用)
       ============================================================ */

    /**
     * 开始流式请求,创建并返回 AbortController。
     *
     * @returns {AbortController}
     */
    function beginStreaming() {
        abortController = new AbortController();
        isStreaming.value = true;
        return abortController;
    }

    /**
     * 结束流式请求(无论是正常完成、出错还是被中断都调用)。
     *
     * @returns {void}
     */
    function endStreaming() {
        abortController = null;
        isStreaming.value = false;
    }

    /**
     * 主动中断当前流式请求。
     *
     * @returns {void}
     */
    function abortStreaming() {
        abortController?.abort();
        abortController = null;
        isStreaming.value = false;
    }

    /**
     * 请求对指定会话启动一次流式回复。
     * MessageList 会在下一帧挂载 StreamingAssistantMessage 来真正发起请求。
     *
     * @param {string} sessionId
     * @returns {void}
     */
    function requestStream(sessionId) {
        pendingStreamSessionId.value = sessionId;
    }

    /**
     * 清除流式启动信号。StreamingAssistantMessage 在 onMounted 接管后调用,
     * 防止重复触发。
     *
     * @returns {void}
     */
    function consumePendingStream() {
        pendingStreamSessionId.value = null;
    }


    /* ============================================================
       待发送文件管理
       ============================================================ */

    /**
     * 添加一个已上传完成的文件到待发送列表。
     *
     * @param {import('./sessions.js').FileRef} fileRef
     * @returns {void}
     */
    function addPendingFile(fileRef) {
        pendingFiles.value = [...pendingFiles.value, fileRef];
    }

    /**
     * 按索引移除待发送文件。
     *
     * @param {number} index
     * @returns {void}
     */
    function removePendingFileAt(index) {
        const next = [...pendingFiles.value];
        next.splice(index, 1);
        pendingFiles.value = next;
    }

    /**
     * 清空待发送文件(发送成功后调用)。
     *
     * @returns {void}
     */
    function clearPendingFiles() {
        pendingFiles.value = [];
    }

    /**
     * 添加一个"占位"待发送文件(用于上传中显示进度)。
     * 返回一个临时 id,供后续 replacePendingFile / removePendingFile 使用。
     *
     * @param {{ name: string, size: number, mediaType: string }} placeholderInfo
     * @returns {string} 临时 id
     */
    function addPendingPlaceholder(placeholderInfo) {
        const placeholderId = `placeholder-${crypto.randomUUID()}`;
        pendingFiles.value = [
            ...pendingFiles.value,
            {
                ...placeholderInfo,
                url: '',
                isImage: false,
                uploading: true,
                placeholderId,
            },
        ];
        return placeholderId;
    }

    /**
     * 把占位 chip 替换为真实的 FileRef(上传成功时调用)。
     *
     * @param {string} placeholderId
     * @param {import('./sessions.js').FileRef} fileRef
     * @returns {void}
     */
    function replacePendingPlaceholder(placeholderId, fileRef) {
        pendingFiles.value = pendingFiles.value.map(item =>
            item.placeholderId === placeholderId ? fileRef : item,
        );
    }

    /**
     * 按占位 id 移除一个上传中占位(上传失败时调用)。
     *
     * @param {string} placeholderId
     * @returns {void}
     */
    function removePendingPlaceholder(placeholderId) {
        pendingFiles.value = pendingFiles.value.filter(
            item => item.placeholderId !== placeholderId,
        );
    }


    /* ============================================================
       系统提示输入模式
       ============================================================ */

    /**
     * 设置系统提示输入模式。
     *
     * @param {boolean} enabled
     * @returns {void}
     */
    function setSystemPromptMode(enabled) {
        isSystemPromptMode.value = Boolean(enabled);
    }

    return {
        // state
        currentSessionId,
        isStreaming,
        pendingFiles,
        isSystemPromptMode,
        pendingStreamSessionId,

        // getters
        currentSession,

        // 会话切换
        switchToSession,
        createAndSwitchSession,
        deleteSessionAndPickNext,

        // 流式
        beginStreaming,
        endStreaming,
        abortStreaming,
        requestStream,
        consumePendingStream,

        // 待发送文件
        addPendingFile,
        removePendingFileAt,
        clearPendingFiles,
        addPendingPlaceholder,
        replacePendingPlaceholder,
        removePendingPlaceholder,

        // 系统提示模式
        setSystemPromptMode,
    };
});
