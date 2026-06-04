/**
 * @file src/composables/useModal.js
 * 通用模态框服务。返回 Promise 接口,resolve 用户点击的按钮 value。
 *
 * 用法:
 *   const { openModal } = useModal();
 *   const result = await openModal({
 *       title: '删除会话',
 *       bodyHtml: '<p>确定删除?</p>',
 *       buttons: [
 *           { label: '取消', value: null,  className: 'btn-secondary' },
 *           { label: '删除', value: 'ok',  className: 'btn-danger'    },
 *       ],
 *   });
 *   if (result === 'ok') { ... }
 *
 * 真正的 DOM 渲染由 components/common/BaseModal.vue 完成,
 * 它从 `currentModal` 这个共享 ref 读取数据。
 */

import { ref } from 'vue';

/**
 * @typedef {object} ModalButton
 * @property {string} label
 * @property {any}    value             按下时 Promise resolve 出的值
 * @property {string} [className='btn-secondary']
 */

/**
 * @typedef {object} ModalConfig
 * @property {string} title
 * @property {string} [bodyHtml]        用 v-html 渲染的 body
 * @property {ModalButton[]} buttons
 * @property {(rootElement: HTMLElement) => void} [onMounted]
 *   modal body 渲染到 DOM 后的回调,常用来给自定义 HTML 中的 input 绑事件,
 *   或者把内置组件挂载进去。
 */

/**
 * 当前正在展示的 modal。null 表示关闭。
 * @type {import('vue').Ref<(ModalConfig & { _resolve: (value: any) => void }) | null>}
 */
const currentModal = ref(null);

/**
 * 提供 modal 相关方法和当前 modal 数据。
 *
 * @returns {{
 *   currentModal: import('vue').Ref<any>,
 *   openModal: (config: ModalConfig) => Promise<any>,
 *   closeModal: (value?: any) => void,
 * }}
 */
export function useModal() {
    /**
     * 打开一个模态框,返回 Promise。
     *
     * 同一时间只能有一个 modal。如果当前已有 modal,新的 modal 会替换它,
     * 旧的会以 null 被 resolve(等同于用户取消)。
     *
     * @param {ModalConfig} config
     * @returns {Promise<any>}
     */
    function openModal(config) {
        // 关闭可能已有的 modal
        if (currentModal.value) {
            currentModal.value._resolve?.(null);
        }

        return new Promise((resolve) => {
            currentModal.value = {
                ...config,
                _resolve: resolve,
            };
        });
    }

    /**
     * 关闭当前 modal,并 resolve 给定的值。
     * 不传 value 时 resolve null。
     *
     * @param {any} [value=null]
     * @returns {void}
     */
    function closeModal(value = null) {
        const modal = currentModal.value;
        currentModal.value = null;
        modal?._resolve?.(value);
    }

    return { currentModal, openModal, closeModal };
}
