/**
 * @file src/utils/escape.js
 * HTML 字符转义辅助。
 *
 * Vue 模板默认会对插值做转义,大部分场景下不需要手动调用这些函数。
 * 但在以下场景仍然有用:
 *   - 拼接 innerHTML(例如 Markdown 渲染时把代码块嵌进自定义 HTML)。
 *   - 把可能含 HTML 的字符串塞进 title / placeholder 等属性。
 */

/**
 * 把字符串中的 HTML 特殊字符转义,可安全地拼进 innerHTML。
 *
 * @param {unknown} value 任意可转字符串的值;null/undefined 会被转成空串
 * @returns {string} 转义后的字符串
 */
export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * 把字符串中的双引号转义,可安全地放入 HTML 属性的双引号值中。
 *
 * @param {unknown} value
 * @returns {string}
 */
export function escapeAttribute(value) {
    return String(value ?? '').replace(/"/g, '&quot;');
}

/**
 * 把字符串中的 HTML 标签全部剥掉,返回纯文本。
 * 用于把"含 SVG 的展示名"塞到 title / placeholder 等不支持 HTML 的属性。
 *
 * @param {string} html 可能包含 HTML 标签的字符串
 * @returns {string} 去标签后的纯文本
 */
export function stripHtmlTags(html) {
    if (!html) return '';
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = String(html);
    return (tempContainer.textContent || tempContainer.innerText || '').trim();
}
