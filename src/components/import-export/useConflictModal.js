/**
 * @file src/components/import-export/useConflictModal.js
 * 冲突解决弹窗的共享状态(全局单例)。
 *
 * importFlow 在检测到冲突时调用 openConflictModal(),
 * 弹出 ConflictModal 让用户选择处理方式,返回 Promise<Map | null>。
 * null 表示用户取消;Map 则是 id → decision 的映射。
 */

import { ref } from 'vue';

/**
 * @typedef {object} ConflictFieldMeta
 * @property {boolean} titleNeedsDecision
 * @property {{ needsDecision: boolean, autoAction: 'skip' | 'replace' }} promptInfo
 */

/**
 * @typedef {object} ConflictEntry
 * @property {'group'|'session'} type
 * @property {object} imported            导入的对象
 * @property {object} existing            现有的对象
 * @property {ConflictFieldMeta} meta     字段级冲突元信息
 * @property {object} decision            用户决策(响应式,绑定 v-model)
 */

/**
 * @typedef {object} ConflictModalState
 * @property {ConflictEntry[]} groupEntries
 * @property {ConflictEntry[]} sessionEntries
 * @property {(value: Map<string, object> | null) => void} resolve
 */

/** @type {import('vue').Ref<ConflictModalState | null>} */
const conflictModalState = ref(null);

/**
 * 提供冲突弹窗的方法和状态。
 *
 * @returns {{
 *   conflictModalState: import('vue').Ref<ConflictModalState | null>,
 *   openConflictModal: (
 *       groupEntries: ConflictEntry[],
 *       sessionEntries: ConflictEntry[]
 *   ) => Promise<{ groupDecisions: Map<string, object>, sessionDecisions: Map<string, object> } | null>,
 *   closeConflictModal: (value: any) => void,
 * }}
 */
export function useConflictModal() {
    /**
     * 弹出冲突解决对话框。
     *
     * @param {ConflictEntry[]} groupEntries
     * @param {ConflictEntry[]} sessionEntries
     * @returns {Promise<{ groupDecisions: Map<string, object>, sessionDecisions: Map<string, object> } | null>}
     */
    function openConflictModal(groupEntries, sessionEntries) {
        return new Promise((resolve) => {
            conflictModalState.value = {
                groupEntries,
                sessionEntries,
                resolve,
            };
        });
    }

    /**
     * 关闭对话框,并 resolve 结果。
     *
     * @param {any} value
     * @returns {void}
     */
    function closeConflictModal(value) {
        const state = conflictModalState.value;
        conflictModalState.value = null;
        state?.resolve(value);
    }

    return { conflictModalState, openConflictModal, closeConflictModal };
}
