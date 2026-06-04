<script setup>
/**
 * @file src/components/chat/ChatToolbar.vue
 * 聊天区顶部工具栏:折叠侧边栏按钮 + 模型选择器。
 */

import BaseButton from '@/components/common/BaseButton.vue';
import ModelSelect from './ModelSelect.vue';

import { usePrefsStore } from '@/stores/prefs.js';

const prefsStore = usePrefsStore();

/**
 * 切换侧边栏的展开/折叠状态。
 *
 * @returns {void}
 */
function onToggleSidebar() {
    prefsStore.updatePreferences({
        sidebarOpen: !prefsStore.preferences.sidebarOpen,
    });
}
</script>

<template>
    <header class="chat-toolbar">
        <BaseButton
            variant="icon"
            icon="sidebar-toggle"
            title="收起/展开侧边栏"
            @click="onToggleSidebar"
        />
        <ModelSelect />
    </header>
</template>

<style scoped>
.chat-toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 10px var(--space-4) 8px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    background: var(--bg-base);
}
</style>
