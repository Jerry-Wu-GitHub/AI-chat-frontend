<script setup>
/**
 * @file src/components/settings/SettingsSidebar.vue
 * 设置面板左侧 tab 列。
 */

import BaseIcon from '@/components/common/BaseIcon.vue';

import { useSettingsPanel } from './useSettingsPanel.js';

const props = defineProps({
    /** tab 列表:[{ id, label, icon }] */
    tabs: {
        type: Array,
        required: true,
    },
});

const { activeTabId } = useSettingsPanel();

/**
 * 切换 tab。
 *
 * @param {string} tabId
 * @returns {void}
 */
function onSelectTab(tabId) {
    activeTabId.value = tabId;
}
</script>

<template>
    <aside class="settings-sidebar">
        <div class="settings-sidebar__header">设置</div>
        <nav class="settings-sidebar__tabs">
            <button
                v-for="tab in tabs"
                :key="tab.id"
                type="button"
                class="settings-sidebar__tab"
                :class="{ 'settings-sidebar__tab--active': tab.id === activeTabId }"
                @click="onSelectTab(tab.id)"
            >
                <BaseIcon :name="tab.icon" :size="14" />
                <span>{{ tab.label }}</span>
            </button>
        </nav>
    </aside>
</template>

<style scoped>
.settings-sidebar {
    width: 200px;
    flex-shrink: 0;
    background: var(--bg-elevated);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    padding: var(--space-3) var(--space-2);
    gap: var(--space-2);
}

.settings-sidebar__header {
    padding: 8px 10px 4px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    letter-spacing: 0.5px;
    text-transform: uppercase;
}

.settings-sidebar__tabs {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.settings-sidebar__tab {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 8px 10px;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-family: inherit;
    font-size: 13.5px;
    text-align: left;
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast);
}

.settings-sidebar__tab:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}

.settings-sidebar__tab--active {
    background: var(--accent-subtle);
    color: var(--accent-text);
    font-weight: 500;
}

@media (max-width: 640px) {
    .settings-sidebar {
        width: 140px;
    }
}
</style>
