<script setup>
/**
 * @file src/components/import-export/ConflictItem.vue
 * 单条冲突的展示与决策表单。
 *
 * 同一个组件兼容"会话组冲突"和"会话冲突"两种类型,通过 entry.type 区分。
 *
 * decision 对象直接来自父组件(已是响应式),v-model 直接修改其字段。
 */

import { computed } from 'vue';

import BaseIcon from '@/components/common/BaseIcon.vue';

const props = defineProps({
    /**
     * @type {import('./useConflictModal.js').ConflictEntry}
     */
    entry: {
        type: Object,
        required: true,
    },
    /** 在列表中的索引(只用于 radio 的 name 防止冲突) */
    index: {
        type: Number,
        required: true,
    },
});

const isGroup   = computed(() => props.entry.type === 'group');
const isSession = computed(() => props.entry.type === 'session');

/** 用于 radio name 的前缀。 */
const namePrefix = computed(() => isGroup.value ? 'g' : 's');

/** 显示用的"标题/名称"。 */
const displayName = computed(() => {
    if (isGroup.value) {
        return props.entry.imported.name || props.entry.imported.id;
    }
    return props.entry.imported.title || props.entry.imported.id;
});

/** 现有对象的标题(用于"跳过"提示中的引用)。 */
const existingTitle = computed(() => {
    return isGroup.value
        ? props.entry.existing.name
        : props.entry.existing.title;
});

/** 导入对象的标题(用于"替换"提示中的引用)。 */
const importedTitle = computed(() => {
    return isGroup.value
        ? props.entry.imported.name
        : props.entry.imported.title;
});

/** 是否要显示子面板(action === keep-one 时显示)。 */
const showSubPanel = computed(() => props.entry.decision.action === 'keep-one');
</script>

<template>
    <div class="conflict-item">
        <header class="conflict-item__header">
            <BaseIcon
                :name="isGroup ? 'folder' : 'chat-bubble'"
                :size="13"
            />
            <strong>{{ displayName }}</strong>
            <span class="conflict-item__id-badge">{{ entry.imported.id }}</span>
        </header>

        <!-- 处理方式 -->
        <div class="conflict-item__field">
            <span class="conflict-item__field-label">处理方式:</span>
            <label class="conflict-item__radio">
                <input
                    v-model="entry.decision.action"
                    type="radio"
                    :name="`${namePrefix}-action-${index}`"
                    value="keep-both"
                />
                保留两者(新建副本)
            </label>
            <label class="conflict-item__radio">
                <input
                    v-model="entry.decision.action"
                    type="radio"
                    :name="`${namePrefix}-action-${index}`"
                    value="keep-one"
                />
                保留一个(合并)
            </label>
        </div>

        <!-- 子面板:仅在"保留一个"时显示 -->
        <div v-show="showSubPanel" class="conflict-item__sub">
            <!-- 标题 -->
            <div
                v-if="entry.meta.titleNeedsDecision"
                class="conflict-item__field"
            >
                <span class="conflict-item__field-label">
                    {{ isGroup ? '对会话组标题:' : '对会话标题:' }}
                </span>
                <label class="conflict-item__radio">
                    <input
                        v-model="entry.decision.title"
                        type="radio"
                        :name="`${namePrefix}-title-${index}`"
                        value="skip"
                    />
                    跳过(保留原标题「{{ existingTitle }}」)
                </label>
                <label class="conflict-item__radio">
                    <input
                        v-model="entry.decision.title"
                        type="radio"
                        :name="`${namePrefix}-title-${index}`"
                        value="replace"
                    />
                    替换为「{{ importedTitle }}」
                </label>
            </div>

            <!-- 系统提示 -->
            <div
                v-if="entry.meta.promptInfo.needsDecision"
                class="conflict-item__field"
            >
                <span class="conflict-item__field-label">对系统提示词:</span>
                <label class="conflict-item__radio">
                    <input
                        v-model="entry.decision.prompt"
                        type="radio"
                        :name="`${namePrefix}-prompt-${index}`"
                        value="skip"
                    />
                    跳过(保留原有)
                </label>
                <label class="conflict-item__radio">
                    <input
                        v-model="entry.decision.prompt"
                        type="radio"
                        :name="`${namePrefix}-prompt-${index}`"
                        value="merge"
                    />
                    合并(追加到原有后面)
                </label>
                <label class="conflict-item__radio">
                    <input
                        v-model="entry.decision.prompt"
                        type="radio"
                        :name="`${namePrefix}-prompt-${index}`"
                        value="replace"
                    />
                    替换
                </label>
            </div>

            <!-- 聊天内容(仅会话) -->
            <div v-if="isSession" class="conflict-item__field">
                <span class="conflict-item__field-label">对聊天内容:</span>
                <label class="conflict-item__radio">
                    <input
                        v-model="entry.decision.messages"
                        type="radio"
                        :name="`${namePrefix}-messages-${index}`"
                        value="skip"
                    />
                    跳过(保留原有)
                </label>
                <label class="conflict-item__radio">
                    <input
                        v-model="entry.decision.messages"
                        type="radio"
                        :name="`${namePrefix}-messages-${index}`"
                        value="merge"
                    />
                    合并(追加到原有后面)
                </label>
                <label class="conflict-item__radio">
                    <input
                        v-model="entry.decision.messages"
                        type="radio"
                        :name="`${namePrefix}-messages-${index}`"
                        value="replace"
                    />
                    替换
                </label>
            </div>
        </div>
    </div>
</template>

<style scoped>
.conflict-item {
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 12px 14px;
    background: var(--bg-subtle);
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.conflict-item__header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13.5px;
}

.conflict-item__header strong {
    color: var(--text-primary);
}

.conflict-item__id-badge {
    font-size: 11px;
    color: var(--text-muted);
    font-family: var(--font-mono);
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 1px 5px;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.conflict-item__field {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 6px 14px;
    font-size: 13px;
}

.conflict-item__field-label {
    color: var(--text-secondary);
    flex-shrink: 0;
    min-width: 90px;
    line-height: 22px;
}

.conflict-item__radio {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    color: var(--text-primary);
    line-height: 22px;
}

.conflict-item__radio input[type="radio"] {
    accent-color: var(--accent);
    cursor: pointer;
}

.conflict-item__sub {
    border-top: 1px solid var(--border);
    padding-top: 8px;
    margin-top: 2px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}
</style>
