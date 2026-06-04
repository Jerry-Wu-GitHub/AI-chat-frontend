/**
 * @file src/utils/api.js
 * 后端 API 调用封装。
 *
 * 后端接口约定:
 *   - GET  /base_url                  获取后端推荐的默认 base_url(纯字符串)
 *   - POST /models                    {base_url, api_key} → {data: ModelInfo[]}
 *   - POST /chat/completions          流式 SSE,带 base_url/api_key/model/messages
 *   - POST /upload                    multipart form data → {success, data:{url}}
 */

/**
 * 请求后端推荐的默认 base_url。
 * 失败时返回空字符串而非抛出,避免阻塞应用启动。
 *
 * @returns {Promise<string>} base_url 字符串,失败时为 ""
 */
export async function fetchDefaultBaseUrl() {
    try {
        const response = await fetch('/base_url');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const parsed = await response.json();
        return typeof parsed === 'string' ? parsed : '';
    } catch (fetchError) {
        console.warn('获取默认 base_url 失败:', fetchError);
        return '';
    }
}

/**
 * 向单个服务请求模型列表。
 *
 * @param {{ base_url: string, api_key: string }} service
 * @returns {Promise<Array<object>>} 模型对象数组(已抽出 .data)
 */
async function fetchModelsForService(service) {
    const response = await fetch('/models', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            base_url: service.base_url,
            api_key:  service.api_key || '',
        }),
    });

    if (!response.ok) {
        throw new Error(`获取模型列表失败: HTTP ${response.status}`);
    }

    const json = await response.json();
    if (!json || !Array.isArray(json.data)) {
        throw new Error('模型列表响应格式不正确');
    }
    return json.data;
}

/**
 * 并发请求所有服务的模型列表,合并为一个数组。
 * 每个返回的模型对象会带 `_serviceId` 字段,标记来源服务卡片。
 *
 * 任一服务失败不影响其它服务的结果。
 *
 * @param {Array<{ id: string, base_url: string, api_key: string }>} services
 * @returns {Promise<Array<object>>} 合并后的模型列表
 */
export async function fetchAllModels(services) {
    if (!Array.isArray(services) || services.length === 0) return [];

    const results = await Promise.allSettled(
        services
            .filter(service => service.base_url)
            .map(service =>
                fetchModelsForService(service).then(models => ({ service, models })),
            ),
    );

    const merged = [];
    for (const result of results) {
        if (result.status === 'fulfilled') {
            const { service, models } = result.value;
            for (const model of models) {
                merged.push({ ...model, _serviceId: service.id });
            }
        } else {
            console.warn('某个服务的模型加载失败:', result.reason);
        }
    }
    return merged;
}

/**
 * 上传文件到后端。
 *
 * @param {File} file
 * @returns {Promise<{ url: string }>} 上传成功后返回服务端访问 URL
 * @throws {Error} 上传失败时抛出
 */
export async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/upload', {
        method: 'POST',
        body:   formData,
    });
    const json = await response.json();

    if (!json.success) {
        throw new Error(json.message || '上传失败');
    }
    return json.data;
}

/**
 * 发起聊天补全请求,以 SSE 形式逐块回调。
 *
 * @param {object} options
 * @param {string}   options.base_url             目标服务 base_url
 * @param {string}   options.api_key              目标服务 api_key
 * @param {string}   options.model
 * @param {Array<object>} options.messages        OpenAI 风格 messages 数组
 * @param {Object<string, boolean|string|string[]>} [options.enable_capabilities]
 * @param {AbortSignal} [options.signal]
 * @param {(chunk: object) => void} options.onChunk    收到一个增量 JSON 时调用
 * @param {() => void}              [options.onDone]   收到 [DONE] 标记时调用
 * @param {(error: Error) => void}  [options.onError]  非 AbortError 的错误回调
 * @returns {Promise<void>} 流处理结束后 resolve
 */
export async function streamChatCompletion({
    base_url,
    api_key,
    model,
    messages,
    enable_capabilities,
    signal,
    onChunk,
    onDone,
    onError,
}) {
    const requestBody = {
        base_url: base_url || '',
        api_key:  api_key  || '',
        model,
        messages,
        stream: true,
    };
    if (enable_capabilities && Object.keys(enable_capabilities).length > 0) {
        requestBody.enable_capabilities = enable_capabilities;
    }

    /** @type {Response} */
    let response;
    try {
        response = await fetch('/chat/completions', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(requestBody),
            signal,
        });
    } catch (networkError) {
        onError?.(networkError);
        return;
    }

    if (!response.ok) {
        onError?.(new Error(`HTTP ${response.status}`));
        return;
    }

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // 按行切;最后一段可能不完整,留到下次拼接。
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith(':')) continue;

                if (trimmed === 'data: [DONE]') {
                    onDone?.();
                    return;
                }
                if (trimmed.startsWith('data: ')) {
                    try {
                        const json = JSON.parse(trimmed.slice(6));
                        onChunk?.(json);
                    } catch {
                        // 损坏的一行,跳过即可。
                    }
                }
            }
        }
    } catch (streamError) {
        if (streamError?.name === 'AbortError') {
            onDone?.();  // 当作正常结束,让上层 finalize
        } else {
            onError?.(streamError);
        }
    } finally {
        reader.releaseLock();
    }
}
