<script setup>
/**
 * @file src/components/import-export/ConflictModal.vue
 * 冲突解决对话框。
 *
 * 自身挂在 App.vue 里,显隐由 useConflictModal() 的 conflictModalState 控制。
 *
 * 内部布局:
 *   - 标题栏(展示冲突总数)
 *   - 会话组冲突:批量条 + 列表(若有)
 *   - 会话冲突:批量条 + 列表(若有)
 *   - 底部按钮:取消 / 确认
 */

import { computed, onMounted, onBeforeUnmount } from 'vue';

import ConflictItem      from './ConflictItem.vue';
import ConflictBatchBar  from './ConflictBatchBar.vue';
import BaseIcon          from '@/components/common/BaseIcon.vue';

import { useConflictModal } from './useConflictModal.js';

const { conflictModalState, closeConflictModal } = useConflictModal();

/** 当前状态对象(简写)。 */
const state = computed(() => conflictModalState.value);

/** 会话组冲突列表。 */
const groupEntries = computed(() => state.value?.groupEntries || []);

/** 会话冲突列表。 */
const sessionEntries = computed(() => state.value?.sessionEntries || []);

/** 总数(用于标题)。 */
const totalCount = computed(() => groupEntries.value.length + sessionEntries.value.length);

/* ============================================================
   批量栏可见性:某类字段中至少有一个冲突需要决策时才显示
   ============================================================ */

const groupBatchShowsTitle = computed(() => {
    return groupEntries.value.some(entry => entry.meta.titleNeedsDecision);
});

const groupBatchShowsPrompt = computed(() => {
    return groupEntries.value.some(entry => entry.meta.promptInfo.needsDecision);
});

const sessionBatchShowsTitle = computed(() => {
    return sessionEntries.value.some(entry => entry.meta.titleNeedsDecision);
});

const sessionBatchShowsPrompt = computed(() => {
    return sessionEntries.value.some(entry => entry.meta.promptInfo.needsDecision);
});

/* ============================================================
   批量操作:把指定字段统一设成某个值
   ============================================================ */

/**
 * 应用批量操作到一组条目。
 *
 * @param {import('./useConflictModal.js').ConflictEntry[]} entries
 * @param {{ field: string, value: string }} payload
 * @returns {void}
 */
function applyBatchTo(entries, payload) {
    const { field, value } = payload;
    for (const entry of entries) {
        // 标题字段:只对"标题确实需要决策"的条目生效,避免污染。
        if (field === 'title' && !entry.meta.titleNeedsDecision) continue;
        // 系统提示字段:只对"提示词确实需要决策"的条目生效。
        if (field === 'prompt' && !entry.meta.promptInfo.needsDecision) continue;
        // 聊天内容只对会话条目有意义,这里不会被会话组调到。

        if (Object.prototype.hasOwnProperty.call(entry.decision, field)) {
            entry.decision[field] = value;
        }
    }
}

/**
 * 处理会话组批量条。
 *
 * @param {{ field: string, value: string }} payload
 * @returns {void}
 */
function onGroupBatchApply(payload) {
    applyBatchTo(groupEntries.value, payload);
}

/**
 * 处理会话批量条。
 *
 * @param {{ field: string, value: string }} payload
 * @returns {void}
 */
function onSessionBatchApply(payload) {
    applyBatchTo(sessionEntries.value, payload);
}

/* ============================================================
   确认 / 取消
   ============================================================ */

/**
 * 用户确认:把每个条目的 decision 整理成 Map 返回。
 *
 * 对"未询问"的字段填充自动决策(例如标题不需要决策时,
 * decision.title 已经是 'skip',效果等同于不做改动)。
 *
 * @returns {void}
 */
function onConfirm() {
    const groupDecisions   = new Map();
    const sessionDecisions = new Map();

    for (const entry of groupEntries.value) {
        groupDecisions.set(entry.imported.id, normalizeDecision(entry));
    }
    for (const entry of sessionEntries.value) {
        sessionDecisions.set(entry.imported.id, normalizeDecision(entry));
    }

    closeConflictModal({ groupDecisions, sessionDecisions });
}

/**
 * 把 entry 的 decision 整理成 importFlow 期望的形状。
 *
 * - keep-both 时只保留 action 字段。
 * - keep-one 时根据 meta 决定字段值(没询问到的字段用自动决策或保持默认)。
 *
 * @param {import('./useConflictModal.js').ConflictEntry} entry
 * @returns {object}
 */
function normalizeDecision(entry) {
    if (entry.decision.action === 'keep-both') {
        return { action: 'keep-both' };
    }

    const normalized = {
        action: 'keep-one',
        title:  entry.meta.titleNeedsDecision ? entry.decision.title : 'skip',
        prompt: entry.meta.promptInfo.needsDecision
            ? entry.decision.prompt
            : entry.meta.promptInfo.autoAction,
    };

    if (entry.type === 'session') {
        normalized.messages = entry.decision.messages || 'skip';
    }

    return normalized;
}

/**
 * 取消。
 *
 * @returns {void}
 */
function onCancel() {
    closeConflictModal(null);
}

/**
 * 点击遮罩 = 取消。
 *
 * @param {MouseEvent} event
 * @returns {void}
 */
function onOverlayClick(event) {
    if (event.target === event.currentTarget) onCancel();
}

/**
 * Esc = 取消。
 *
 * @param {KeyboardEvent} event
 * @returns {void}
 */
function onKeyDown(event) {
    if (event.key === 'Escape' && state.value) onCancel();
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
            v-if="state"
            class="conflict-overlay"
            @click="onOverlayClick"
        >
            <div class="conflict-box" role="dialog" aria-modal="true">
                <header class="conflict-box__header">
                    <h3 class="conflict-box__title">
                        导入冲突({{ totalCount }} 项)
                    </h3>
                    <button
                        type="button"
                        class="conflict-box__close-btn"
                        title="关闭"
                        aria-label="关闭"
                        @click="onCancel"
                    >
                        <BaseIcon name="close" :size="16" />
                    </button>
                </header>

                <div class="conflict-box__body">
                    <p class="conflict-box__hint">
                        以下项目的 id 与现有数据冲突,请选择处理方式:
                    </p>

                    <!-- 会话组冲突 -->
                    <template v-if="groupEntries.length > 0">
                        <h4 class="conflict-box__section-title">
                            会话组冲突({{ groupEntries.length }} 个)
                        </h4>

                        <ConflictBatchBar
                            :show-title-row="groupBatchShowsTitle"
                            :show-prompt-row="groupBatchShowsPrompt"
                            :show-messages-row="false"
                            title-label="全部会话组标题:"
                            @apply="onGroupBatchApply"
                        />

                        <div class="conflict-box__list">
                            <ConflictItem
                                v-for="(entry, index) in groupEntries"
                                :key="entry.imported.id"
                                :entry="entry"
                                :index="index"
                            />
                        </div>
                    </template>

                    <!-- 会话冲突 -->
                    <template v-if="sessionEntries.length > 0">
                        <h4
                            class="conflict-box__section-title"
                            :class="{ 'conflict-box__section-title--spaced': groupEntries.length > 0 }"
                        >
                            会话冲突({{ sessionEntries.length }} 个)
                        </h4>

                        <ConflictBatchBar
                            :show-title-row="sessionBatchShowsTitle"
                            :show-prompt-row="sessionBatchShowsPrompt"
                            :show-messages-row="true"
                            title-label="全部会话标题:"
                            @apply="onSessionBatchApply"
                        />

                        <div class="conflict-box__list">
                            <ConflictItem
                                v-for="(entry, index) in sessionEntries"
                                :key="entry.imported.id"
                                :entry="entry"
                                :index="index"
                            />
                        </div>
                    </template>
                </div>

                <footer class="conflict-box__footer">
                    <button
                        type="button"
                        class="modal-action-btn btn-secondary"
                        @click="onCancel"
                    >取消</button>
                    <button
                        type="button"
                        class="modal-action-btn btn-primary"
                        @click="onConfirm"
                    >确认</button>
                </footer>
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
.conflict-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
    z-index: 9100;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fade-in var(--transition-fast) ease;
}

.conflict-box {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    width: min(720px, calc(100vw - 32px));
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    animation: slide-up var(--transition-base) ease;
}

.conflict-box__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
}

.conflict-box__title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.conflict-box__close-btn {
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
.conflict-box__close-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
}

.conflict-box__body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4) var(--space-5);
}

.conflict-box__hint {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0 0 12px 0;
}

.conflict-box__section-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 10px 0;
}

.conflict-box__section-title--spaced {
    margin-top: var(--space-4);
}

.conflict-box__list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.conflict-box__footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-5) var(--space-4);
    border-top: 1px solid var(--border);
    flex-shrink: 0;
}
</style>
