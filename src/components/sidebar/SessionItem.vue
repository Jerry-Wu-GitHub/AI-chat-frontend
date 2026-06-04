<script setup>
/**
 * @file src/components/sidebar/SessionItem.vue
 * 单条会话行。点击 → 切换;三点菜单 → 重命名/移动/编辑提示词/导出/删除。
 */

import { computed } from 'vue';

import BaseIcon     from '@/components/common/BaseIcon.vue';
import BaseDropdown from '@/components/common/BaseDropdown.vue';
import { useSidebarActions } from './useSidebarActions.js';

import { useSessionsStore } from '@/stores/sessions.js';
import { useChatStore }     from '@/stores/chat.js';

const props = defineProps({
    sessionId: {
        type: String,
        required: true,
    },
    depth: {
        type: Number,
        required: true,
    },
});

const sessionsStore = useSessionsStore();
const chatStore     = useChatStore();
const sidebarActions = useSidebarActions();

const session = computed(() => sessionsStore.findSessionById(props.sessionId));
const isActive = computed(() => chatStore.currentSessionId === props.sessionId);

/**
 * 切换到这条会话。
 *
 * @param {MouseEvent} event
 * @returns {void}
 */
function onRowClick(event) {
    if (event.target.closest('.session-item__menu-btn')) return;
    chatStore.switchToSession(props.sessionId);
}

const menuItems = computed(() => [
    {
        label:   '重命名',
        icon:    'edit',
        onClick: () => sidebarActions.renameSession(props.sessionId),
    },
    {
        label:   '移动',
        icon:    'move',
        onClick: () => sidebarActions.moveItem(props.sessionId, 'session'),
    },
    {
        label:   '系统提示',
        icon:    'prompt-shield',
        onClick: () => sidebarActions.editSessionSystemPrompt(props.sessionId),
    },
    {
        label:   '导出',
        icon:    'export',
        onClick: () => sidebarActions.exportItem(props.sessionId, 'session'),
    },
    {
        label:     '删除',
        icon:      'trash',
        className: 'danger',
        onClick: () => sidebarActions.deleteSession(props.sessionId),
    },
]);
</script>

<template>
    <div
        v-if="session"
        class="session-item"
        :class="{ 'session-item--active': isActive }"
        :style="{ '--session-depth': depth }"
        @click="onRowClick"
    >
        <BaseIcon name="chat-bubble" :size="13" class="session-item__icon" />

        <span class="session-item__title" :title="session.title">
            {{ session.title }}
        </span>

        <BaseDropdown :items="menuItems" :min-width="140">
            <template #trigger="{ toggle }">
                <button
                    type="button"
                    class="session-item__menu-btn"
                    title="更多操作"
                    @click.stop="toggle"
                >
                    <BaseIcon name="more-vertical" :size="13" />
                </button>
            </template>
        </BaseDropdown>
    </div>
</template>

<style scoped>
.session-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 8px 10px 8px calc(10px + var(--session-depth) * 14px);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background var(--transition-fast);
    position: relative;
    min-width: 0;
}
.session-item:hover {
    background: var(--bg-hover);
}

.session-item--active {
    background: var(--accent-subtle);
    color: var(--accent-text);
}

.session-item__icon {
    flex-shrink: 0;
    color: var(--text-muted);
}
.session-item--active .session-item__icon {
    color: var(--accent-text);
}

.session-item__title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13.5px;
}

.session-item__menu-btn {
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--text-muted);
    border-radius: var(--radius-sm);
    cursor: pointer;
    padding: 0;
    opacity: 0;
    transition: opacity var(--transition-fast), background var(--transition-fast);
}
.session-item:hover .session-item__menu-btn,
.session-item--active .session-item__menu-btn {
    opacity: 1;
}
.session-item__menu-btn:hover {
    background: var(--bg-active);
    color: var(--text-primary);
}
</style>
