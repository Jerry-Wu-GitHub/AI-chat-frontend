/**
 * @file src/stores/_persist.js
 * Pinia store 持久化辅助工具。
 *
 * 用法:在 store 内部调用 setupPersistence(),把 state 中指定的字段
 * 自动同步到 localStorage,并在 store 初始化时把已有的值恢复回来。
 */

import { watch } from 'vue';

/**
 * 从 localStorage 读取并解析一个 JSON 值。
 *
 * @template T
 * @param {string} storageKey   localStorage 中的键名
 * @param {T}      fallbackValue 解析失败或没有值时返回的默认值
 * @returns {T} 解析后的值或默认值
 */
export function readPersistedJson(storageKey, fallbackValue) {
    try {
        const raw = localStorage.getItem(storageKey);
        if (raw === null) return fallbackValue;
        const parsed = JSON.parse(raw);
        return parsed === null || parsed === undefined ? fallbackValue : parsed;
    } catch (parseError) {
        console.warn(`读取 localStorage 键 "${storageKey}" 失败,使用默认值:`, parseError);
        return fallbackValue;
    }
}

/**
 * 把一个值序列化为 JSON 写入 localStorage。
 *
 * @param {string} storageKey localStorage 键名
 * @param {any}    value      要写入的值(必须可被 JSON.stringify 序列化)
 * @returns {void}
 */
export function writePersistedJson(storageKey, value) {
    try {
        localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (writeError) {
        // 配额超限或隐私模式等可能导致写入失败,这里只警告不抛出,
        // 避免阻塞用户的正常操作。
        console.warn(`写入 localStorage 键 "${storageKey}" 失败:`, writeError);
    }
}

/**
 * 把一个 Pinia store 的某个 ref 状态自动同步到 localStorage。
 *
 * 内部用 deep watch 监听变化并写回。组件销毁时不需要手动清理,
 * 因为 store 是全局单例,watch 会一直生效。
 *
 * @template T
 * @param {string}                  storageKey localStorage 键名
 * @param {import('vue').Ref<T>}    stateRef   要持久化的 ref
 * @returns {void}
 */
export function attachAutoPersist(storageKey, stateRef) {
    watch(
        stateRef,
        (newValue) => {
            writePersistedJson(storageKey, newValue);
        },
        { deep: true },
    );
}
