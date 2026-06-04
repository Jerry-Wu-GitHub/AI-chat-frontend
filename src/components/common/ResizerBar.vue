<script setup>
/**
 * @file src/components/common/ResizerBar.vue
 * 可拖动分界条。侧边栏和预览面板共用一个组件,通过 `kind` 区分行为。
 *
 * 用法:
 *   <ResizerBar kind="sidebar" :min-width="180" :max-width="480"
 *               storage-key="ai_chat_sidebar_width" />
 *
 * 两种 kind:
 *   - 'sidebar':分界条向右拖 → 侧边栏变宽(deltaSign = +1)
 *   - 'preview':分界条向左拖 → 预览面板变宽(deltaSign = -1)
 *
 * 当对应面板隐藏(侧边栏 collapsed / 预览面板 currentFile=null)时,
 * 分界条会自动隐藏(避免拖一根没用的线)。
 */

import { ref, computed } from 'vue';
import { useResizer } from '@/composables/useResizer.js';
import { usePrefsStore } from '@/stores/prefs.js';
import { usePreviewStore } from '@/stores/preview.js';

const props = defineProps({
    /** 'sidebar' | 'preview' */
    kind: {
        type: String,
        required: true,
        validator: (value) => ['sidebar', 'preview'].includes(value),
    },
    minWidth: {
        type: [Number, Function],
        required: true,
    },
    maxWidth: {
        type: [Number, Function],
        required: true,
    },
    storageKey: {
        type: String,
        required: true,
    },
});

/** @type {import('vue').Ref<HTMLElement | null>} */
const resizerRef = ref(null);

const prefsStore   = usePrefsStore();
const previewStore = usePreviewStore();

/**
 * 找到要被调整宽度的目标元素。
 * 用 ID 选择器,避免组件之间相互 prop 传递引用。
 *
 * @returns {HTMLElement | null}
 */
function getTargetElement() {
    if (props.kind === 'sidebar') {
        return document.getElementById('the-sidebar');
    }
    return document.getElementById('the-preview-panel');
}

/**
 * 读取目标元素当前宽度。
 *
 * @returns {number}
 */
function getCurrentWidth() {
    const element = getTargetElement();
    if (!element) return props.minWidth;
    return element.getBoundingClientRect().width;
}

/**
 * 应用新宽度。侧边栏要同时更新 CSS 变量 --sidebar-width。
 *
 * @param {number} width
 * @returns {void}
 */
function applyWidth(width) {
    const element = getTargetElement();
    if (!element) return;

    if (props.kind === 'sidebar') {
        // 同时设置 CSS 变量,这样依赖该变量的子元素(.sidebar-inner)也会跟着变。
        document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
        // 折叠状态下不写 inline width,让 CSS 类的 width:0 生效。
        if (!element.classList.contains('collapsed')) {
            element.style.width    = `${width}px`;
            element.style.minWidth = `${width}px`;
        }
    } else {
        element.style.width    = `${width}px`;
        element.style.minWidth = `${width}px`;
    }
}

const { isDragging } = useResizer(resizerRef, {
    storageKey:      props.storageKey,
    minWidth:        props.minWidth,
    maxWidth:        props.maxWidth,
    deltaSign:       props.kind === 'sidebar' ? 1 : -1,
    getCurrentWidth,
    applyWidth,
});

/**
 * 当目标面板隐藏时,分界条也跟着隐藏。
 */
const isHidden = computed(() => {
    if (props.kind === 'sidebar') {
        return !prefsStore.preferences.sidebarOpen;
    }
    return !previewStore.isVisible;
});
</script>

<template>
    <div
        v-show="!isHidden"
        ref="resizerRef"
        class="resizer-bar"
        :class="{ 'resizer-bar--dragging': isDragging }"
        role="separator"
        aria-orientation="vertical"
    />
</template>

<style scoped>
.resizer-bar {
    flex-shrink: 0;
    width: 5px;
    cursor: col-resize;
    background: transparent;
    position: relative;
    z-index: 10;
    margin: 0 -3px;
    padding: 0 3px;
    box-sizing: content-box;
}

/* 视觉上的细线靠伪元素实现,真正的命中区域比它宽得多。 */
.resizer-bar::after {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 1px;
    height: 100%;
    background: var(--border);
    transition: background var(--transition-fast), width var(--transition-fast);
}

.resizer-bar:hover::after,
.resizer-bar--dragging::after {
    background: var(--accent);
    width: 2px;
}
</style>
