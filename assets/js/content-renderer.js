/**
 * 内容渲染模块
 * 负责文档内容的渲染、处理和增强功能
 */

// 导入依赖
import config from '/config.js';
import { initializeMermaid, processMermaidDiagrams } from './mermaid-handler.js';
import { processKaTeXFormulas } from './katex-handler.js';
import documentCache from './document-cache.js';
import { hasSupportedExtension } from './utils.js';

// 全局变量
let pathData = null;
let currentRoot = null;

// 辅助函数：检查是否为支持的文档链接
function isSupportedDocumentLink(href) {
    if (!href) return false;
    
    // 移除锚点部分进行检查
    const pathWithoutAnchor = href.split('#')[0];
    
    // 检查是否有支持的扩展名
    return hasSupportedExtension(pathWithoutAnchor);
}

// 从主文件导入的函数引用
let generateToc = null;
let updateActiveHeading = null;
let getAllDocumentLinks = null;
let generateNewUrl = null;
let debounce = null;
let isDarkMode = null;
let parseUrlPath = null;
let scrollTocToActiveItem = null;
let ensureParentHeadingChildrenVisible = null;
let expandChildHeadings = null;
let generatePrevNextNavigation = null;
let showTocLoading = null;
let fadeOutLoadingAndShowContent = null;
let updatePageTitle = null;
let generateBreadcrumb = null;
let updateGitInfo = null;
let setupHeadingIntersectionObserver = null;
let updateReadingProgress = null;
let createEnhancedImageModal = null;
let showEnhancedImageModal = null;

/**
 * 初始化内容渲染模块
 */
export function initContentRenderer(data, root, mainFunctions) {
    pathData = data;
    currentRoot = root;
    
    // 设置从主文件导入的函数引用
    generateToc = mainFunctions.generateToc;
    updateActiveHeading = mainFunctions.updateActiveHeading;
    getAllDocumentLinks = mainFunctions.getAllDocumentLinks;
    generateNewUrl = mainFunctions.generateNewUrl;
    debounce = mainFunctions.debounce;
    isDarkMode = mainFunctions.isDarkMode;
    parseUrlPath = mainFunctions.parseUrlPath;
    scrollTocToActiveItem = mainFunctions.scrollTocToActiveItem;
    ensureParentHeadingChildrenVisible = mainFunctions.ensureParentHeadingChildrenVisible;
    expandChildHeadings = mainFunctions.expandChildHeadings;
    generatePrevNextNavigation = mainFunctions.generatePrevNextNavigation;
    showTocLoading = mainFunctions.showTocLoading;
    fadeOutLoadingAndShowContent = mainFunctions.fadeOutLoadingAndShowContent;
    updatePageTitle = mainFunctions.updatePageTitle;
    generateBreadcrumb = mainFunctions.generateBreadcrumb;
    updateGitInfo = mainFunctions.updateGitInfo;
    setupHeadingIntersectionObserver = mainFunctions.setupHeadingIntersectionObserver;
    updateReadingProgress = mainFunctions.updateReadingProgress;
    createEnhancedImageModal = mainFunctions.createEnhancedImageModal;
    showEnhancedImageModal = mainFunctions.showEnhancedImageModal;
}

// ===== 文章加载和渲染动画函数 =====

/**
 * 创建文章加载动画骨架屏
 */
function createArticleLoader() {
    const loader = document.createElement('div');
    loader.className = 'article-loader p-8';
    loader.innerHTML = `
        <div class="space-y-6">
            <!-- 标题骨架 -->
            <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg max-w-md animate-pulse"></div>
            
            <!-- 面包屑骨架 -->
            <div class="flex items-center space-x-2">
                <div class="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div class="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div class="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div class="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div class="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            
            <!-- 内容段落骨架 -->
            <div class="space-y-6">
                <div class="space-y-3">
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse"></div>
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5 animate-pulse"></div>
                </div>
                
                <div class="space-y-3">
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
                </div>
                
                <!-- 小标题骨架 -->
                <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-8 animate-pulse"></div>
                
                <div class="space-y-3">
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5 animate-pulse"></div>
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse"></div>
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
                </div>
                
                <!-- 代码块骨架 -->
                <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mt-6">
                    <div class="space-y-3">
                        <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 animate-pulse"></div>
                        <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2 animate-pulse"></div>
                        <div class="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6 animate-pulse"></div>
                    </div>
                </div>
                
                <div class="space-y-3">
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse"></div>
                </div>
            </div>
        </div>
    `;
    return loader;
}

/**
 * 替换加载动画为实际内容的平滑过渡
 */
async function replaceLoaderWithContent(contentDiv, renderFunction) {
    const loader = contentDiv.querySelector('.article-loader');
    const loadingText = contentDiv.querySelector('.text-center.py-8');
    
    // 先淡出加载动画或加载文本
    if (loader || loadingText) {
        const elementToFade = loader || loadingText;
        elementToFade.style.transition = 'opacity 0.3s ease-out';
        elementToFade.style.opacity = '0';
        
        // 等待淡出完成
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // 清空内容并渲染新内容
    contentDiv.innerHTML = '';
    await renderFunction();
    
    // 添加淡入效果
    contentDiv.style.opacity = '0';
    contentDiv.style.transition = 'opacity 0.4s ease-in';
    
    // 触发淡入动画
    requestAnimationFrame(() => {
        contentDiv.style.opacity = '1';
    });
    
    // 清理过渡样式
    setTimeout(() => {
        contentDiv.style.transition = '';
    }, 400);
}

/**
 * 添加文章渲染动画
 * 对整个markdown-body容器进行淡入动画
 */
function addArticleRenderAnimation(contentDiv) {
    // 查找 markdown-body 容器
    const markdownBody = contentDiv.querySelector('.markdown-body');
    if (!markdownBody) return;
    
    // 获取动画持续时间
    const renderDuration = config.animation?.article?.render_duration || 600;
    
    // 确保初始状态（用户已经设置了透明度为0）
    // markdownBody.style.opacity = '0'; // 用户已设置，无需重复
    
    // 触发动画
    setTimeout(() => {
        // 设置CSS变量为动画持续时间
        markdownBody.style.setProperty('--animation-duration', `${renderDuration}ms`);
        
        // 添加动画类
        markdownBody.classList.add('article-fade-in');
    }, 100); // 延迟100ms确保DOM完全渲染
}



// 1. addCacheStatusIndicator
// 添加缓存状态指示器
function addCacheStatusIndicator(contentDiv, cacheType) {
    // 移除已有的缓存状态指示器（如果有）
    const existingIndicator = document.getElementById('cache-status-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    // 创建状态指示器
    const statusIndicator = document.createElement('div');
    statusIndicator.id = 'cache-status-indicator';
    
    let className, icon, text, color;
    
    switch(cacheType) {
        case 'preloaded':
            className = 'cache-status-preloaded';
            icon = 'fas fa-bolt';
            text = '预加载';
            color = 'purple';
            break;
        case 'cached':
            className = 'cache-status-cached';
            icon = 'fas fa-database';
            text = '已缓存';
            color = 'blue';
            break;
        case 'not-enabled':
            className = 'cache-status-not-enabled';
            icon = 'fas fa-ban';
            text = '未启用';
            color = 'gray';
            break;
        default:
            return; // 未知类型不显示指示器
    }
    
    statusIndicator.className = `fixed bottom-4 right-4 bg-white dark:bg-gray-800 shadow-md rounded-lg p-2 text-sm z-40 flex items-center ${className} cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`;
    
    statusIndicator.innerHTML = `
        <i class="${icon} mr-2"></i>
        <span>${text}</span>
    `;
    
    // 添加到页面
    document.body.appendChild(statusIndicator);
    
    // 添加点击事件，打开缓存管理窗口
    statusIndicator.addEventListener('click', () => {
        const cacheModal = document.getElementById('cache-modal');
        if (cacheModal) {
            cacheModal.classList.remove('hidden');
            // 如果cache-manager.js导出了updateCacheList函数，则调用它
            if (typeof window.updateCacheList === 'function') {
                window.updateCacheList();
            }
        }
    });
    
    // 5秒后自动隐藏
    setTimeout(() => {
        statusIndicator.classList.add('opacity-50');
    }, 5000);
    
    // 鼠标进入时恢复透明度
    statusIndicator.addEventListener('mouseenter', () => {
        statusIndicator.classList.remove('opacity-50');
    });
    
    // 鼠标离开时恢复半透明
    statusIndicator.addEventListener('mouseleave', () => {
        statusIndicator.classList.add('opacity-50');
    });
}
// 2. renderDocument (async)
// 渲染文档内容
async function renderDocument(relativePath, content, contentDiv, tocNav) {
    // 清空内容区域
    contentDiv.innerHTML = '';
    
    // 创建 markdown-body 容器
    const markdownBody = document.createElement('div');
    markdownBody.className = 'markdown-body';
    
    try {
        // 检查文件扩展名  
        const isHtmlFile = relativePath.toLowerCase().endsWith('.html');
        
        if (isHtmlFile) {
            // HTML 文件使用iframe嵌入
            // console.log('使用iframe嵌入 HTML 文件:', relativePath);
            
            // 创建iframe包装容器
            const iframeContainer = document.createElement('div');
            iframeContainer.className = 'iframe-container relative mb-4 rounded-lg';
            
            // 创建iframe元素 - 使其成为let，以便于后面可以重新引用
            let iframeElement = document.createElement('iframe');
            iframeElement.className = 'w-full';
            iframeElement.style.minHeight = '500px'; // 默认最小高度
            iframeElement.title = '嵌入HTML内容';
            iframeElement.sandbox = 'allow-same-origin'; // 初始沙箱限制，禁止执行JS
            
            // 添加iframe加载事件 - 尝试自动调整高度
            iframeElement.onload = () => {
                try {
                    // 尝试获取内容高度并调整
                    setTimeout(() => {
                        try {
                            const iframeDoc = iframeElement.contentWindow.document;
                            const bodyHeight = iframeDoc.body.scrollHeight;
                            // 设置iframe高度，最小500px
                            iframeElement.style.height = Math.max(500, bodyHeight + 50) + 'px';
                            
                            // 同步暗黑模式
                            syncDarkMode(iframeDoc);
                            
                            // 生成HTML文件的目录
                            generateTocFromIframe(iframeDoc, tocNav);
                        } catch (e) {
                            console.warn('自动调整iframe高度失败:', e);
                        }
                    }, 200);
                } catch (e) {
                    console.warn('iframe加载事件处理出错:', e);
                }
            };
            
            // 创建控制按钮容器
            const controlsContainer = document.createElement('div');
            controlsContainer.className = 'controls-container';
            
            // 创建加载JS按钮
            const loadJsButton = document.createElement('button');
            loadJsButton.className = 'bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm flex items-center';
            loadJsButton.innerHTML = '<i class="fas fa-play mr-1"></i> 运行脚本';
            loadJsButton.title = '运行HTML中的JavaScript代码';
            
            // 防止重复点击
            let jsLoaded = false;
            
            loadJsButton.addEventListener('click', () => {
                if (jsLoaded) return; // 防止重复执行
                jsLoaded = true;
                
                // 改变按钮状态为加载中
                loadJsButton.className = 'bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm flex items-center';
                loadJsButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> 加载中...';
                
                // 创建新iframe元素
                const newIframe = document.createElement('iframe');
                newIframe.className = iframeElement.className;
                newIframe.style.minHeight = iframeElement.style.minHeight;
                newIframe.title = iframeElement.title;
                newIframe.sandbox = 'allow-same-origin allow-scripts allow-forms allow-modals';
                
                // 设置加载事件
                newIframe.onload = () => {
                    try {
                        // 如果HTML内容被加载完成
                        const iframeDoc = newIframe.contentWindow.document;
                        const iframeWin = newIframe.contentWindow;
                        
                        // 同步暗黑模式
                        syncDarkMode(iframeDoc);
                        
                        // 生成HTML文件的目录
                        setTimeout(() => {
                            // 从iframe中提取标题元素并生成TOC
                            generateTocFromIframe(iframeDoc, tocNav);
                        }, 200);
                        
                        // 手动触发DOM和load事件
                        setTimeout(() => {
                            try {
                                // 手动执行脚本
                                const scriptEvent = new Event('DOMContentLoaded');
                                iframeDoc.dispatchEvent(scriptEvent);
                                
                                const loadEvent = new Event('load');
                                iframeWin.dispatchEvent(loadEvent);
                                
                                // 改变按钮状态为成功
                                loadJsButton.className = 'bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm flex items-center';
                                loadJsButton.innerHTML = '<i class="fas fa-check mr-1"></i> 已运行';
                                
                                // 自动调整iframe高度函数
                                const resizeIframe = () => {
                                    try {
                                        const bodyHeight = iframeDoc.body.scrollHeight;
                                        newIframe.style.height = Math.max(500, bodyHeight + 50) + 'px';
                                    } catch (e) {
                                        console.warn('调整iframe高度时出错:', e);
                                    }
                                };
                                
                                // 初始调整高度
                                resizeIframe();
                                // 再次尝试调整高度（防止有延迟加载的内容）
                                setTimeout(resizeIframe, 500);
                                
                                // 使用ResizeObserver监听内容变化
                                try {
                                    const resizeObserver = new ResizeObserver(debounce(() => {
                                        resizeIframe();
                                    }, 100));
                                    resizeObserver.observe(iframeDoc.body);
                                } catch (e) {
                                    console.warn('无法监控iframe内容变化:', e);
                                    // 降级方案：定时检查高度变化
                                    const intervalId = setInterval(resizeIframe, 1000);
                                    // 30秒后停止检查
                                    setTimeout(() => clearInterval(intervalId), 30000);
                                }
                                
                                // 添加iframe内容变化监听
                                try {
                                    const mutationObserver = new MutationObserver(debounce(() => {
                                        resizeIframe();
                                    }, 100));
                                    
                                    mutationObserver.observe(iframeDoc.body, {
                                        childList: true,
                                        subtree: true,
                                        attributes: true
                                    });
                                } catch (e) {
                                    console.warn('无法监控iframe DOM变化:', e);
                                }
                            } catch (e) {
                                console.error('执行iframe JS时出错:', e);
                                loadJsButton.className = 'bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm flex items-center';
                                loadJsButton.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i> 执行失败';
                            }
                        }, 100);
                    } catch (e) {
                        console.error('iframe加载事件处理出错:', e);
                        loadJsButton.className = 'bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm flex items-center';
                        loadJsButton.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i> 加载失败';
                    }
                };
                
                // 设置iframe内容
                newIframe.srcdoc = content;
                
                // 替换旧iframe
                iframeContainer.replaceChild(newIframe, iframeElement);
                iframeElement = newIframe; // 更新引用
            });
            
            // 创建调整大小按钮
            const resizeButton = document.createElement('button');
            resizeButton.className = 'bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-md text-sm flex items-center';
            resizeButton.innerHTML = '<i class="fas fa-expand-alt mr-1"></i> 全屏';
            resizeButton.title = '全屏显示';
            
            // 切换全屏显示
            let isFullscreen = false;
            resizeButton.addEventListener('click', () => {
                isFullscreen = !isFullscreen;
                
                if (isFullscreen) {
                    // 仅让iframe全屏
                    iframeElement.classList.add('iframe-fullscreen');
                    resizeButton.innerHTML = '<i class="fas fa-compress-alt mr-1"></i> 退出全屏';
                    
                    // 添加关闭按钮，以防iframe内无法点击控制按钮
                    const closeFullscreenBtn = document.createElement('button');
                    closeFullscreenBtn.id = 'close-fullscreen-btn';
                    closeFullscreenBtn.className = 'fixed top-4 right-4 z-[9999] bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2 rounded-full shadow-lg';
                    closeFullscreenBtn.innerHTML = '<i class="fas fa-times"></i>';
                    closeFullscreenBtn.addEventListener('click', () => {
                        iframeElement.classList.remove('iframe-fullscreen');
                        isFullscreen = false;
                        resizeButton.innerHTML = '<i class="fas fa-expand-alt mr-1"></i> 全屏';
                        document.getElementById('close-fullscreen-btn')?.remove();
                    });
                    document.body.appendChild(closeFullscreenBtn);
                } else {
                    // 退出全屏
                    iframeElement.classList.remove('iframe-fullscreen');
                    resizeButton.innerHTML = '<i class="fas fa-expand-alt mr-1"></i> 全屏';
                    document.getElementById('close-fullscreen-btn')?.remove();
                }
            });
            
            // 组装控制按钮
            controlsContainer.appendChild(loadJsButton);
            
            controlsContainer.appendChild(resizeButton);
            
            // 设置iframe初始内容（不运行JS）
            iframeElement.srcdoc = content;
            
            // 组装整个容器
            iframeContainer.appendChild(iframeElement);
            iframeContainer.appendChild(controlsContainer);
            
            // 添加提示消息
            const hintMessage = document.createElement('div');
            hintMessage.className = 'text-xs text-gray-500 dark:text-gray-400 mt-1 ml-2';
            hintMessage.textContent = '此HTML内容在沙箱中运行，点击"运行脚本"按钮以启用JavaScript';
            
            markdownBody.appendChild(iframeContainer);
            markdownBody.appendChild(hintMessage);
            
            // 添加到内容区域
            contentDiv.appendChild(markdownBody);
        } else {
            // Markdown 文件处理
            // console.log('渲染 Markdown 文件:', relativePath);
            
            // 预处理Markdown内容，处理块级数学公式
            content = preProcessMathContent(content);
            
            // 使用 marked 解析 Markdown
            const markedContent = marked.parse(content, {
                gfm: true,
                breaks: true,
                headerIds: true,
                mangle: false,
                highlight(code, lang) {
                    // 检查Highlight.js是否已加载
                    if (config.extensions.highlight && typeof window.hljs !== 'undefined') {
                        try {
                            return window.hljs.highlight(code, { language: lang || 'plaintext' }).value;
                        } catch (e) {
                            console.warn('语法高亮处理失败:', e);
                            return code;
                        }
                    }
                    return code;
                }
            });
            
            // 设置解析后的内容
            markdownBody.innerHTML = markedContent;
            
            // 添加到内容区域
            contentDiv.appendChild(markdownBody);
        }
        
        // 处理代码块 - 必须在处理数学公式之前执行
        const codeBlocks = markdownBody.querySelectorAll('pre code');
        codeBlocks.forEach(block => {
            // **首先检查是否是 Mermaid 代码块**
            if (block.classList.contains('language-mermaid')) {
                return; // 由 mermaid-handler.js 处理，此处跳过
            }

            // 获取 pre 元素
            const preElement = block.parentElement;
            
            // 应用 highlight.js
            if (config.extensions.highlight && typeof window.hljs !== 'undefined') {
                try {
                    window.hljs.highlightElement(block);
                } catch (e) {
                    console.warn('语法高亮元素处理失败:', e);
                }
            }
            
            // 创建代码块包装器
            const wrapper = document.createElement('div');
            wrapper.className = 'code-block-wrapper';
            
            // 替换 pre 元素为包装器
            preElement.parentNode.insertBefore(wrapper, preElement);
            wrapper.appendChild(preElement);
            
            // 处理行号
            if (config.document.code_block?.line_numbers) {
                // 获取代码内容
                const codeLines = block.textContent.split('\n');
                // 如果最后一行是空行，移除它
                if (codeLines[codeLines.length - 1] === '') {
                    codeLines.pop();
                }
                
                // 生成行号
                const startLine = config.document.code_block.start_line || 1;
                const lineNumbers = Array.from(
                    { length: codeLines.length }, 
                    (_, i) => startLine + i
                ).join('\n');
                
                // 添加行号
                preElement.classList.add('has-line-numbers');
                preElement.setAttribute('data-line-numbers', lineNumbers);
            }
            
            // 如果启用了代码复制按钮，添加复制功能
            if (config.document.code_copy_button) {
                // 创建复制按钮容器
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'code-copy-button-container';
                
                // 创建复制按钮
                const copyButton = document.createElement('button');
                copyButton.className = 'code-copy-button';
                copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                copyButton.title = '复制代码';
                
                // 添加复制功能
                copyButton.addEventListener('click', async (e) => {
                    // 阻止事件冒泡，避免触发其他事件
                    e.stopPropagation();
                    
                    try {
                        await navigator.clipboard.writeText(block.textContent);
                        copyButton.innerHTML = '<i class="fas fa-check"></i>';
                        setTimeout(() => {
                            copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                        }, 2000);
                    } catch (err) {
                        console.error('复制失败:', err);
                        copyButton.innerHTML = '<i class="fas fa-times"></i>';
                        setTimeout(() => {
                            copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                        }, 2000);
                    }
                });
                
                // 将按钮添加到容器
                buttonContainer.appendChild(copyButton);
                
                // 将按钮容器添加到包装器
                wrapper.appendChild(buttonContainer);
            }
        });
        
        // 处理GitHub风格的提示卡片
        processAdmonitions(markdownBody);
        
        // 手动处理块级数学公式 (必须在代码块处理后执行)
        if (config.extensions.math && !isHtmlFile) { // 只对Markdown文件处理公式
            processBlockMath(markdownBody);
        }
        
        // Mermaid图表处理完成后，才处理其他元素
        const mermaidDivs = markdownBody.querySelectorAll('.mermaid');
        if (mermaidDivs.length > 0 && typeof window.mermaid !== 'undefined' && config.extensions.mermaid) {
            window.mermaid.init(undefined, mermaidDivs);
        }
        
        // 处理图片链接
        fixExternalImageLinks(markdownBody);
        
        // 处理内部链接
        fixInternalLinks(markdownBody);
        
        // 处理外部链接
        fixExternalLinks(markdownBody);
        
        // 先生成目录，此步骤会统一生成所有标题的ID
        generateToc(markdownBody);
        
        // 增强标题，添加点击复制链接功能
        enhanceHeadings(markdownBody);
        
        // 设置标题观察器(使用交叉观察API提高准确性)
        setupHeadingIntersectionObserver(contentDiv);
        
        // 初始化一次处理目录高亮 
        // handleTocScrollHighlight(); // 函数不存在，暂时注释掉
        
        // 更新页面标题
        updatePageTitle(relativePath);
        
        // 生成面包屑导航
        generateBreadcrumb(relativePath);
        
        // 添加上一篇/下一篇导航
        generatePrevNextNavigation(relativePath);
        
        // 显示Git和GitHub相关信息
        updateGitInfo(relativePath);
        
        // 触发内容已加载事件，用于KaTeX自动渲染和其他需要在内容加载后执行的操作
        document.dispatchEvent(new CustomEvent('mdContentLoaded', {
            detail: { markdownBody, contentPath: relativePath }
        }));
        
        // 添加文章渲染动画（如果启用）
        if (config.animation?.article?.enable_render !== false) {
            setTimeout(() => {
                addArticleRenderAnimation(contentDiv);
            }, 100); // 稍微延迟确保DOM完全渲染
        }
        
        // 添加图片点击放大功能
        const images = contentDiv.querySelectorAll('img:not(a > img)'); // 选择不在链接内的图片
        
        // 确保模态框只创建一次
        let imageModal = document.getElementById('custom-image-modal');
        if (!imageModal) {
            imageModal = createEnhancedImageModal();
        }
        
        // 为每个图片添加点击事件
        images.forEach(img => {
            img.style.cursor = 'zoom-in'; // 添加鼠标样式
            img.addEventListener('click', () => {
                showEnhancedImageModal(img.src, img.alt || '放大图片');
            });
        });
        
        // 修正外部链接
        fixExternalLinks(contentDiv);
        // 修正外部图片链接（如果需要）
        fixExternalImageLinks(contentDiv);
        
        // 修正内部链接
        fixInternalLinks(contentDiv);

        // 更新阅读进度
        updateReadingProgress();
    } catch (error) {
        console.error('渲染文档时出错:', error);
        contentDiv.innerHTML = '<div class="error-message">文档渲染失败</div>';
    }
}
// 3. preProcessMathContent
// 预处理Markdown内容中的数学公式
function preProcessMathContent(content) {
    // 分割代码块和非代码块
    const segments = [];
    let isInCodeBlock = false;
    let currentSegment = '';
    let codeBlockLang = '';
    
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 检测代码块开始或结束
        if (line.trim().startsWith('```')) {
            if (!isInCodeBlock) {
                // 开始新代码块
                isInCodeBlock = true;
                // 获取代码块语言
                codeBlockLang = line.trim().substring(3).trim();
                
                // 保存之前的非代码块内容
                if (currentSegment) {
                    segments.push({
                        type: 'text',
                        content: currentSegment
                    });
                }
                
                // 开始新的代码块内容
                currentSegment = line + '\n';
            } else {
                // 结束当前代码块
                isInCodeBlock = false;
                currentSegment += line;
                
                // 保存代码块内容
                segments.push({
                    type: 'code',
                    content: currentSegment,
                    lang: codeBlockLang
                });
                
                // 重置内容收集器
                currentSegment = '';
            }
        } else {
            // 普通行，添加到当前段落
            currentSegment += line + '\n';
        }
    }
    
    // 添加最后一段内容
    if (currentSegment) {
        segments.push({
            type: isInCodeBlock ? 'code' : 'text',
            content: currentSegment,
            lang: isInCodeBlock ? codeBlockLang : ''
        });
    }
    
    // 只处理非代码块中的公式
    for (let i = 0; i < segments.length; i++) {
        if (segments[i].type === 'text') {
            // 处理块级公式
            segments[i].content = segments[i].content.replace(/\$\$([\s\S]*?)\$\$/g, function(match, formula) {
                return `<div class="math-block">$$${formula}$$</div>`;
            });
        }
    }
    
    // 重新组合内容
    return segments.map(segment => segment.content).join('');
}
// 4. processBlockMath
// 处理文档中的块级数学公式
function processBlockMath(container) {
    // 检查是否启用了数学公式支持
    if (!config.extensions.math) return;
    
    // 确保KaTeX已加载
    if (typeof katex === 'undefined') {
        console.warn('KaTeX未加载，无法渲染数学公式');
        return;
    }
    
    // 查找所有数学块容器 (排除在代码块内的)
    const mathBlocks = container.querySelectorAll('div.math-block');
    
    mathBlocks.forEach(block => {
        // 检查是否在代码块内
        if (block.closest('pre') || block.closest('code')) {
            // 在代码块内，不处理
            return;
        }
        
        // 提取公式（去掉$$符号）
        const formula = block.textContent.replace(/^\$\$([\s\S]*)\$\$$/, '$1');
        
        // 创建一个新的div用于KaTeX渲染
        const displayMath = document.createElement('div');
        displayMath.className = 'katex-display';
        
        try {
            // 直接使用KaTeX渲染
            katex.render(formula, displayMath, {
                throwOnError: false,
                displayMode: true
            });
            
            // 替换原始内容
            block.innerHTML = '';
            block.appendChild(displayMath);
        } catch (err) {
            console.error('渲染块级公式失败:', err);
            block.innerHTML = `<div class="katex-error">公式渲染错误: ${formula}</div>`;
        }
    });
    
    // 处理行内公式
    const inlineMathElements = container.querySelectorAll('.math');
    inlineMathElements.forEach(element => {
        // 检查是否在代码块内
        if (element.closest('pre') || element.closest('code')) {
            // 在代码块内，不处理
            return;
        }
        
        // 处理包含$...$格式的公式
        const formula = element.textContent;
        try {
            katex.render(formula, element, {
                throwOnError: false,
                displayMode: false
            });
        } catch (err) {
            console.error('渲染行内公式失败:', err);
        }
    });
}
// 5. fixExternalLinks
// 修复外部链接，在外部链接上添加target="_blank"
function fixExternalLinks(container) {
    const links = container.querySelectorAll('a');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('www.'))) {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener');
        }
    });
}
// 6. fixExternalImageLinks
// 修复外部图片链接
function fixExternalImageLinks(container) {
    const images = container.querySelectorAll('img');
    images.forEach(img => {
        const src = img.getAttribute('src');
        // 检查图片地址是否出现了undefined前缀
        if (src && src.startsWith('undefined')) {
            // 修复图片地址
            const fixedSrc = src.replace(/^undefined/, '');
            img.setAttribute('src', fixedSrc);
        }
        
        // 为图片添加错误处理
        img.addEventListener('error', function() {
            // 图片加载失败时显示占位图
            this.src = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23cccccc\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Crect x=\'3\' y=\'3\' width=\'18\' height=\'18\' rx=\'2\' ry=\'2\'/%3E%3Ccircle cx=\'8.5\' cy=\'8.5\' r=\'1.5\'/%3E%3Cpolyline points=\'21 15 16 10 5 21\'/%3E%3C/svg%3E';
            this.classList.add('img-error');
            this.setAttribute('alt', '图片加载失败');
            this.style.padding = '2rem';
            this.style.background = '#f5f5f5';
            if (isDarkMode()) {
                this.style.background = '#333';
            }
        });
    });
}
// 7. fixInternalLinks
// 修复内部链接，维持root参数
// 导入路径工具
import { getDocumentPagePath } from './path-utils.js';

function fixInternalLinks(container) {
    const links = container.querySelectorAll('a');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        
        // 跳过已经处理过的链接（以main.html开头的）
        const docPagePath = getDocumentPagePath();
        if (href.startsWith(`${docPagePath}#`)) {
            return;
        }
        
        // 跳过外部链接
        if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
            // 标记外部链接
            if ((href.startsWith('http://') || href.startsWith('https://')) && 
                !href.includes(window.location.hostname)) {
                if (!link.classList.contains('external-link') && !link.querySelector('.external-link-icon')) {
                    link.classList.add('external-link');
                    
                    // 添加外部链接图标
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-external-link-alt ml-1 text-xs external-link-icon';
                    icon.style.fontSize = '0.75em';
                    icon.setAttribute('aria-hidden', 'true');
                    link.appendChild(icon);
                    
                    // 设置为在新标签页打开
                    if (!link.getAttribute('target')) {
                        link.setAttribute('target', '_blank');
                        link.setAttribute('rel', 'noopener noreferrer');
                    }
                }
            }
            return;
        }
        
        // 跳过纯锚点链接（页面内跳转）
        if (href === '#' || (href.startsWith('#') && !isSupportedDocumentLink(href))) {
            return;
        }
        
        // 处理相对路径的支持文档文件链接
        if (isSupportedDocumentLink(href)) {
            // 提取路径和锚点，并解码
            let path = decodeURIComponent(href);
            let anchor = '';
            
            if (path.includes('#')) {
                const parts = path.split('#');
                path = parts[0];
                anchor = parts.slice(1).join('#'); // 处理可能的多个#
            }
            
            // 构建新的URL，不使用generateNewUrl以避免编码
            let newHref;
            if (currentRoot) {
                // 有root的情况，需要判断是绝对路径还是相对路径
                if (path && path.startsWith(currentRoot + '/')) {
                    // 如果路径已经包含root前缀，移除它作为相对路径处理
                    const relativePath = path.substring(currentRoot.length + 1);
                newHref = `${docPagePath}#${currentRoot}`;
                if (relativePath) {
                    newHref += `/${relativePath}`;
                    }
                } else {
                    // 否则视为绝对路径，不使用当前root
                    newHref = `${docPagePath}#/${path}`;
                }
                if (anchor) {
                    newHref += `#${anchor}`;
                }
            } else {
                // 无root的情况
                newHref = `${docPagePath}#/${path}`;
                if (anchor) {
                    newHref += `#${anchor}`;
                }
            }
            
            link.setAttribute('href', newHref);
            
            // 标记为内部链接
            if (!link.classList.contains('internal-link')) {
                link.classList.add('internal-link');
            }
        }
        // 处理旧格式的链接（包含path参数）
        else if (href.includes('path=')) {
            try {
                const url = new URL(href, window.location.origin);
                const path = decodeURIComponent(url.searchParams.get('path') || '');
                const anchor = url.hash ? url.hash.substring(1) : '';
                
                // 转换为新格式
                const newHref = generateNewUrl(path, currentRoot, anchor);
                link.setAttribute('href', newHref);
                
                // 标记为内部链接
                if (!link.classList.contains('internal-link')) {
                    link.classList.add('internal-link');
                }
            } catch (e) {
                console.error('转换链接格式失败:', e);
            }
        }
        // 处理目录链接（没有扩展名的相对路径）
        else if (!href.startsWith('#') && !href.startsWith('?') && !href.includes('.')) {
            // 解码路径
            let path = decodeURIComponent(href);
            
            // 不再自动添加默认索引文件，保持目录路径
            // 构建新的URL，不编码
            let newHref;
            if (currentRoot) {
                // 有root的情况，需要判断是绝对路径还是相对路径
                if (path && path.startsWith(currentRoot + '/')) {
                    // 如果路径已经包含root前缀，移除它作为相对路径处理
                    const relativePath = path.substring(currentRoot.length + 1);
                newHref = `${docPagePath}#${currentRoot}`;
                if (relativePath) {
                    newHref += `/${relativePath}`;
                    }
                } else {
                    // 否则视为绝对路径，不使用当前root
                    newHref = `${docPagePath}#/${path}`;
                }
            } else {
                // 无root的情况
                newHref = `${docPagePath}#/${path}`;
            }
            
            link.setAttribute('href', newHref);
            
            // 标记为内部链接
            if (!link.classList.contains('internal-link')) {
                link.classList.add('internal-link');
            }
        }
    });
}
// 8. syncDarkMode
// 添加暗黑模式同步功能
function syncDarkMode(iframeDoc) {
    if (!iframeDoc || !iframeDoc.documentElement) return;
    
    try {
        // 检查外部文档是否是暗黑模式
        const isParentDark = document.documentElement.classList.contains('dark');
        
        // 将iframe文档的html元素设置为与父文档相同的模式
        if (isParentDark) {
            iframeDoc.documentElement.classList.add('dark');
        } else {
            iframeDoc.documentElement.classList.remove('dark');
        }
        
        // 监听外部文档暗黑模式变化
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    const isParentDarkNow = document.documentElement.classList.contains('dark');
                    if (isParentDarkNow) {
                        iframeDoc.documentElement.classList.add('dark');
                    } else {
                        iframeDoc.documentElement.classList.remove('dark');
                    }
                }
            });
        });
        
        // 设置观察器选项
        const observerConfig = { attributes: true };
        
        // 开始观察document.documentElement的class变化
        observer.observe(document.documentElement, observerConfig);
        
        // 添加暗黑模式样式到iframe中
        const darkModeStyle = iframeDoc.createElement('style');
        darkModeStyle.textContent = `
            /* 基本暗黑模式样式 */
            .dark {
                color-scheme: dark;
            }
            
            .dark body {
                background-color: #1F2937;
                color: #f3f4f6;
            }
        `;
        
        // 将样式添加到iframe的head中
        iframeDoc.head.appendChild(darkModeStyle);
    } catch (e) {
        console.warn('同步暗黑模式失败:', e);
    }
}
// 9. generateTocFromIframe
// 从iframe中生成目录
function generateTocFromIframe(iframeDoc, tocNav) {
    // 显示TOC加载动画
    showTocLoading();
    
    // 使用平滑切换动画
    setTimeout(async () => {
        // 获取配置的目录深度
        const tocDepth = config.document.toc_depth || 3;
        
        // 构建标题选择器，仅选择配置的深度内的标题
        let headingSelector = '';
        for (let i = 1; i <= tocDepth; i++) {
            headingSelector += (headingSelector ? ', ' : '') + 'h' + i;
        }
        
        // 查找iframe中符合深度要求的标题元素
        const headings = iframeDoc.querySelectorAll(headingSelector);
        
        // 首先为iframe中的所有标题生成统一的ID（与普通文章相同的方式）
        const usedIds = new Set(); // 用于跟踪已使用的ID
        
        // 为所有标题生成统一的ID
        headings.forEach((heading, index) => {
            // 如果标题已经有ID，跳过
            if (heading.id) {
                usedIds.add(heading.id);
                return;
            }
            
            // 获取标题文本，并清理
            const headingText = heading.textContent.trim();
            // 移除可能存在的链接图标文本
            const cleanText = headingText.replace(/复制链接$/, '').trim();
            
            // 生成符合URL要求的ID：只保留字母、数字、中文字符和连字符
            let headingId = cleanText
                .replace(/[^\p{L}\p{N}\p{Script=Han}-]/gu, '-') // 替换非字母、数字、中文和连字符为连字符
                .replace(/-+/g, '-')       // 合并多个连续连字符
                .replace(/^-|-$/g, '')     // 移除首尾连字符
                .toLowerCase();
            
            // 如果转换后为空，使用备用ID
            if (!headingId) {
                headingId = `heading-${index}`;
            }
            
            // 确保ID唯一
            let uniqueId = headingId;
            let counter = 1;
            while (usedIds.has(uniqueId)) {
                uniqueId = `${headingId}-${counter}`;
                counter++;
            }
            
            // 保存使用过的ID
            usedIds.add(uniqueId);
            
            // 设置新ID
            heading.id = uniqueId;
        });
        
        const headingsArray = Array.from(headings);
        
        if (headingsArray.length === 0) {
            await fadeOutLoadingAndShowContent(tocNav, () => {
                tocNav.innerHTML = '<p class="text-gray-400 text-sm">暂无目录</p>';
            });
            return;
        }

        await fadeOutLoadingAndShowContent(tocNav, () => {
            // 是否显示标题编号
            const showNumbering = config.document.toc_numbering || false;
            // 是否忽略h1标题计数
            const ignoreH1 = config.document.toc_ignore_h1 || false;
            
            // 用于生成标题编号的计数器
            const counters = [0, 0, 0, 0, 0, 0];
            let lastLevel = 0;
            
            headingsArray.forEach((heading, index) => {
                const level = parseInt(heading.tagName.substring(1));
                const id = heading.id; // 使用已经生成的ID
                
                // 处理标题编号
                let prefix = '';
                if (showNumbering) {
                    // 如果设置了忽略h1并且当前是h1，不生成编号
                    if (ignoreH1 && level === 1) {
                        prefix = '';
                    } else {
                        // 更新计数器，对h1做特殊处理
                        if (level > lastLevel) {
                            // 如果新标题级别比上一个大，将所有更深层级的计数器重置为0
                            for (let i = lastLevel; i < level; i++) {
                                // 如果忽略h1，并且是处理h1计数器，则跳过
                                if (!(ignoreH1 && i === 0)) {
                                    counters[i]++;
                                }
                            }
                            for (let i = level; i < counters.length; i++) {
                                counters[i] = 0;
                            }
                        } else if (level === lastLevel) {
                            // 如果新标题与上一个同级，递增计数器
                            // 如果忽略h1，并且是处理h1计数器，则跳过
                            if (!(ignoreH1 && level === 1)) {
                                counters[level - 1]++;
                            }
                        } else {
                            // 如果新标题比上一个小（更高级别），递增当前级别并重置更低级别
                            // 如果忽略h1，并且是处理h1计数器，则跳过
                            if (!(ignoreH1 && level === 1)) {
                                counters[level - 1]++;
                            }
                            for (let i = level; i < counters.length; i++) {
                                counters[i] = 0;
                            }
                        }
                        
                        // 生成标题编号，注意对h1的特殊处理
                        prefix = '';
                        // 如果忽略h1，则从h2开始计数
                        const startIdx = ignoreH1 ? 1 : 0;
                        for (let i = startIdx; i < level; i++) {
                            if (counters[i] > 0) {
                                prefix += counters[i] + '.';
                            }
                        }
                        prefix = prefix ? `${prefix} ` : '';
                    }
                }
                
                lastLevel = level;

                const li = document.createElement('li');
                const a = document.createElement('a');
                
                // 生成新格式的链接：保留当前文档路径，添加锚点
                const currentParsed = parseUrlPath();
                const iframeTocUrl = generateNewUrl(currentParsed.path, currentParsed.root, id);
                a.href = iframeTocUrl;
                
                a.innerHTML = prefix + heading.textContent; 
                a.classList.add('block', 'text-sm', 'py-1', 'hover:text-primary', 'dark:hover:text-primary');
                a.style.marginLeft = `${(level - 1) * 0.75}rem`; // 缩进
                a.dataset.headingId = id;
                
                // 点击目录条目时滚动到iframe内部对应标题
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // 获取当前激活的iframe元素
                    const iframes = document.querySelectorAll('.iframe-container iframe');
                    if (iframes.length > 0) {
                        // 查找可见的iframe
                        let activeIframe = null;
                        for (const iframe of iframes) {
                            if (iframe.offsetParent !== null) { // 检查iframe是否可见
                                activeIframe = iframe;
                                break;
                            }
                        }
                        
                        if (activeIframe) {
                            try {
                                // console.log('尝试滚动到标题:', id);
                                // 使用iframe中的document获取标题元素
                                const targetHeading = activeIframe.contentWindow.document.getElementById(id);
                                if (targetHeading) {
                                    // console.log('找到标题元素:', targetHeading);
                                    
                                    // 获取iframe在页面中的位置
                                    const iframeRect = activeIframe.getBoundingClientRect();
                                    // 获取标题在iframe中的位置
                                    const headingRect = targetHeading.getBoundingClientRect();
                                    
                                    // 计算标题在页面中的绝对位置 = iframe在页面中的位置 + 标题在iframe中的位置
                                    const absoluteHeadingTop = window.scrollY + iframeRect.top + headingRect.top;
                                    
                                    // console.log('滚动主页面到位置:', absoluteHeadingTop);
                                    
                                    // 滚动主页面到标题位置
                                    window.scrollTo({
                                        top: absoluteHeadingTop - 80, // 减去一些顶部空间，使标题不会太靠上
                                        behavior: 'smooth'
                                    });
                                    
                                    // 更新URL为新格式，包含锚点
                                    const newUrl = generateNewUrl(currentParsed.path, currentParsed.root, id);
                                    history.pushState(null, null, newUrl);
                                    
                                    // 高亮当前目录项
                                    document.querySelectorAll('#toc-nav a').forEach(link => link.classList.remove('active'));
                                    a.classList.add('active');
                                    
                                    // 确保当前目录项在视图中
                                    scrollTocToActiveItem(a);
                                } else {
                                    console.warn('在iframe中找不到标题元素:', id);
                                }
                            } catch (error) {
                                console.error('滚动到iframe标题时出错:', error);
                            }
                        }
                    }
                });
                
                li.appendChild(a);
                tocNav.appendChild(li);
            });
            
            // 监听iframe滚动事件，高亮当前可见标题的目录项
            try {
                const iframe = document.querySelector('.iframe-container iframe');
                if (iframe) {
                    // 使用setTimeout确保iframe完全加载
                    setTimeout(() => {
                        try {
                            // 监听iframe的滚动事件
                            iframe.contentWindow.addEventListener('scroll', debounce(() => {
                                updateIframeTocHighlight(iframe);
                            }, 100));
                            
                            // 监听主文档的滚动事件
                            window.addEventListener('scroll', debounce(() => {
                                updateIframeTocHighlight(iframe);
                            }, 100));
                            
                            // 初始调用一次
                            updateIframeTocHighlight(iframe);
                        } catch (e) {
                            console.warn('添加iframe滚动事件监听器失败:', e);
                        }
                    }, 500);
                }
            } catch (error) {
                console.warn('无法监听iframe滚动事件:', error);
            }
        }, true, '.toc-item:not(.toc-beyond-depth)'); // 使用交错动画，排除超出深度的元素
        
        // 移除这行，因为动画已经在 fadeOutLoadingAndShowContent 中处理了
        // addStaggerAnimation(tocNav, '.toc-item');
    }, 300); // 显示加载动画300ms后再生成内容
}

// 10. updateIframeTocHighlight
// 更新HTML文档的目录高亮
function updateIframeTocHighlight(iframe) {
    try {
        if (!iframe || !iframe.contentWindow || !iframe.contentWindow.document) {
            return;
        }
        
        const iframeDoc = iframe.contentWindow.document;
        
        // 获取配置的目录深度
        const tocDepth = config.document.toc_depth || 3;
        
        // 构建标题选择器，仅选择配置的深度内的标题
        let headingSelector = '';
        for (let i = 1; i <= tocDepth; i++) {
            headingSelector += (headingSelector ? ', ' : '') + 'h' + i;
        }
        
        // 查找符合深度要求的标题元素
        const headingElements = iframeDoc.querySelectorAll(headingSelector);
        
        if (headingElements.length === 0) {
            return;
        }
        
        // 获取iframe在页面中的位置
        const iframeRect = iframe.getBoundingClientRect();
        
        // 计算视口中间位置
        const viewportMiddle = window.innerHeight / 3; // 使用视口上部1/3处作为参考点
        
        // 跟踪最接近视口中间的标题及其距离
        let closestHeading = null;
        let closestDistance = Infinity;
        
        // 遍历所有标题，查找最接近视口中间的标题
        headingElements.forEach(heading => {
            // 获取标题在iframe内的位置
            const headingRect = heading.getBoundingClientRect();
            
            // 计算标题在页面中的绝对位置
            const headingAbsTop = iframeRect.top + headingRect.top;
            
            // 计算标题与视口中间的距离
            const distance = Math.abs(headingAbsTop - viewportMiddle);
            
            // 如果这个标题是可见的，并且距离比之前找到的更近
            if (
                headingAbsTop > 0 && 
                headingAbsTop < window.innerHeight && 
                distance < closestDistance
            ) {
                closestHeading = heading;
                closestDistance = distance;
            }
        });
        
        // 如果没有找到可见标题，尝试找最后一个已经滚过的标题
        if (!closestHeading) {
            let lastPassedHeading = null;
            
            // 找出最后一个已经过去的标题
            for (let i = headingElements.length - 1; i >= 0; i--) {
                const heading = headingElements[i];
                const headingRect = heading.getBoundingClientRect();
                const headingAbsTop = iframeRect.top + headingRect.top;
                
                if (headingAbsTop < viewportMiddle) {
                    lastPassedHeading = heading;
                    break;
                }
            }
            
            closestHeading = lastPassedHeading;
        }
        
        // 高亮对应目录项
        if (closestHeading && closestHeading.id) {
            const tocLinks = document.querySelectorAll('#toc-nav a');
            let activeTocLink = null;
            
            tocLinks.forEach(link => {
                link.classList.remove('active');
                if (link.dataset.headingId === closestHeading.id) {
                    link.classList.add('active');
                    activeTocLink = link;
                }
            });
            
            // 确保当前活动的目录项在视图中
            if (activeTocLink) {
                scrollTocToActiveItem(activeTocLink);
            }
        }
    } catch (e) {
        console.warn('更新iframe目录高亮出错:', e);
    }
}
// 11. processAdmonitions
// 处理类似GitHub的提示卡片，如 > [TIP]
function processAdmonitions(container) {
    // 查找所有引用块
    const blockquotes = container.querySelectorAll('blockquote');
    
    blockquotes.forEach(blockquote => {
        // 检查第一个子元素是否是段落
        const firstChild = blockquote.firstElementChild;
        if (!firstChild || firstChild.tagName.toLowerCase() !== 'p') return;
        
        // 检查段落的文本内容
        const text = firstChild.textContent.trim();
        
        // 检查是否匹配 [TYPE] 模式
        const match = text.match(/^\[([A-Z]+)\]\s*(.*)/);
        if (!match) return;
        
        const type = match[1].toLowerCase();
        const title = match[2] || '';
        
        // 支持的提示类型及其图标和颜色
        const admonitionTypes = {
            'note': { icon: 'fas fa-info-circle', color: 'blue', title: title || '注意' },
            'tip': { icon: 'fas fa-lightbulb', color: 'green', title: title || '提示' },
            'important': { icon: 'fas fa-exclamation-circle', color: 'purple', title: title || '重要' },
            'warning': { icon: 'fas fa-exclamation-triangle', color: 'orange', title: title || '警告' },
            'caution': { icon: 'fas fa-fire', color: 'orange', title: title || '小心' },
            'danger': { icon: 'fas fa-bolt', color: 'red', title: title || '危险' }
        };
        
        // 如果是支持的类型，转换为特色卡片
        if (admonitionTypes[type]) {
            const admonition = admonitionTypes[type];
            
            // 创建卡片容器
            const card = document.createElement('div');
            card.className = `admonition admonition-${type} border-l-4 pl-4 py-2 my-4 rounded-r-md`;
            card.style.borderLeftColor = `var(--color-${admonition.color}, ${getDefaultColor(admonition.color)})`;
            
            // 创建标题
            const cardTitle = document.createElement('div');
            cardTitle.className = 'admonition-title font-medium flex items-center mb-2';
            cardTitle.style.color = `var(--color-${admonition.color}, ${getDefaultColor(admonition.color)})`;
            
            // 添加图标
            const icon = document.createElement('i');
            icon.className = `${admonition.icon} mr-2`;
            cardTitle.appendChild(icon);
            
            // 添加标题文本
            const titleSpan = document.createElement('span');
            titleSpan.textContent = admonition.title;
            cardTitle.appendChild(titleSpan);
            
            // 添加标题到卡片
            card.appendChild(cardTitle);
            
            // 创建内容容器
            const content = document.createElement('div');
            content.className = 'admonition-content text-gray-700 dark:text-gray-300';
            
            // 移除第一个段落（包含类型标记）
            firstChild.remove();
            
            // 将剩余内容移动到新容器中
            while (blockquote.firstChild) {
                content.appendChild(blockquote.firstChild);
            }
            
            // 添加内容到卡片
            card.appendChild(content);
            
            // 替换原始引用块
            blockquote.parentNode.replaceChild(card, blockquote);
        }
    });
}
// 12. getDefaultColor
// 获取颜色的默认值（如果CSS变量不可用）
function getDefaultColor(color) {
    const colorMap = {
        'blue': '#3b82f6',
        'green': '#10b981',
        'purple': '#8b5cf6',
        'orange': '#f97316',
        'red': '#ef4444',
        'gray': '#6b7280'
    };
    return colorMap[color] || '#3b82f6';
}
// 13. enhanceHeadings
// 处理标题，添加点击复制链接功能 (ID已在generateToc中处理)
function enhanceHeadings(container) {
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    headings.forEach((heading, index) => {
        // ID已在generateToc中设置，这里只添加复制链接功能
        
        // 移除之前可能添加的复制链接按钮
        const existingButton = heading.querySelector('.heading-link');
        if (existingButton) {
            existingButton.remove();
        }
        
        // 创建复制链接按钮
        const copyButton = document.createElement('span');
        copyButton.className = 'heading-link ml-2 text-gray-400 hover:text-primary cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity';
        copyButton.innerHTML = '<i class="fas fa-link text-sm"></i>';
        copyButton.title = '复制链接';
        copyButton.style.display = 'inline-block';
        
        // 点击事件：复制标题链接到剪贴板
        copyButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 使用新的URL格式生成链接
            const { path, root } = parseUrlPath();
            const relativeUrl = generateNewUrl(path, root, heading.id);
            
            // 生成完整的绝对URL
            const fullUrl = window.location.origin + relativeUrl;
            
            // 复制到剪贴板
            navigator.clipboard.writeText(fullUrl).then(() => {
                // 使用统一的showToast方法
                if (window.contextMenuManager && window.contextMenuManager.showToast) {
                    window.contextMenuManager.showToast('链接已复制到剪贴板');
                } else {
                    // 兜底方案，直接创建toast但使用统一样式
                    const toast = document.createElement('div');
                    toast.className = 'toast toast-success';
                    toast.textContent = '链接已复制到剪贴板';
                    document.body.appendChild(toast);
                    
                    // 显示动画
                    setTimeout(() => {
                        toast.classList.add('show');
                    }, 10);
                    
                    // 自动隐藏
                    setTimeout(() => {
                        toast.classList.remove('show');
                        setTimeout(() => {
                            if (toast.parentNode) {
                                toast.parentNode.removeChild(toast);
                            }
                        }, 300);
                    }, 2000);
                }
            }).catch(err => {
                console.error('复制失败:', err);
                if (window.contextMenuManager && window.contextMenuManager.showToast) {
                    window.contextMenuManager.showToast('复制链接失败', 'error');
                }
            });
        });
        
        // 移除标题本身的点击复制功能，只保留链接图标的点击功能
        // 使标题可以正常选择文本，不会意外触发复制
        heading.classList.add('group'); // 添加group类以支持悬停显示链接图标
        
        // 注释掉原来的标题点击事件
        // heading.style.cursor = 'pointer';
        // heading.addEventListener('click', (e) => {
        //     // 只在没有选中文本的情况下触发
        //     if (window.getSelection().toString() === '') {
        //         copyButton.click();
        //     }
        // });
        
        // 将按钮添加到标题
        heading.appendChild(copyButton);
    });
}

// ===== 导出函数列表 =====
export {
    createArticleLoader,
    replaceLoaderWithContent,
    addArticleRenderAnimation,
    addCacheStatusIndicator,
    renderDocument,
    preProcessMathContent,
    processBlockMath,
    fixExternalLinks,
    fixExternalImageLinks,
    fixInternalLinks,
    syncDarkMode,
    generateTocFromIframe,
    updateIframeTocHighlight,
    processAdmonitions,
    getDefaultColor,
    enhanceHeadings
}; 