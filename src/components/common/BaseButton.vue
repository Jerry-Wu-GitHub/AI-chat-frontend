<script setup>
/**
 * @file src/components/common/BaseButton.vue
 * 通用按钮。统一各种按钮风格的入口,通过 variant prop 切换样式。
 *
 * 用法:
 *   <BaseButton variant="primary" @click="...">保存</BaseButton>
 *   <BaseButton variant="icon" icon="settings" />
 *   <BaseButton variant="toggle" :active="enabled" icon="search" label="搜索" />
 *
 * variant 取值:
 *   - 'primary'   蓝色主按钮(模态框确认、新建会话等)
 *   - 'secondary' 灰色次按钮(模态框取消等)
 *   - 'danger'    危险按钮(删除等,通常配合 useConfirmAction)
 *   - 'icon'      纯图标按钮(34×34 圆角方形,工具栏用)
 *   - 'toggle'    胶囊形开关按钮(底部能力区用,通过 active 切换激活态)
 *   - 'plain'     无背景,仅 hover 高亮(下拉菜单项等)
 */

import { computed } from 'vue';
import BaseIcon from './BaseIcon.vue';

const props = defineProps({
    /** 按钮风格,详见文件头注释。 */
    variant: {
        type: String,
        default: 'secondary',
        validator: (value) => ['primary', 'secondary', 'danger', 'icon', 'toggle', 'plain'].includes(value),
    },
    /** 图标名(可选,放在文本左侧)。 */
    icon: {
        type: String,
        default: '',
    },
    /** toggle 风格下的激活状态。 */
    active: {
        type: Boolean,
        default: false,
    },
    /** 原生 type 属性(button / submit / reset)。 */
    type: {
        type: String,
        default: 'button',
    },
    /** 是否禁用。 */
    disabled: {
        type: Boolean,
        default: false,
    },
    /** title 属性(鼠标悬停提示)。 */
    title: {
        type: String,
        default: '',
    },
});

defineEmits(['click']);

/**
 * 根据 variant 计算根元素 class。
 */
const buttonClasses = computed(() => {
    const list = ['base-button', `base-button--${props.variant}`];
    if (props.variant === 'toggle' && props.active) {
        list.push('base-button--toggle-active');
    }
    return list;
});
</script>

<template>
    <button
        :class="buttonClasses"
        :type="type"
        :disabled="disabled"
        :title="title"
        :aria-pressed="variant === 'toggle' ? active : undefined"
        @click="$emit('click', $event)"
    >
        <BaseIcon v-if="icon" :name="icon" class="base-button__icon" />
        <span v-if="$slots.default" class="base-button__label">
            <slot />
        </span>
    </button>
</template>

<style scoped>
/* 基础重置 */
.base-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    font-family: inherit;
    font-size: inherit;
    line-height: 1;
    cursor: pointer;
    border: 1px solid transparent;
    background: transparent;
    color: inherit;
    border-radius: var(--radius-md);
    transition: background var(--transition-fast),
                color      var(--transition-fast),
                border     var(--transition-fast),
                transform  var(--transition-fast),
                box-shadow var(--transition-fast);
    -webkit-tap-highlight-color: transparent;
}

.base-button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.base-button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
}

.base-button__icon {
    width: 1em;
    height: 1em;
    font-size: 14px;
}

/* ---- primary ---- */
.base-button--primary {
    padding: 7px 18px;
    background: var(--accent);
    color: #fff;
    font-size: 14px;
    font-weight: 500;
}
.base-button--primary:hover:not(:disabled) {
    background: var(--accent-hover);
}
.base-button--primary:active:not(:disabled) {
    transform: scale(0.97);
}

/* ---- secondary ---- */
.base-button--secondary {
    padding: 7px 18px;
    background: var(--bg-subtle);
    color: var(--text-primary);
    border-color: var(--border);
    font-size: 14px;
    font-weight: 500;
}
.base-button--secondary:hover:not(:disabled) {
    background: var(--bg-hover);
}

/* ---- danger ---- */
.base-button--danger {
    padding: 7px 18px;
    background: var(--danger-subtle);
    color: var(--danger);
    border-color: color-mix(in srgb, var(--danger) 20%, transparent);
    font-size: 14px;
    font-weight: 500;
}
.base-button--danger:hover:not(:disabled) {
    background: color-mix(in srgb, var(--danger) 15%, transparent);
}

/* ---- icon ---- */
.base-button--icon {
    width: 34px;
    height: 34px;
    padding: 0;
    color: var(--text-secondary);
    border-radius: var(--radius-md);
}
.base-button--icon:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
}
.base-button--icon .base-button__icon {
    width: 16px;
    height: 16px;
    font-size: 16px;
}

/* ---- toggle ---- */
.base-button--toggle {
    padding: 5px 11px;
    border-radius: 99px;
    font-size: 12.5px;
    color: var(--text-secondary);
    border-color: var(--border);
}
.base-button--toggle:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
}
.base-button--toggle-active,
.base-button--toggle[aria-pressed="true"] {
    background: var(--accent-subtle);
    color: var(--accent-text);
    border-color: color-mix(in srgb, var(--accent) 30%, transparent);
}

/* ---- plain ---- */
.base-button--plain {
    padding: 4px 8px;
    font-size: 12px;
    color: var(--text-muted);
    border-radius: var(--radius-sm);
}
.base-button--plain:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text-primary);
}
</style>
