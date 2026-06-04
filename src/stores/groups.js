/**
 * @file src/stores/groups.js
 * 会话组(SessionGroup)store。
 *
 * 会话组是一棵以 ROOT_GROUP_ID 为根的树:
 *   - 每个组的 childIds 列表里可以混合放"子组 id"和"会话 id"。
 *   - 通过 parentId(组)/parentGroupId(会话)反向指回父节点。
 *
 * 组本身存于本 store(STORAGE_KEY_GROUPS);
 * 会话存于 sessions store。两者通过 childIds + parentGroupId 互相引用。
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

import { readPersistedJson, attachAutoPersist } from './_persist.js';
import { useSessionsStore } from './sessions.js';

/** 根组的固定 id。所有未指定父组的会话/组都挂在它下面。 */
export const ROOT_GROUP_ID = '__root__';

const STORAGE_KEY = 'ai_chat_groups';

/**
 * @typedef {object} SessionGroup
 * @property {string}      id           UUID 或 ROOT_GROUP_ID
 * @property {string}      name         显示名称
 * @property {string}      systemPrompt 该组生效的固定系统提示词
 * @property {string[]}    childIds     子项 id 列表(可以是组或会话)
 * @property {string|null} parentId     父组 id;根组为 null
 * @property {number}      createdAt    创建时间(ms)
 * @property {number}      lastActiveAt 最近活跃时间(ms),用于侧边栏排序
 */

/**
 * 构造根组对象。
 *
 * @returns {SessionGroup}
 */
function makeRootGroup() {
    const now = Date.now();
    return {
        id:           ROOT_GROUP_ID,
        name:         '全部会话',
        systemPrompt: '',
        childIds:     [],
        parentId:     null,
        createdAt:    now,
        lastActiveAt: now,
    };
}

export const useGroupsStore = defineStore('groups', () => {
    /** @type {import('vue').Ref<SessionGroup[]>} */
    const groups = ref(loadInitialGroups());

    attachAutoPersist(STORAGE_KEY, groups);

    /**
     * 初始化:确保根组始终存在。
     *
     * @returns {SessionGroup[]}
     */
    function loadInitialGroups() {
        const stored = readPersistedJson(STORAGE_KEY, []);
        if (!Array.isArray(stored) || stored.length === 0) {
            return [makeRootGroup()];
        }
        if (!stored.find(group => group.id === ROOT_GROUP_ID)) {
            stored.unshift(makeRootGroup());
        }
        return stored;
    }

    /** 所有组的列表(只读副本)。 */
    const allGroups = computed(() => groups.value);

    /* ============================================================
       基础查询
       ============================================================ */

    /**
     * 按 id 查找会话组。
     *
     * @param {string} groupId
     * @returns {SessionGroup | null}
     */
    function findGroupById(groupId) {
        return groups.value.find(group => group.id === groupId) || null;
    }

    /**
     * 获取从根组到指定组的祖先链(含自身,从外到内)。
     *
     * @param {string} groupId
     * @returns {SessionGroup[]}
     */
    function getGroupAncestors(groupId) {
        const chain = [];
        let cursor = groupId;
        while (cursor) {
            const group = findGroupById(cursor);
            if (!group) break;
            chain.unshift(group);
            if (!group.parentId) break;
            cursor = group.parentId;
        }
        return chain;
    }

    /**
     * 获取某个会话所属的完整祖先组链(从根到直接父组)。
     *
     * @param {string} sessionId
     * @returns {SessionGroup[]}
     */
    function getSessionAncestorGroups(sessionId) {
        const sessionsStore = useSessionsStore();
        const session = sessionsStore.findSessionById(sessionId);
        const parentId = session?.parentGroupId ?? ROOT_GROUP_ID;
        return getGroupAncestors(parentId);
    }

    /**
     * 获取某个会话生效的固定系统提示词条目列表。
     * 顺序:根组 → 中间祖先 → 直接父组 → 会话自身。
     * 只返回非空提示词。
     *
     * @param {string} sessionId
     * @returns {Array<{id:string, type:'group'|'session', name:string, content:string}>}
     */
    function getSessionSystemPromptChain(sessionId) {
        const sessionsStore = useSessionsStore();
        const session = sessionsStore.findSessionById(sessionId);
        if (!session) return [];

        const chain = [];

        for (const group of getSessionAncestorGroups(sessionId)) {
            const content = String(group.systemPrompt || '').trim();
            if (!content) continue;
            chain.push({
                id:      group.id,
                type:    'group',
                name:    group.id === ROOT_GROUP_ID ? '根节点' : group.name,
                content,
            });
        }

        const sessionPrompt = String(session.systemPrompt || '').trim();
        if (sessionPrompt) {
            chain.push({
                id:      session.id,
                type:    'session',
                name:    session.title || '当前会话',
                content: sessionPrompt,
            });
        }

        return chain;
    }

    /**
     * 获取指定组的直接子项,按 lastActiveAt / updatedAt 倒序排序。
     *
     * @param {string} groupId
     * @returns {Array<{id:string, type:'group'|'session', sortTimestamp:number}>}
     */
    function getGroupChildren(groupId) {
        const group = findGroupById(groupId);
        if (!group) return [];

        const sessionsStore = useSessionsStore();
        const items = [];

        for (const childId of group.childIds) {
            const childGroup = findGroupById(childId);
            if (childGroup) {
                items.push({
                    id:            childId,
                    type:          'group',
                    sortTimestamp: childGroup.lastActiveAt,
                });
                continue;
            }
            const childSession = sessionsStore.findSessionById(childId);
            if (childSession) {
                items.push({
                    id:            childId,
                    type:          'session',
                    sortTimestamp: childSession.updatedAt,
                });
            }
        }

        return items.sort((a, b) => b.sortTimestamp - a.sortTimestamp);
    }

    /* ============================================================
       修改类 action
       ============================================================ */

    /**
     * 新建一个会话组并挂到指定父组下。
     *
     * @param {Partial<SessionGroup>} overrides 覆盖默认字段
     * @returns {SessionGroup} 新建的组
     */
    function createGroup(overrides = {}) {
        const now = Date.now();
        const newGroup = {
            id:           crypto.randomUUID(),
            name:         '新建分组',
            systemPrompt: '',
            childIds:     [],
            parentId:     ROOT_GROUP_ID,
            createdAt:    now,
            lastActiveAt: now,
            ...overrides,
        };

        groups.value.push(newGroup);

        const parentId = newGroup.parentId ?? ROOT_GROUP_ID;
        const parentGroup = findGroupById(parentId);
        if (parentGroup && !parentGroup.childIds.includes(newGroup.id)) {
            parentGroup.childIds.unshift(newGroup.id);
        }

        return newGroup;
    }

    /**
     * 部分更新指定组的字段。
     *
     * @param {string} groupId
     * @param {Partial<SessionGroup>} patch
     * @returns {void}
     */
    function updateGroup(groupId, patch) {
        const index = groups.value.findIndex(group => group.id === groupId);
        if (index === -1) return;
        groups.value[index] = { ...groups.value[index], ...patch };
    }

    /**
     * 递归删除一个组,以及它下面所有子组和子会话。
     * 根组不可删除。
     *
     * @param {string} groupId
     * @returns {void}
     */
    function deleteGroup(groupId) {
        if (groupId === ROOT_GROUP_ID) return;
        const target = findGroupById(groupId);
        if (!target) return;

        const groupIdsToDelete = new Set();
        const sessionIdsToDelete = new Set();

        /**
         * 深度优先收集要删除的组和会话 id。
         * @param {string} currentId
         */
        function collectDescendants(currentId) {
            groupIdsToDelete.add(currentId);
            const current = findGroupById(currentId);
            if (!current) return;
            for (const childId of current.childIds) {
                if (findGroupById(childId)) {
                    collectDescendants(childId);
                } else {
                    sessionIdsToDelete.add(childId);
                }
            }
        }
        collectDescendants(groupId);

        // 从父组的 childIds 中移除自身。
        const parentGroup = findGroupById(target.parentId ?? ROOT_GROUP_ID);
        if (parentGroup) {
            parentGroup.childIds = parentGroup.childIds.filter(id => id !== groupId);
        }

        groups.value = groups.value.filter(group => !groupIdsToDelete.has(group.id));

        // 同步删除会话。
        const sessionsStore = useSessionsStore();
        sessionsStore.deleteSessionsByIds([...sessionIdsToDelete]);
    }

    /**
     * 把一个会话或会话组移动到目标组下。
     *
     * @param {string} itemId         要移动的 id
     * @param {'session'|'group'} itemType
     * @param {string} targetGroupId  目标父组 id
     * @returns {void}
     */
    function moveItem(itemId, itemType, targetGroupId) {
        // 从当前父组的 childIds 中移除。
        for (const group of groups.value) {
            const childIndex = group.childIds.indexOf(itemId);
            if (childIndex !== -1) {
                group.childIds.splice(childIndex, 1);
            }
        }

        // 加入新父组的最前面。
        const targetGroup = findGroupById(targetGroupId);
        if (targetGroup) {
            targetGroup.childIds.unshift(itemId);
        }

        // 修正被移动项自身的反向指针。
        if (itemType === 'group') {
            updateGroup(itemId, { parentId: targetGroupId });
        } else {
            const sessionsStore = useSessionsStore();
            sessionsStore.updateSession(itemId, { parentGroupId: targetGroupId });
        }

        bumpGroupLastActive(targetGroupId);
    }

    /**
     * 向上更新指定组及其所有祖先的 lastActiveAt。
     *
     * @param {string} groupId
     * @param {number} [timestamp=Date.now()]
     * @returns {void}
     */
    function bumpGroupLastActive(groupId, timestamp = Date.now()) {
        let cursor = groupId;
        while (cursor) {
            const group = findGroupById(cursor);
            if (!group) break;
            if (group.lastActiveAt < timestamp) {
                group.lastActiveAt = timestamp;
            }
            if (!group.parentId) break;
            cursor = group.parentId;
        }
    }

    /**
     * 把指定会话在其所属组的 childIds 中提到最前面。
     * 用于发消息后让该会话在侧边栏置顶。
     *
     * @param {string} sessionId
     * @returns {void}
     */
    function moveSessionToTopOfItsGroup(sessionId) {
        const sessionsStore = useSessionsStore();
        const session = sessionsStore.findSessionById(sessionId);
        if (!session) return;

        const parentGroupId = session.parentGroupId ?? ROOT_GROUP_ID;
        const parentGroup = findGroupById(parentGroupId);
        if (!parentGroup) return;

        const childIndex = parentGroup.childIds.indexOf(sessionId);
        if (childIndex > 0) {
            parentGroup.childIds.splice(childIndex, 1);
            parentGroup.childIds.unshift(sessionId);
        } else if (childIndex === -1) {
            parentGroup.childIds.unshift(sessionId);
        }

        bumpGroupLastActive(parentGroupId);
    }

    /* ============================================================
       数据迁移
       ============================================================ */

    /**
     * 数据迁移:把旧版本数据规范化。幂等可重复调用。
     *
     *   - 给孤儿会话/组补上根组父引用。
     *   - 给会话的消息补 createdAt、过滤非法 role 等。
     *   - 给组补 systemPrompt、lastActiveAt 等字段。
     *
     * @returns {void}
     */
    function runMigration() {
        const sessionsStore = useSessionsStore();
        const rootGroup = findGroupById(ROOT_GROUP_ID);
        if (!rootGroup) return;

        const referencedIds = new Set(groups.value.flatMap(group => group.childIds));

        // 修正孤儿会话。
        for (const session of sessionsStore.allSessions) {
            const patches = {};

            if (!referencedIds.has(session.id)) {
                patches.parentGroupId = ROOT_GROUP_ID;
                if (!rootGroup.childIds.includes(session.id)) {
                    rootGroup.childIds.push(session.id);
                }
            }
            if (!session.parentGroupId) {
                patches.parentGroupId = ROOT_GROUP_ID;
            }
            if (typeof session.systemPrompt !== 'string') {
                patches.systemPrompt = '';
            }

            if (Object.keys(patches).length > 0) {
                sessionsStore.updateSessionSilently(session.id, patches);
            }

            sessionsStore.normalizeSessionMessages(session.id);
        }

        // 修正孤儿组、补字段。
        for (const group of groups.value) {
            if (group.id === ROOT_GROUP_ID) continue;
            if (!referencedIds.has(group.id)) {
                group.parentId = ROOT_GROUP_ID;
                if (!rootGroup.childIds.includes(group.id)) {
                    rootGroup.childIds.push(group.id);
                }
            }
            if (!Array.isArray(group.childIds))     group.childIds = [];
            if (typeof group.systemPrompt !== 'string') group.systemPrompt = '';
            if (!group.lastActiveAt) {
                group.lastActiveAt = group.createdAt || Date.now();
            }
        }
    }

    return {
        // state
        groups,
        allGroups,

        // 查询
        findGroupById,
        getGroupAncestors,
        getSessionAncestorGroups,
        getSessionSystemPromptChain,
        getGroupChildren,

        // 修改
        createGroup,
        updateGroup,
        deleteGroup,
        moveItem,
        bumpGroupLastActive,
        moveSessionToTopOfItsGroup,

        // 迁移
        runMigration,
    };
});
