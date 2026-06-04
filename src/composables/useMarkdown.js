/**
 * @file src/composables/useMarkdown.js
 * Markdown 渲染后的 DOM 后处理:KaTeX 公式渲染 + Mermaid 代码块渲染。
 *
 * 文本到 HTML 字符串的转换在 utils/markdown.js;
 * 这里负责拿到挂载好 HTML 的容器后,二次处理可视元素。
 */

import renderMathInElement from 'katex/contrib/auto-render';
import mermaid from 'mermaid';

let mermaidInitialized = false;
let mermaidSequenceId = 0;

/**
 * 提供 Markdown 后处理方法。
 *
 * @returns {{
 *   renderMath:    (element: HTMLElement) => void,
 *   renderMermaid: (element: HTMLElement) => Promise<void>,
 * }}
 */
export function useMarkdown() {
    /**
     * 在指定容器内渲染数学公式。
     *
     * @param {HTMLElement} element
     * @returns {void}
     */
    function renderMath(element) {
        if (!element) return;
        renderMathInElement(element, {
            delimiters: [
                { left: '\\[', right: '\\]', display: true  },
                { left: '\\(', right: '\\)', display: false },
            ],
            throwOnError: false,
            errorColor: '#cc0000',
        });
    }

    /**
     * 渲染容器内所有 Mermaid 代码块(由 markdown 渲染时产出的占位容器)。
     *
     * 每个 .mermaid-block-wrap 内的 .mermaid-canvas 元素持有 data-mermaid-code 属性,
     * 这里读出代码、调用 mermaid.render() 得到 SVG,再写回 canvas。
     *
     * 已渲染过的容器会被 data-mermaid-rendered="true" 标记,重复调用幂等。
     *
     * @param {HTMLElement} element
     * @returns {Promise<void>}
     */
    async function renderMermaid(element) {
        if (!element) return;
        ensureMermaidInitialized();

        const blocks = element.querySelectorAll('.mermaid-block-wrap');
        for (const block of blocks) {
            if (block.dataset.mermaidRendered === 'true') continue;
            await renderSingleMermaidBlock(block);
        }
    }

    return { renderMath, renderMermaid };
}

/**
 * 懒初始化 Mermaid。主题跟随 <html data-resolved-theme>。
 */
function ensureMermaidInitialized() {
    if (mermaidInitialized) return;
    const resolvedTheme = document.documentElement.getAttribute('data-resolved-theme');
    mermaid.initialize({
        startOnLoad:   false,
        securityLevel: 'loose',
        theme:         resolvedTheme === 'dark' ? 'dark' : 'default',
    });
    mermaidInitialized = true;
}

/**
 * 渲染单个 .mermaid-block-wrap 内的图。
 *
 * @param {HTMLElement} blockElement
 * @returns {Promise<void>}
 */
async function renderSingleMermaidBlock(blockElement) {
    const canvas = blockElement.querySelector('.mermaid-canvas');
    if (!canvas) return;

    const mermaidCode = canvas.dataset.mermaidCode || '';
    if (!mermaidCode.trim()) {
        canvas.innerHTML = '<div class="mermaid-error">Mermaid 内容为空</div>';
        blockElement.dataset.mermaidRendered = 'true';
        return;
    }

    try {
        const renderId = `mermaid-${Date.now()}-${mermaidSequenceId++}`;
        const { svg } = await mermaid.render(renderId, mermaidCode);

        canvas.innerHTML = svg;
        const svgElement = canvas.querySelector('svg');
        if (svgElement) {
            svgElement.removeAttribute('height');
            svgElement.style.maxWidth = 'none';
            svgElement.style.height = 'auto';
        }
        blockElement.dataset.mermaidRendered = 'true';
    } catch (renderError) {
        console.warn('Mermaid 渲染失败:', renderError);
        canvas.innerHTML = '<div class="mermaid-error">Mermaid 渲染失败</div>';
        blockElement.dataset.mermaidRendered = 'true';
    }
}
