/**
 * @file src/components/import-export/importFlow.js
 * 导入流程的总入口。
 *
 * 调用方式:
 *   import { startImportFlow } from '@/components/import-export/importFlow.js';
 *   startImportFlow(targetGroupId);
 *
 * 流程:
 *   1. 弹出文件选择框,用户选择 .json 文件
 *   2. 解析 JSON,分类为 importedGroups / importedSessions
 *   3. 检测冲突
 *   4. 有冲突 → 弹 ConflictModal 收集决策;无冲突 → 跳过
 *   5. 应用导入(写入 stores)
 *   6. 弹 toast 提示成功
 */

import { useSessionsStore } from '@/stores/sessions.js';
import { useGroupsStore }   from '@/stores/groups.js';
import { useToast }         from '@/composables/useToast.js';

import {
    readImportFile,
    detectImportConflicts,
    titleNeedsDecision,
    analyzeFieldDecision,
    applyImport,
} from '@/utils/import-export.js';

import { useConflictModal } from './useConflictModal.js';

/**
 * 启动导入流程。
 *
 * @param {string} targetGroupId 默认导入目标组(通常是用户右键的那个组,或根组)
 * @returns {Promise<void>}
 */
export async function startImportFlow(targetGroupId) {
    const { showToast } = useToast();

    // 1. 选文件
    const file = await pickJsonFile();
    if (!file) return;

    // 2. 解析
    /** @type {Array<object>} */
    let importedData;
    try {
        importedData = await readImportFile(file);
    } catch (parseError) {
        showToast(`导入失败:${parseError.message}`, 'error');
        return;
    }

    const sessionsStore = useSessionsStore();
    const groupsStore   = useGroupsStore();
    const stores = { sessions: sessionsStore, groups: groupsStore };

    // 3. 分类 + 检测冲突
    const {
        importedGroups,
        importedSessions,
        groupConflicts,
        sessionConflicts,
    } = detectImportConflicts(importedData, stores);

    if (importedGroups.length === 0 && importedSessions.length === 0) {
        showToast('文件中没有可导入的数据', 'error');
        return;
    }

    // 4. 弹冲突弹窗(如有)
    let groupDecisions = new Map();
    let sessionDecisions = new Map();

    if (groupConflicts.length > 0 || sessionConflicts.length > 0) {
        const decisions = await collectConflictDecisions(
            groupConflicts,
            sessionConflicts,
            stores,
        );
        if (decisions === null) return; // 用户取消
        groupDecisions   = decisions.groupDecisions;
        sessionDecisions = decisions.sessionDecisions;
    }

    // 5. 应用
    applyImport({
        importedGroups,
        importedSessions,
        targetGroupId,
        groupDecisions,
        sessionDecisions,
        stores,
    });

    showToast('导入成功', 'success');
}

/* ================================================================
   私有辅助
   ================================================================ */

/**
 * 弹出隐藏的 <input type="file"> 让用户选择一个 JSON 文件。
 *
 * @returns {Promise<File | null>} 取消时返回 null
 */
function pickJsonFile() {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';

        input.addEventListener('change', () => {
            const file = input.files?.[0] || null;
            resolve(file);
        });

        // 用户关闭对话框不点选时浏览器不触发 change 事件;
        // 为了避免 Promise 永远挂起,监听 focus 一次后再延迟检查 files。
        // 这是 web file picker 的常见兼容做法。
        const onWindowFocus = () => {
            setTimeout(() => {
                if (!input.files || input.files.length === 0) {
                    resolve(null);
                }
                window.removeEventListener('focus', onWindowFocus);
            }, 300);
        };
        window.addEventListener('focus', onWindowFocus, { once: true });

        input.click();
    });
}

/**
 * 把冲突列表整理成弹窗需要的"条目"形式,然后弹窗,收集决策。
 *
 * @param {Array<object>} groupConflicts
 * @param {Array<object>} sessionConflicts
 * @param {object} stores
 * @returns {Promise<{
 *   groupDecisions: Map<string, object>,
 *   sessionDecisions: Map<string, object>,
 * } | null>}
 */
async function collectConflictDecisions(groupConflicts, sessionConflicts, stores) {
    const { openConflictModal } = useConflictModal();

    const groupEntries = groupConflicts.map((importedGroup) => {
        const existing = stores.groups.findGroupById(importedGroup.id);
        return buildConflictEntry('group', importedGroup, existing);
    });

    const sessionEntries = sessionConflicts.map((importedSession) => {
        const existing = stores.sessions.findSessionById(importedSession.id);
        return buildConflictEntry('session', importedSession, existing);
    });

    const result = await openConflictModal(groupEntries, sessionEntries);
    return result;
}

/**
 * 构造一个冲突条目,初始化默认决策。
 *
 * @param {'group'|'session'} type
 * @param {object} imported
 * @param {object} existing
 * @returns {import('./useConflictModal.js').ConflictEntry}
 */
function buildConflictEntry(type, imported, existing) {
    const titleA = type === 'group' ? existing.name : existing.title;
    const titleB = type === 'group' ? imported.name : imported.title;

    const meta = {
        titleNeedsDecision: titleNeedsDecision(titleA, titleB),
        promptInfo: analyzeFieldDecision(existing.systemPrompt, imported.systemPrompt),
    };

    // 默认决策:keep-both;子字段全部"skip"
    /** @type {object} */
    const decision = {
        action:   'keep-both',
        title:    'skip',
        prompt:   meta.promptInfo.needsDecision ? 'skip' : meta.promptInfo.autoAction,
    };
    if (type === 'session') {
        decision.messages = 'skip';
    }

    return { type, imported, existing, meta, decision };
}
