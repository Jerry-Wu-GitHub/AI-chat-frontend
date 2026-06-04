/**
 * @file src/composables/useFileUpload.js
 * 文件上传辅助。封装并发限制 + 错误处理 + toast 反馈。
 *
 * 提供两种用法:
 *   - uploadOne / uploadMany:仅上传,不操作 store。
 *   - uploadAndAddToPending:先在 pendingFiles 插入"上传中"占位,
 *     上传完成后替换为真实 FileRef,失败则移除占位。这样用户能看到
 *     旋转动画。
 */

import { uploadFile } from '@/utils/api.js';
import { createConcurrencyLimiter } from '@/utils/concurrency.js';
import { isImageMediaType } from '@/utils/format.js';
import { useToast } from './useToast.js';
import { useChatStore } from '@/stores/chat.js';

/** 全局共享的上传并发限制器。 */
const uploadLimiter = createConcurrencyLimiter(5);

/**
 * 提供文件上传方法。
 *
 * @returns {{
 *   uploadOne:  (file: File) => Promise<import('@/stores/sessions.js').FileRef | null>,
 *   uploadMany: (files: File[]) => Promise<Array<import('@/stores/sessions.js').FileRef | null>>,
 *   uploadAndAddToPending: (file: File) => Promise<import('@/stores/sessions.js').FileRef | null>,
 *   uploadManyAndAddToPending: (files: File[]) => Promise<void>,
 * }}
 */
export function useFileUpload() {
    const { showToast } = useToast();
    const chatStore = useChatStore();

    /**
     * 上传单个文件,不与 store 交互。失败时弹 toast 并返回 null。
     *
     * @param {File} file
     * @returns {Promise<import('@/stores/sessions.js').FileRef | null>}
     */
    async function uploadOne(file) {
        try {
            const result = await uploadLimiter(() => uploadFile(file));
            return {
                name:      file.name,
                size:      file.size,
                mediaType: file.type,
                url:       result.url,
                isImage:   isImageMediaType(file.type),
            };
        } catch (uploadError) {
            showToast(`上传失败:${uploadError.message}`, 'error');
            return null;
        }
    }

    /**
     * 批量上传(不与 store 交互)。
     *
     * @param {File[]} files
     * @returns {Promise<Array<import('@/stores/sessions.js').FileRef | null>>}
     */
    async function uploadMany(files) {
        return Promise.all(files.map(file => uploadOne(file)));
    }

    /**
     * 上传单个文件,并在 chatStore.pendingFiles 中先插入"上传中"占位 chip,
     * 完成后替换为真实 FileRef。这样用户能看到旋转动画。
     *
     * @param {File} file
     * @returns {Promise<import('@/stores/sessions.js').FileRef | null>}
     */
    async function uploadAndAddToPending(file) {
        const placeholderId = chatStore.addPendingPlaceholder({
            name:      file.name,
            size:      file.size,
            mediaType: file.type,
        });

        const fileRef = await uploadOne(file);

        if (fileRef) {
            chatStore.replacePendingPlaceholder(placeholderId, fileRef);
        } else {
            chatStore.removePendingPlaceholder(placeholderId);
        }
        return fileRef;
    }

    /**
     * 批量上传到 pendingFiles。
     *
     * @param {File[]} files
     * @returns {Promise<void>}
     */
    async function uploadManyAndAddToPending(files) {
        await Promise.all(files.map(file => uploadAndAddToPending(file)));
    }

    return {
        uploadOne,
        uploadMany,
        uploadAndAddToPending,
        uploadManyAndAddToPending,
    };
}
