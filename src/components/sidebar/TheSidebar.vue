<script setup>
/**
 * @file src/components/sidebar/TheSidebar.vue
 * 侧边栏容器。三段式布局:header / 会话列表 / footer。
 *
 * 折叠状态由 prefsStore.preferences.sidebarOpen 控制,
 * 通过 CSS 类 `the-sidebar--collapsed` 把宽度收为 0。
 * 宽度由 ResizerBar 通过 inline style 写入,与折叠类不冲突
 * (折叠类用 width:0 !important 覆盖)。
 */

import { computed } from 'vue';

import SidebarHeader from './SidebarHeader.vue';
import SessionTree   from './SessionTree.vue';
import SidebarFooter from './SidebarFooter.vue';

import { usePrefsStore } from '@/stores/prefs.js';

const prefsStore = usePrefsStore();

/**
 * 是否折叠。折叠时 CSS 类把宽度收为 0,同时清掉 inline width
 * 由 ResizerBar 在折叠时自动处理(它发现折叠就停止响应)。
 */
const isCollapsed = computed(() => !prefsStore.preferences.sidebarOpen);
</script>

<template>
    <aside
        id="the-sidebar"
        class="the-sidebar"
        :class="{ 'the-sidebar--collapsed': isCollapsed }"
    >
        <!-- inner 包一层是为了让宽度收缩时内部内容不变形,
             与 ResizerBar 写入的 inline width 保持一致。 -->
        <div class="the-sidebar__inner">
            <SidebarHeader />
            <SessionTree />
            <SidebarFooter />
        </div>
    </aside>
</template>

<style scoped>
.the-sidebar {
    width: var(--sidebar-width);
    min-width: var(--sidebar-width);
    height: 100vh;
    background: var(--bg-elevated);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
    transition: width    var(--transition-slow) cubic-bezier(0.4, 0, 0.2, 1),
                min-width var(--transition-slow) cubic-bezier(0.4, 0, 0.2, 1),
                opacity   var(--transition-base);
}

.the-sidebar--collapsed {
    width: 0 !important;
    min-width: 0 !important;
    opacity: 0;
    pointer-events: none;
}

.the-sidebar__inner {
    width: var(--sidebar-width);
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
</style>
