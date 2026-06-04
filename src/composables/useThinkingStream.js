/**
 * @file src/composables/useThinkingStream.js
 * 流式思考块的节流渲染。
 *
 * 思考块在流式期间会持续接收 reasoning_content。如果每次有增量都
 * 整段重新渲染 Markdown,会非常卡。这里的策略:
 *   - 调度一次"立即渲染",然后在节流窗口内忽略后续调用。
 *   - 窗口结束后,如果期间还有新调用,再渲染一次。
 *   - 只在"已展开 + 视口附近"时才真正渲染,否则保留纯文本占位。
 *   - 流式期间会临时屏蔽"未闭合 Mermaid 块"的渲染,避免反复报错。
 */

import { renderMarkdownToHtml } from '@/utils/markdown.js';

const RENDER_THROTTLE_MS = 80;
const VIEWPORT_MARGIN_PX = 200;

/**
 * 每个思考块对应的节流状态。
 * @type {WeakMap<HTMLElement, { timerId: ReturnType<typeof setTimeout> | null, pending: boolean }>}
 */
const scheduleStates = new WeakMap();

/**
 * 判断思考块当前是否"展开 + 在视口附近"。
 *
 * @param {HTMLElement} blockElement
 * @returns {boolean}
 */
function isOpenAndNearViewport(blockElement) {
    if (!blockElement) return false;
    if (!blockElement.classList.contains('open')) return false;

    const rect = blockElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    if (rect.bottom < -VIEWPORT_MARGIN_PX) return false;
    if (rect.top > viewportHeight + VIEWPORT_MARGIN_PX) return false;
    return true;
}

/**
 * 流式期间用于"带守卫"的 Markdown 渲染:
 * 把"开了但还没闭合"的 ```mermaid 块临时改成 ```text,
 * 避免 Mermaid 拿到残缺源码反复抛错。
 *
 * @param {string} raw
 * @returns {string}
 */
function guardUnclosedMermaidFences(raw) {
    if (!raw) return '';

    const lines = raw.split('\n');
    let inFence = false;
    let fenceMarker = '';
    let fenceLength = 0;
    let openLineIndex = -1;
    let openIsMermaid = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^[ \t]*(`{3,}|~{3,})(.*)$/);
        if (!match) continue;

        if (!inFence) {
            inFence = true;
            fenceMarker = match[1][0];
            fenceLength = match[1].length;
            openLineIndex = i;
            openIsMermaid = /^\s*mermaid\b/i.test(match[2] || '');
        } else if (match[1][0] === fenceMarker && match[1].length >= fenceLength) {
            inFence = false;
            fenceMarker = '';
            fenceLength = 0;
            openLineIndex = -1;
            openIsMermaid = false;
        }
    }

    // 到结尾仍在 fence 内,且是 mermaid → 把开标记的语言改成 text。
    if (inFence && openIsMermaid && openLineIndex >= 0) {
        const openLine = lines[openLineIndex];
        lines[openLineIndex] = openLine.replace(
            /^([ \t]*(?:`{3,}|~{3,}))\s*mermaid\b.*$/i,
            '$1text',
        );
    }
    return lines.join('\n');
}

/**
 * 提供流式思考块渲染调度方法。
 *
 * 与组件解耦:调用方传入"块元素"和"承载 md 渲染的子元素",
 * 何时调度由 useChatStream 决定。
 *
 * @returns {{
 *   scheduleRender: (blockElement: HTMLElement, mdBodyElement: HTMLElement, rawText: string, messageId: string, onRendered?: (el: HTMLElement) => void) => void,
 *   renderImmediately: (blockElement: HTMLElement, mdBodyElement: HTMLElement, rawText: string, messageId: string, onRendered?: (el: HTMLElement) => void) => void,
 *   clearSchedule: (blockElement: HTMLElement) => void,
 * }}
 */
export function useThinkingStream() {
    /**
     * 在容器中执行一次渲染。
     *
     * @param {HTMLElement} mdBodyElement
     * @param {string} rawText
     * @param {string} messageId
     * @param {((el: HTMLElement) => void) | undefined} onRendered
     */
    function performRender(mdBodyElement, rawText, messageId, onRendered) {
        const scroller = document.getElementById('message-list');
        const wasAtBottom = scroller
            ? (scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight) <= 80
            : false;

        const safeText = guardUnclosedMermaidFences(rawText);
        mdBodyElement.innerHTML = renderMarkdownToHtml(safeText, messageId);
        mdBodyElement.dataset.streamingRendered = 'true';
        mdBodyElement.classList.remove('streaming-plain');

        onRendered?.(mdBodyElement);

        if (scroller && wasAtBottom) {
            scroller.scrollTop = scroller.scrollHeight;
        }
    }

    /**
     * 调度一次渲染(节流)。
     */
    function scheduleRender(blockElement, mdBodyElement, rawText, messageId, onRendered) {
        if (!blockElement || !mdBodyElement) return;
        if (!isOpenAndNearViewport(blockElement)) return;

        let state = scheduleStates.get(blockElement);
        if (!state) {
            state = { timerId: null, pending: false };
            scheduleStates.set(blockElement, state);
        }

        if (state.timerId !== null) {
            state.pending = true;
            return;
        }

        // 立刻执行一次,后续命中节流。
        performRender(mdBodyElement, rawText, messageId, onRendered);

        state.timerId = setTimeout(() => {
            const currentState = scheduleStates.get(blockElement);
            if (!currentState) return;
            currentState.timerId = null;

            if (currentState.pending) {
                currentState.pending = false;
                if (isOpenAndNearViewport(blockElement)) {
                    performRender(mdBodyElement, rawText, messageId, onRendered);
                }
            }
        }, RENDER_THROTTLE_MS);
    }

    /**
     * 立即渲染一次(用户主动展开折叠块时调用)。
     */
    function renderImmediately(blockElement, mdBodyElement, rawText, messageId, onRendered) {
        if (!blockElement || !mdBodyElement) return;
        if (!isOpenAndNearViewport(blockElement)) return;
        performRender(mdBodyElement, rawText, messageId, onRendered);
    }

    /**
     * 清理某个思考块的节流状态(流结束或组件卸载时调用)。
     */
    function clearSchedule(blockElement) {
        const state = scheduleStates.get(blockElement);
        if (!state) return;
        if (state.timerId !== null) clearTimeout(state.timerId);
        scheduleStates.delete(blockElement);
    }

    return { scheduleRender, renderImmediately, clearSchedule };
}
