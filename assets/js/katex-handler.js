/**
 * KaTeX数学公式处理模块
 */
import config from '/config.js';

// 处理文档中的数学公式
export function processKaTeXFormulas() {
    // 检查是否启用了数学公式支持
    if (!config.extensions.math) return;
    
    // 检查KaTeX库是否已加载
    if (typeof window.katex === 'undefined' || typeof window.renderMathInElement === 'undefined') {
        console.warn('KaTeX库未加载，跳过数学公式处理');
        return;
    }

    // 获取文档内容容器
    const contentElement = document.getElementById('document-content');
    if (!contentElement) return;

    // 在处理前，临时隐藏所有代码块中的内容，避免处理代码块中的公式
    const codeBlocks = contentElement.querySelectorAll('pre code');
    const hiddenContents = [];

    // 保存代码块内容并替换为占位符
    codeBlocks.forEach((block, index) => {
        hiddenContents.push(block.innerHTML);
        block.innerHTML = `CODE_BLOCK_PLACEHOLDER_${index}`;
    });

    // 使用KaTeX处理公式
    window.renderMathInElement(contentElement, {
        delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\(', right: '\\)', display: false},
            {left: '\\[', right: '\\]', display: true}
        ],
        throwOnError: false,
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option']
    });

    // 恢复代码块内容
    codeBlocks.forEach((block, index) => {
        block.innerHTML = hiddenContents[index];
    });
}