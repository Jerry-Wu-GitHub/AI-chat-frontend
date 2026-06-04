/**
 * @file src/composables/useDropdown.js
 * 通用下拉菜单管理:点击外部关闭、ESC 关闭。
 *
 * 用法:
 *   const triggerRef = ref(null);
 *   const dropdownRef = ref(null);
 *   const { isOpen, toggle, close } = useDropdown(triggerRef, dropdownRef);
 *
 * 触发元素与面板元素都要传入 ref(可以是组件根元素也可以是普通 DOM),
 * composable 会监听全局 click,如果点击位置不在它们里面就自动关闭。
 */

import { ref, onMounted, onBeforeUnmount } from 'vue';

/**
 * 管理一个下拉菜单的开关状态。
 *
 * @param {import('vue').Ref<HTMLElement | null>} triggerRef  触发按钮元素
 * @param {import('vue').Ref<HTMLElement | null>} dropdownRef 下拉面板元素
 * @param {object} [options]
 * @param {boolean} [options.closeOnEscape=true]
 * @returns {{
 *   isOpen: import('vue').Ref<boolean>,
 *   open: () => void,
 *   close: () => void,
 *   toggle: () => void,
 * }}
 */
export function useDropdown(triggerRef, dropdownRef, options = {}) {
    const closeOnEscape = options.closeOnEscape !== false;
    const isOpen = ref(false);

    /**
     * 检测点击是否在 trigger 或 dropdown 内,如果都不在就关闭。
     *
     * @param {MouseEvent} event
     */
    function onDocumentClick(event) {
        if (!isOpen.value) return;

        const target = event.target;
        const inTrigger  = triggerRef.value?.contains(target);
        const inDropdown = dropdownRef.value?.contains(target);
        if (!inTrigger && !inDropdown) {
            isOpen.value = false;
        }
    }

    /**
     * ESC 关闭。
     *
     * @param {KeyboardEvent} event
     */
    function onKeyDown(event) {
        if (event.key === 'Escape' && isOpen.value) {
            isOpen.value = false;
        }
    }

    function open()   { isOpen.value = true;  }
    function close()  { isOpen.value = false; }
    function toggle() { isOpen.value = !isOpen.value; }

    onMounted(() => {
        document.addEventListener('click', onDocumentClick);
        if (closeOnEscape) {
            document.addEventListener('keydown', onKeyDown);
        }
    });

    onBeforeUnmount(() => {
        document.removeEventListener('click', onDocumentClick);
        document.removeEventListener('keydown', onKeyDown);
    });

    return { isOpen, open, close, toggle };
}
