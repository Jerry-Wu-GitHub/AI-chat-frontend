<script setup>
/**
 * @file src/components/import-export/ConflictBatchBar.vue
 * 冲突弹窗顶部的"批量操作"区。
 *
 * 每一行是一个字段(处理方式 / 标题 / 系统提示 / 聊天内容),
 * 后跟若干按钮。点击会触发 @apply 事件,把决策应用到所有冲突项。
 *
 * 通过 props 控制哪些行显示:某字段没有任何冲突需要决策时,
 * 对应的行被隐藏(由父组件计算并传 prop)。
 */

const props = defineProps({
    /** 是否显示标题批量行 */
    showTitleRow: {
        type: Boolean,
        default: false,
    },
    /** 是否显示系统提示批量行 */
    showPromptRow: {
        type: Boolean,
        default: false,
    },
    /** 是否显示聊天内容批量行(仅会话弹窗) */
    showMessagesRow: {
        type: Boolean,
        default: false,
    },
    /** 标题文案前缀,例如 "全部会话标题:" / "全部会话组标题:" */
    titleLabel: {
        type: String,
        default: '全部标题:',
    },
});

const emit = defineEmits(['apply']);

/**
 * 触发批量应用。
 *
 * @param {string} field
 * @param {string} value
 * @returns {void}
 */
function onApply(field, value) {
    emit('apply', { field, value });
}
</script>

<template>
    <div class="conflict-batch-bar">
        <div class="conflict-batch-bar__title">
            批量设置(点击按钮一次应用到全部)
        </div>

        <!-- 处理方式 -->
        <div class="conflict-batch-bar__row">
            <span class="conflict-batch-bar__label">全部处理方式:</span>
            <div class="conflict-batch-bar__buttons">
                <button
                    type="button"
                    class="conflict-batch-bar__btn"
                    @click="onApply('action', 'keep-both')"
                >全部保留两者</button>
                <button
                    type="button"
                    class="conflict-batch-bar__btn"
                    @click="onApply('action', 'keep-one')"
                >全部保留一个</button>
            </div>
        </div>

        <!-- 标题 -->
        <div v-if="showTitleRow" class="conflict-batch-bar__row">
            <span class="conflict-batch-bar__label">{{ titleLabel }}</span>
            <div class="conflict-batch-bar__buttons">
                <button
                    type="button"
                    class="conflict-batch-bar__btn"
                    @click="onApply('title', 'skip')"
                >全部跳过</button>
                <button
                    type="button"
                    class="conflict-batch-bar__btn"
                    @click="onApply('title', 'replace')"
                >全部替换</button>
            </div>
        </div>

        <!-- 系统提示 -->
        <div v-if="showPromptRow" class="conflict-batch-bar__row">
            <span class="conflict-batch-bar__label">全部系统提示词:</span>
            <div class="conflict-batch-bar__buttons">
                <button
                    type="button"
                    class="conflict-batch-bar__btn"
                    @click="onApply('prompt', 'skip')"
                >全部跳过</button>
                <button
                    type="button"
                    class="conflict-batch-bar__btn"
                    @click="onApply('prompt', 'merge')"
                >全部合并</button>
                <button
                    type="button"
                    class="conflict-batch-bar__btn"
                    @click="onApply('prompt', 'replace')"
                >全部替换</button>
            </div>
        </div>

        <!-- 聊天内容(仅会话冲突) -->
        <div v-if="showMessagesRow" class="conflict-batch-bar__row">
            <span class="conflict-batch-bar__label">全部聊天内容:</span>
            <div class="conflict-batch-bar__buttons">
                <button
                    type="button"
                    class="conflict-batch-bar__btn"
                    @click="onApply('messages', 'skip')"
                >全部跳过</button>
                <button
                    type="button"
                    class="conflict-batch-bar__btn"
                    @click="onApply('messages', 'merge')"
                >全部合并</button>
                <button
                    type="button"
                    class="conflict-batch-bar__btn"
                    @click="onApply('messages', 'replace')"
                >全部替换</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.conflict-batch-bar {
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--bg-elevated);
    padding: 10px 12px;
    margin-bottom: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.conflict-batch-bar__title {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 2px;
}

.conflict-batch-bar__row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 10px;
    font-size: 12.5px;
}

.conflict-batch-bar__label {
    color: var(--text-secondary);
    flex-shrink: 0;
    min-width: 110px;
}

.conflict-batch-bar__buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.conflict-batch-bar__btn {
    padding: 3px 10px;
    background: var(--bg-surface);
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-radius: 99px;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    transition: background var(--transition-fast),
                border-color var(--transition-fast),
                color var(--transition-fast);
}

.conflict-batch-bar__btn:hover {
    background: var(--accent-subtle);
    border-color: var(--accent);
    color: var(--accent-text);
}

.conflict-batch-bar__btn:active {
    transform: scale(0.96);
}
</style>
