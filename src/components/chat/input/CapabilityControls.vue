<script setup>
/**
 * @file src/components/chat/input/CapabilityControls.vue
 * 把当前模型的 capabilities 渲染为一行能力控件。
 *
 * 根据每个 capability 的 type 渲染不同子组件,值统一存到
 * modelsStore.capabilityValues。
 */

import { computed } from 'vue';

import CapabilityBool   from './CapabilityBool.vue';
import CapabilityChoice from './CapabilityChoice.vue';
import CapabilityText   from './CapabilityText.vue';

import { useModelsStore } from '@/stores/models.js';

const modelsStore = useModelsStore();

/** 当前模型的能力列表。 */
const capabilities = computed(() => {
    return modelsStore.selectedModel?.capabilities || [];
});

/**
 * 读取某个能力的当前值。
 *
 * @param {string} capabilityId
 * @returns {boolean|string|string[]|undefined}
 */
function readValue(capabilityId) {
    return modelsStore.capabilityValues[capabilityId];
}

/**
 * 切换 bool 能力。
 *
 * @param {object} capability
 * @returns {void}
 */
function toggleBool(capability) {
    const current = modelsStore.capabilityValues[capability.id] === true;
    modelsStore.setCapabilityValue(capability.id, !current);
}

/**
 * 修改 choice / choices / text 能力。
 *
 * @param {object} capability
 * @param {boolean|string|string[]} newValue
 * @returns {void}
 */
function changeValue(capability, newValue) {
    modelsStore.setCapabilityValue(capability.id, newValue);
}
</script>

<template>
    <div class="capabilities-container">
        <template v-for="capability in capabilities" :key="capability.id">
            <CapabilityBool
                v-if="capability.type === 'bool'"
                :capability="capability"
                :active="readValue(capability.id) === true"
                @toggle="toggleBool(capability)"
            />
            <CapabilityChoice
                v-else-if="capability.type === 'choice' || capability.type === 'choices'"
                :capability="capability"
                :value="readValue(capability.id) ?? (capability.type === 'choices' ? [] : '')"
                @change="(value) => changeValue(capability, value)"
            />
            <CapabilityText
                v-else-if="capability.type === 'text'"
                :capability="capability"
                :value="readValue(capability.id) ?? ''"
                @change="(value) => changeValue(capability, value)"
            />
        </template>
    </div>
</template>

<style scoped>
.capabilities-container {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    flex-wrap: wrap;
}

.capabilities-container:empty {
    display: none;
}
</style>
