/**
 * @file src/stores/models.js
 * 模型列表 store。
 *
 * 模型来自 services store 中所有服务的 /models 接口聚合;
 * 每个模型对象上带 `_serviceId` 字段记录来源,用于:
 *   - 同名模型在多个服务上同时存在时消歧义;
 *   - 发送请求时查回对应的 base_url / api_key。
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

import { fetchAllModels } from '@/utils/api.js';
import { useServicesStore } from './services.js';

/**
 * @typedef {object} ModelInfo
 * @property {string} id
 * @property {string} [owned_by]
 * @property {Array<object>} [capabilities]
 * @property {string} _serviceId 该模型来自哪张服务卡片
 */

export const useModelsStore = defineStore('models', () => {
    /** @type {import('vue').Ref<ModelInfo[]>} */
    const models = ref([]);

    /** 当前选中的模型 id。 */
    const selectedModelId = ref('');

    /** 当前选中模型来自哪张服务卡片。 */
    const selectedServiceId = ref('');

    /** 是否正在加载模型列表。 */
    const isLoading = ref(false);

    /**
     * 当前模型生效的"能力当前值"映射。键为 capability.id。
     * 值的类型取决于 capability.type:
     *   - bool:    boolean
     *   - choice:  string
     *   - choices: string[]
     *   - text:    string
     * 空值表示未启用,不会随请求发送。
     *
     * @type {import('vue').Ref<Object<string, boolean|string|string[]>>}
     */
    const capabilityValues = ref({});

    /**
     * 当前选中的模型对象(包含 capabilities 等元信息)。
     */
    const selectedModel = computed(() => {
        if (selectedServiceId.value) {
            const matched = models.value.find(
                model => model.id === selectedModelId.value
                    && model._serviceId === selectedServiceId.value,
            );
            if (matched) return matched;
        }
        return models.value.find(model => model.id === selectedModelId.value) || null;
    });

    /**
     * 当前选中模型对应的服务卡片(用于取 base_url/api_key)。
     */
    const selectedService = computed(() => {
        if (!selectedServiceId.value) return null;
        const servicesStore = useServicesStore();
        return servicesStore.findServiceById(selectedServiceId.value);
    });

    /**
     * 按"模型 id 首段字母数字"分组,组名小写。
     * 例如 "GPT-4o" → "gpt", "Claude_3.5" → "claude"。
     * 用于下拉菜单分组展示。
     *
     * @returns {Map<string, ModelInfo[]>}
     */
    const modelsByGroup = computed(() => {
        const groupMap = new Map();
        for (const model of models.value) {
            const match = /^[A-Za-z0-9]+/.exec(model.id || '');
            const groupName = (match ? match[0] : (model.id || '')).toLowerCase();
            if (!groupMap.has(groupName)) groupMap.set(groupName, []);
            groupMap.get(groupName).push(model);
        }
        // 组内按 id 倒序(让 GPT-4 排在 GPT-3 之前)
        for (const list of groupMap.values()) {
            list.sort((a, b) => b.id.localeCompare(a.id));
        }
        return groupMap;
    });

    /**
     * 已启用的能力参数(仅包含真正生效的值,用于发请求)。
     */
    const enabledCapabilities = computed(() => {
        const result = {};
        for (const [key, value] of Object.entries(capabilityValues.value)) {
            if (value === undefined || value === null || value === false) continue;
            if (typeof value === 'string' && value.length === 0) continue;
            if (Array.isArray(value) && value.length === 0) continue;
            result[key] = value;
        }
        return result;
    });

    /* ============================================================
       Actions
       ============================================================ */

    /**
     * 从所有已配置的服务并发拉取模型列表。
     * 加载完成后:
     *   - 如果当前选中模型仍存在,刷新对应的能力控件值。
     *   - 否则自动选择列表里的第一个模型。
     *
     * @returns {Promise<void>}
     */
    async function loadAllModels() {
        isLoading.value = true;
        try {
            const servicesStore = useServicesStore();
            const merged = await fetchAllModels(servicesStore.allServices);
            models.value = merged;

            const stillExists = merged.some(model => model.id === selectedModelId.value);
            if (stillExists) {
                // 重新触发能力控件初始化(可能模型定义有更新)
                selectModel(selectedModelId.value, selectedServiceId.value || undefined);
            } else if (merged.length > 0) {
                selectModel(merged[0].id, merged[0]._serviceId);
            } else {
                selectedModelId.value = '';
                selectedServiceId.value = '';
                capabilityValues.value = {};
            }
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * 选中指定模型,同时重置能力值为该模型的默认值。
     *
     * @param {string} modelId
     * @param {string} [serviceId] 多服务同名模型时用于消歧义
     * @returns {void}
     */
    function selectModel(modelId, serviceId) {
        let target;
        if (serviceId) {
            target = models.value.find(
                model => model.id === modelId && model._serviceId === serviceId,
            );
        }
        if (!target) {
            target = models.value.find(model => model.id === modelId);
        }
        if (!target) return;

        selectedModelId.value = target.id;
        selectedServiceId.value = target._serviceId || '';
        resetCapabilitiesToDefaults(target.capabilities || []);
    }

    /**
     * 根据模型的 capabilities 定义,初始化 capabilityValues
     * 为各能力的 default(若有)。
     *
     * @param {Array<object>} capabilities
     * @returns {void}
     */
    function resetCapabilitiesToDefaults(capabilities) {
        const next = {};
        for (const capability of capabilities) {
            if (capability.default === undefined || capability.default === null) continue;

            switch (capability.type) {
                case 'bool':
                    if (capability.default === true) next[capability.id] = true;
                    break;
                case 'choice':
                    if (typeof capability.default === 'string' && capability.default) {
                        next[capability.id] = capability.default;
                    }
                    break;
                case 'choices':
                    if (Array.isArray(capability.default) && capability.default.length > 0) {
                        next[capability.id] = [...capability.default];
                    }
                    break;
                case 'text':
                    if (typeof capability.default === 'string' && capability.default) {
                        next[capability.id] = capability.default;
                    }
                    break;
            }
        }
        capabilityValues.value = next;
    }

    /**
     * 设置某个能力的当前值。传入 undefined / 空值会被解释为"关闭该能力"。
     *
     * @param {string} capabilityId
     * @param {boolean|string|string[]|undefined} value
     * @returns {void}
     */
    function setCapabilityValue(capabilityId, value) {
        const isEmpty =
            value === undefined ||
            value === null ||
            value === false ||
            (typeof value === 'string' && value.length === 0) ||
            (Array.isArray(value) && value.length === 0);

        if (isEmpty) {
            const next = { ...capabilityValues.value };
            delete next[capabilityId];
            capabilityValues.value = next;
        } else {
            capabilityValues.value = {
                ...capabilityValues.value,
                [capabilityId]: value,
            };
        }
    }

    return {
        // state
        models,
        selectedModelId,
        selectedServiceId,
        isLoading,
        capabilityValues,

        // getters
        selectedModel,
        selectedService,
        modelsByGroup,
        enabledCapabilities,

        // actions
        loadAllModels,
        selectModel,
        setCapabilityValue,
    };
});
