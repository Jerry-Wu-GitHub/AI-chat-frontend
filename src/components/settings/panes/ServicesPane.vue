<script setup>
/**
 * @file src/components/settings/panes/ServicesPane.vue
 * "服务管理" tab:卡片列表 + 添加按钮。
 */

import ServiceCard from '../ServiceCard.vue';
import BaseIcon    from '@/components/common/BaseIcon.vue';

import { useServicesStore } from '@/stores/services.js';
import { useModelsStore }   from '@/stores/models.js';

const servicesStore = useServicesStore();
const modelsStore   = useModelsStore();

/**
 * 添加一张空白服务卡片,然后刷新模型列表。
 *
 * @returns {Promise<void>}
 */
async function onAddService() {
    servicesStore.addEmptyService();
    await modelsStore.loadAllModels();
}
</script>

<template>
    <div class="settings-pane">
        <p class="services-intro">
            每个服务卡片对应一个 OpenAI 兼容的 LLM 接口端点。
            添加多个服务后,模型列表会自动合并显示。
        </p>

        <div class="services-card-list">
            <ServiceCard
                v-for="service in servicesStore.allServices"
                :key="service.id"
                :service="service"
            />

            <button
                type="button"
                class="btn-add-service"
                @click="onAddService"
            >
                <BaseIcon name="plus" :size="14" />
                添加服务
            </button>
        </div>
    </div>
</template>

<style scoped>
.settings-pane {
    animation: fade-in var(--transition-base) ease;
}

.services-intro {
    font-size: 13px;
    color: var(--text-muted);
    margin: 0 0 var(--space-4) 0;
    line-height: 1.6;
}

.services-card-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
}

.btn-add-service {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    background: transparent;
    border: 1.5px dashed var(--border-strong);
    border-radius: var(--radius-lg);
    color: var(--text-secondary);
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 500;
    cursor: pointer;
    transition: background var(--transition-fast),
                border-color var(--transition-fast),
                color var(--transition-fast);
}

.btn-add-service:hover {
    background: var(--accent-subtle);
    border-color: var(--accent);
    color: var(--accent-text);
}
</style>
