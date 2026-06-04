/**
 * @file src/utils/mermaid-export.js
 * Mermaid 图导出相关的纯函数辅助:
 *   - 把已渲染的 SVG 节点导出为独立 SVG 字符串(内联样式、处理 foreignObject)。
 *   - 把 SVG 字符串栅格化为 PNG Blob。
 *
 * 缩放 / 拖拽 / 切换形态等"组件局部 UI"逻辑不在这里,
 * 它们由 components/chat/messages/MermaidBlock.vue 管理。
 */

const EXPORT_TEXT_SCALE = 0.74;

/**
 * 获取 SVG 节点的实际包围盒。
 * 优先用 getBBox(),其次 viewBox,再退回到 getBoundingClientRect。
 *
 * @param {SVGSVGElement} svg
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function getSvgBoundingBox(svg) {
    /** @type {{ x: number, y: number, width: number, height: number } | null} */
    let box = null;
    try {
        box = svg.getBBox();
    } catch {
        box = null;
    }
    const viewBox = svg.viewBox?.baseVal;
    const rect = svg.getBoundingClientRect();

    return {
        x: box?.x ?? viewBox?.x ?? 0,
        y: box?.y ?? viewBox?.y ?? 0,
        width:  Math.max(Math.ceil(box?.width  || viewBox?.width  || rect.width  || svg.clientWidth  || 800), 1),
        height: Math.max(Math.ceil(box?.height || viewBox?.height || rect.height || svg.clientHeight || 400), 1),
    };
}

/**
 * 把一个 DOM 节点的计算样式中"对 SVG 渲染有意义"的属性,
 * 内联到对应的克隆节点上。递归处理子节点。
 *
 * 这样导出的 SVG 不依赖外部 CSS 也能保持视觉一致。
 *
 * @param {Element} sourceElement
 * @param {Element} targetElement
 * @returns {void}
 */
function inlineImportantSvgStyles(sourceElement, targetElement) {
    const importantProperties = [
        'fill', 'stroke', 'stroke-width',
        'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin',
        'opacity',
        'font-family', 'font-size', 'font-weight', 'font-style',
        'text-anchor', 'dominant-baseline', 'alignment-baseline',
        'color',
    ];

    const computedStyle = window.getComputedStyle(sourceElement);
    const inlineDeclarations = importantProperties
        .map((prop) => {
            const value = computedStyle.getPropertyValue(prop);
            return value ? `${prop}:${value}` : '';
        })
        .filter(Boolean)
        .join(';');

    if (inlineDeclarations) {
        const oldStyle = targetElement.getAttribute('style') || '';
        targetElement.setAttribute(
            'style',
            oldStyle ? `${oldStyle};${inlineDeclarations}` : inlineDeclarations,
        );
    }

    const sourceChildren = Array.from(sourceElement.children);
    const targetChildren = Array.from(targetElement.children);
    for (let index = 0; index < sourceChildren.length; index++) {
        if (targetChildren[index]) {
            inlineImportantSvgStyles(sourceChildren[index], targetChildren[index]);
        }
    }
}

/**
 * 从 CSS line-height 字符串解析像素值。
 *
 * @param {string} value
 * @param {number} fontSize
 * @returns {number}
 */
function parseLineHeightPixels(value, fontSize) {
    if (!value || value === 'normal') return fontSize * 1.25;
    if (value.endsWith('px')) return parseFloat(value) || fontSize * 1.25;
    const numeric = parseFloat(value);
    if (!Number.isFinite(numeric)) return fontSize * 1.25;
    if (numeric > 0 && numeric < 5) return numeric * fontSize;
    return numeric;
}

/**
 * 把一段长文本按估算宽度粗略换行。
 * 含中文按单字宽度估算,纯英文按单词估算。
 *
 * @param {string} text
 * @param {number} maxWidth   可用宽度(像素)
 * @param {number} fontSize
 * @returns {string[]}        换行后的行数组
 */
function wrapMermaidLabelText(text, maxWidth, fontSize) {
    const normalized = String(text || '').trim();
    if (!normalized) return [];

    const hasCjk = /[\u3400-\u9fff]/.test(normalized);
    const averageCharWidth = hasCjk ? fontSize : fontSize * 0.56;
    const maxCharsPerLine = Math.max(1, Math.floor(maxWidth / averageCharWidth));

    if (normalized.length <= maxCharsPerLine) return [normalized];

    if (hasCjk) {
        const lines = [];
        for (let i = 0; i < normalized.length; i += maxCharsPerLine) {
            lines.push(normalized.slice(i, i + maxCharsPerLine));
        }
        return lines;
    }

    const words = normalized.split(/\s+/);
    const lines = [];
    let current = '';
    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length <= maxCharsPerLine) {
            current = candidate;
        } else {
            if (current) lines.push(current);
            current = word;
        }
    }
    if (current) lines.push(current);
    return lines;
}

/**
 * 把 Mermaid 图里的 <foreignObject>(HTML 文本节点)
 * 转换为原生 <text> 节点。
 *
 * 原因:浏览器在把含 foreignObject 的 SVG 画到 canvas 时,
 * 出于安全策略会把 canvas 标记为 tainted,导致 toBlob() 抛 SecurityError。
 * 同时,直接打开导出的 SVG 文件也可能丢失 foreignObject 内的文字。
 *
 * @param {SVGSVGElement} sourceSvg   原始(挂载在页面上的)SVG
 * @param {SVGSVGElement} clonedSvg   即将导出的克隆 SVG
 * @returns {void}
 */
function convertForeignObjectsToText(sourceSvg, clonedSvg) {
    const sourceList = Array.from(sourceSvg.querySelectorAll('foreignObject'));
    const clonedList = Array.from(clonedSvg.querySelectorAll('foreignObject'));

    sourceList.forEach((sourceFo, index) => {
        const clonedFo = clonedList[index];
        if (!clonedFo) return;

        const labelElement =
            sourceFo.querySelector('.nodeLabel') ||
            sourceFo.querySelector('.edgeLabel') ||
            sourceFo.querySelector('span') ||
            sourceFo.querySelector('div');

        const text = String((labelElement || sourceFo).textContent || '')
            .replace(/\s+/g, ' ')
            .trim();
        if (!text) {
            clonedFo.remove();
            return;
        }

        const foX = Number(clonedFo.getAttribute('x') || '0');
        const foY = Number(clonedFo.getAttribute('y') || '0');
        const foW = Number(clonedFo.getAttribute('width') || '0');
        const foH = Number(clonedFo.getAttribute('height') || '0');

        const sourceTextElement = labelElement || sourceFo;
        const computed = window.getComputedStyle(sourceTextElement);

        const rawFontSize = parseFloat(computed.fontSize || '16') || 16;
        const fontSize    = rawFontSize * EXPORT_TEXT_SCALE;
        const fontFamily  = computed.fontFamily || 'Arial, sans-serif';
        const fontWeight  = computed.fontWeight || '400';
        const fontStyle   = computed.fontStyle  || 'normal';
        const color       = computed.color      || '#000000';
        const lineHeight  = parseLineHeightPixels(computed.lineHeight, rawFontSize) * EXPORT_TEXT_SCALE;

        const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textElement.setAttribute('x', String(foX + foW / 2));
        textElement.setAttribute('y', String(foY + foH / 2 + fontSize * 0.05));
        textElement.setAttribute('text-anchor',       'middle');
        textElement.setAttribute('dominant-baseline', 'middle');
        textElement.setAttribute('font-family', fontFamily);
        textElement.setAttribute('font-size',   String(fontSize));
        textElement.setAttribute('font-weight', fontWeight);
        textElement.setAttribute('font-style',  fontStyle);
        textElement.setAttribute('fill', color);

        const lines = wrapMermaidLabelText(text, Math.max(foW - 8, 20), fontSize);
        const totalHeight = (lines.length - 1) * lineHeight;
        const startDy = -totalHeight / 2;

        lines.forEach((line, lineIndex) => {
            const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
            tspan.setAttribute('x', String(foX + foW / 2));
            tspan.setAttribute('dy', lineIndex === 0 ? String(startDy) : String(lineHeight));
            tspan.textContent = line;
            textElement.appendChild(tspan);
        });

        clonedFo.replaceWith(textElement);
    });
}

/**
 * 移除可能让 canvas tainted 或导致外链请求的 SVG 内容,
 * 比如 <script>、外链的 href、外链的 url(...) 等。
 *
 * @param {SVGSVGElement} svg
 * @returns {void}
 */
function removeUnsafeSvgParts(svg) {
    svg.querySelectorAll('script, iframe, canvas, video, audio').forEach(el => el.remove());

    svg.querySelectorAll('*').forEach((element) => {
        for (const attribute of Array.from(element.attributes)) {
            const name = attribute.name.toLowerCase();
            const value = attribute.value || '';

            if (name.startsWith('on')) {
                element.removeAttribute(attribute.name);
                continue;
            }

            if (name === 'href' || name === 'xlink:href' || name === 'src') {
                if (/^(https?:)?\/\//i.test(value) || /^data:(?!image\/svg\+xml)/i.test(value)) {
                    element.removeAttribute(attribute.name);
                }
            }

            if (name === 'style' && /url\s*\(/i.test(value)) {
                element.setAttribute(
                    attribute.name,
                    value.replace(/url\s*\([^)]+\)/gi, 'none'),
                );
            }
        }
    });

    svg.querySelectorAll('style').forEach((styleElement) => {
        styleElement.textContent = styleElement.textContent.replace(/url\s*\([^)]+\)/gi, 'none');
    });
}

/**
 * 把页面上的 Mermaid SVG 节点导出为独立的、可单独打开的 SVG 字符串。
 *
 * @param {SVGSVGElement} sourceSvg
 * @param {object} options
 * @param {boolean} [options.convertForeignObjectsToTextNodes=false]
 *        true 时把 foreignObject 转成原生 text,用于导出 PNG。
 * @param {string} [options.backgroundColor='#ffffff']
 *        背景填充颜色。
 * @returns {string} SVG 文本
 */
export function serializeMermaidSvg(sourceSvg, options = {}) {
    const {
        convertForeignObjectsToTextNodes = false,
        backgroundColor = '#ffffff',
    } = options;

    const cloned = sourceSvg.cloneNode(true);
    inlineImportantSvgStyles(sourceSvg, cloned);

    const box = getSvgBoundingBox(sourceSvg);
    cloned.setAttribute('xmlns',  'http://www.w3.org/2000/svg');
    cloned.setAttribute('width',  String(box.width));
    cloned.setAttribute('height', String(box.height));
    if (!cloned.getAttribute('viewBox')) {
        cloned.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
    }

    if (convertForeignObjectsToTextNodes) {
        convertForeignObjectsToText(sourceSvg, cloned);
    }

    removeUnsafeSvgParts(cloned);

    // 加一层背景矩形,确保导出的 PNG 不是透明背景。
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', String(box.x));
    bgRect.setAttribute('y', String(box.y));
    bgRect.setAttribute('width',  String(box.width));
    bgRect.setAttribute('height', String(box.height));
    bgRect.setAttribute('fill', backgroundColor);
    cloned.insertBefore(bgRect, cloned.firstChild);

    return new XMLSerializer().serializeToString(cloned);
}

/**
 * 把 SVG 字符串栅格化为 PNG Blob。
 *
 * @param {string} svgText
 * @param {number} width
 * @param {number} height
 * @returns {Promise<Blob>} 失败时 reject
 */
export function svgStringToPngBlob(svgText, width, height) {
    return new Promise((resolve, reject) => {
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const objectUrl = URL.createObjectURL(svgBlob);

        const image = new Image();
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
                canvas.width  = width  * devicePixelRatio;
                canvas.height = height * devicePixelRatio;

                const context = canvas.getContext('2d');
                context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
                context.drawImage(image, 0, 0, width, height);

                canvas.toBlob((pngBlob) => {
                    URL.revokeObjectURL(objectUrl);
                    if (pngBlob) {
                        resolve(pngBlob);
                    } else {
                        reject(new Error('canvas.toBlob 返回空 Blob'));
                    }
                }, 'image/png');
            } catch (rasterizeError) {
                URL.revokeObjectURL(objectUrl);
                reject(rasterizeError);
            }
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('SVG 图像加载失败'));
        };
        image.src = objectUrl;
    });
}
