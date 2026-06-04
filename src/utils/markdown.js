/**
 * @file src/utils/markdown.js
 * Markdown 渲染:把原始 Markdown 文本转成 HTML 字符串。
 *
 * 渲染细节:
 *   - 用 markdown-it 做基础渲染,highlight.js 做语法高亮。
 *   - 围栏代码块的渲染规则被覆盖,输出自带"复制 / 下载"按钮的容器。
 *   - Mermaid 代码块输出"双形态"容器(图片视图 / 代码视图),
 *     真正的渲染逻辑在 MermaidBlock.vue。
 *   - 数学公式($、$$、$$..$$)用占位符保护,绕开 markdown-it 解析,
 *     KaTeX auto-render 在挂载后处理。
 *
 * 这里只输出 HTML 字符串,不接触真实 DOM。挂载后的二次处理
 * (KaTeX 渲染、Mermaid 渲染)由 composables/useMarkdown.js 完成。
 */

import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';

import { escapeHtml, escapeAttribute } from './escape.js';
import { isMermaidLanguage } from './lang-ext.js';

/* ================================================================
   markdown-it 实例(懒初始化)
   ================================================================ */

/** @type {MarkdownIt | null} */
let markdownInstance = null;

/**
 * 获取(并在首次调用时初始化)markdown-it 实例。
 *
 * @returns {MarkdownIt}
 */
function getMarkdownInstance() {
    if (markdownInstance) return markdownInstance;

    markdownInstance = new MarkdownIt({
        html:        true,
        linkify:     true,
        typographer: false,
        highlight(code, language) {
            try {
                if (language && hljs.getLanguage(language)) {
                    return hljs.highlight(code, { language }).value;
                }
                return hljs.highlightAuto(code).value;
            } catch (highlightError) {
                console.warn('代码高亮失败:', highlightError);
                return markdownInstance.utils.escapeHtml(code);
            }
        },
    });

    // 覆盖围栏代码块渲染规则。
    markdownInstance.renderer.rules.fence = renderFenceBlock;
    return markdownInstance;
}

/**
 * 围栏代码块的自定义渲染规则。
 *
 * @param {Array} tokens
 * @param {number} index
 * @param {object} options
 * @param {{ blockIndex: number, messageId: string }} env
 * @returns {string} 渲染后的 HTML 字符串
 */
function renderFenceBlock(tokens, index, options, env) {
    const token = tokens[index];
    const rawLanguage = token.info ? token.info.trim().split(/\s+/)[0] : '';
    const language = rawLanguage || 'text';

    // 走 markdown-it 的 highlight 选项拿到高亮后的内部 HTML。
    let highlightedHtml;
    if (options.highlight) {
        const result = options.highlight(token.content, rawLanguage, '');
        highlightedHtml = (result && typeof result === 'string')
            ? result
            : markdownInstance.utils.escapeHtml(token.content);
    } else {
        highlightedHtml = markdownInstance.utils.escapeHtml(token.content);
    }

    // 给每个代码块一个序号(同消息内唯一),用于下载文件命名。
    const blockIndex = (env && typeof env.blockIndex === 'number') ? env.blockIndex++ : 0;
    const messageId  = (env && env.messageId) || '';

    if (isMermaidLanguage(language)) {
        return renderMermaidFenceHtml(token.content, language, highlightedHtml, blockIndex, messageId);
    }
    return renderNormalFenceHtml(language, highlightedHtml, blockIndex, messageId);
}

/**
 * 渲染普通代码块为 HTML 字符串。
 * 注意:复制 / 下载按钮在这里不绑事件,只是占位 class,
 * 真正的事件由 MarkdownBody.vue 通过事件委托处理。
 *
 * @param {string} language
 * @param {string} highlightedHtml
 * @param {number} blockIndex
 * @param {string} messageId
 * @returns {string}
 */
function renderNormalFenceHtml(language, highlightedHtml, blockIndex, messageId) {
    const safeLanguage = escapeHtml(language);
    return (
        `<div class="code-block-wrap"` +
            ` data-lang="${safeLanguage}"` +
            ` data-msg-id="${escapeHtml(messageId)}"` +
            ` data-block-idx="${blockIndex}">` +
            `<div class="code-block-header">` +
                `<span class="code-lang">${safeLanguage}</span>` +
                `<div class="code-block-actions">` +
                    `<button class="btn-copy" type="button">复制</button>` +
                    `<button class="btn-download-code" type="button">下载</button>` +
                `</div>` +
            `</div>` +
            `<pre><code class="hljs language-${safeLanguage}">${highlightedHtml}</code></pre>` +
        `</div>\n`
    );
}

/**
 * 渲染 Mermaid 代码块为"双形态"容器 HTML。
 * 默认展示为图片视图;真正的 SVG 渲染由 MermaidBlock.vue 在挂载后做。
 *
 * @param {string} rawCode      Mermaid 源码
 * @param {string} language
 * @param {string} highlightedHtml
 * @param {number} blockIndex
 * @param {string} messageId
 * @returns {string}
 */
function renderMermaidFenceHtml(rawCode, language, highlightedHtml, blockIndex, messageId) {
    const safeLanguage = escapeHtml(language);
    return (
        `<div class="code-block-wrap mermaid-block-wrap"` +
            ` data-lang="${safeLanguage}"` +
            ` data-msg-id="${escapeHtml(messageId)}"` +
            ` data-block-idx="${blockIndex}"` +
            ` data-view="image"` +
            ` data-scale="1"` +
            ` data-offset-x="0"` +
            ` data-offset-y="0">` +
            `<div class="code-block-header">` +
                `<span class="code-lang">${safeLanguage}</span>` +
                `<div class="code-block-actions">` +
                    `<button class="btn-copy" type="button">复制</button>` +
                    `<button class="btn-download-code" type="button">下载</button>` +
                    `<button class="btn-mermaid-tool btn-mermaid-zoom-out" type="button" title="缩小"></button>` +
                    `<button class="btn-mermaid-tool btn-mermaid-zoom-in" type="button" title="放大"></button>` +
                    `<button class="btn-mermaid-tool btn-mermaid-fit" type="button" title="适应页面"></button>` +
                    `<button class="btn-mermaid-toggle" type="button" title="代码 / 图片切换"></button>` +
                `</div>` +
            `</div>` +
            `<div class="mermaid-image-pane">` +
                `<div class="mermaid-canvas" data-mermaid-code="${escapeAttribute(rawCode)}">` +
                    `<div class="mermaid-loading">正在渲染 Mermaid...</div>` +
                `</div>` +
            `</div>` +
            `<pre class="mermaid-code-pane"><code class="hljs language-${safeLanguage}">${highlightedHtml}</code></pre>` +
        `</div>\n`
    );
}

/* ================================================================
   预处理:保护代码块和公式
   ================================================================ */

/**
 * 判断一行去掉前导空白后是否像 HTML 标签开头。
 *
 * @param {string} line
 * @returns {boolean}
 */
function lineLooksLikeHtml(line) {
    const trimmed = String(line || '').trimStart();
    return /^<\/?[a-zA-Z][a-zA-Z0-9:-]*(?:\s|>|\/>)/.test(trimmed)
        || /^<!doctype\s+html\s*>/i.test(trimmed)
        || /^<!--/.test(trimmed);
}

/**
 * 避免缩进的 HTML 被 markdown-it 当作"缩进代码块"。
 * 把"行首 ≥ 4 空格且看起来像 HTML"的行的前导空白去掉。
 *
 * 内部会跳过 fence 代码块和块级公式区域。
 *
 * @param {string} text 原始 Markdown(此时 fence/公式应已被占位符替换)
 * @returns {string}
 */
function unindentHtmlBlocks(text) {
    const lines = String(text || '').split('\n');

    let inFence = false;
    let fenceMarker = '';
    let inMathBlock = false;

    return lines.map((line) => {
        const fenceMatch = line.match(/^[ \t]*(`{3,}|~{3,})/);

        if (!inMathBlock && fenceMatch) {
            const marker = fenceMatch[1][0];
            if (!inFence) {
                inFence = true;
                fenceMarker = marker;
            } else if (marker === fenceMarker) {
                inFence = false;
                fenceMarker = '';
            }
            return line;
        }

        if (!inFence && /^\s*\$\$\s*$/.test(line)) {
            inMathBlock = !inMathBlock;
            return line;
        }

        if (inFence || inMathBlock) return line;

        const hasCodeIndent = /^(?: {4,}|\t+)/.test(line);
        if (!hasCodeIndent) return line;
        if (!lineLooksLikeHtml(line)) return line;

        return line.trimStart();
    }).join('\n');
}

/* ================================================================
   公开 API
   ================================================================ */

/**
 * 把 Markdown 文本渲染为 HTML 字符串。
 *
 * 这一步不接触真实 DOM,也不渲染数学公式 / Mermaid 图;
 * 调用方拿到 HTML 后:
 *   - 把它写到容器 .innerHTML;
 *   - 调用 useMarkdown 暴露的 renderMathInElement、renderMermaidBlocks
 *     做二次处理。
 *
 * @param {string} text       原始 Markdown
 * @param {string} [messageId=''] 消息 id,用于代码块下载文件命名
 * @returns {string} HTML 字符串
 */
export function renderMarkdownToHtml(text, messageId = '') {
    if (!text) return '';

    const md = getMarkdownInstance();
    const env = { blockIndex: 0, messageId };

    // 1) 用占位符保护所有 fence 代码块,避免它们被后续替换误伤。
    const fenceSnapshots = [];
    let working = text.replace(
        /^([ \t]*)(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)\n\1\2[ \t]*$/gm,
        (match) => {
            const index = fenceSnapshots.length;
            fenceSnapshots.push(match);
            return `FENCEPLACEHOLDER_${index}_END`;
        },
    );

    // 2) 把数学公式($$ block、$$ inline、$ inline)替换为 KaTeX 友好的占位符。
    const mathSnapshots = [];

    working = working.replace(/^\s*\$\$\n([\s\S]+?)\n\s*\$\$$/gm, (_, inner) => {
        const index = mathSnapshots.length;
        mathSnapshots.push(`\\[\n${inner}\n\\]`);
        return `MATHPLACEHOLDER_BLOCK_${index}_END`;
    });

    working = working.replace(/\$\$([^\n]+?)\$\$/g, (_, inner) => {
        const index = mathSnapshots.length;
        mathSnapshots.push(`\\(${inner}\\)`);
        return `MATHPLACEHOLDER_INLINE_${index}_END`;
    });

    working = working.replace(/\$([^\$\n]+?)\$/g, (_, inner) => {
        const index = mathSnapshots.length;
        mathSnapshots.push(`\\(${inner}\\)`);
        return `MATHPLACEHOLDER_INLINE_${index}_END`;
    });

    // 3) 修正"缩进 HTML"。
    working = unindentHtmlBlocks(working);

    // 4) 还原 fence 占位符。
    working = working.replace(/FENCEPLACEHOLDER_(\d+)_END/g, (_, indexString) => {
        return fenceSnapshots[parseInt(indexString, 10)];
    });

    // 5) markdown-it 渲染。
    let html = md.render(working, env);

    // 6) 还原数学占位符,交给 KaTeX 处理。
    html = html.replace(/MATHPLACEHOLDER_BLOCK_(\d+)_END/g, (_, indexString) => {
        return mathSnapshots[parseInt(indexString, 10)];
    });
    html = html.replace(/MATHPLACEHOLDER_INLINE_(\d+)_END/g, (_, indexString) => {
        return mathSnapshots[parseInt(indexString, 10)];
    });

    return html;
}
