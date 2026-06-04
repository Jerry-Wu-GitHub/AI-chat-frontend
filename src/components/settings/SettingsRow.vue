<script setup>
/**
 * @file src/components/settings/SettingsRow.vue
 * 单行设置项的通用布局。左侧 label + description,右侧 control(slot)。
 *
 * stack 模式下,control 区会换到下一行铺满宽度,适合较高的控件(快捷键列表等)。
 */

const props = defineProps({
    /** 标题 */
    title: {
        type: String,
        required: true,
    },
    /** 描述(可选) */
    description: {
        type: String,
        default: '',
    },
    /** 是否纵向堆叠(描述+控件分两行) */
    stack: {
        type: Boolean,
        default: false,
    },
});
</script>

<template>
    <div class="settings-section">
        <div
            class="settings-row"
            :class="{ 'settings-row--stack': stack }"
        >
            <div class="settings-row__label">
                <div class="settings-row__title">{{ title }}</div>
                <div v-if="description" class="settings-row__desc">
                    {{ description }}
                </div>
            </div>

            <div class="settings-row__control">
                <slot />
            </div>
        </div>
    </div>
</template>

<style scoped>
.settings-section {
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--border);
}
.settings-section:last-child {
    border-bottom: none;
}

.settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
}

.settings-row--stack {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
}

.settings-row__label {
    min-width: 0;
}

.settings-row__title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 2px;
}

.settings-row__desc {
    font-size: 12.5px;
    color: var(--text-muted);
}

.settings-row__control {
    flex-shrink: 0;
}
</style>
