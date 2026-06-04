import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

/**
 * Vite 构建配置。
 *
 * - `@` 别名指向 `src` 目录,方便深层组件之间互相引用。
 * - 开发服务器把后端 API 反向代理到本地的后端服务,
 *   这样前端可以用相对路径(/models、/chat/completions 等)调用,
 *   生产环境部署到同一域名下时无需修改任何代码。
 * - SVG 等静态资源放在 `public/` 下,通过绝对路径(/svg/icon/xxx.svg)引用。
 */
export default defineConfig({
    plugins: [vue()],

    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },

    server: {
        port: 5173,
        proxy: {
            // 把所有后端接口转发到本地 FastAPI(或同类)服务。
            // 如果后端端口不是 8000,修改这里的 target 即可。
            '/models':           { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/chat/completions': { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/upload':           { target: 'http://127.0.0.1:8000', changeOrigin: true },
            '/base_url':         { target: 'http://127.0.0.1:8000', changeOrigin: true },
            // 上传后的文件托管路径(可按后端实际情况调整)
            '/files':            { target: 'http://127.0.0.1:8000', changeOrigin: true },
        },
    },

    build: {
        outDir: 'dist',
        sourcemap: true,
    },
});
