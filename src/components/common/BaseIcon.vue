<script setup>
/**
 * @file src/components/common/BaseIcon.vue
 * 统一的图标组件。所有图标都从 /svg/icon/<name>.svg 加载,
 * 通过 CSS mask 让颜色跟随父元素的 color。
 *
 * 用法:
 *   <BaseIcon name="copy" />
 *   <BaseIcon name="send" :size="18" />
 *   <BaseIcon name="spinner" spinning />
 *
 * 设计原因:
 *   - 用 CSS mask 而不是 <img>,可以让 SVG 颜色随当前文字颜色变化。
 *   - 用 background-color: currentColor 自动继承父元素颜色。
 *   - 单一组件统一管理图标,后续换图标库或加新图标只改一个地方。
 */

import { computed } from 'vue';

const props = defineProps({
    /** 图标名,对应 public/svg/icon/<name>.svg */
    name: {
        type: String,
        required: true,
    },
    /** 图标大小(像素)。若不指定则继承自父样式(通常是 1em)。 */
    size: {
        type: [Number, String],
        default: null,
    },
    /** 是否做旋转动画(用于 loading 状态)。 */
    spinning: {
        type: Boolean,
        default: false,
    },
});

/**
 * 计算根元素的内联样式:控制大小,以及 SVG 文件路径。
 */
const iconStyle = computed(() => {
    /** @type {Record<string, string>} */
    const style = {
        '--icon-url': `url(/svg/icon/${props.name}.svg)`,
    };
    if (props.size !== null) {
        const sizeValue = typeof props.size === 'number' ? `${props.size}px` : props.size;
        style.width  = sizeValue;
        style.height = sizeValue;
    }
    return style;
});
</script>

<template>
    <span
        class="base-icon"
        :class="{ 'base-icon--spinning': spinning }"
        :style="iconStyle"
        aria-hidden="true"
    />
</template>

<style scoped>
.base-icon {
    display: inline-block;
    flex-shrink: 0;
    width: 1em;
    height: 1em;
    background-color: currentColor;
    -webkit-mask-image: var(--icon-url);
            mask-image: var(--icon-url);
    -webkit-mask-repeat: no-repeat;
            mask-repeat: no-repeat;
    -webkit-mask-position: center;
            mask-position: center;
    -webkit-mask-size: contain;
            mask-size: contain;
    vertical-align: middle;
}

.base-icon--spinning {
    animation: base-icon-spin 0.7s linear infinite;
}

@keyframes base-icon-spin {
    to { transform: rotate(360deg); }
}
</style>
