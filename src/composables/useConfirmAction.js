/**
 * @file src/composables/useConfirmAction.js
 * 两段式确认:第一次点击进入"确认"态,第二次才真正执行。
 * 鼠标移开或一段时间未操作自动复原。
 *
 * 主要用于 danger 操作的按钮,避免误触。
 *
 * 用法(在组件中):
 *   const { isArmed, armedLabel, handleClick, handleMouseLeave }
 *       = useConfirmAction('删除', () => doDelete());
 *
 * 模板里把 handleClick 绑到 @click,handleMouseLeave 绑到 @mouseleave,
 * 文字用 `isArmed ? armedLabel : '删除'` 显示即可。
 */

import { ref, computed, onBeforeUnmount } from 'vue';

/**
 * @param {string} originalLabel        正常状态下的按钮文字(用于生成确认文案)
 * @param {() => void} performAction    第二次点击时执行的动作
 * @param {object} [options]
 * @param {number} [options.timeoutMs=3000] 多少毫秒未操作自动复原
 * @returns {{
 *   isArmed: import('vue').Ref<boolean>,
 *   armedLabel: import('vue').ComputedRef<string>,
 *   handleClick: (event: MouseEvent) => void,
 *   handleMouseLeave: () => void,
 * }}
 */
export function useConfirmAction(originalLabel, performAction, options = {}) {
    const timeoutMs = options.timeoutMs ?? 3000;
    const isArmed = ref(false);

    /** @type {ReturnType<typeof setTimeout> | null} */
    let resetTimerId = null;

    const armedLabel = computed(() => `确认${originalLabel}?`);

    /**
     * 切回未确认状态。
     */
    function disarm() {
        isArmed.value = false;
        if (resetTimerId !== null) {
            clearTimeout(resetTimerId);
            resetTimerId = null;
        }
    }

    /**
     * 处理点击事件。第一次点击 → 进入确认态;第二次 → 真正执行。
     *
     * @param {MouseEvent} event
     * @returns {void}
     */
    function handleClick(event) {
        event.stopPropagation();
        if (!isArmed.value) {
            isArmed.value = true;
            resetTimerId = setTimeout(disarm, timeoutMs);
        } else {
            disarm();
            performAction();
        }
    }

    /**
     * 鼠标移开 → 复原。
     */
    function handleMouseLeave() {
        if (isArmed.value) disarm();
    }

    onBeforeUnmount(() => {
        if (resetTimerId !== null) clearTimeout(resetTimerId);
    });

    return { isArmed, armedLabel, handleClick, handleMouseLeave };
}
