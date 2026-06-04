/**
 * @file src/utils/import-export.js
 * 会话与会话组的导入导出 —— 数据层逻辑。
 *
 * 弹窗 UI(展示冲突项、收集用户决策)由 ConflictModal.vue 负责;
 * 这里提供:
 *   - collectExportItems():    把指定 id 的会话/组(含子树)序列化为数组。
 *   - downloadExportJson():    触发浏览器下载。
 *   - readImportFile():        从用户选中的 File 解析出导入数据。
 *   - detectImportConflicts(): 找出哪些导入项的 id 与现有数据冲突。
 *   - analyzeFieldDecision():  分析两个值是否需要让用户做决策。
 *   - applyImport():           按用户决策把导入数据真正写入 stores。
 */

import { downloadBlob } from './format.js';

/* ================================================================
   导出
   ================================================================ */

/**
 * 递归收集一个会话或会话组(含子树)以便导出。
 * 返回的数组每个元素都带 `_exportType: 'session'|'group'` 字段。
 *
 * @param {string} itemId           会话或会话组的 id
 * @param {'session'|'group'} itemType
 * @param {object} stores           已经 useXxxStore() 之后的 store 实例集合
 * @param {ReturnType<typeof import('@/stores/sessions.js').useSessionsStore>} stores.sessions
 * @param {ReturnType<typeof import('@/stores/groups.js').useGroupsStore>}     stores.groups
 * @returns {Array<object>}
 */
export function collectExportItems(itemId, itemType, stores) {
    const items = [];

    if (itemType === 'session') {
        const session = stores.sessions.findSessionById(itemId);
        if (session) {
            items.push({ _exportType: 'session', ...session });
        }
        return items;
    }

    // 递归收集组及其所有后代。
    function recurse(currentGroupId) {
        const group = stores.groups.findGroupById(currentGroupId);
        if (!group) return;

        items.push({ _exportType: 'group', ...group });

        for (const childId of group.childIds) {
            const childGroup = stores.groups.findGroupById(childId);
            if (childGroup) {
                recurse(childId);
                continue;
            }
            const childSession = stores.sessions.findSessionById(childId);
            if (childSession) {
                items.push({ _exportType: 'session', ...childSession });
            }
        }
    }
    recurse(itemId);
    return items;
}

/**
 * 把导出数据序列化为 JSON 文件并触发下载。
 *
 * @param {Array<object>} items
 * @param {string} [filename] 不传则自动生成
 * @returns {void}
 */
export function downloadExportJson(items, filename) {
    const finalName = filename || `export_${Date.now()}.json`;
    const blob = new Blob([JSON.stringify(items, null, 2)], {
        type: 'application/json',
    });
    downloadBlob(blob, finalName);
}

/* ================================================================
   导入:解析 & 冲突检测
   ================================================================ */

/**
 * 读取用户选中的 JSON 文件并解析为导入数据。
 *
 * @param {File} file
 * @returns {Promise<Array<object>>} 顶层数组
 * @throws {Error} 文件格式错误时
 */
export async function readImportFile(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
        throw new Error('格式错误:顶层应为数组');
    }
    return parsed;
}

/**
 * 把导入数据分类并检测冲突。
 *
 * @param {Array<object>} importedData
 * @param {object} stores
 * @param {ReturnType<typeof import('@/stores/sessions.js').useSessionsStore>} stores.sessions
 * @param {ReturnType<typeof import('@/stores/groups.js').useGroupsStore>}     stores.groups
 * @returns {{
 *   importedGroups:   Array<object>,
 *   importedSessions: Array<object>,
 *   groupConflicts:   Array<object>,
 *   sessionConflicts: Array<object>,
 * }}
 */
export function detectImportConflicts(importedData, stores) {
    const importedGroups   = importedData.filter(item => item._exportType === 'group');
    const importedSessions = importedData.filter(item => item._exportType === 'session');

    const groupConflicts = importedGroups.filter(group => {
        if (group.id === '__root__') return false;
        return !!stores.groups.findGroupById(group.id);
    });

    const sessionConflicts = importedSessions.filter(session =>
        !!stores.sessions.findSessionById(session.id),
    );

    return { importedGroups, importedSessions, groupConflicts, sessionConflicts };
}

/* ================================================================
   字段级冲突分析
   ================================================================ */

/**
 * 判断两个标题是否需要让用户决策。
 * 相同(忽略首尾空白)时直接返回 false。
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function titleNeedsDecision(a, b) {
    return (a || '').trim() !== (b || '').trim();
}

/**
 * 分析两个系统提示词的关系,决定是否需要用户决策,
 * 以及"不需要决策时应自动采用"的动作。
 *
 * 规则:
 *   - 都为空 / 完全相同:无需决策,自动 skip。
 *   - 一方为空:自动采用非空那一方。
 *   - 一方是另一方的子串:自动采用更长的那一方。
 *   - 否则:需要用户决策。
 *
 * @param {string} existingPrompt 现有的系统提示词
 * @param {string} importedPrompt 待导入的系统提示词
 * @returns {{ needsDecision: boolean, autoAction: 'skip' | 'replace' }}
 *   autoAction:'skip' 保留现有,'replace' 采用导入的
 */
export function analyzeFieldDecision(existingPrompt, importedPrompt) {
    const existing = (existingPrompt || '').trim();
    const imported = (importedPrompt || '').trim();

    if (existing === imported) {
        return { needsDecision: false, autoAction: 'skip' };
    }
    if (!existing && imported) {
        return { needsDecision: false, autoAction: 'replace' };
    }
    if (existing && !imported) {
        return { needsDecision: false, autoAction: 'skip' };
    }
    if (imported.includes(existing)) {
        return { needsDecision: false, autoAction: 'replace' };
    }
    if (existing.includes(imported)) {
        return { needsDecision: false, autoAction: 'skip' };
    }
    return { needsDecision: true, autoAction: 'skip' };
}

/* ================================================================
   执行导入
   ================================================================ */

/**
 * @typedef {object} GroupDecision
 * @property {'keep-both' | 'keep-one'} action
 * @property {'skip' | 'replace'}              [title]
 * @property {'skip' | 'merge' | 'replace'}    [prompt]
 */

/**
 * @typedef {object} SessionDecision
 * @property {'keep-both' | 'keep-one'} action
 * @property {'skip' | 'replace'}              [title]
 * @property {'skip' | 'merge' | 'replace'}    [prompt]
 * @property {'skip' | 'merge' | 'replace'}    [messages]
 */

/**
 * 把消息列表中所有与已有 id 冲突的消息重新分配新 id。
 *
 * @param {Array<object>} messages
 * @param {Set<string>}   existingIds
 * @returns {Array<object>}
 */
function remapConflictingMessageIds(messages, existingIds) {
    return messages.map((message) => {
        if (existingIds.has(message.id)) {
            return { ...message, id: crypto.randomUUID() };
        }
        return { ...message };
    });
}

/**
 * 把导入的会话组插入到 store 中。
 * 同时修正 parentId 与 childIds 的 id 重映射。
 *
 * @param {object} group              已经处理过 id 的待插入组对象
 * @param {string} fallbackParentId   默认父组 id
 * @param {Map<string,string>} idRemap 旧 id → 新 id 的映射
 * @param {object} stores
 * @returns {void}
 */
function insertGroupIntoStore(group, fallbackParentId, idRemap, stores) {
    const ROOT_ID = '__root__';

    let parentId = group.parentId;
    if (!parentId || parentId === ROOT_ID) {
        parentId = fallbackParentId;
    } else if (idRemap.has(parentId)) {
        parentId = idRemap.get(parentId);
    } else if (!stores.groups.findGroupById(parentId)) {
        parentId = fallbackParentId;
    }

    const remappedChildIds = (group.childIds || []).map(childId =>
        idRemap.get(childId) || childId,
    );

    const finalGroup = {
        ...group,
        parentId,
        childIds:     remappedChildIds,
        lastActiveAt: group.lastActiveAt || Date.now(),
    };
    delete finalGroup._exportType;

    stores.groups.groups.push(finalGroup);

    const parentGroup = stores.groups.findGroupById(parentId);
    if (parentGroup && !parentGroup.childIds.includes(finalGroup.id)) {
        parentGroup.childIds.unshift(finalGroup.id);
    }
}

/**
 * 把导入的会话插入到 store 中。
 *
 * @param {object} session
 * @param {object} stores
 * @returns {void}
 */
function insertSessionIntoStore(session, stores) {
    const finalSession = { ...session };
    delete finalSession._exportType;
    finalSession.updatedAt = finalSession.updatedAt || Date.now();
    finalSession.createdAt = finalSession.createdAt || Date.now();

    stores.sessions.sessions.unshift(finalSession);

    const parentGroupId = finalSession.parentGroupId || '__root__';
    const parentGroup = stores.groups.findGroupById(parentGroupId);
    if (parentGroup && !parentGroup.childIds.includes(finalSession.id)) {
        parentGroup.childIds.unshift(finalSession.id);
    }
}

/**
 * 对"保留一个"决策下的会话组,执行合并写入。
 *
 * @param {object} importedGroup
 * @param {object} existingGroup
 * @param {GroupDecision} decision
 * @param {object} stores
 * @returns {void}
 */
function mergeGroupIntoExisting(importedGroup, existingGroup, decision, stores) {
    const patch = {};

    if (decision.title === 'replace') {
        patch.name = importedGroup.name;
    }

    if (decision.prompt === 'replace') {
        patch.systemPrompt = importedGroup.systemPrompt;
    } else if (decision.prompt === 'merge') {
        const base = (existingGroup.systemPrompt || '').trim();
        const append = (importedGroup.systemPrompt || '').trim();
        patch.systemPrompt = base ? `${base}\n\n${append}` : append;
    }

    // 子节点:始终合并(导入的子节点追加到现有 childIds)。
    const target = stores.groups.findGroupById(existingGroup.id);
    if (target) {
        const existingChildIds = new Set(target.childIds);
        for (const childId of importedGroup.childIds || []) {
            if (!existingChildIds.has(childId)) {
                target.childIds.push(childId);
            }
        }
        Object.assign(target, patch);
    }
}

/**
 * 对"保留一个"决策下的会话,执行合并写入。
 *
 * @param {object} importedSession
 * @param {object} existingSession
 * @param {SessionDecision} decision
 * @param {object} stores
 * @returns {void}
 */
function mergeSessionIntoExisting(importedSession, existingSession, decision, stores) {
    const patch = {};

    if (decision.title === 'replace') {
        patch.title = importedSession.title;
    }

    if (decision.prompt === 'replace') {
        patch.systemPrompt = importedSession.systemPrompt;
    } else if (decision.prompt === 'merge') {
        const base = (existingSession.systemPrompt || '').trim();
        const append = (importedSession.systemPrompt || '').trim();
        patch.systemPrompt = base ? `${base}\n\n${append}` : append;
    }

    if (decision.messages === 'replace') {
        patch.messages = importedSession.messages || [];
    } else if (decision.messages === 'merge') {
        const existingMessageIds = new Set((existingSession.messages || []).map(m => m.id));
        const remappedNewMessages = remapConflictingMessageIds(
            importedSession.messages || [],
            existingMessageIds,
        );
        patch.messages = [...(existingSession.messages || []), ...remappedNewMessages];
    }

    stores.sessions.updateSessionSilently(existingSession.id, patch);
}

/**
 * 决定一个被导入会话最终应该挂到哪个父组。
 *
 * @param {object} importedSession
 * @param {Array<object>} importedGroups
 * @param {Map<string,string>} idRemap
 * @param {string} targetGroupId
 * @returns {string}
 */
function resolveSessionParentGroup(importedSession, importedGroups, idRemap, targetGroupId) {
    const parentGroupId = importedSession.parentGroupId;
    if (!parentGroupId) return targetGroupId;
    if (idRemap.has(parentGroupId)) return idRemap.get(parentGroupId);

    const isImportedGroup = importedGroups.some(group => group.id === parentGroupId);
    if (isImportedGroup) return parentGroupId;

    return targetGroupId;
}

/**
 * 按用户决策把导入数据真正写入 stores。
 *
 * @param {object} options
 * @param {Array<object>} options.importedGroups
 * @param {Array<object>} options.importedSessions
 * @param {string} options.targetGroupId        无明确父组时的默认归属
 * @param {Map<string, GroupDecision>}   options.groupDecisions
 * @param {Map<string, SessionDecision>} options.sessionDecisions
 * @param {object} options.stores
 * @returns {void}
 */
export function applyImport({
    importedGroups,
    importedSessions,
    targetGroupId,
    groupDecisions,
    sessionDecisions,
    stores,
}) {
    /** @type {Map<string, string>} 旧 id → 新 id 的重映射表。 */
    const idRemap = new Map();

    /* ---- 1. 处理会话组 ---- */
    for (const importedGroup of importedGroups) {
        if (importedGroup.id === '__root__') continue;

        const existing = stores.groups.findGroupById(importedGroup.id);
        if (!existing) {
            insertGroupIntoStore(importedGroup, targetGroupId, idRemap, stores);
            continue;
        }

        const decision = groupDecisions.get(importedGroup.id) || { action: 'keep-both' };

        if (decision.action === 'keep-both') {
            const newId = crypto.randomUUID();
            idRemap.set(importedGroup.id, newId);
            insertGroupIntoStore(
                { ...importedGroup, id: newId },
                targetGroupId,
                idRemap,
                stores,
            );
        } else {
            mergeGroupIntoExisting(importedGroup, existing, decision, stores);
        }
    }

    /* ---- 2. 处理会话 ---- */
    for (const importedSession of importedSessions) {
        const existing = stores.sessions.findSessionById(importedSession.id);
        const finalParentId = resolveSessionParentGroup(
            importedSession, importedGroups, idRemap, targetGroupId,
        );

        if (!existing) {
            insertSessionIntoStore(
                { ...importedSession, parentGroupId: finalParentId },
                stores,
            );
            continue;
        }

        const decision = sessionDecisions.get(importedSession.id) || { action: 'keep-both' };

        if (decision.action === 'keep-both') {
            const newId = crypto.randomUUID();
            const existingMessageIds = new Set(
                stores.sessions.allSessions.flatMap(session =>
                    session.messages.map(message => message.id),
                ),
            );
            const remappedMessages = remapConflictingMessageIds(
                importedSession.messages || [],
                existingMessageIds,
            );
            insertSessionIntoStore(
                {
                    ...importedSession,
                    id: newId,
                    messages: remappedMessages,
                    parentGroupId: finalParentId,
                },
                stores,
            );
        } else {
            mergeSessionIntoExisting(importedSession, existing, decision, stores);
        }
    }
}
