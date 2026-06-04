/**
 * @file src/main.js
 * 应用入口。负责:
 *   1. 创建 Vue 应用实例并注册 Pinia。
 *   2. 在首屏渲染前,把已保存的主题、主题色等关键偏好同步应用到 <html> 上,
 *      避免出现"白屏 → 深色"之类的视觉跳变。
 *   3. 挂载根组件 App。
 *
 * 注意:这里只做"在挂载前必须完成"的事;其它初始化(例如拉取默认服务、
 * 加载模型列表、恢复上次会话)放在 App.vue 的 onMounted 中,因为它们
 * 依赖响应式 store 和组件已挂载的 DOM。
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import { usePrefsStore } from './stores/prefs.js';
import { applyTheme, applyAccentColor } from './composables/useTheme.js';

// 全部样式入口。一个文件汇总所有 CSS,顺序由 index.css 内部控制。
import './assets/styles/index.css';

/**
 * 在挂载 Vue 之前同步应用用户偏好。
 *
 * 这里不能直接 `usePrefsStore()`,因为 Pinia 还没装到 app 上;
 * 但偏好本身只是从 localStorage 读出的 JSON,完全可以在 store 之外
 * 读取并应用一次。store 在被组件首次访问时也会从同一份 localStorage
 * 初始化,二者数据来源一致。
 */
function applyPreferencesBeforeMount() {
    /** @type {string} */
    let theme = 'system';
    /** @type {string} */
    let accentColor = '#6366f1';

    try {
        const raw = localStorage.getItem('ai_chat_prefs');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (typeof parsed?.theme === 'string') {
                theme = parsed.theme;
            }
            if (typeof parsed?.accentColor === 'string') {
                accentColor = parsed.accentColor;
            }
        }
    } catch (parseError) {
        // 偏好读取失败时使用默认值即可,不打断启动流程。
        console.warn('读取用户偏好失败,使用默认值:', parseError);
    }

    applyTheme(theme);
    applyAccentColor(accentColor);
}

applyPreferencesBeforeMount();

const app = createApp(App);
app.use(createPinia());
app.mount('#app');
