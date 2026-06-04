<script setup>
/**
 * @file src/components/common/BaseDropdown.vue
 * 通用下拉菜单。
 *
 * 用法(典型场景:三点菜单):
 *   <BaseDropdown :items="menuItems">
 *       <template #trigger="{ toggle, isOpen }">
 *           <button @click.stop="toggle">⋮</button>
 *       </template>
 *   </BaseDropdown>
 *
 * items 结构:
 *   { label, icon?, className?, onClick }
 *
 * 设计要点:
 *   - 触发按钮和菜单项都通过 slot 暴露 toggle / close 方法,
 *     允许调用方完全自定义触发器外观。
 *   - 菜单本身定位 fixed,挂在 trigger 旁边,自动避开屏幕边缘。
 *   - 点击外部 / Esc 自动关闭(由 useDropdown 提供)。
 */

import { ref, computed, nextTick, watch } from 'vue';
import { useDropdown } from '@/composables/useDropdown.js';
import BaseIcon from './BaseIcon.vue';

const props = defineProps({
    /** 菜单项列表 */
    items: {
        type: Array,
        required: true,
    },
    /** 面板最小宽度(像素) */
    minWidth: {
        type: Number,
        default: 140,
    },
});

/** @type {import('vue').Ref<HTMLElement | null>} */
const triggerWrapperRef = ref(null);
/** @type {import('vue').Ref<HTMLElement | null>} */
const dropdownRef = ref(null);

const { isOpen, open, close, toggle } = useDropdown(triggerWrapperRef, dropdownRef);

/** 计算菜单的 fixed 定位坐标。 */
const panelPosition = ref({ top: 0, left: 0 });

/**
 * 菜单弹出时,根据触发器位置和窗口边界计算面板坐标。
 */
async function updatePanelPosition() {
    await nextTick();
    const triggerElement = triggerWrapperRef.value;
    const dropdownElement = dropdownRef.value;
    if (!triggerElement || !dropdownElement) return;

    const triggerRect = triggerElement.getBoundingClientRect();
    const dropdownRect = dropdownElement.getBoundingClientRect();

    let top  = triggerRect.bottom + 4;
    let left = triggerRect.right - dropdownRect.width;

    // 下方放不下就放上方
    if (top + dropdownRect.height > window.innerHeight - 8) {
        top = triggerRect.top - dropdownRect.height - 4;
    }
    // 左侧贴边保护
    if (left < 8) left = 8;

    panelPosition.value = { top, left };
}

watch(isOpen, (newValue) => {
    if (newValue) updatePanelPosition();
});

/**
 * 点击菜单项:执行回调并关闭菜单。
 *
 * @param {{ onClick: Function }} item
 * @returns {void}
 */
function onItemClick(item) {
    close();
    item.onClick?.();
}

/**
 * 计算菜单的样式(位置 + 最小宽度)。
 */
const panelStyle = computed(() => ({
    top:      `${panelPosition.value.top}px`,
    left:     `${panelPosition.value.left}px`,
    minWidth: `${props.minWidth}px`,
}));
</script>

<template>
    <div ref="triggerWrapperRef" class="dropdown-trigger-wrapper">
        <slot name="trigger" :toggle="toggle" :open="open" :close="close" :is-open="isOpen" />

        <Teleport to="body">
            <div
                v-if="isOpen"
                ref="dropdownRef"
                class="dropdown-panel"
                :style="panelStyle"
                role="menu"
            >
                <button
                    v-for="(item, index) in items"
                    :key="index"
                    type="button"
                    role="menuitem"
                    class="dropdown-item"
                    :class="item.className"
                    @click="onItemClick(item)"
                >
                    <BaseIcon v-if="item.icon" :name="item.icon" class="dropdown-item__icon" />
                    <span class="dropdown-item__label">{{ item.label }}</span>
                </button>
            </div>
        </Teleport>
    </div>
</template>

<style scoped>
.dropdown-trigger-wrapper {
    display: inline-block;
}

.dropdown-panel {
    position: fixed;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
    padding: 4px;
    z-index: 1000;
    animation: dropdown-slide-up 120ms ease;
    display: flex;
    flex-direction: column;
    gap: 1px;
}

.dropdown-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: 7px 10px;
    border-radius: var(--radius-sm);
    font-size: 13.5px;
    font-family: inherit;
    color: var(--text-primary);
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background var(--transition-fast), color var(--transition-fast);
}

.dropdown-item:hover {
    background: var(--bg-hover);
}

.dropdown-item.danger {
    color: var(--danger);
}
.dropdown-item.danger:hover {
    background: var(--danger-subtle);
}

.dropdown-item__icon {
    width: 13px;
    height: 13px;
    font-size: 13px;
    flex-shrink: 0;
}

.dropdown-item__label {
    flex: 1;
}

@keyframes dropdown-slide-up {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
}
</style>
