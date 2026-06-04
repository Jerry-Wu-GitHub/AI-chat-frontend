/**
 * @file src/components/sidebar/useSidebarActions.js
 * 侧边栏菜单动作合集:重命名、移动、编辑系统提示、删除、导出、导入。
 *
 * 实现要点:
 *   - openModal 关闭后,内部 DOM 已从文档卸载,document.querySelector 取不到。
 *     所以在 onMounted 回调里就要把表单元素引用保存到外层变量,
 *     await 返回后从这个变量读 .value(节点对象本身仍在内存中)。
 */

import { useGroupsStore, ROOT_GROUP_ID } from '@/stores/groups.js';
import { useSessionsStore } from '@/stores/sessions.js';
import { useChatStore }     from '@/stores/chat.js';
import { useModal }         from '@/composables/useModal.js';
import { useToast }         from '@/composables/useToast.js';
import { startImportFlow }  from '@/components/import-export/importFlow.js';

import {
    collectExportItems,
    downloadExportJson,
} from '@/utils/import-export.js';
import { escapeHtml, escapeAttribute } from '@/utils/escape.js';

export function useSidebarActions() {
    const groupsStore   = useGroupsStore();
    const sessionsStore = useSessionsStore();
    const chatStore     = useChatStore();
    const { openModal } = useModal();
    const { showToast } = useToast();

    /* ============================================================
       会话组动作
       ============================================================ */

    /**
     * 新建子会话组。
     *
     * @param {string} parentGroupId
     * @param {() => void} [onCreated]
     * @returns {Promise<void>}
     */
    async function createSubGroup(parentGroupId, onCreated) {
        /** @type {HTMLInputElement | null} */
        let inputRef = null;

        const result = await openModal({
            title: '新建会话组',
            bodyHtml: `
                <input
                    id="sidebar-modal-input-group-name"
                    class="sidebar-modal-input"
                    type="text"
                    value="新建分组"
                    placeholder="分组名称"
                    maxlength="60"
                />
            `,
            buttons: [
                { label: '取消', value: null, className: 'btn-secondary' },
                { label: '创建', value: 'ok', className: 'btn-primary'   },
            ],
            onMounted(rootElement) {
                inputRef = rootElement.querySelector('#sidebar-modal-input-group-name');
                inputRef?.focus();
                inputRef?.select();
            },
        });
        if (result !== 'ok') return;

        const name = inputRef?.value.trim();
        if (!name) return;

        groupsStore.createGroup({ name, parentId: parentGroupId });
        onCreated?.();
    }

    /**
     * 重命名会话组。
     *
     * @param {string} groupId
     * @returns {Promise<void>}
     */
    async function renameGroup(groupId) {
        const group = groupsStore.findGroupById(groupId);
        if (!group) return;

        /** @type {HTMLInputElement | null} */
        let inputRef = null;

        const result = await openModal({
            title: '重命名会话组',
            bodyHtml: `
                <input
                    id="sidebar-modal-input-rename-group"
                    class="sidebar-modal-input"
                    type="text"
                    value="${escapeAttribute(group.name)}"
                    placeholder="分组名称"
                    maxlength="60"
                />
            `,
            buttons: [
                { label: '取消', value: null, className: 'btn-secondary' },
                { label: '确定', value: 'ok', className: 'btn-primary'   },
            ],
            onMounted(rootElement) {
                inputRef = rootElement.querySelector('#sidebar-modal-input-rename-group');
                inputRef?.focus();
                inputRef?.select();
            },
        });
        if (result !== 'ok') return;

        const name = inputRef?.value.trim();
        if (!name) return;

        groupsStore.updateGroup(groupId, { name });
    }

    /**
     * 编辑会话组的系统提示词。
     *
     * @param {string} groupId
     * @returns {Promise<void>}
     */
    async function editGroupSystemPrompt(groupId) {
        const group = groupsStore.findGroupById(groupId);
        if (!group) return;

        /** @type {HTMLTextAreaElement | null} */
        let textareaRef = null;

        const result = await openModal({
            title: '会话组系统提示',
            bodyHtml: `
                <textarea
                    id="sidebar-modal-input-group-prompt"
                    class="sidebar-modal-textarea"
                    rows="6"
                    placeholder="在这里输入系统提示词(留空则无)"
                >${escapeHtml(group.systemPrompt || '')}</textarea>
            `,
            buttons: [
                { label: '取消', value: null, className: 'btn-secondary' },
                { label: '保存', value: 'ok', className: 'btn-primary'   },
            ],
            onMounted(rootElement) {
                textareaRef = rootElement.querySelector('#sidebar-modal-input-group-prompt');
                textareaRef?.focus();
            },
        });
        if (result !== 'ok') return;

        const newPrompt = textareaRef?.value ?? '';
        groupsStore.updateGroup(groupId, { systemPrompt: newPrompt });
        showToast('系统提示词已保存', 'success');
    }

    /**
     * 删除会话组(连带所有后代)。二次确认。
     *
     * @param {string} groupId
     * @returns {Promise<void>}
     */
    async function deleteGroup(groupId) {
        if (groupId === ROOT_GROUP_ID) return;
        const group = groupsStore.findGroupById(groupId);
        if (!group) return;

        const result = await openModal({
            title: '删除会话组',
            bodyHtml: `
                <p class="sidebar-modal-hint">
                    确定要删除「${escapeHtml(group.name)}」及其所有内容吗?
                    此操作不可恢复。
                </p>
            `,
            buttons: [
                { label: '取消', value: null, className: 'btn-secondary' },
                { label: '删除', value: 'ok', className: 'btn-danger'    },
            ],
        });
        if (result !== 'ok') return;

        const currentSessionId = chatStore.currentSessionId;
        groupsStore.deleteGroup(groupId);

        const remaining = sessionsStore.allSessions;
        if (!remaining.find(session => session.id === currentSessionId)) {
            if (remaining.length > 0) {
                chatStore.switchToSession(remaining[0].id);
            } else {
                chatStore.createAndSwitchSession(ROOT_GROUP_ID);
            }
        }
    }

    /* ============================================================
       会话动作
       ============================================================ */

    /**
     * 重命名会话。
     *
     * @param {string} sessionId
     * @returns {Promise<void>}
     */
    async function renameSession(sessionId) {
        const session = sessionsStore.findSessionById(sessionId);
        if (!session) return;

        /** @type {HTMLInputElement | null} */
        let inputRef = null;

        const result = await openModal({
            title: '重命名会话',
            bodyHtml: `
                <input
                    id="sidebar-modal-input-rename-session"
                    class="sidebar-modal-input"
                    type="text"
                    value="${escapeAttribute(session.title)}"
                    placeholder="输入新标题"
                    maxlength="100"
                />
            `,
            buttons: [
                { label: '取消', value: null, className: 'btn-secondary' },
                { label: '确定', value: 'ok', className: 'btn-primary'   },
            ],
            onMounted(rootElement) {
                inputRef = rootElement.querySelector('#sidebar-modal-input-rename-session');
                inputRef?.focus();
                inputRef?.select();
            },
        });
        if (result !== 'ok') return;

        const newTitle = inputRef?.value.trim();
        if (!newTitle) return;

        sessionsStore.updateSession(sessionId, { title: newTitle });
    }

    /**
     * 编辑会话自身的系统提示词。
     *
     * @param {string} sessionId
     * @returns {Promise<void>}
     */
    async function editSessionSystemPrompt(sessionId) {
        const session = sessionsStore.findSessionById(sessionId);
        if (!session) return;

        /** @type {HTMLTextAreaElement | null} */
        let textareaRef = null;

        const result = await openModal({
            title: '会话系统提示',
            bodyHtml: `
                <textarea
                    id="sidebar-modal-input-session-prompt"
                    class="sidebar-modal-textarea"
                    rows="6"
                    placeholder="在这里输入系统提示词(留空则无,祖先组的提示词会自动继承)"
                >${escapeHtml(session.systemPrompt || '')}</textarea>
            `,
            buttons: [
                { label: '取消', value: null, className: 'btn-secondary' },
                { label: '保存', value: 'ok', className: 'btn-primary'   },
            ],
            onMounted(rootElement) {
                textareaRef = rootElement.querySelector('#sidebar-modal-input-session-prompt');
                textareaRef?.focus();
            },
        });
        if (result !== 'ok') return;

        const newPrompt = textareaRef?.value ?? '';
        sessionsStore.updateSession(sessionId, { systemPrompt: newPrompt });
        showToast('系统提示词已保存', 'success');
    }

    /**
     * 删除会话。二次确认。
     *
     * @param {string} sessionId
     * @returns {Promise<void>}
     */
    async function deleteSession(sessionId) {
        const session = sessionsStore.findSessionById(sessionId);
        if (!session) return;

        const result = await openModal({
            title: '删除会话',
            bodyHtml: `
                <p class="sidebar-modal-hint">
                    确定要删除「${escapeHtml(session.title)}」吗?此操作不可恢复。
                </p>
            `,
            buttons: [
                { label: '取消', value: null, className: 'btn-secondary' },
                { label: '删除', value: 'ok', className: 'btn-danger'    },
            ],
        });
        if (result !== 'ok') return;

        chatStore.deleteSessionAndPickNext(sessionId);
    }

    /* ============================================================
       移动(会话和会话组通用)
       ============================================================ */

    /**
     * 弹出"移动到"选择器,把指定项移动到目标会话组下。
     *
     * @param {string} itemId
     * @param {'session'|'group'} itemType
     * @returns {Promise<void>}
     */
    async function moveItem(itemId, itemType) {
        const allGroups = groupsStore.allGroups;

        const forbiddenIds = new Set();
        if (itemType === 'group') {
            collectGroupDescendants(itemId, allGroups, forbiddenIds);
        }

        let currentParentId;
        if (itemType === 'group') {
            currentParentId = groupsStore.findGroupById(itemId)?.parentId ?? ROOT_GROUP_ID;
        } else {
            currentParentId = sessionsStore.findSessionById(itemId)?.parentGroupId ?? ROOT_GROUP_ID;
        }

        const optionsHtml = buildMoveTargetOptionsHtml(
            ROOT_GROUP_ID, 0, allGroups, forbiddenIds, currentParentId,
        );

        /** @type {HTMLSelectElement | null} */
        let selectRef = null;

        const result = await openModal({
            title: '移动到',
            bodyHtml: `
                <label class="sidebar-modal-label">选择目标会话组</label>
                <select
                    id="sidebar-modal-input-move-target"
                    class="sidebar-modal-input"
                    style="cursor: pointer;"
                >
                    ${optionsHtml}
                </select>
            `,
            buttons: [
                { label: '取消', value: null, className: 'btn-secondary' },
                { label: '移动', value: 'ok', className: 'btn-primary'   },
            ],
            onMounted(rootElement) {
                selectRef = rootElement.querySelector('#sidebar-modal-input-move-target');
            },
        });
        if (result !== 'ok') return;

        const targetGroupId = selectRef?.value;
        if (!targetGroupId || targetGroupId === currentParentId) return;

        groupsStore.moveItem(itemId, itemType, targetGroupId);
        showToast('已移动', 'success');
    }

    /* ============================================================
       导出 / 导入
       ============================================================ */

    function exportItem(itemId, itemType) {
        const items = collectExportItems(itemId, itemType, {
            sessions: sessionsStore,
            groups:   groupsStore,
        });
        if (items.length === 0) {
            showToast('未找到可导出的内容', 'error');
            return;
        }
        downloadExportJson(items);
        showToast('已导出', 'success');
    }

    function importIntoGroup(targetGroupId) {
        startImportFlow(targetGroupId);
    }

    return {
        createSubGroup,
        renameGroup,
        editGroupSystemPrompt,
        deleteGroup,
        renameSession,
        editSessionSystemPrompt,
        deleteSession,
        moveItem,
        exportItem,
        importIntoGroup,
    };
}

/* ================================================================
   私有辅助
   ================================================================ */

function collectGroupDescendants(groupId, allGroups, resultSet) {
    resultSet.add(groupId);
    const group = allGroups.find(item => item.id === groupId);
    if (!group) return;
    for (const childId of group.childIds) {
        if (allGroups.find(item => item.id === childId)) {
            collectGroupDescendants(childId, allGroups, resultSet);
        }
    }
}

function buildMoveTargetOptionsHtml(groupId, depth, allGroups, forbiddenIds, currentParentId) {
    const group = allGroups.find(item => item.id === groupId);
    if (!group) return '';

    const isDisabled = forbiddenIds.has(groupId) || groupId === currentParentId;
    const indent = '\u00a0\u00a0\u00a0\u00a0'.repeat(depth);
    const label  = groupId === ROOT_GROUP_ID ? '(根组)' : group.name;

    let html = `<option value="${escapeAttribute(groupId)}"${isDisabled ? ' disabled' : ''}>`
             + `${indent}${escapeHtml(label)}`
             + `</option>`;

    for (const childId of group.childIds) {
        if (allGroups.find(item => item.id === childId)) {
            html += buildMoveTargetOptionsHtml(
                childId, depth + 1, allGroups, forbiddenIds, currentParentId,
            );
        }
    }
    return html;
}
