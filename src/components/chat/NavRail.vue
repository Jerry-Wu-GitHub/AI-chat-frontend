<script setup>
/**
 * @file src/components/chat/NavRail.vue
 * 右侧迷你导航栏。把消息列表中的每条消息抽象成一根短横线,
 * hover 展开为文字标签。点击横线 → 滚到对应消息。
 *
 * 设计要点:
 *   - 监听 scrollerRef 的滚动,根据"哪个消息行最靠近顶部"判定当前活跃项。
 *   - 用 requestAnimationFrame 节流,避免每帧都做查询。
 *   - 自身可滚动:当消息数量超过 navRail 高度时,内部 overflow-y。
 *   - 活跃项自动滚到 navRail 中间。
 */

import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';

import { usePrefsStore } from '@/stores/prefs.js';

const props = defineProps({
    /** 消息列表滚动容器的 ref(由 MessageList 传入) */
    scrollerRef: {
        type: Object,
        required: true,
    },
    /** 真实消息数组(已扁平化,不含继承的系统提示) */
    messages: {
        type: Array,
        required: true,
    },
});

const prefsStore = usePrefsStore();

/** @type {import('vue').Ref<HTMLElement | null>} */
const railRef = ref(null);

/** 当前活跃的消息 id。 */
const activeMessageId = ref('');

/** @type {number | null} */
let scheduledRafId = null;

/**
 * 把消息抽象成导航项。
 */
const navItems = computed(() => {
    return props.messages.map(message => ({
        id:    message.id,
        role:  message.role,
        label: formatNavLabel(message),
    }));
});

/**
 * 是否完全隐藏(用户偏好关闭 或 没有消息)。
 */
const isHidden = computed(() => {
    if (prefsStore.preferences.navRailEnabled === false) return true;
    return navItems.value.length === 0;
});

/**
 * 把消息转成导航文本。
 *
 * @param {object} message
 * @returns {string}
 */
function formatNavLabel(message) {
    let text = '';

    if (message.role === 'user') {
        text = typeof message.content === 'string' ? message.content : '';
        if (!text && message.files?.length > 0) {
            text = `附件 ${message.files.length} 个`;
        }
        return formatPrefixed(text, '用户');
    }
    if (message.role === 'assistant') {
        return formatPrefixed(message.content || '', 'AI');
    }
    if (message.role === 'system') {
        return formatPrefixed(message.content || '', '系统');
    }
    return formatPrefixed(message.content || '', '消息');
}

/**
 * 加角色前缀并截断。
 *
 * @param {string} text
 * @param {string} prefix
 * @returns {string}
 */
function formatPrefixed(text, prefix) {
    const compact = String(text || '').replace(/\s+/g, ' ').trim() || '空消息';
    const maxLength = 28;
    const truncated = compact.length > maxLength ? `${compact.slice(0, maxLength)}...` : compact;
    return `${prefix}:${truncated}`;
}

/**
 * 滚到指定消息行。
 *
 * @param {string} messageId
 * @returns {void}
 */
function scrollToMessage(messageId) {
    const scroller = props.scrollerRef.value;
    if (!scroller) return;
    const row = scroller.querySelector(`.message-row[data-msg-id="${messageId}"]`);
    if (!row) return;
    scroller.scrollTo({ top: row.offsetTop - 16, behavior: 'smooth' });
}

/**
 * 处理 scroller 的滚动:找出"最靠近顶部但仍在视口内"的消息行。
 */
function onScrollerScroll() {
    if (scheduledRafId !== null) return;
    scheduledRafId = requestAnimationFrame(() => {
        scheduledRafId = null;
        updateActiveByScroll();
    });
}

/**
 * 真正的活跃项判定。
 */
function updateActiveByScroll() {
    const scroller = props.scrollerRef.value;
    if (!scroller) return;

    const threshold = 40;
    const scrollTop = scroller.scrollTop + threshold;

    let candidateId = navItems.value[0]?.id ?? '';
    for (const item of navItems.value) {
        const row = scroller.querySelector(`.message-row[data-msg-id="${item.id}"]`);
        if (!row) continue;
        if (row.offsetTop <= scrollTop) {
            candidateId = item.id;
        } else {
            break;
        }
    }
    activeMessageId.value = candidateId;
    scrollActiveIntoCenter();
}

/**
 * 把当前活跃项滚到 navRail 中部。
 */
function scrollActiveIntoCenter() {
    const rail = railRef.value;
    if (!rail) return;
    const activeElement = rail.querySelector('.nav-rail__item--active');
    if (!activeElement) return;
    const railHeight = rail.clientHeight;
    rail.scrollTop = Math.max(
        0,
        activeElement.offsetTop - railHeight / 2 + activeElement.offsetHeight / 2,
    );
}

// ---- 生命周期 ----

// ---- 生命周期 ----

/** 当前是否已经绑了 scroll 监听。 */
let isScrollListenerAttached = false;

/**
 * 尝试为 scroller 绑定 scroll 监听。已绑就不重复绑。
 */
function attachScrollListener() {
    if (isScrollListenerAttached) return;
    const scroller = props.scrollerRef.value;
    if (!scroller) return;
    scroller.addEventListener('scroll', onScrollerScroll, { passive: true });
    isScrollListenerAttached = true;
    updateActiveByScroll();
}

onMounted(async () => {
    await nextTick();
    attachScrollListener();
});

onBeforeUnmount(() => {
    const scroller = props.scrollerRef.value;
    scroller?.removeEventListener('scroll', onScrollerScroll);
    if (scheduledRafId !== null) cancelAnimationFrame(scheduledRafId);
});

// 消息数组变化时,等 DOM 更新后重新判定活跃项,
// 顺便确保 scroller 监听已绑(scroller 可能在 NavRail 挂载之后才就绪)。
watch(navItems, async () => {
    await nextTick();
    attachScrollListener();
    updateActiveByScroll();
});
</script>

<template>
    <nav
        v-show="!isHidden"
        ref="railRef"
        class="nav-rail"
        aria-label="消息导航"
    >
        <div
            v-for="item in navItems"
            :key="item.id"
            class="nav-rail__item"
            :class="[
                `nav-rail__item--${item.role}`,
                { 'nav-rail__item--active': item.id === activeMessageId },
            ]"
            @click="scrollToMessage(item.id)"
        >
            <span class="nav-rail__label">{{ item.label }}</span>
            <span class="nav-rail__tick" />
        </div>
    </nav>
</template>

<style scoped>
.nav-rail {
    position: absolute;
    top: 50%;
    right: 4px;
    transform: translateY(-50%);
    max-height: 70vh;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: none;
    z-index: 100;

    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
    padding: 6px 2px;

    width: 12px;
    transition: width var(--transition-base);
    border-radius: var(--radius-sm);
}
.nav-rail::-webkit-scrollbar { display: none; }

.nav-rail:hover {
    width: 180px;
    background: var(--bg-surface);
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border);
}

.nav-rail__item {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 5px;
    width: 100%;
    cursor: pointer;
    border-radius: var(--radius-sm);
    padding: 1px 2px;
    transition: background var(--transition-fast);
    min-height: 14px;
    flex-shrink: 0;
}
.nav-rail:hover .nav-rail__item:hover {
    background: var(--bg-hover);
}

.nav-rail__tick {
    flex-shrink: 0;
    width: 16px;
    height: 3px;
    border-radius: 2px;
    transition:
        width var(--transition-fast),
        height var(--transition-fast),
        background var(--transition-fast);
}

/* 不同 role 的颜色 */
.nav-rail__item--user .nav-rail__tick {
    background: color-mix(in srgb, var(--border-strong) 60%, var(--bg-base));
}
.nav-rail__item--assistant .nav-rail__tick {
    background: color-mix(in srgb, var(--accent) 30%, var(--bg-base));
}
.nav-rail__item--system .nav-rail__tick {
    background: color-mix(in srgb, var(--accent) 48%, var(--bg-base));
}

/* 活跃项 */
.nav-rail__item--active .nav-rail__tick {
    width: 20px;
    height: 4px;
}
.nav-rail__item--active.nav-rail__item--user .nav-rail__tick {
    background: var(--text-secondary);
}
.nav-rail__item--active.nav-rail__item--assistant .nav-rail__tick {
    background: var(--accent);
}
.nav-rail__item--active.nav-rail__item--system .nav-rail__tick {
    background: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}

/* 文字标签 */
.nav-rail__label {
    flex: 1;
    min-width: 0;
    font-size: 11.5px;
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0;
    max-width: 0;
    transition:
        opacity var(--transition-base),
        max-width var(--transition-base);
    pointer-events: none;
}
.nav-rail:hover .nav-rail__label {
    opacity: 1;
    max-width: 140px;
    pointer-events: auto;
}

/* 文字颜色:与对应短横线颜色完全一致 */
.nav-rail__item--user .nav-rail__label {
    color: color-mix(in srgb, var(--text-secondary) 60%, var(--border-strong));
}
.nav-rail__item--assistant .nav-rail__label {
    color: color-mix(in srgb, var(--accent) 70%, var(--bg-base));
}
.nav-rail__item--system .nav-rail__label {
    color: color-mix(in srgb, var(--accent) 50%, var(--bg-base));
}

/* 活跃项:文字也跟着短横线变深,并加粗以区分 */
.nav-rail__item--active.nav-rail__item--user .nav-rail__label {
    color: var(--text-secondary);
    font-weight: 500;
}
.nav-rail__item--active.nav-rail__item--assistant .nav-rail__label,
.nav-rail__item--active.nav-rail__item--system    .nav-rail__label {
    color: var(--accent);
    font-weight: 500;
}
</style>
