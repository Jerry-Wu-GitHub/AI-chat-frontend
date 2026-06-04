<script setup>
/**
 * @file src/components/sidebar/GroupItem.vue
 * 单个会话组行 + 其展开后的子项。组件自递归实现树形结构。
 *
 * 一行的结构:
 *   [chevron] [folder icon] [name ......................] [+] [⋮]
 *
 * 展开后,把 groups.getGroupChildren 返回的子项依次渲染:
 *   - type 'group':  → 嵌套 GroupItem(depth+1)
 *   - type 'session': → SessionItem
 */

import { computed, inject } from 'vue';

import BaseIcon       from '@/components/common/BaseIcon.vue';
import BaseDropdown   from '@/components/common/BaseDropdown.vue';
import SessionItem    from './SessionItem.vue';
import { useSidebarActions } from './useSidebarActions.js';

import { useGroupsStore, ROOT_GROUP_ID } from '@/stores/groups.js';
import { useChatStore } from '@/stores/chat.js';

const props = defineProps({
    /** 当前组的 id */
    groupId: {
        type: String,
        required: true,
    },
    /** 缩进层级(根组为 0) */
    depth: {
        type: Number,
        required: true,
    },
});

const groupsStore = useGroupsStore();
const chatStore   = useChatStore();
const sidebarActions = useSidebarActions();

/** 注入展开状态。 */
const expansion = inject('sidebarExpansion');

/** 当前组对象。 */
const group = computed(() => groupsStore.findGroupById(props.groupId));

/** 是否是根组(根组不可删除/移动/重命名为某些操作)。 */
const isRoot = computed(() => props.groupId === ROOT_GROUP_ID);

/** 是否展开。 */
const isOpen = computed(() => expansion.expandedGroupIds.value.has(props.groupId));

/** 当前组是否是当前活动会话的祖先(用于高亮)。 */
const isAncestorOfActive = computed(() => {
    const activeId = chatStore.currentSessionId;
    if (!activeId) return false;
    return groupsStore.getSessionAncestorGroups(activeId)
        .some(ancestor => ancestor.id === props.groupId);
});

/** 当前组展开后要渲染的子项列表(按活跃时间排序)。 */
const children = computed(() => {
    if (!isOpen.value) return [];
    return groupsStore.getGroupChildren(props.groupId);
});

/** chevron 用 right 图标,展开时旋转 90° 来表示朝下。 */
const chevronTransformStyle = computed(() => ({
    transform: isOpen.value ? 'rotate(90deg)' : 'rotate(0deg)',
}));

/**
 * 切换展开/折叠。
 *
 * @returns {void}
 */
function toggleExpansion() {
    expansion.toggleGroupExpanded(props.groupId);
}

/**
 * 行整体被点击(非按钮区域)。点击行也切换展开。
 *
 * @param {MouseEvent} event
 * @returns {void}
 */
function onRowClick(event) {
    // 子按钮的点击在它们自己的 handler 里 stopPropagation,
    // 这里再做一道兜底:如果点的是按钮区域,不响应。
    if (event.target.closest('.group-item__actions')) return;
    toggleExpansion();
}

/**
 * 新建会话按钮:在当前组下新建一个空会话。
 *
 * @param {MouseEvent} event
 * @returns {void}
 */
function onAddSession(event) {
    event.stopPropagation();
    expansion.expandGroup(props.groupId);
    chatStore.createAndSwitchSession(props.groupId);
}

/**
 * 构造三点菜单的项目列表。
 *
 * 根组的菜单略有不同:不允许移动 / 删除。
 */
const menuItems = computed(() => {
    const items = [
        {
            label:   '新建会话组',
            icon:    'folder',
            onClick: () => sidebarActions.createSubGroup(props.groupId, () => {
                expansion.expandGroup(props.groupId);
            }),
        },
        {
            label:   '重命名',
            icon:    'edit',
            onClick: () => sidebarActions.renameGroup(props.groupId),
        },
    ];

    if (!isRoot.value) {
        items.push({
            label:   '移动',
            icon:    'move',
            onClick: () => sidebarActions.moveItem(props.groupId, 'group'),
        });
    }

    items.push(
        {
            label:   '系统提示',
            icon:    'prompt-shield',
            onClick: () => sidebarActions.editGroupSystemPrompt(props.groupId),
        },
        {
            label:   '导出',
            icon:    'export',
            onClick: () => sidebarActions.exportItem(props.groupId, 'group'),
        },
        {
            label:   '导入',
            icon:    'import',
            onClick: () => sidebarActions.importIntoGroup(props.groupId),
        },
    );

    if (!isRoot.value) {
        items.push({
            label:     '删除',
            icon:      'trash',
            className: 'danger',
            onClick: () => sidebarActions.deleteGroup(props.groupId),
        });
    }

    return items;
});
</script>

<template>
    <div
        v-if="group"
        class="group-item"
        :class="{ 'group-item--ancestor': isAncestorOfActive }"
        :style="{ '--group-depth': depth }"
    >
        <div class="group-item__row" @click="onRowClick">
            <button
                type="button"
                class="group-item__chevron"
                :title="isOpen ? '收起' : '展开'"
                @click.stop="toggleExpansion"
            >
                <BaseIcon name="chevron-right" :size="12" :style="chevronTransformStyle" />
            </button>

            <BaseIcon
                :name="isOpen ? 'folder-open' : 'folder'"
                :size="13"
                class="group-item__folder-icon"
            />

            <span class="group-item__name" :title="group.name">{{ group.name }}</span>

            <div class="group-item__actions">
                <button
                    type="button"
                    class="group-item__action-btn"
                    title="新建会话"
                    @click="onAddSession"
                >
                    <BaseIcon name="plus" :size="13" />
                </button>

                <BaseDropdown :items="menuItems" :min-width="150">
                    <template #trigger="{ toggle }">
                        <button
                            type="button"
                            class="group-item__action-btn"
                            title="更多操作"
                            @click.stop="toggle"
                        >
                            <BaseIcon name="more-vertical" :size="13" />
                        </button>
                    </template>
                </BaseDropdown>
            </div>
        </div>

        <!-- 子项:递归渲染。 -->
        <template v-if="isOpen">
            <template v-for="child in children" :key="`${child.type}-${child.id}`">
                <GroupItem
                    v-if="child.type === 'group'"
                    :group-id="child.id"
                    :depth="depth + 1"
                />
                <SessionItem
                    v-else
                    :session-id="child.id"
                    :depth="depth + 1"
                />
            </template>
        </template>
    </div>
</template>

<script>
/**
 * Vue SFC 自递归:必须显式 export name 才能让模板里 <GroupItem> 自引用。
 */
export default { name: 'GroupItem' };
</script>

<style scoped>
/* 每级缩进 14px。--group-depth 来自 inline style。 */
.group-item__row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 8px 6px calc(8px + var(--group-depth) * 14px);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background var(--transition-fast);
    position: relative;
    min-width: 0;
    user-select: none;
}
.group-item__row:hover {
    background: var(--bg-hover);
}

/* 当前活动会话的祖先组高亮。 */
.group-item--ancestor > .group-item__row {
    border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
    background: color-mix(in srgb, var(--accent) 6%, transparent);
}
.group-item--ancestor > .group-item__row .group-item__name {
    color: var(--accent-text);
}
.group-item--ancestor > .group-item__row .group-item__folder-icon {
    color: var(--accent);
}
.group-item--ancestor > .group-item__row:hover {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.group-item__chevron {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--text-muted);
    border-radius: var(--radius-sm);
    cursor: pointer;
    padding: 0;
}
.group-item__chevron:hover {
    color: var(--text-primary);
}
.group-item__chevron :deep(.base-icon) {
    transition: transform var(--transition-base);
}

.group-item__folder-icon {
    flex-shrink: 0;
    color: var(--text-secondary);
}

.group-item__name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
}

.group-item__actions {
    display: flex;
    align-items: center;
    gap: 1px;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity var(--transition-fast);
}
.group-item__row:hover .group-item__actions {
    opacity: 1;
}

.group-item__action-btn {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--text-muted);
    border-radius: var(--radius-sm);
    cursor: pointer;
    padding: 0;
    transition: background var(--transition-fast), color var(--transition-fast);
}
.group-item__action-btn:hover {
    background: var(--bg-active);
    color: var(--text-primary);
}
</style>
