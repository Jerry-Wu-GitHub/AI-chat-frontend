<script setup>
/**
 * @file src/components/common/BaseToggle.vue
 * 开关按钮(横向 switch)。v-model:modelValue 绑定布尔值。
 *
 * 用法:
 *   <BaseToggle v-model="enabled" />
 */

const props = defineProps({
    /** v-model:modelValue */
    modelValue: {
        type: Boolean,
        required: true,
    },
    /** 是否禁用 */
    disabled: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['update:modelValue']);

/**
 * 切换状态。
 *
 * @param {Event} event
 * @returns {void}
 */
function onChange(event) {
    emit('update:modelValue', event.target.checked);
}
</script>

<template>
    <label class="base-toggle" :class="{ 'base-toggle--disabled': disabled }">
        <input
            type="checkbox"
            class="base-toggle__input"
            :checked="modelValue"
            :disabled="disabled"
            @change="onChange"
        />
        <span class="base-toggle__track" />
    </label>
</template>

<style scoped>
.base-toggle {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 22px;
    cursor: pointer;
    flex-shrink: 0;
}

.base-toggle--disabled {
    cursor: not-allowed;
    opacity: 0.6;
}

.base-toggle__input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
}

.base-toggle__track {
    position: absolute;
    inset: 0;
    background: var(--border-strong);
    border-radius: 999px;
    transition: background var(--transition-base);
}

.base-toggle__track::after {
    content: '';
    position: absolute;
    left: 3px;
    top: 3px;
    width: 16px;
    height: 16px;
    background: #fff;
    border-radius: 50%;
    transition: transform var(--transition-base);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.base-toggle__input:checked + .base-toggle__track {
    background: var(--accent);
}

.base-toggle__input:checked + .base-toggle__track::after {
    transform: translateX(18px);
}
</style>
