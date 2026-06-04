/**
 * @file src/stores/sessions.js
 * 会话(Session)store。
 *
 * 负责会话本身的 CRUD 以及会话内消息的增删改。组与会话的拓扑关系
 * 由 groups store 负责;本 store 只通过 parentGroupId 记录自己挂在哪。
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

import { readPersistedJson, attachAutoPersist } from './_persist.js';

const STORAGE_KEY = 'ai_chat_sessions';

/**
 * @typedef {object} FileRef
 * @property {string}  name
 * @property {number}  size
 * @property {string}  mediaType
 * @property {string}  url
 * @property {boolean} isImage
 */

/**
 * @typedef {object} Message
 * @property {string}   id
 * @property {'user'|'assistant'|'system'} role
 * @property {string}   content
 * @property {FileRef[]} [files]
 * @property {string}   [reasoning]
 * @property {string}   [model]
 * @property {number}   createdAt
 */

/**
 * @typedef {object} Session
 * @property {string}    id
 * @property {string}    title
 * @property {string}    systemPrompt
 * @property {string}    model
 * @property {string}    parentGroupId
 * @property {number}    createdAt
 * @property {number}    updatedAt
 * @property {Message[]} messages
 */

const VALID_MESSAGE_ROLES = new Set(['user', 'assistant', 'system']);

export const useSessionsStore = defineStore('sessions', () => {
    /** @type {import('vue').Ref<Session[]>} */
    const sessions = ref(readPersistedJson(STORAGE_KEY, []));

    attachAutoPersist(STORAGE_KEY, sessions);

    /** 所有会话列表(只读使用)。 */
    const allSessions = computed(() => sessions.value);

    /**
     * 按 id 查找会话。
     *
     * @param {string} sessionId
     * @returns {Session | null}
     */
    function findSessionById(sessionId) {
        return sessions.value.find(session => session.id === sessionId) || null;
    }

    /**
     * 获取一条消息所属的模型名:
     * 优先使用消息自带的 model 字段;否则回退到会话默认 model。
     *
     * @param {Message} message
     * @param {Session | null} session
     * @returns {string}
     */
    function getMessageModelName(message, session) {
        if (message?.model) return message.model;
        return session?.model || '';
    }

    /* ============================================================
       会话 CRUD
       ============================================================ */

    /**
     * 新建会话。会被推入列表最前面,但不会自动挂到任何组的 childIds 上,
     * 调用方(通常是 chat store)负责把 id 注册到目标组的 childIds。
     *
     * @param {Partial<Session>} overrides
     * @returns {Session} 新建的会话
     */
    function createSession(overrides = {}) {
        const now = Date.now();
        const newSession = {
            id:            crypto.randomUUID(),
            title:         '未命名会话',
            systemPrompt:  '',
            model:         '',
            parentGroupId: '__root__',
            createdAt:     now,
            updatedAt:     now,
            messages:      [],
            ...overrides,
        };
        sessions.value.unshift(newSession);
        return newSession;
    }

    /**
     * 部分更新会话字段,同时刷新 updatedAt。
     *
     * @param {string} sessionId
     * @param {Partial<Session>} patch
     * @returns {void}
     */
    function updateSession(sessionId, patch) {
        const index = sessions.value.findIndex(session => session.id === sessionId);
        if (index === -1) return;
        sessions.value[index] = {
            ...sessions.value[index],
            ...patch,
            updatedAt: Date.now(),
        };
    }

    /**
     * 同 updateSession,但不更新 updatedAt。
     * 仅供数据迁移等"非用户行为"使用,避免污染侧边栏排序。
     *
     * @param {string} sessionId
     * @param {Partial<Session>} patch
     * @returns {void}
     */
    function updateSessionSilently(sessionId, patch) {
        const index = sessions.value.findIndex(session => session.id === sessionId);
        if (index === -1) return;
        sessions.value[index] = { ...sessions.value[index], ...patch };
    }

    /**
     * 删除单个会话。注意:这里不维护 groups 的 childIds,
     * 调用方(通常是 chat store)应负责相应清理。
     *
     * @param {string} sessionId
     * @returns {void}
     */
    function deleteSession(sessionId) {
        sessions.value = sessions.value.filter(session => session.id !== sessionId);
    }

    /**
     * 批量删除会话。groups store 在删除一个组时会用到。
     *
     * @param {string[]} sessionIds
     * @returns {void}
     */
    function deleteSessionsByIds(sessionIds) {
        if (sessionIds.length === 0) return;
        const idSet = new Set(sessionIds);
        sessions.value = sessions.value.filter(session => !idSet.has(session.id));
    }

    /**
     * 把指定会话提到 sessions 数组的最前面,并刷新 updatedAt。
     * (groups store 的 moveSessionToTopOfItsGroup 也会同步更新组内顺序。)
     *
     * @param {string} sessionId
     * @returns {void}
     */
    function moveSessionToTop(sessionId) {
        const index = sessions.value.findIndex(session => session.id === sessionId);
        if (index === -1) return;
        const now = Date.now();
        sessions.value[index].updatedAt = now;
        if (index > 0) {
            const [moved] = sessions.value.splice(index, 1);
            sessions.value.unshift(moved);
        }
    }

    /* ============================================================
       消息 CRUD
       ============================================================ */

    /**
     * 向会话追加一条消息。
     *
     * @param {string}  sessionId
     * @param {Message} message
     * @returns {void}
     */
    function addMessage(sessionId, message) {
        const session = findSessionById(sessionId);
        if (!session) return;
        session.messages.push(message);
        session.updatedAt = Date.now();
    }

    /**
     * 部分更新指定消息。
     *
     * @param {string} sessionId
     * @param {string} messageId
     * @param {Partial<Message>} patch
     * @returns {void}
     */
    function updateMessage(sessionId, messageId, patch) {
        const session = findSessionById(sessionId);
        if (!session) return;
        const messageIndex = session.messages.findIndex(message => message.id === messageId);
        if (messageIndex === -1) return;
        session.messages[messageIndex] = {
            ...session.messages[messageIndex],
            ...patch,
        };
        session.updatedAt = Date.now();
    }

    /**
     * 截断会话:从某条消息起,删除它及之后的所有消息(可选是否包含它自身)。
     *
     * @param {string}  sessionId
     * @param {string}  fromMessageId
     * @param {boolean} [includeFromMessage=true] true=连同该消息一起删
     * @returns {void}
     */
    function truncateMessagesFrom(sessionId, fromMessageId, includeFromMessage = true) {
        const session = findSessionById(sessionId);
        if (!session) return;
        const messageIndex = session.messages.findIndex(message => message.id === fromMessageId);
        if (messageIndex === -1) return;
        session.messages = session.messages.slice(
            0,
            includeFromMessage ? messageIndex : messageIndex + 1,
        );
        session.updatedAt = Date.now();
    }

    /**
     * 删除单条消息(不影响其它消息)。
     *
     * @param {string} sessionId
     * @param {string} messageId
     * @returns {void}
     */
    function deleteMessage(sessionId, messageId) {
        const session = findSessionById(sessionId);
        if (!session) return;
        session.messages = session.messages.filter(message => message.id !== messageId);
        session.updatedAt = Date.now();
    }

    /**
     * 规范化某会话的消息数组:补 createdAt、过滤非法 role 等。
     * 数据迁移用,幂等。
     *
     * @param {string} sessionId
     * @returns {void}
     */
    function normalizeSessionMessages(sessionId) {
        const session = findSessionById(sessionId);
        if (!session) return;

        if (!Array.isArray(session.messages)) {
            session.messages = [];
            return;
        }

        const normalized = [];
        for (const message of session.messages) {
            if (!message || typeof message !== 'object') continue;
            if (!message.id || !VALID_MESSAGE_ROLES.has(message.role)) continue;

            if (typeof message.content !== 'string') {
                message.content = String(message.content ?? '');
            }
            if (!message.createdAt) {
                message.createdAt = session.createdAt || Date.now();
            }
            normalized.push(message);
        }
        session.messages = normalized;
    }

    return {
        // state
        sessions,
        allSessions,

        // 查询
        findSessionById,
        getMessageModelName,

        // 会话 CRUD
        createSession,
        updateSession,
        updateSessionSilently,
        deleteSession,
        deleteSessionsByIds,
        moveSessionToTop,

        // 消息 CRUD
        addMessage,
        updateMessage,
        truncateMessagesFrom,
        deleteMessage,
        normalizeSessionMessages,
    };
});
