/**
 * @file src/stores/prefs.js
 * 用户偏好设置 store。包含:
 *   - theme:                浅色 / 跟随系统 / 深色
 *   - accentColor:          主题强调色(hex)
 *   - sendShortcut:         发送快捷键
 *   - sidebarOpen:          侧边栏是否展开
 *   - navRailEnabled:       是否显示右侧消息导航栏
 *   - showInheritedPrompts: 是否在对话顶部显示固定系统提示词气泡
 *   - autoCollapseControls: 鼠标移开时是否自动收起底部工具栏
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';

import { readPersistedJson, attachAutoPersist } from './_persist.js';

const STORAGE_KEY = 'ai_chat_prefs';

/** 发送快捷键允许的取值。 */
const VALID_SHORTCUTS = ['enter', 'ctrl-enter', 'shift-enter'];

/**
 * 偏好的默认值。
 * @returns {object}
 */
function makeDefaultPrefs() {
    return {
        theme:                'system',
        accentColor:          '#6366f1',
        sendShortcut:         'enter',
        sidebarOpen:          true,
        navRailEnabled:       true,
        showInheritedPrompts: true,
        autoCollapseControls: true,
    };
}

export const usePrefsStore = defineStore('prefs', () => {
    // 从 localStorage 读出,合并默认值,做基础校验。
    const stored = readPersistedJson(STORAGE_KEY, {});
    const initial = { ...makeDefaultPrefs(), ...stored };
    if (!VALID_SHORTCUTS.includes(initial.sendShortcut)) {
        initial.sendShortcut = 'enter';
    }

    const preferences = ref(initial);

    // 任何修改都自动写回 localStorage。
    attachAutoPersist(STORAGE_KEY, preferences);

    /**
     * 批量更新偏好。只覆盖传入的字段,未传入的保持原值。
     *
     * @param {Partial<ReturnType<typeof makeDefaultPrefs>>} patch
     * @returns {void}
     */
    function updatePreferences(patch) {
        preferences.value = { ...preferences.value, ...patch };
    }

    return {
        preferences,
        updatePreferences,
    };
});
