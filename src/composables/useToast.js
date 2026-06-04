/**
 * @file src/composables/useToast.js
 * 全局 Toast 服务。
 *
 * 用法:
 *   import { useToast } from '@/composables/useToast.js';
 *   const { showToast } = useToast();
 *   showToast('保存成功', 'success');
 *
 * 实际渲染由 components/common/ToastContainer.vue 完成,
 * 它从 `toastList` 这个共享 ref 读取数据。
 */

import { ref } from 'vue';

/**
 * @typedef {object} ToastEntry
 * @property {string|number} id        唯一标识(用于 v-for key 和定时清除)
 * @property {string}        message
 * @property {'info'|'success'|'error'} type
 * @property {boolean}       fadingOut  是否正在淡出(用于触发 CSS 动画)
 */

/** 当前展示中的 toast 列表(全局单例)。 */
const toastList = ref(/** @type {ToastEntry[]} */ ([]));

/** 每条 toast 自增 id 计数。 */
let nextToastId = 1;

/**
 * 提供 toast 相关的方法和当前列表。
 *
 * @returns {{
 *   toastList: import('vue').Ref<ToastEntry[]>,
 *   showToast: (message: string, type?: 'info'|'success'|'error', duration?: number) => void,
 *   dismissToast: (id: string|number) => void,
 * }}
 */
export function useToast() {
    /**
     * 显示一条 toast。在指定时间后自动淡出并移除。
     *
     * @param {string} message
     * @param {'info'|'success'|'error'} [type='info']
     * @param {number} [duration=3000] 持续毫秒数(不含淡出动画)
     * @returns {void}
     */
    function showToast(message, type = 'info', duration = 3000) {
        const id = nextToastId++;
        toastList.value = [...toastList.value, { id, message, type, fadingOut: false }];

        // 触发淡出
        setTimeout(() => {
            const index = toastList.value.findIndex(item => item.id === id);
            if (index === -1) return;
            const next = [...toastList.value];
            next[index] = { ...next[index], fadingOut: true };
            toastList.value = next;
        }, duration);

        // 淡出动画完成后真正移除
        setTimeout(() => {
            toastList.value = toastList.value.filter(item => item.id !== id);
        }, duration + 400);
    }

    /**
     * 立即移除指定 toast(用户手动关闭时用)。
     *
     * @param {string|number} id
     * @returns {void}
     */
    function dismissToast(id) {
        toastList.value = toastList.value.filter(item => item.id !== id);
    }

    return { toastList, showToast, dismissToast };
}
