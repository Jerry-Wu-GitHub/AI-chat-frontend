<script setup>
/**
 * @file src/components/sidebar/SessionTree.vue
 * 整棵会话树的渲染入口:从根组开始递归。
 *
 * 把"展开/折叠的组 id 集合"维护在这里(响应式 Set),
 * 通过 provide 传给所有后代 GroupItem,避免 prop drill。
 */

import { ref, provide } from 'vue';

import GroupItem from './GroupItem.vue';
import { ROOT_GROUP_ID } from '@/stores/groups.js';

/**
 * 已展开的组 id 集合。
 * 默认展开根组,后续用户点击 chevron 切换。
 *
 * @type {import('vue').Ref<Set<string>>}
 */
const expandedGroupIds = ref(new Set([ROOT_GROUP_ID]));

/**
 * 切换某个组的展开状态。
 *
 * @param {string} groupId
 * @returns {void}
 */
function toggleGroupExpanded(groupId) {
    const next = new Set(expandedGroupIds.value);
    if (next.has(groupId)) {
        next.delete(groupId);
    } else {
        next.add(groupId);
    }
    expandedGroupIds.value = next;
}

/**
 * 确保某个组处于展开状态(新建子项后需要让父组展开,以便看到新建的内容)。
 *
 * @param {string} groupId
 * @returns {void}
 */
function expandGroup(groupId) {
    if (expandedGroupIds.value.has(groupId)) return;
    const next = new Set(expandedGroupIds.value);
    next.add(groupId);
    expandedGroupIds.value = next;
}

// 通过 provide 把展开状态暴露给后代;后代用 inject('sidebarExpansion') 获取。
provide('sidebarExpansion', {
    expandedGroupIds,
    toggleGroupExpanded,
    expandGroup,
});
</script>

<template>
    <nav class="session-tree" aria-label="会话列表">
        <!-- 根组本身也是一个 GroupItem,depth=0。 -->
        <GroupItem :group-id="ROOT_GROUP_ID" :depth="0" />
    </nav>
</template>

<style scoped>
.session-tree {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2);
    display: flex;
    flex-direction: column;
    gap: 2px;
}

/* 滚动条:平时透明,hover 时显示。 */
.session-tree::-webkit-scrollbar { width: 6px; }
.session-tree::-webkit-scrollbar-track { background: transparent; }
.session-tree::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 99px;
    transition: background var(--transition-fast);
}
.session-tree:hover::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
}
.session-tree:hover::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-thumb-hover);
}
.session-tree { scrollbar-width: thin; scrollbar-color: transparent transparent; }
.session-tree:hover { scrollbar-color: var(--scrollbar-thumb) transparent; }
</style>
