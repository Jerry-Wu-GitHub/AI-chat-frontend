<script setup>
/**
 * @file src/components/settings/SettingsPanel.vue
 * 设置面板总容器。
 *
 * 显隐由 useSettingsPanel() 共享 ref 控制。
 * 内部 tab 切换:左侧 SettingsSidebar 决定 activeTabId,
 * 右侧根据 activeTabId 渲染对应的 pane。
 *
 * 点遮罩 / Esc 关闭。
 */

import { computed, onMounted, onBeforeUnmount } from 'vue';

import SettingsSidebar from './SettingsSidebar.vue';
import BaseIcon        from '@/components/common/BaseIcon.vue';

import PrefsPane      from './panes/PrefsPane.vue';
import ServicesPane   from './panes/ServicesPane.vue';
import ChatPrefsPane  from './panes/ChatPrefsPane.vue';

import { useSettingsPanel } from './useSettingsPanel.js';

const {
    isSettingsOpen,
    activeTabId,
    closeSettings,
} = useSettingsPanel();

/**
 * tab 配置:id、显示名、图标。同时决定 SettingsSidebar 的列表顺序。
 */
const TABS = [
    { id: 'prefs',     label: '用户偏好',  icon: 'settings' },
    { id: 'services',  label: '服务管理',  icon: 'folder'   },
    { id: 'chat',      label: '聊天对话',  icon: 'chat-bubble' },
];

/** 当前 tab 的标题(显示在右侧 header)。 */
const activeTabLabel = computed(() => {
    return TABS.find(tab => tab.id === activeTabId.value)?.label || '设置';
});

/**
 * 点击遮罩(非内容区)关闭。
 *
 * @param {MouseEvent} event
 * @returns {void}
 */
function onOverlayClick(event) {
    if (event.target === event.currentTarget) {
        closeSettings();
    }
}

/**
 * @param {KeyboardEvent} event
 * @returns {void}
 */
function onKeyDown(event) {
    if (event.key === 'Escape' && isSettingsOpen.value) {
        closeSettings();
    }
}

onMounted(() => {
    document.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
    <Teleport to="body">
        <div
            v-if="isSettingsOpen"
            class="settings-overlay"
            @click="onOverlayClick"
        >
            <div class="settings-panel" role="dialog" aria-modal="true">
                <SettingsSidebar :tabs="TABS" />

                <section class="settings-content">
                    <header class="settings-content__header">
                        <h2 class="settings-content__title">{{ activeTabLabel }}</h2>
                        <button
                            type="button"
                            class="settings-content__close-btn"
                            title="关闭"
                            aria-label="关闭"
                            @click="closeSettings"
                        >
                            <BaseIcon name="close" :size="16" />
                        </button>
                    </header>

                    <div class="settings-content__body">
                        <PrefsPane     v-if="activeTabId === 'prefs'" />
                        <ServicesPane  v-else-if="activeTabId === 'services'" />
                        <ChatPrefsPane v-else-if="activeTabId === 'chat'" />
                    </div>
                </section>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
.settings-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(6px);
    z-index: 9500;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fade-in var(--transition-fast) ease;
}

.settings-panel {
    width: min(880px, calc(100vw - 48px));
    height: min(620px, calc(100vh - 48px));
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    display: flex;
    overflow: hidden;
    animation: slide-up var(--transition-base) ease;
}

.settings-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
}

.settings-content__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
}

.settings-content__title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.settings-content__close-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--text-muted);
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast);
}
.settings-content__close-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}

.settings-content__body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-5);
}

/* 移动端 */
@media (max-width: 640px) {
    .settings-panel {
        width: 100vw;
        height: 100vh;
        border-radius: 0;
    }
}
</style>
