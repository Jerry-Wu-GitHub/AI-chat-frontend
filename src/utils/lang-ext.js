/**
 * @file src/utils/lang-ext.js
 * 代码块语言标识符 → 文件扩展名的映射表。
 *
 * 给 Markdown 渲染出的代码块"下载"按钮决定文件后缀用。
 */

/** @type {Object<string, string>} */
const LANGUAGE_EXTENSION_MAP = {
    // Web
    html: 'html', htm: 'html', xml: 'xml', svg: 'svg',
    css: 'css', scss: 'scss', sass: 'sass', less: 'less',
    javascript: 'js', js: 'js', jsx: 'jsx',
    typescript: 'ts', ts: 'ts', tsx: 'tsx',
    json: 'json', jsonc: 'jsonc', yaml: 'yaml', yml: 'yml', toml: 'toml',

    // 后端 / 通用
    python: 'py', py: 'py',
    ruby: 'rb', rb: 'rb',
    php: 'php',
    java: 'java',
    kotlin: 'kt', kts: 'kts',
    swift: 'swift',
    go: 'go',
    rust: 'rs',
    c: 'c',
    cpp: 'cpp', 'c++': 'cpp', cxx: 'cpp',
    cs: 'cs', csharp: 'cs',
    scala: 'scala',
    dart: 'dart',
    r: 'r',
    lua: 'lua',
    perl: 'pl',
    haskell: 'hs',
    elixir: 'ex',
    erlang: 'erl',
    clojure: 'clj',
    groovy: 'groovy',
    objectivec: 'm', 'objective-c': 'm',

    // 脚本 / Shell
    bash: 'sh', sh: 'sh', shell: 'sh', zsh: 'sh', fish: 'fish',
    powershell: 'ps1', ps1: 'ps1', bat: 'bat', cmd: 'bat',

    // 数据库
    sql: 'sql', mysql: 'sql', postgresql: 'sql', sqlite: 'sql',
    graphql: 'graphql', gql: 'graphql',

    // 配置 / 基础设施
    dockerfile: 'dockerfile', docker: 'dockerfile',
    makefile: 'makefile', make: 'makefile',
    nginx: 'conf', apache: 'conf', ini: 'ini', env: 'env',
    terraform: 'tf', tf: 'tf',
    ansible: 'yml',

    // 文档
    markdown: 'md', md: 'md',
    latex: 'tex', tex: 'tex',

    // Mermaid
    mermaid: 'mmd',

    // 其它
    text: 'txt', txt: 'txt', plaintext: 'txt', plain: 'txt',
    diff: 'diff', patch: 'patch',
    csv: 'csv',
    proto: 'proto',
    wasm: 'wat',
    verilog: 'v', vhdl: 'vhd',
    matlab: 'm',
    julia: 'jl',
    zig: 'zig',
    nim: 'nim',
    crystal: 'cr',
    fsharp: 'fs', 'f#': 'fs',
};

/**
 * 把代码块的语言标识符转换为文件扩展名。
 * 找不到映射时回退到 "txt"。
 *
 * @param {string} language
 * @returns {string} 扩展名(不含点)
 */
export function languageToExtension(language) {
    const normalized = (language || '').toLowerCase();
    return LANGUAGE_EXTENSION_MAP[normalized] || 'txt';
}

/**
 * 判断指定语言是否是 Mermaid。
 *
 * @param {string} language
 * @returns {boolean}
 */
export function isMermaidLanguage(language) {
    return (language || '').toLowerCase() === 'mermaid';
}

/**
 * 把模型名 / 消息 id / 代码块序号拼成"模型友好"的文件名前缀。
 * 替换文件系统不允许的字符,避免下载失败。
 *
 * @param {string} modelName
 * @param {string} messageId
 * @param {string|number} blockIndex
 * @returns {string} 例如 "gpt-4o-abc123-0"
 */
export function buildCodeBlockBaseFilename(modelName, messageId, blockIndex) {
    const safeModel   = String(modelName || 'unknown').replace(/[\\/:*?"<>|]/g, '_');
    const safeMessage = String(messageId || 'unknown').replace(/[\\/:*?"<>|]/g, '_');
    return `${safeModel}-${safeMessage}-${blockIndex}`;
}
