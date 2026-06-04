<script setup>
/**
 * @file src/components/settings/ServiceCard.vue
 * 单张 LLM 服务卡片。展示 base_url + api_key 输入框 + 删除按钮。
 *
 * 输入变化时做 600ms 防抖,然后写回 servicesStore 并触发模型列表重载。
 */

import { ref, computed, watch, onBeforeUnmount } from 'vue';

import BaseIcon from '@/components/common/BaseIcon.vue';

import { useServicesStore } from '@/stores/services.js';
import { useModelsStore }   from '@/stores/models.js';
import { useModal }         from '@/composables/useModal.js';

const props = defineProps({
    service: {
        type: Object,
        required: true,
    },
});

const servicesStore = useServicesStore();
const modelsStore   = useModelsStore();
const { openModal } = useModal();

// 本地表单状态,从 props 初始化
const baseUrlInput = ref(props.service.base_url);
const apiKeyInput  = ref(props.service.api_key);

/** 标题文案。 */
const titleText = computed(() => {
    return props.service.isDefault ? '默认服务' : '自定义服务';
});

/** api_key 行的额外提示文字。 */
const apiKeyHint = computed(() => {
    return props.service.isDefault ? '(默认服务无需填写)' : '';
});

/** @type {ReturnType<typeof setTimeout> | null} */
let saveTimerId = null;

/**
 * 调度一次"保存 + 重载模型"。带防抖。
 *
 * @returns {void}
 */
function scheduleSave() {
    if (saveTimerId !== null) clearTimeout(saveTimerId);
    saveTimerId = setTimeout(async () => {
        saveTimerId = null;
        servicesStore.updateService(props.service.id, {
            base_url: baseUrlInput.value.trim(),
            api_key:  apiKeyInput.value,
        });
        await modelsStore.loadAllModels();
    }, 600);
}

watch(baseUrlInput, scheduleSave);
watch(apiKeyInput,  scheduleSave);

onBeforeUnmount(() => {
    if (saveTimerId !== null) clearTimeout(saveTimerId);
});

/**
 * 删除服务卡片(二次确认)。
 *
 * @returns {Promise<void>}
 */
async function onDelete() {
    const result = await openModal({
        title: '删除服务',
        bodyHtml: `
            <p class="sidebar-modal-hint">
                确定要删除这个服务吗?相关模型将从列表中移除。
            </p>
        `,
        buttons: [
            { label: '取消', value: null, className: 'btn-secondary' },
            { label: '删除', value: 'ok', className: 'btn-danger'    },
        ],
    });
    if (result !== 'ok') return;

    servicesStore.removeService(props.service.id);
    await modelsStore.loadAllModels();
}
</script>

<template>
    <div
        class="service-card"
        :class="{ 'service-card--default': service.isDefault }"
    >
        <header class="service-card__header">
            <span class="service-card__title">{{ titleText }}</span>
            <button
                type="button"
                class="service-card__delete-btn"
                title="删除此服务"
                @click="onDelete"
            >
                <BaseIcon name="trash" :size="14" />
            </button>
        </header>

        <div class="service-card__field">
            <label>Base URL</label>
            <input
                v-model="baseUrlInput"
                type="text"
                class="service-card__input"
                placeholder="https://api.example.com/v1"
            />
        </div>

        <div class="service-card__field">
            <label>API Key{{ apiKeyHint }}</label>
            <input
                v-model="apiKeyInput"
                type="password"
                class="service-card__input"
                placeholder="sk-..."
                autocomplete="off"
            />
        </div>
    </div>
</template>

<style scoped>
.service-card {
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-3) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    transition: border-color var(--transition-fast),
                box-shadow var(--transition-fast);
}

.service-card:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent);
}

.service-card--default {
    border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
    background: color-mix(in srgb, var(--accent) 5%, var(--bg-subtle));
}

.service-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2px;
}

.service-card__title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
}

.service-card--default .service-card__title {
    color: var(--accent-text);
}

.service-card__delete-btn {
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast);
}
.service-card__delete-btn:hover {
    background: var(--danger-subtle);
    color: var(--danger);
}

.service-card__field {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.service-card__field label {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 500;
}

.service-card__input {
    width: 100%;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 7px 10px;
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--text-primary);
    outline: none;
    transition: border var(--transition-fast), box-shadow var(--transition-fast);
}

.service-card__input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 15%, transparent);
}
</style>
