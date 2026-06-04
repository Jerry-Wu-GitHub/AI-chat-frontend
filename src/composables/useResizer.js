/**
 * @file src/composables/useResizer.js
 * 可拖动分界条逻辑。
 *
 * minWidth / maxWidth 既可以是固定数字,也可以是函数(每次拖动时即时调用),
 * 后者用于"上限取决于其它元素当前宽度"的场景,例如预览面板上限是
 * 窗口宽度减去侧边栏宽度。
 */

import { ref, onMounted, onBeforeUnmount } from 'vue';

/**
 * 把可能是函数或数字的"边界值"解析为当前数字。
 *
 * @param {number | (() => number)} value
 * @returns {number}
 */
function resolveBoundary(value) {
    return typeof value === 'function' ? value() : value;
}

/**
 * 为一个分界条元素绑定鼠标拖动行为。
 *
 * @param {import('vue').Ref<HTMLElement | null>} resizerRef
 * @param {object} options
 * @param {string} options.storageKey
 * @param {number | (() => number)} options.minWidth
 * @param {number | (() => number)} options.maxWidth
 * @param {1 | -1} options.deltaSign
 * @param {() => number} options.getCurrentWidth
 * @param {(width: number) => void} options.applyWidth
 * @returns {{ isDragging: import('vue').Ref<boolean> }}
 */
export function useResizer(resizerRef, options) {
    const {
        storageKey,
        minWidth,
        maxWidth,
        deltaSign,
        getCurrentWidth,
        applyWidth,
    } = options;

    const isDragging = ref(false);
    let dragStartX = 0;
    let dragStartWidth = 0;

    function onMouseMove(event) {
        const deltaPx = (event.clientX - dragStartX) * deltaSign;
        const minPx = resolveBoundary(minWidth);
        const maxPx = resolveBoundary(maxWidth);
        const nextWidth = Math.min(maxPx, Math.max(minPx, dragStartWidth + deltaPx));
        applyWidth(nextWidth);
    }

    function onMouseUp() {
        isDragging.value = false;
        document.body.classList.remove('resizing');

        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup',   onMouseUp);

        try {
            localStorage.setItem(storageKey, String(Math.round(getCurrentWidth())));
        } catch {
            // 写入失败不阻塞用户操作。
        }
    }

    function onMouseDown(event) {
        event.preventDefault();
        dragStartX = event.clientX;
        dragStartWidth = getCurrentWidth();
        isDragging.value = true;
        document.body.classList.add('resizing');

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup',   onMouseUp);
    }

    onMounted(() => {
        const savedRaw = localStorage.getItem(storageKey);
        if (savedRaw !== null) {
            const savedWidth = parseInt(savedRaw, 10);
            const minPx = resolveBoundary(minWidth);
            const maxPx = resolveBoundary(maxWidth);
            if (savedWidth >= minPx && savedWidth <= maxPx) {
                applyWidth(savedWidth);
            }
        }

        resizerRef.value?.addEventListener('mousedown', onMouseDown);
    });

    onBeforeUnmount(() => {
        resizerRef.value?.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup',   onMouseUp);
        document.body.classList.remove('resizing');
    });

    return { isDragging };
}
