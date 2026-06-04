<script setup>
/**
 * @file src/components/settings/panes/PrefsPane.vue
 * "用户偏好" tab:外观主题、主题色、发送快捷键。
 */

import { computed } from 'vue';

import SettingsRow         from '../SettingsRow.vue';
import ThemeTrack          from '@/components/common/ThemeTrack.vue';
import AccentColorPicker   from '../AccentColorPicker.vue';
import ShortcutPicker      from '../ShortcutPicker.vue';

import { usePrefsStore } from '@/stores/prefs.js';
import { useTheme }      from '@/composables/useTheme.js';

const prefsStore = usePrefsStore();
const { setTheme } = useTheme();

const currentTheme = computed({
    get: () => prefsStore.preferences.theme,
    set: (value) => setTheme(value),
});
</script>

<template>
    <div class="settings-pane">
        <SettingsRow
            title="外观主题"
            description="选择浅色、跟随系统或深色模式"
        >
            <ThemeTrack v-model="currentTheme" />
        </SettingsRow>

        <SettingsRow
            title="主题色"
            description="自定义网页强调色(按钮、链接、高亮等)"
            stack
        >
            <AccentColorPicker />
        </SettingsRow>

        <SettingsRow
            title="发送快捷键"
            description="选择用什么按键发送消息"
            stack
        >
            <ShortcutPicker />
        </SettingsRow>
    </div>
</template>

<style scoped>
.settings-pane {
    animation: fade-in var(--transition-base) ease;
}
</style>
