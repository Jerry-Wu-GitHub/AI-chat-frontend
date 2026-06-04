<script setup>
/**
 * @file src/components/chat/ModelSelect.vue
 * 自定义模型选择器(分组下拉)。
 *
 * 交互:
 *   - 鼠标进入触发按钮 → 展开面板
 *   - 鼠标在 trigger 或面板内 → 保持展开
 *   - 鼠标完全离开 → 延时 150ms 收起(给用户从 trigger 移到面板的时间)
 *   - 鼠标在组名列表上 hover → 切换右侧模型
 *   - 点击模型 → 立即选中并关闭
 *   - 关闭时有淡出动画(by Vue <Transition>)
 */

import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';

import BaseIcon from '@/components/common/BaseIcon.vue';
import { useModelsStore } from '@/stores/models.js';

const modelsStore = useModelsStore();

/** @type {import('vue').Ref<HTMLElement | null>} */
const triggerRef = ref(null);
/** @type {import('vue').Ref<HTMLElement | null>} */
const dropdownRef = ref(null);

const isOpen = ref(false);

/** 关闭延时定时器。 */
/** @type {ReturnType<typeof setTimeout> | null} */
let closeTimerId = null;

/** 当前 hover 中的组名(右侧列展示这个组的模型)。 */
const hoveredGroupName = ref('');

/** 面板 fixed 定位坐标。 */
const panelPosition = ref({ top: 0, left: 0 });

/** 触发按钮显示的文字。 */
const triggerLabel = computed(() => {
    if (modelsStore.isLoading) return '加载模型中...';
    if (modelsStore.models.length === 0) return '无可用模型';
    return modelsStore.selectedModelId || '选择模型';
});

/** 所有组名(已排序)。 */
const groupNames = computed(() => {
    return [...modelsStore.modelsByGroup.keys()].sort((a, b) => a.localeCompare(b));
});

/** 右列要展示的模型列表。 */
const visibleModels = computed(() => {
    if (!hoveredGroupName.value) return [];
    return modelsStore.modelsByGroup.get(hoveredGroupName.value) || [];
});

const panelPositionStyle = computed(() => ({
    top:  `${panelPosition.value.top}px`,
    left: `${panelPosition.value.left}px`,
}));

/**
 * 打开下拉(取消可能挂起的关闭)。
 */
function openPanel() {
    if (closeTimerId !== null) {
        clearTimeout(closeTimerId);
        closeTimerId = null;
    }
    if (isOpen.value) return;

    // 默认 hover 第一组
    if (!hoveredGroupName.value && groupNames.value.length > 0) {
        hoveredGroupName.value = groupNames.value[0];
    }
    isOpen.value = true;
}

/**
 * 延时关闭(150ms),给鼠标从 trigger 移到面板的缓冲时间。
 */
function scheduleClose() {
    if (closeTimerId !== null) clearTimeout(closeTimerId);
    closeTimerId = setTimeout(() => {
        isOpen.value = false;
        closeTimerId = null;
    }, 150);
}

/**
 * 立刻关闭(选中模型时)。
 */
function closePanel() {
    if (closeTimerId !== null) {
        clearTimeout(closeTimerId);
        closeTimerId = null;
    }
    isOpen.value = false;
}

/**
 * 鼠标进入组名时切换右侧。
 *
 * @param {string} groupName
 * @returns {void}
 */
function onGroupHover(groupName) {
    hoveredGroupName.value = groupName;
}

/**
 * 点击模型 → 选中并关闭。
 *
 * @param {object} model
 * @returns {void}
 */
function onSelectModel(model) {
    modelsStore.selectModel(model.id, model._serviceId);
    closePanel();
}

/**
 * 展开后定位到 trigger 下方。
 */
watch(isOpen, async (newValue) => {
    if (!newValue) return;
    await nextTick();
    const rect = triggerRef.value?.getBoundingClientRect();
    if (!rect) return;
    panelPosition.value = {
        top:  rect.bottom + 4,
        left: rect.left,
    };
});

onBeforeUnmount(() => {
    if (closeTimerId !== null) clearTimeout(closeTimerId);
});
</script>

<template>
    <div
        ref="triggerRef"
        class="model-select"
        @mouseenter="openPanel"
        @mouseleave="scheduleClose"
    >
        <button
            type="button"
            class="model-select__trigger"
            :aria-expanded="isOpen"
        >
            <span class="model-select__label">{{ triggerLabel }}</span>
            <BaseIcon
                name="chevron-down"
                :size="10"
                class="model-select__chevron"
                :class="{ 'model-select__chevron--open': isOpen }"
            />
        </button>

        <Teleport to="body">
            <Transition name="model-select-fade">
                <div
                    v-if="isOpen"
                    ref="dropdownRef"
                    class="model-select__panel"
                    :style="panelPositionStyle"
                    @mouseenter="openPanel"
                    @mouseleave="scheduleClose"
                >
                    <div class="model-select__panel-inner">
                        <div class="model-select__group-list">
                            <div
                                v-for="groupName in groupNames"
                                :key="groupName"
                                class="model-select__group-item"
                                :class="{
                                    'model-select__group-item--active': hoveredGroupName === groupName,
                                }"
                                @mouseenter="onGroupHover(groupName)"
                            >
                                {{ groupName }}
                            </div>
                        </div>

                        <div class="model-select__item-list">
                            <div
                                v-if="visibleModels.length === 0"
                                class="model-select__hint"
                            >
                                请悬停到一个分组
                            </div>
                            <button
                                v-for="model in visibleModels"
                                :key="`${model._serviceId}-${model.id}`"
                                type="button"
                                class="model-select__model-item"
                                :class="{
                                    'model-select__model-item--selected':
                                        model.id === modelsStore.selectedModelId
                                        && model._serviceId === modelsStore.selectedServiceId,
                                }"
                                @click="onSelectModel(model)"
                            >
                                <span class="model-select__model-name">{{ model.id }}</span>
                                <span v-if="model.owned_by" class="model-select__model-owner">
                                    {{ model.owned_by }}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<style scoped>
/* trigger / panel 视觉样式保持原状,只改了动画。 */

.model-select {
    position: relative;
    display: inline-block;
}

.model-select__trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px 6px 12px;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-family: inherit;
    font-size: 13.5px;
    color: var(--text-primary);
    cursor: pointer;
    max-width: 240px;
    transition: border var(--transition-fast), box-shadow var(--transition-fast);
    white-space: nowrap;
    overflow: hidden;
}
.model-select:hover .model-select__trigger,
.model-select__trigger:hover {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
}

.model-select__label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
}

.model-select__chevron {
    flex-shrink: 0;
    transition: transform var(--transition-fast);
}
.model-select__chevron--open {
    transform: rotate(180deg);
}

.model-select__panel {
    position: fixed;
    z-index: 3000;
    min-width: 160px;
}

.model-select__panel-inner {
    display: flex;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
    overflow: hidden;
}

.model-select__group-list {
    min-width: 110px;
    border-right: 1px solid var(--border);
    padding: var(--space-1) 0;
    flex-shrink: 0;
}

.model-select__group-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 12px;
    font-size: 13px;
    color: var(--text-secondary);
    cursor: default;
    white-space: nowrap;
    transition: background var(--transition-fast), color var(--transition-fast);
    gap: 6px;
}
.model-select__group-item:hover,
.model-select__group-item--active {
    background: var(--bg-hover);
    color: var(--text-primary);
}
.model-select__group-item::after {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    border-right: 1.5px solid currentColor;
    border-top:   1.5px solid currentColor;
    transform: rotate(45deg);
    opacity: 0.5;
    flex-shrink: 0;
}

.model-select__item-list {
    min-width: 200px;
    max-height: 320px;
    overflow-y: auto;
    padding: var(--space-1) 0;
}

.model-select__hint {
    padding: 12px 16px;
    font-size: 12px;
    color: var(--text-muted);
}

.model-select__model-item {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-3);
    width: 100%;
    padding: 7px 16px;
    background: transparent;
    border: none;
    font-family: inherit;
    font-size: 13px;
    color: var(--text-secondary);
    text-align: left;
    cursor: pointer;
    white-space: nowrap;
    transition: background var(--transition-fast), color var(--transition-fast);
}
.model-select__model-item:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}
.model-select__model-item--selected {
    color: var(--accent);
    font-weight: 500;
}

.model-select__model-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.model-select__model-owner {
    flex-shrink: 0;
    font-size: 11px;
    color: var(--text-muted);
    opacity: 0.85;
    letter-spacing: 0.02em;
}
.model-select__model-item:hover .model-select__model-owner {
    color: var(--text-secondary);
    opacity: 1;
}
.model-select__model-item--selected .model-select__model-owner {
    color: var(--accent);
    opacity: 0.75;
}

/* Vue <Transition> 动画 */
.model-select-fade-enter-active,
.model-select-fade-leave-active {
    transition: opacity 150ms ease, transform 150ms ease;
}
.model-select-fade-enter-from,
.model-select-fade-leave-to {
    opacity: 0;
    transform: translateY(-6px);
}
</style>
