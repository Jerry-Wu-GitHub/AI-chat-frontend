/**
 * @file src/stores/services.js
 * LLM 服务卡片 store。每张卡片对应一个 OpenAI 兼容的接入点
 * (base_url + 可选 api_key)。多张卡片的模型列表会合并展示。
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

import { readPersistedJson, attachAutoPersist } from './_persist.js';
import { fetchDefaultBaseUrl } from '@/utils/api.js';

const STORAGE_KEY = 'ai_chat_services';

/**
 * @typedef {object} ServiceCard
 * @property {string}  id        UUID
 * @property {string}  base_url  OpenAI 兼容接口的根地址
 * @property {string}  api_key   API Key,默认服务可为空字符串
 * @property {boolean} isDefault 是否为后端预置的默认服务
 */

export const useServicesStore = defineStore('services', () => {
    /** @type {import('vue').Ref<ServiceCard[]>} */
    const services = ref(readPersistedJson(STORAGE_KEY, []));

    attachAutoPersist(STORAGE_KEY, services);

    /** 当前所有服务的副本(只读使用)。 */
    const allServices = computed(() => services.value);

    /**
     * 按 id 查找一张服务卡片。
     *
     * @param {string} serviceId
     * @returns {ServiceCard | null}
     */
    function findServiceById(serviceId) {
        return services.value.find(service => service.id === serviceId) || null;
    }

    /**
     * 追加一张空白服务卡片(用户在设置面板点"添加服务"时调用)。
     *
     * @returns {ServiceCard} 新建的卡片
     */
    function addEmptyService() {
        const newService = {
            id:        crypto.randomUUID(),
            base_url:  '',
            api_key:   '',
            isDefault: false,
        };
        services.value.push(newService);
        return newService;
    }

    /**
     * 删除指定 id 的服务卡片。
     *
     * @param {string} serviceId
     * @returns {void}
     */
    function removeService(serviceId) {
        services.value = services.value.filter(service => service.id !== serviceId);
    }

    /**
     * 部分更新指定服务卡片的字段。
     *
     * @param {string} serviceId
     * @param {Partial<ServiceCard>} patch
     * @returns {void}
     */
    function updateService(serviceId, patch) {
        const index = services.value.findIndex(service => service.id === serviceId);
        if (index === -1) return;
        services.value[index] = { ...services.value[index], ...patch };
    }

    /**
     * 首次启动时,如果本地完全没有服务卡片,调用后端 GET /base_url
     * 拉取一个默认服务并写入。该默认服务无需用户填写 api_key。
     *
     * @returns {Promise<void>}
     */
    async function ensureDefaultService() {
        if (services.value.length > 0) return;

        const defaultBaseUrl = await fetchDefaultBaseUrl();
        if (!defaultBaseUrl) return;

        services.value = [{
            id:        crypto.randomUUID(),
            base_url:  defaultBaseUrl,
            api_key:   '',
            isDefault: true,
        }];
    }

    return {
        services,
        allServices,
        findServiceById,
        addEmptyService,
        removeService,
        updateService,
        ensureDefaultService,
    };
});
