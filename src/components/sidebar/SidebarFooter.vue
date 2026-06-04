<script setup>
/**
 * @file src/components/sidebar/SidebarFooter.vue
 * 侧边栏底部:打开设置面板的入口。
 *
 * 设置面板自身的显示控制由 settings store 或一个简单的 ref 维护;
 * 这里用 provide/inject 太重,直接用一个共享 ref(挂在 useSettingsPanel 上)。
 */

import BaseIcon from '@/components/common/BaseIcon.vue';
import { useSettingsPanel } from '@/components/settings/useSettingsPanel.js';

const { openSettings } = useSettingsPanel();
</script>

<template>
    <footer class="sidebar-footer">
        <button
            type="button"
            class="sidebar-footer__settings-btn"
            @click="openSettings"
        >
            <BaseIcon name="settings" :size="16" class="sidebar-footer__settings-icon" />
            <span>设置</span>
        </button>
    </footer>
</template>

<style scoped>
.sidebar-footer {
    flex-shrink: 0;
    padding: var(--space-2) var(--space-2) var(--space-3);
    border-top: 1px solid var(--border);
}

.sidebar-footer__settings-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 8px 10px;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 13.5px;
    font-family: inherit;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast);
}
.sidebar-footer__settings-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}

.sidebar-footer__settings-icon {
    color: var(--text-muted);
    transition: color var(--transition-fast), transform var(--transition-base);
}
.sidebar-footer__settings-btn:hover .sidebar-footer__settings-icon {
    color: var(--accent);
    transform: rotate(45deg);
}
</style>
