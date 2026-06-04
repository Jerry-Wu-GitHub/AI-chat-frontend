<script setup>
/**
 * @file src/components/sidebar/SidebarHeader.vue
 * 侧边栏顶部:会话计数 + 导入按钮。
 */

import { computed } from 'vue';

import BaseIcon from '@/components/common/BaseIcon.vue';

import { useSessionsStore } from '@/stores/sessions.js';
import { ROOT_GROUP_ID }    from '@/stores/groups.js';
import { startImportFlow }  from '@/components/import-export/importFlow.js';

const sessionsStore = useSessionsStore();

/** 会话总数。 */
const sessionCount = computed(() => sessionsStore.allSessions.length);

/**
 * 触发导入,目标为根组。
 *
 * @returns {void}
 */
function onImportToRoot() {
    startImportFlow(ROOT_GROUP_ID);
}
</script>

<template>
    <header class="sidebar-header">
        <div class="sidebar-header__meta">
            <span class="sidebar-header__count">{{ sessionCount }} 个会话</span>

            <button
                type="button"
                class="sidebar-header__import-btn"
                title="导入会话"
                @click="onImportToRoot"
            >
                <BaseIcon name="import" :size="13" />
                导入
            </button>
        </div>
    </header>
</template>

<style scoped>
.sidebar-header {
    flex-shrink: 0;
    padding: var(--space-4) var(--space-3) var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    border-bottom: 1px solid var(--border);
}

.sidebar-header__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
}

.sidebar-header__count {
    font-size: 12px;
    color: var(--text-muted);
}

.sidebar-header__import-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 9px 3px 7px;
    background: var(--bg-subtle);
    color: var(--text-secondary);
    border: 1px solid var(--border);
    border-radius: 99px;
    font-size: 12px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast);
}
.sidebar-header__import-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}
</style>
