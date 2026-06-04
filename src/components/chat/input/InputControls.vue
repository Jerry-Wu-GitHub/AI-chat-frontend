<script setup>
/**
 * @file src/components/chat/input/InputControls.vue
 * 输入区底部的工具按钮行。包含:
 *   - 左侧:上传按钮、系统提示模式按钮、模型能力控件
 *   - 右侧:发送按钮 + 快捷键切换
 *
 * 整体可通过 visible prop 控制显隐(用于"鼠标移开自动收起")。
 */

import { computed, ref } from 'vue';

import BaseButton          from '@/components/common/BaseButton.vue';
import CapabilityControls  from './CapabilityControls.vue';
import SendButton          from './SendButton.vue';
import ShortcutToggle      from './ShortcutToggle.vue';

import { useChatStore }   from '@/stores/chat.js';
import { useFileUpload }  from '@/composables/useFileUpload.js';

const props = defineProps({
    /** 是否展开显示工具栏(收起时高度为 0) */
    visible: {
        type: Boolean,
        default: true,
    },
    /** 输入框是否有内容(用于决定发送按钮 disabled) */
    hasInputText: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['send']);

const chatStore = useChatStore();
const { uploadAndAddToPending } = useFileUpload();

/** @type {import('vue').Ref<HTMLInputElement | null>} */
const fileInputRef = ref(null);

/**
 * 发送按钮是否禁用:流式中 / 文字和附件都为空 → 禁用。
 */
const sendDisabled = computed(() => {
    if (chatStore.isStreaming) return true;
    if (props.hasInputText) return false;
    return chatStore.pendingFiles.length === 0;
});

/**
 * 点击文件上传按钮 → 触发 hidden input。
 *
 * @returns {void}
 */
function onClickUpload() {
    if (!fileInputRef.value) return;
    fileInputRef.value.value = '';
    fileInputRef.value.click();
}

/**
 * hidden input 选中文件后批量上传。
 *
 * @param {Event} event
 * @returns {Promise<void>}
 */
async function onFilesPicked(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const files = Array.from(target.files || []);
    target.value = '';

    for (const file of files) {
        await uploadAndAddToPending(file);
    }
}

/**
 * 切换系统提示模式。
 *
 * @returns {void}
 */
function onToggleSystemPromptMode() {
    chatStore.setSystemPromptMode(!chatStore.isSystemPromptMode);
}

/**
 * 点击发送按钮。
 *
 * @returns {void}
 */
function onSendClicked() {
    emit('send');
}
</script>

<template>
    <div
        class="input-controls"
        :class="{ 'input-controls--visible': visible }"
    >
        <div class="input-controls__left">
            <BaseButton
                variant="toggle"
                icon="upload"
                title="上传文件"
                @click="onClickUpload"
            />
            <BaseButton
                variant="toggle"
                icon="system-prompt"
                :active="chatStore.isSystemPromptMode"
                :title="chatStore.isSystemPromptMode ? '关闭系统提示' : '系统提示'"
                @click="onToggleSystemPromptMode"
            />
            <CapabilityControls />
        </div>

        <div class="input-controls__right">
            <div class="send-shortcut-wrap">
                <SendButton
                    :is-add-mode="chatStore.isSystemPromptMode"
                    :disabled="sendDisabled"
                    @click="onSendClicked"
                />
                <ShortcutToggle />
            </div>
        </div>

        <!-- 隐藏的 file input,由上传按钮触发 -->
        <input
            ref="fileInputRef"
            type="file"
            multiple
            style="display: none;"
            @change="onFilesPicked"
        />
    </div>
</template>

<style scoped>
.input-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0;
    max-height: 0;
    opacity: 0;
    pointer-events: none;
    overflow: hidden;
    transition:
        max-height 200ms ease,
        opacity    200ms ease,
        margin-top 200ms ease;
}

.input-controls--visible {
    max-height: 80px;
    opacity: 1;
    pointer-events: auto;
    margin-top: var(--space-2);
}

.input-controls__left {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    flex-wrap: wrap;
}

.input-controls__right {
    display: flex;
    align-items: flex-end;
    gap: var(--space-2);
}

.send-shortcut-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
}
</style>
