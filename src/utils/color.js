/**
 * @file src/utils/color.js
 * 颜色格式转换辅助。
 *
 * 应用的主题强调色保存为 hex 字符串,但 CSS 变量需要 HSL 分量,
 * 因为基于强调色派生的颜色(hover、subtle 等)都靠 HSL 计算。
 */

/**
 * 把 6 位 hex 颜色转换为 HSL(整数)。
 *
 * @param {string} hex 形如 "#6366f1" 或 "6366f1"
 * @returns {{ h: number, s: number, l: number } | null} 解析失败返回 null
 */
export function hexToHsl(hex) {
    const match = /^#?([a-f\d]{6})$/i.exec(hex || '');
    if (!match) return null;

    const intValue = parseInt(match[1], 16);
    const red   = ((intValue >> 16) & 0xff) / 255;
    const green = ((intValue >>  8) & 0xff) / 255;
    const blue  = ( intValue        & 0xff) / 255;

    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const lightness = (max + min) / 2;

    let hue = 0;
    let saturation = 0;

    if (max !== min) {
        const delta = max - min;
        saturation = lightness > 0.5
            ? delta / (2 - max - min)
            : delta / (max + min);

        switch (max) {
            case red:
                hue = (green - blue) / delta + (green < blue ? 6 : 0);
                break;
            case green:
                hue = (blue - red) / delta + 2;
                break;
            case blue:
                hue = (red - green) / delta + 4;
                break;
        }
        hue /= 6;
    }

    return {
        h: Math.round(hue * 360),
        s: Math.round(saturation * 100),
        l: Math.round(lightness * 100),
    };
}
