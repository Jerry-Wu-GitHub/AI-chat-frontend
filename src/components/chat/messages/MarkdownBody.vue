<script setup>
/**
 * @file src/components/chat/messages/MarkdownBody.vue
 * Markdown 正文渲染容器。
 *
 * 渲染策略:
 *   - 默认走懒渲染(useLazyRender):元素进入视口附近才渲染。
 *   - 流式期间,父组件(AssistantMessage)会主动调用 setStreamHtml()
 *     在每次增量后写入最新 HTML。
 *   - 渲染后自动触发 KaTeX 和 Mermaid。
 *   - 内部代码块的"复制 / 下载 / Mermaid 缩放拖拽"等交互通过
 *     事件委托绑定,避免在 innerHTML 内写 onclick。
 */

import { ref, watch, onBeforeUnmount } from 'vue';

import { useLazyRender } from '@/composables/useLazyRender.js';
import { useMarkdown }   from '@/composables/useMarkdown.js';
import { useToast }      from '@/composables/useToast.js';

import { renderMarkdownToHtml } from '@/utils/markdown.js';
import { languageToExtension, buildCodeBlockBaseFilename } from '@/utils/lang-ext.js';
import { downloadBlob }         from '@/utils/format.js';
import {
    serializeMermaidSvg,
    svgStringToPngBlob,
    getSvgBoundingBox,
} from '@/utils/mermaid-export.js';


const props = defineProps({
    /** 原始 Markdown 文本。响应式;变化时(非流式期间)会重新触发懒渲染。 */
    rawText: {
        type: String,
        default: '',
    },
    /** 消息 id(用于代码块下载文件名)。 */
    messageId: {
        type: String,
        default: '',
    },
    /** 模型名(用于代码块下载文件名)。 */
    modelName: {
        type: String,
        default: 'unknown',
    },
    /** 是否启用懒渲染。流式期间需要传 false,由父组件主动写入。 */
    lazy: {
        type: Boolean,
        default: true,
    },
});

const { showToast }     = useToast();
const { renderMath, renderMermaid } = useMarkdown();

/** @type {import('vue').Ref<HTMLElement | null>} */
const containerRef = ref(null);

/**
 * 渲染后回调:做 KaTeX 和 Mermaid 二次处理,然后绑定事件委托。
 *
 * @param {HTMLElement} element
 * @returns {void}
 */
function onRendered(element) {
    renderMath(element);
    renderMermaid(element);
}

// 懒渲染钩子(只在 lazy=true 时真正注册)
const { renderNow } = useLazyRender(containerRef, {
    rawText:   () => props.rawText,
    messageId: () => props.messageId,
    onRendered,
});

/**
 * 流式期间外部调用:直接把已渲染好的 HTML 写入容器,并做后处理。
 *
 * @param {string} html
 * @returns {void}
 */
function setStreamHtml(html) {
    const element = containerRef.value;
    if (!element) return;
    element.innerHTML = html;
    onRendered(element);
}

/**
 * 流式结束后调用:做一次最终的全量渲染。
 *
 * @returns {void}
 */
function finalizeStreamRender() {
    const element = containerRef.value;
    if (!element) return;
    element.innerHTML = renderMarkdownToHtml(props.rawText, props.messageId);
    onRendered(element);
    element.dataset.mdRendered = 'true';
}

/**
 * 非流式场景下,如果 rawText 变化(例如用户编辑了消息),
 * 重置渲染状态并重新走懒渲染。
 */
watch(() => props.rawText, () => {
    const element = containerRef.value;
    if (!element) return;
    if (!props.lazy) return;
    element.removeAttribute('data-md-rendered');
    element.textContent = props.rawText;
});

/**
 * 暴露给父组件的方法。
 */
defineExpose({
    renderNow,
    setStreamHtml,
    finalizeStreamRender,
    /** 直接获取容器 DOM(供需要细粒度操作的场景使用)。 */
    getElement: () => containerRef.value,
});

/* ================================================================
   事件委托:代码块的复制 / 下载、Mermaid 的缩放 / 拖拽 / 切换形态
   ================================================================ */

/**
 * 主点击处理器。
 *
 * @param {MouseEvent} event
 * @returns {void}
 */
function onContainerClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    // 复制代码块
    const copyButton = target.closest('.btn-copy');
    if (copyButton) {
        handleCopyCode(copyButton);
        return;
    }

    // 下载代码块
    const downloadButton = target.closest('.btn-download-code');
    if (downloadButton) {
        handleDownloadCode(downloadButton);
        return;
    }

    // Mermaid 缩放 / 适应
    const zoomInButton = target.closest('.btn-mermaid-zoom-in');
    if (zoomInButton) {
        applyMermaidZoom(zoomInButton.closest('.mermaid-block-wrap'), +1);
        return;
    }
    const zoomOutButton = target.closest('.btn-mermaid-zoom-out');
    if (zoomOutButton) {
        applyMermaidZoom(zoomOutButton.closest('.mermaid-block-wrap'), -1);
        return;
    }
    const fitButton = target.closest('.btn-mermaid-fit');
    if (fitButton) {
        applyMermaidFit(fitButton.closest('.mermaid-block-wrap'));
        return;
    }

    // Mermaid 形态切换(图片 ↔ 代码)
    const toggleButton = target.closest('.btn-mermaid-toggle');
    if (toggleButton) {
        toggleMermaidView(toggleButton.closest('.mermaid-block-wrap'));
        return;
    }
}

/**
 * 复制代码块。Mermaid 图片形态下复制 PNG,失败回退到 SVG 源码。
 *
 * @param {HTMLElement} button
 * @returns {Promise<void>}
 */
async function handleCopyCode(button) {
    const wrap = button.closest('.code-block-wrap');
    if (!wrap) return;

    const isMermaidImage =
        wrap.classList.contains('mermaid-block-wrap') &&
        wrap.dataset.view === 'image';

    if (isMermaidImage) {
        await copyMermaidImage(button, wrap);
        return;
    }

    const codeText = wrap.querySelector('code')?.innerText || '';
    try {
        await navigator.clipboard.writeText(codeText);
        flashButton(button, '已复制');
    } catch {
        showToast('复制失败', 'error');
    }
}

/**
 * 复制 Mermaid 图为 PNG(失败回退 SVG)。
 *
 * @param {HTMLElement} button
 * @param {HTMLElement} wrap
 * @returns {Promise<void>}
 */
async function copyMermaidImage(button, wrap) {
    const svg = wrap.querySelector('.mermaid-canvas svg');
    if (!svg) {
        showToast('图片还未就绪', 'error');
        return;
    }

    try {
        if (
            navigator.clipboard &&
            window.ClipboardItem &&
            typeof navigator.clipboard.write === 'function'
        ) {
            const svgText = serializeMermaidSvg(svg, {
                convertForeignObjectsToTextNodes: true,
                backgroundColor: resolveDiagramBackground(),
            });
            const box = getSvgBoundingBox(svg);
            const pngBlob = await svgStringToPngBlob(svgText, box.width, box.height);
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': pngBlob }),
            ]);
            flashButton(button, '已复制');
            return;
        }
    } catch (copyError) {
        console.warn('复制 PNG 失败,尝试 SVG:', copyError);
    }

    // 回退:复制 SVG 源码
    try {
        const svgText = serializeMermaidSvg(svg, {
            backgroundColor: resolveDiagramBackground(),
        });
        await navigator.clipboard.writeText(svgText);
        flashButton(button, '已复制 SVG');
        showToast('PNG 复制失败,已复制 SVG 源码', 'info');
    } catch {
        showToast('复制失败', 'error');
    }
}

/**
 * 下载代码块。Mermaid 图片形态下载 PNG,普通代码块下载源码。
 *
 * @param {HTMLElement} button
 * @returns {Promise<void>}
 */
async function handleDownloadCode(button) {
    const wrap = button.closest('.code-block-wrap');
    if (!wrap) return;

    const blockIndex = wrap.dataset.blockIdx || '0';
    const baseFilename = buildCodeBlockBaseFilename(
        props.modelName,
        props.messageId,
        blockIndex,
    );

    if (wrap.classList.contains('mermaid-block-wrap') && wrap.dataset.view === 'image') {
        await downloadMermaidImage(wrap, baseFilename);
        return;
    }

    const codeText = wrap.querySelector('code')?.innerText || '';
    const language = wrap.dataset.lang || 'text';
    const extension = languageToExtension(language);
    const blob = new Blob([codeText], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, `${baseFilename}.${extension}`);
}

/**
 * 下载 Mermaid 图(PNG,失败回退 SVG)。
 *
 * @param {HTMLElement} wrap
 * @param {string} baseFilename
 * @returns {Promise<void>}
 */
async function downloadMermaidImage(wrap, baseFilename) {
    const svg = wrap.querySelector('.mermaid-canvas svg');
    if (!svg) {
        showToast('图片还未就绪', 'error');
        return;
    }

    try {
        const svgText = serializeMermaidSvg(svg, {
            convertForeignObjectsToTextNodes: true,
            backgroundColor: resolveDiagramBackground(),
        });
        const box = getSvgBoundingBox(svg);
        const pngBlob = await svgStringToPngBlob(svgText, box.width, box.height);
        downloadBlob(pngBlob, `${baseFilename}.png`);
        showToast('图片已下载', 'success');
    } catch (downloadError) {
        console.warn('下载 PNG 失败,尝试 SVG:', downloadError);
        try {
            const svgText = serializeMermaidSvg(svg, {
                backgroundColor: resolveDiagramBackground(),
            });
            const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
            downloadBlob(blob, `${baseFilename}.svg`);
            showToast('PNG 生成失败,已下载 SVG', 'info');
        } catch {
            showToast('下载失败', 'error');
        }
    }
}

/**
 * 给按钮临时显示反馈文字,然后还原。
 *
 * @param {HTMLElement} button
 * @param {string} text
 * @returns {void}
 */
function flashButton(button, text) {
    const originalText = button.innerHTML;
    button.innerHTML = text;
    button.classList.add('copied');
    setTimeout(() => {
        button.innerHTML = originalText;
        button.classList.remove('copied');
    }, 1500);
}

/**
 * 解析当前主题对应的图表背景色。
 *
 * @returns {string}
 */
function resolveDiagramBackground() {
    const resolvedTheme = document.documentElement.getAttribute('data-resolved-theme');
    return resolvedTheme === 'dark' ? '#1e1e1e' : '#ffffff';
}

/* ================================================================
   Mermaid 缩放 / 适应 / 切换 / 拖拽
   ================================================================ */

const MERMAID_MIN_SCALE = 0.3;
const MERMAID_MAX_SCALE = 4;
const MERMAID_SCALE_STEP = 0.15;

/**
 * 缩放(direction = +1 / -1)。
 *
 * @param {HTMLElement | null} wrap
 * @param {number} direction
 * @returns {void}
 */
function applyMermaidZoom(wrap, direction) {
    if (!wrap) return;
    const current = Number(wrap.dataset.scale || '1');
    const next = Math.max(
        MERMAID_MIN_SCALE,
        Math.min(MERMAID_MAX_SCALE, current + direction * MERMAID_SCALE_STEP),
    );
    wrap.dataset.scale = String(next);
    applyMermaidTransform(wrap);
}

/**
 * 适应页面。考虑极端长宽比,保证可读性。
 *
 * @param {HTMLElement | null} wrap
 * @returns {void}
 */
function applyMermaidFit(wrap) {
    if (!wrap) return;
    const pane = wrap.querySelector('.mermaid-image-pane');
    const canvas = wrap.querySelector('.mermaid-canvas');
    const svg = canvas?.querySelector('svg');
    if (!pane || !canvas || !svg) return;

    const paneWidth = Math.max(pane.clientWidth - 28, 100);
    const box = getSvgBoundingBox(svg);
    const scale = Math.min(1, paneWidth / box.width);
    const scaledWidth = box.width * scale;
    const scaledHeight = box.height * scale;

    wrap.dataset.scale = String(scale);
    wrap.dataset.offsetX = String(Math.max((paneWidth - scaledWidth) / 2, 0));
    wrap.dataset.offsetY = String(Math.max((pane.clientHeight - scaledHeight) / 2, 0));
    applyMermaidTransform(wrap);
}

/**
 * 应用当前 scale + offset 到 canvas 的 transform。
 *
 * @param {HTMLElement} wrap
 * @returns {void}
 */
function applyMermaidTransform(wrap) {
    const canvas = wrap.querySelector('.mermaid-canvas');
    if (!canvas) return;
    const scale = Number(wrap.dataset.scale || '1');
    const offsetX = Number(wrap.dataset.offsetX || '0');
    const offsetY = Number(wrap.dataset.offsetY || '0');
    canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

/**
 * 切换 Mermaid 形态:图片 ↔ 代码。
 *
 * @param {HTMLElement | null} wrap
 * @returns {void}
 */
function toggleMermaidView(wrap) {
    if (!wrap) return;
    wrap.dataset.view = wrap.dataset.view === 'image' ? 'code' : 'image';
}

/* ================================================================
   Mermaid 拖拽:用 pointerdown 在容器层级监听
   ================================================================ */

/** 当前正在拖拽的状态。 */
const dragState = {
    /** @type {HTMLElement | null} */
    wrap:     null,
    /** @type {HTMLElement | null} */
    pane:     null,
    startX:   0,
    startY:   0,
    baseX:    0,
    baseY:    0,
};

/**
 * @param {PointerEvent} event
 */
function onContainerPointerDown(event) {
    if (event.button !== 0) return;
    const pane = event.target instanceof Element
        ? event.target.closest('.mermaid-image-pane')
        : null;
    if (!pane) return;
    const wrap = pane.closest('.mermaid-block-wrap');
    if (!wrap || wrap.dataset.view !== 'image') return;

    dragState.wrap = wrap;
    dragState.pane = pane;
    dragState.startX = event.clientX;
    dragState.startY = event.clientY;
    dragState.baseX = Number(wrap.dataset.offsetX || '0');
    dragState.baseY = Number(wrap.dataset.offsetY || '0');

    pane.classList.add('dragging');
    pane.setPointerCapture(event.pointerId);

    pane.addEventListener('pointermove',  onContainerPointerMove);
    pane.addEventListener('pointerup',    onContainerPointerUp);
    pane.addEventListener('pointercancel', onContainerPointerUp);
}

/**
 * @param {PointerEvent} event
 */
function onContainerPointerMove(event) {
    if (!dragState.wrap) return;
    dragState.wrap.dataset.offsetX = String(dragState.baseX + event.clientX - dragState.startX);
    dragState.wrap.dataset.offsetY = String(dragState.baseY + event.clientY - dragState.startY);
    applyMermaidTransform(dragState.wrap);
}

/**
 * @param {PointerEvent} event
 */
function onContainerPointerUp(event) {
    const pane = dragState.pane;
    if (pane) {
        pane.classList.remove('dragging');
        if (pane.hasPointerCapture(event.pointerId)) {
            pane.releasePointerCapture(event.pointerId);
        }
        pane.removeEventListener('pointermove',   onContainerPointerMove);
        pane.removeEventListener('pointerup',     onContainerPointerUp);
        pane.removeEventListener('pointercancel', onContainerPointerUp);
    }
    dragState.wrap = null;
    dragState.pane = null;
}

onBeforeUnmount(() => {
    if (dragState.pane) {
        dragState.pane.removeEventListener('pointermove',   onContainerPointerMove);
        dragState.pane.removeEventListener('pointerup',     onContainerPointerUp);
        dragState.pane.removeEventListener('pointercancel', onContainerPointerUp);
    }
});
</script>

<template>
    <!--
        懒渲染下,初始内容是 rawText 占位(让布局撑开高度)。
        进入视口后由 useLazyRender 把 innerHTML 替换为渲染后 HTML。
        流式时由父组件主动调用 setStreamHtml 写入。
    -->
    <div
        ref="containerRef"
        class="md-body"
        :data-msg-id="messageId"
        @click="onContainerClick"
        @pointerdown="onContainerPointerDown"
    >{{ lazy ? rawText : '' }}</div>
</template>
