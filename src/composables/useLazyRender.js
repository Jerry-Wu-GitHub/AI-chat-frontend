/**
 * @file src/composables/useLazyRender.js
 * Markdown 懒渲染:只在元素进入视口附近时才把原始文本转成富文本。
 *
 * 在长对话场景下,如果一次性把所有 AI 回复都渲染为 Markdown + 公式 + Mermaid,
 * 首屏切换会非常卡。这个 composable 让"屏幕外"的消息保持纯文本占位,
 * 进入视口后再异步渲染,同时补偿 scrollTop 避免视口跳变。
 *
 * 用法:
 *   const bodyRef = ref(null);
 *   const { renderNow } = useLazyRender(bodyRef, {
 *       rawText:   () => message.content,
 *       messageId: () => message.id,
 *       onRendered: (element) => { ... },
 *   });
 */

import { onMounted, onBeforeUnmount } from 'vue';

import { renderMarkdownToHtml } from '@/utils/markdown.js';

const RENDER_DELAY_MS = 180;
const ROOT_MARGIN = '200px 0px 200px 0px';

/**
 * 共享的 IntersectionObserver。多个元素共用一个,效率更好。
 * @type {IntersectionObserver | null}
 */
let sharedObserver = null;

/** 每个元素对应的 pending timer。 */
const pendingTimers = /** @type {WeakMap<Element, ReturnType<typeof setTimeout>>} */ (new WeakMap());

/** 每个元素的渲染回调注册。 */
const callbacks = /** @type {WeakMap<Element, () => void>} */ (new WeakMap());

/**
 * 获取共享 observer,首次调用时创建。
 *
 * @returns {IntersectionObserver}
 */
function getSharedObserver() {
    if (sharedObserver) return sharedObserver;

    sharedObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            const element = entry.target;

            if (entry.isIntersecting) {
                if (!pendingTimers.has(element)) {
                    const timerId = setTimeout(() => {
                        pendingTimers.delete(element);
                        callbacks.get(element)?.();
                    }, RENDER_DELAY_MS);
                    pendingTimers.set(element, timerId);
                }
            } else {
                const timerId = pendingTimers.get(element);
                if (timerId !== undefined) {
                    clearTimeout(timerId);
                    pendingTimers.delete(element);
                }
            }
        }
    }, { rootMargin: ROOT_MARGIN, threshold: 0 });

    return sharedObserver;
}

/**
 * 为一个 .md-body 元素配置懒渲染。
 *
 * @param {import('vue').Ref<HTMLElement | null>} elementRef
 * @param {object} options
 * @param {() => string} options.rawText          原始 Markdown 文本(每次渲染时调用)
 * @param {() => string} options.messageId        消息 id(代码块下载用)
 * @param {(element: HTMLElement) => void} [options.onRendered]
 *   渲染完成后的回调,通常用来做 KaTeX、Mermaid 等二次处理
 * @returns {{ renderNow: () => void, isRendered: () => boolean }}
 */
export function useLazyRender(elementRef, options) {
    const { rawText, messageId, onRendered } = options;

    /**
     * 真正执行渲染:替换 innerHTML 并补偿滚动位置。
     *
     * 补偿原理:如果元素整体位于视口顶部以上,渲染后高度膨胀
     * 会把视口里看到的内容"推下去";为了让用户感觉不到跳变,
     * 我们把 scroller 的 scrollTop 加上膨胀量。
     */
    function doRender() {
        const element = elementRef.value;
        if (!element) return;
        if (element.dataset.mdRendered === 'true') return;

        const scroller = document.getElementById('message-list');

        let heightBefore = 0;
        let scrollTopBefore = 0;
        let needsCompensation = false;

        if (scroller) {
            // 抑制浏览器的 scroll anchoring,避免和我们的补偿叠加。
            scroller.style.overflowAnchor = 'none';
            heightBefore = element.offsetHeight;
            scrollTopBefore = scroller.scrollTop;
            needsCompensation = element.offsetTop < scrollTopBefore;
        }

        element.innerHTML = renderMarkdownToHtml(rawText(), messageId());
        element.dataset.mdRendered = 'true';
        sharedObserver?.unobserve(element);
        callbacks.delete(element);

        onRendered?.(element);

        if (scroller) {
            if (needsCompensation) {
                const heightAfter = element.offsetHeight;
                const heightDelta = heightAfter - heightBefore;
                if (heightDelta > 0) {
                    scroller.scrollTop = scrollTopBefore + heightDelta;
                }
            }
            scroller.style.overflowAnchor = '';
        }
    }

    /**
     * 立即渲染(绕过 IntersectionObserver 的延迟和可见性判断)。
     * 用于"用户主动展开折叠块"等场景。
     */
    function renderNow() {
        const element = elementRef.value;
        if (!element) return;
        if (element.dataset.mdRendered === 'true') return;

        const timerId = pendingTimers.get(element);
        if (timerId !== undefined) {
            clearTimeout(timerId);
            pendingTimers.delete(element);
        }
        sharedObserver?.unobserve(element);
        doRender();
    }

    /**
     * 当前是否已渲染。
     *
     * @returns {boolean}
     */
    function isRendered() {
        return elementRef.value?.dataset.mdRendered === 'true';
    }

    onMounted(() => {
        const element = elementRef.value;
        if (!element) return;
        if (element.dataset.mdRendered === 'true') return;

        callbacks.set(element, doRender);
        getSharedObserver().observe(element);
    });

    onBeforeUnmount(() => {
        const element = elementRef.value;
        if (!element) return;

        const timerId = pendingTimers.get(element);
        if (timerId !== undefined) {
            clearTimeout(timerId);
            pendingTimers.delete(element);
        }
        sharedObserver?.unobserve(element);
        callbacks.delete(element);
    });

    return { renderNow, isRendered };
}
