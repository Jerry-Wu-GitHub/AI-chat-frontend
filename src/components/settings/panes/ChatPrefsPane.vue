<script setup>
/**
 * @file src/components/settings/panes/ChatPrefsPane.vue
 * "聊天对话" tab:导航栏、固定提示词、工具栏自动收起 三个开关。
 */

import { computed } from 'vue';

import SettingsRow from '../SettingsRow.vue';
import BaseToggle  from '@/components/common/BaseToggle.vue';

import { usePrefsStore } from '@/stores/prefs.js';

const prefsStore = usePrefsStore();

/**
 * 为每个 boolean 偏好生成可写 computed,直接绑到 BaseToggle。
 *
 * @param {string} key
 * @returns {import('vue').WritableComputedRef<boolean>}
 */
function bindBooleanPref(key) {
    return computed({
        get: () => prefsStore.preferences[key] !== false,
        set: (value) => prefsStore.updatePreferences({ [key]: value }),
    });
}

const navRailEnabled       = bindBooleanPref('navRailEnabled');
const showInheritedPrompts = bindBooleanPref('showInheritedPrompts');
const autoCollapseControls = bindBooleanPref('autoCollapseControls');
</script>

<template>
    <div class="settings-pane">
        <SettingsRow
            title="显示消息导航栏"
            description="在聊天区域右侧显示消息目录,可快速定位到任意消息"
        >
            <BaseToggle v-model="navRailEnabled" />
        </SettingsRow>

        <SettingsRow
            title="在对话顶部显示固定系统提示词"
            description="将来自当前会话及父级分组的固定系统提示词以气泡形式置顶展示"
        >
            <BaseToggle v-model="showInheritedPrompts" />
        </SettingsRow>

        <SettingsRow
            title="鼠标移开时自动收起工具栏"
            description="鼠标离开输入区域后,自动隐藏底部工具按钮以节省空间;输入框内有内容时不收起"
        >
            <BaseToggle v-model="autoCollapseControls" />
        </SettingsRow>
    </div>
</template>

<style scoped>
.settings-pane {
    animation: fade-in var(--transition-base) ease;
}
</style>
