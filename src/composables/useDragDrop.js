/**
 * @file src/composables/useDragDrop.js
 * 通用拖放接收逻辑。
 *
 * 用法:
 *   const dropZoneRef = ref(null);
 *   const { isDragActive } = useDragDrop(dropZoneRef, {
 *       onDropFiles(files) { ... },
 *   });
 *   <!-- 模板中根据 isDragActive 控制遮罩显隐 -->
 *
 * 内部细节:
 *   - 支持递归读取文件夹(通过 webkitGetAsEntry)。
 *   - 用 dragenter/dragleave 计数,避免在子元素之间移动时反复闪烁。
 *   - 只接受携带文件的拖放;拖文本不会触发。
 */

import { ref, onMounted, onBeforeUnmount, watch } from 'vue';

/**
 * 递归读取一个 FileSystemEntry,返回扁平化后的 File 列表。
 *
 * @param {FileSystemEntry} entry
 * @returns {Promise<File[]>}
 */
async function readEntryRecursively(entry) {
    if (entry.isFile) {
        return new Promise((resolve, reject) => {
            entry.file(file => resolve([file]), reject);
        });
    }

    if (entry.isDirectory) {
        const reader = entry.createReader();
        /** @type {FileSystemEntry[]} */
        const allEntries = [];

        // readEntries 每次最多 100 条,需要循环读到空数组为止。
        await new Promise((resolve, reject) => {
            function readNextBatch() {
                reader.readEntries((batch) => {
                    if (batch.length === 0) {
                        resolve();
                    } else {
                        allEntries.push(...batch);
                        readNextBatch();
                    }
                }, reject);
            }
            readNextBatch();
        });

        const nested = await Promise.all(allEntries.map(readEntryRecursively));
        return nested.flat();
    }

    return [];
}

/**
 * 从 DragEvent 中提取所有文件(支持文件夹)。
 *
 * @param {DragEvent} event
 * @returns {Promise<File[]>}
 */
async function extractFilesFromDragEvent(event) {
    const items = Array.from(event.dataTransfer?.items || []);
    const entries = items
        .map(item => item.webkitGetAsEntry?.())
        .filter(Boolean);

    if (entries.length === 0) {
        // 浏览器不支持 FileSystem API,退回纯 files。
        return Array.from(event.dataTransfer?.files || []);
    }
    const nested = await Promise.all(entries.map(readEntryRecursively));
    return nested.flat();
}

/**
 * 为指定元素绑定拖放接收逻辑。
 *
 * @param {import('vue').Ref<HTMLElement | null>} zoneRef
 * @param {object} options
 * @param {(files: File[]) => (void | Promise<void>)} options.onDropFiles
 *   收到文件时的回调(已展开文件夹)
 * @param {boolean} [options.stopPropagation=false]
 *   是否阻止事件冒泡(用在嵌套拖放区域里,例如消息编辑框需要阻止冒泡到聊天区)
 * @returns {{ isDragActive: import('vue').Ref<boolean> }}
 */
export function useDragDrop(zoneRef, options) {
    const { onDropFiles, stopPropagation = false } = options;
    const isDragActive = ref(false);

    /** 嵌套拖入计数,避免子元素切换时遮罩闪烁。 */
    let dragEnterCount = 0;

    /**
     * 检查拖放事件是否真的携带了文件(而非纯文本)。
     *
     * @param {DragEvent} event
     * @returns {boolean}
     */
    function hasFiles(event) {
        if (!event.dataTransfer) return false;
        return Array.from(event.dataTransfer.types).includes('Files');
    }

    /** @param {DragEvent} event */
    function onDragEnter(event) {
        if (!hasFiles(event)) return;
        event.preventDefault();
        if (stopPropagation) event.stopPropagation();
        dragEnterCount++;
        isDragActive.value = true;
    }

    /** @param {DragEvent} event */
    function onDragOver(event) {
        if (!hasFiles(event)) return;
        event.preventDefault();
        if (stopPropagation) event.stopPropagation();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'copy';
        }
    }

    /** @param {DragEvent} event */
    function onDragLeave(event) {
        if (stopPropagation) event.stopPropagation();
        dragEnterCount--;
        if (dragEnterCount <= 0) {
            dragEnterCount = 0;
            isDragActive.value = false;
        }
    }

    /** @param {DragEvent} event */
    async function onDrop(event) {
        if (!event.dataTransfer) return;
        event.preventDefault();
        if (stopPropagation) event.stopPropagation();

        dragEnterCount = 0;
        isDragActive.value = false;

        const files = await extractFilesFromDragEvent(event);
        if (files.length > 0) {
            await onDropFiles(files);
        }
    }

    /**
     * 把所有拖放事件绑定到指定元素。
     *
     * @param {HTMLElement} element
     */
    function attachListeners(element) {
        element.addEventListener('dragenter', onDragEnter);
        element.addEventListener('dragover',  onDragOver);
        element.addEventListener('dragleave', onDragLeave);
        element.addEventListener('drop',      onDrop);
    }

    /**
     * 解绑事件。
     *
     * @param {HTMLElement} element
     */
    function detachListeners(element) {
        element.removeEventListener('dragenter', onDragEnter);
        element.removeEventListener('dragover',  onDragOver);
        element.removeEventListener('dragleave', onDragLeave);
        element.removeEventListener('drop',      onDrop);
    }

    onMounted(() => {
        if (zoneRef.value) attachListeners(zoneRef.value);
    });

    onBeforeUnmount(() => {
        if (zoneRef.value) detachListeners(zoneRef.value);
    });

    // 如果 ref 指向的元素被替换,重新绑定。
    watch(zoneRef, (newElement, oldElement) => {
        if (oldElement) detachListeners(oldElement);
        if (newElement) attachListeners(newElement);
    });

    return { isDragActive };
}
