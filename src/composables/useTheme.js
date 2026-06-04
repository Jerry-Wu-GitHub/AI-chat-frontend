/**
 * @file src/composables/useTheme.js
 * 主题应用工具。
 *
 * 这个文件分成两半:
 *   - 模块级"立即生效"函数(applyTheme / applyAccentColor):
 *     不需要 Vue 上下文,在 main.js 首屏阶段就可调用,避免主题闪烁。
 *   - useTheme():供组件使用的 hook,提供切换主题的便捷方法 + 系统主题监听。
 */

import { onMounted, onBeforeUnmount } from 'vue';

import { hexToHsl } from '@/utils/color.js';
import { usePrefsStore } from '@/stores/prefs.js';

/**
 * 把主题应用到 <html> 元素,并切换 highlight.js 样式表的 disabled。
 * 不读 Pinia,适合在 Vue 挂载前调用。
 *
 * @param {'light'|'system'|'dark'} theme
 * @returns {void}
 */
export function applyTheme(theme) {
    const htmlElement = document.documentElement;
    htmlElement.setAttribute('data-theme', theme);

    let resolvedTheme = theme;
    if (theme === 'system') {
        resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
    }
    htmlElement.setAttribute('data-resolved-theme', resolvedTheme);

    // 切换 highlight.js 样式表。元素可能在首屏渲染前不存在,做容错。
    const lightStyle = document.getElementById('hljs-light-theme');
    const darkStyle  = document.getElementById('hljs-dark-theme');
    if (lightStyle) lightStyle.disabled = (resolvedTheme === 'dark');
    if (darkStyle)  darkStyle.disabled  = (resolvedTheme === 'light');
}

/**
 * 把主题强调色(hex)写入 :root 的 --accent-h/s/l CSS 变量。
 * 解析失败时静默忽略。
 *
 * @param {string} hexColor
 * @returns {void}
 */
export function applyAccentColor(hexColor) {
    const hsl = hexToHsl(hexColor);
    if (!hsl) return;
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--accent-h', String(hsl.h));
    rootStyle.setProperty('--accent-s', `${hsl.s}%`);
    rootStyle.setProperty('--accent-l', `${hsl.l}%`);
}

/**
 * 主题 hook:暴露切换主题/强调色的方法,并自动监听系统主题变化。
 *
 * 系统主题监听只在 onMounted 之后才注册,避免 SSR 或测试环境报错。
 *
 * @returns {{
 *   setTheme: (theme: 'light'|'system'|'dark') => void,
 *   setAccentColor: (hex: string) => void,
 * }}
 */
export function useTheme() {
    const prefsStore = usePrefsStore();

    /** @type {MediaQueryList | null} */
    let darkMediaQuery = null;

    /**
     * 系统主题变化的回调:仅在用户选择"跟随系统"时生效。
     */
    function onSystemThemeChange() {
        if (prefsStore.preferences.theme === 'system') {
            applyTheme('system');
        }
    }

    onMounted(() => {
        darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        darkMediaQuery.addEventListener('change', onSystemThemeChange);
    });

    onBeforeUnmount(() => {
        darkMediaQuery?.removeEventListener('change', onSystemThemeChange);
    });

    /**
     * 切换主题并持久化。
     *
     * @param {'light'|'system'|'dark'} theme
     * @returns {void}
     */
    function setTheme(theme) {
        prefsStore.updatePreferences({ theme });
        applyTheme(theme);
    }

    /**
     * 切换强调色并持久化。
     *
     * @param {string} hexColor 形如 "#6366f1"
     * @returns {void}
     */
    function setAccentColor(hexColor) {
        prefsStore.updatePreferences({ accentColor: hexColor });
        applyAccentColor(hexColor);
    }

    return { setTheme, setAccentColor };
}
