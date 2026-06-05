/**
 * @file src/utils/format.js
 * 文件大小、媒体类型相关的格式化与判断辅助。
 */

/** 可在预览面板内直接展示的文本类型集合。 */
const PREVIEWABLE_TEXT_TYPES = new Set([
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'text/csv',
    'text/xml',
    'application/json',
    'application/xml',
    'application/javascript',
]);

/**
 * 把字节数格式化为人类可读字符串(B / KB / MB)。
 *
 * @param {number} bytes 字节数
 * @returns {string} 例如 "1.2 MB"
 */
export function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 判断给定 MIME 类型是否为图片。
 *
 * @param {string} mediaType
 * @returns {boolean}
 */
export function isImageMediaType(mediaType) {
    return typeof mediaType === 'string' && mediaType.startsWith('image/');
}

/**
 * 判断给定文件能否在预览面板内打开。
 *   - 'image':<img>
 *   - 'pdf':  iframe
 *   - 'text': fetch + <pre>
 *   - 'office': iframe via Office Online Viewer(需文件公网可达)
 *   - null:  不可预览
 */
export function classifyPreviewKind(mediaType) {
    if (!mediaType) return null;
    if (mediaType.startsWith('image/')) return 'image';
    if (mediaType === 'application/pdf') return 'pdf';
    if (OFFICE_MEDIA_TYPES.has(mediaType)) return 'office';
    if (PREVIEWABLE_TEXT_TYPES.has(mediaType) || mediaType.startsWith('text/')) return 'text';
    return null;
}

/**
 * 触发浏览器下载一个 URL 指向的文件。
 *
 * 注意:如果服务器响应没有设置 Content-Disposition: attachment,
 * 且文件与页面跨域,浏览器会忽略 download 属性而在新窗口打开。
 * 对于这种情况,改用 forceDownload。
 *
 * @param {string} url
 * @param {string} filename 建议的保存文件名
 * @returns {void}
 */
export function triggerDownload(url, filename) {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    // 不要加 target=_blank,否则浏览器会优先以"打开新页面"策略处理。
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
}

/**
 * 强制下载一个 URL 指向的文件。
 * 先用 fetch 把内容拿到内存(Blob),再通过 createObjectURL + download 属性
 * 触发本地保存。这种方式不依赖服务器 Content-Disposition 头,
 * 也不受跨域影响。
 *
 * 失败时回退到 triggerDownload。
 *
 * @param {string} url
 * @param {string} filename
 * @returns {Promise<void>}
 */
export async function forceDownload(url, filename) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        downloadBlob(blob, filename);
    } catch (downloadError) {
        console.warn('强制下载失败,回退到直接触发:', downloadError);
        triggerDownload(url, filename);
    }
}

/**
 * 把内存中的 Blob 下载到本地。
 * 适用于"前端动态生成的内容"(PNG、SVG、JSON 导出等)。
 *
 * @param {Blob}   blob
 * @param {string} filename
 * @returns {void}
 */
export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}


/** Office 类文件:暂不支持原生预览,但可以试着用 Office Online Viewer。 */
const OFFICE_MEDIA_TYPES = new Set([
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);


/**
 * 用 HEAD 请求探测一个 URL 的元信息(Content-Type、Content-Length、
 * Content-Disposition 中的 filename)。
 *
 * 带 2.5 秒超时:超时或网络失败时 resolve 一个空对象(由调用方决定回退)。
 *
 * @param {string} url
 * @param {object} [options]
 * @param {number} [options.timeoutMs=2500]
 * @returns {Promise<{ mediaType: string, size: number, filename: string }>}
 */
export async function probeResourceMetadata(url, options = {}) {
    const timeoutMs = options.timeoutMs ?? 2500;
    const result = { mediaType: '', size: 0, filename: '' };

    /** @type {AbortController} */
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            method: 'HEAD',
            signal: abortController.signal,
            // 不带 credentials,避免不必要的 CORS preflight 复杂度。
        });
        if (!response.ok) return result;

        const contentType = response.headers.get('Content-Type') || '';
        // Content-Type 可能形如 "application/pdf; charset=utf-8",取分号前部分。
        result.mediaType = contentType.split(';')[0].trim().toLowerCase();

        const contentLength = response.headers.get('Content-Length');
        if (contentLength) {
            const parsed = parseInt(contentLength, 10);
            if (Number.isFinite(parsed) && parsed >= 0) result.size = parsed;
        }

        // 解析 Content-Disposition: attachment; filename="xxx.pdf"
        // 或 RFC 5987 形式 filename*=UTF-8''...
        const disposition = response.headers.get('Content-Disposition') || '';
        const utf8Match  = disposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
        const plainMatch = disposition.match(/filename\s*=\s*"?([^";]+)"?/i);
        if (utf8Match) {
            try { result.filename = decodeURIComponent(utf8Match[1]); } catch {}
        } else if (plainMatch) {
            result.filename = plainMatch[1].trim();
        }
    } catch {
        // 超时 / 网络错误 / CORS 阻塞 → 返回空 result,调用方走回退。
    } finally {
        clearTimeout(timeoutId);
    }

    return result;
}


/**
 * 从 URL 中提取最后一段路径作为文件名(去掉 query 和 hash)。
 *
 * @param {string} url
 * @returns {string} 推断出的文件名,失败时返回空串
 */
export function guessFilenameFromUrl(url) {
    try {
        const absolute = new URL(url, window.location.href);
        const pathname = absolute.pathname;
        const lastSlash = pathname.lastIndexOf('/');
        const tail = lastSlash >= 0 ? pathname.slice(lastSlash + 1) : pathname;
        return decodeURIComponent(tail || '');
    } catch {
        return '';
    }
}
