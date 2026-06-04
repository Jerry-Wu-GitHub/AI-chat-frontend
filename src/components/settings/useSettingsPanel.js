/**
 * @file src/components/settings/useSettingsPanel.js
 * 设置面板的显隐控制(全局单例)。
 */

import { ref } from 'vue';

/** 是否正在显示设置面板。 */
const isSettingsOpen = ref(false);

/** 当前激活的 tab。初始值是第一个 tab 的 id。 */
const activeTabId = ref('prefs');

/** 已知的 tab id 列表(必须与 SettingsPanel.TABS 一致)。 */
const KNOWN_TAB_IDS = ['prefs', 'services', 'chat'];

/**
 * 提供设置面板的开关方法和当前状态。
 *
 * @returns {{
 *   isSettingsOpen: import('vue').Ref<boolean>,
 *   activeTabId:    import('vue').Ref<string>,
 *   openSettings:   (tabId?: string) => void,
 *   closeSettings:  () => void,
 * }}
 */
export function useSettingsPanel() {
    /**
     * 打开设置面板。
     * 调用方可显式指定要切到哪个 tab;
     * 不传时,如果 activeTabId 已是合法 tab 就保留,否则回落到 'prefs'。
     *
     * @param {string} [tabId]
     * @returns {void}
     */
    function openSettings(tabId) {
        if (tabId && KNOWN_TAB_IDS.includes(tabId)) {
            activeTabId.value = tabId;
        } else if (!KNOWN_TAB_IDS.includes(activeTabId.value)) {
            activeTabId.value = 'prefs';
        }
        isSettingsOpen.value = true;
    }

    /**
     * 关闭设置面板。
     *
     * @returns {void}
     */
    function closeSettings() {
        isSettingsOpen.value = false;
    }

    return { isSettingsOpen, activeTabId, openSettings, closeSettings };
}
