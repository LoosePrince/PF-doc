/**
 * 文档页面交互逻辑
 */
import config from '/config.js';
import { initializeMermaid, processMermaidDiagrams } from './mermaid-handler.js';
import { processKaTeXFormulas } from './katex-handler.js';
import documentCache from './document-cache.js';
import { initCacheManager } from './cache-manager.js';
import { initContextMenu } from './context-menu.js';
import { 
    createProgressBar, 
    createReadingProgressBar, 
    updateReadingProgress, 
    showProgressBar, 
    updateProgressBar, 
    hideProgressBar 
} from './progress-bar.js';
import { 
    createEnhancedImageModal, 
    setupImageModalEvents, 
    showEnhancedImageModal 
} from './image-modal.js';
import {
    initSundryModule,
    highlightSearchTerms,
    setupHeadingIntersectionObserver,
    showSearchSummary,
    findDocInfoByPath,
    updateGitInfo,
    hideGitInfoElements,
    generateBreadcrumb
} from './sundry.js';
import {
    initContentRenderer,
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
} from './content-renderer.js';
import {
    initSidebarNavigation,
    generateSidebar,
    handleFolderExpandMode,
    expandAllFolders,
    findNodeByPath,
    getFolderPathFromIndexPath,
    createNavList,
    createNavLink,
    navigateToFolderIndex,
    toggleFolder,
    applyFreshStaggerAnimation,
    setActiveLink,
    expandParentFolders,
    highlightCurrentDocument,
    updateBackToFullDirectoryLink,
    collapseAllFolders,
    highlightParentFolders,
    scrollSidebarToActiveItem,
    generateToc,
    expandChildHeadings,
    ensureParentHeadingChildrenVisible,
    updateActiveHeading,
    handleTocScrollHighlight,
    scrollTocToActiveItem,
    showSidebarLoading,
    showTocLoading,
    fadeOutLoadingAndShowContent,
    addStaggerAnimation,
    generateSkeletonItems,
    generateTocSkeletonItems
} from './sidebar-navigation.js';
import {
    initUtils,
    filePathToUrl,
    resolvePathFromData,
    findDirectoryIndexPath,
    parseUrlPath,
    generateNewUrl,
    isIndexFile,
    hasSupportedExtension,
    getTitleFromPath,
    findIndexPath,
    getAllDocumentLinks,
    isDarkMode,
    updatePageTitle,
    formatTimestamp,
    handleUrlHash,
    addHeadingStyles,
    setupLegacyHeadingLinks,
    setupTocResizer,
    debounce
} from './utils.js';

let pathData = null; // 存储文档结构数据
let currentRoot = null; // 当前根目录
let isLoadingDocument = false; // 是否正在加载文档

document.addEventListener('DOMContentLoaded', async () => {
    // 初始化Mermaid
    initializeMermaid();
    
    // 应用布局配置
    applyLayoutConfig();
    
    // 设置侧边栏粘连控制
    setupStickyBars();
    
    // 创建顶部进度条
    createProgressBar();
    
    // 添加阅读进度条
    createReadingProgressBar();
    
    // 加载文档结构
    try {
        const response = await fetch('/path.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        pathData = await response.json();
        
        // 初始化sundry模块
        const { path: currentPath, root } = parseUrlPath();
        currentRoot = root;
        
        // 初始化工具模块
        initUtils(pathData, currentRoot);
        
        initSundryModule(pathData, currentRoot, updateActiveHeading);
        
        // 初始化侧边栏导航模块
        initSidebarNavigation(pathData, currentRoot, {
            parseUrlPath,
            generateNewUrl,
            loadContentFromUrl,
            loadDocument,
            resolvePathFromData,
            isIndexFile,
            debounce,
            getAllDocumentLinks,
            generatePrevNextNavigation,
            updatePageTitle,
            generateBreadcrumb,
            updateGitInfo,
            setupHeadingIntersectionObserver,
            updateReadingProgress,
            createEnhancedImageModal,
            showEnhancedImageModal,
            isDarkMode,
            filePathToUrl,
            initUtils,
            initSundryModule,
            updateActiveHeading,
            handleUrlHash
        });
        
        // 初始化content-renderer模块
        initContentRenderer(pathData, currentRoot, {
            generateToc,
            updateActiveHeading,
            getAllDocumentLinks,
            generateNewUrl,
            debounce,
            isDarkMode,
            parseUrlPath,
            scrollTocToActiveItem,
            ensureParentHeadingChildrenVisible,
            expandChildHeadings,
            generatePrevNextNavigation,
            showTocLoading,
            fadeOutLoadingAndShowContent,
            updatePageTitle,
            generateBreadcrumb,
            updateGitInfo,
            setupHeadingIntersectionObserver,
            updateReadingProgress,
            createEnhancedImageModal,
            showEnhancedImageModal
        });
        
        // **移除**: 不再在页面加载时自动预加载
        // documentCache.autoPreloadDocuments(pathData, 5);
    } catch (error) {
        console.error("加载 path.json 失败:", error);
        document.getElementById('sidebar-nav').innerHTML = '<p class="text-red-500">加载文档结构失败!</p>';
        document.getElementById('document-content').innerHTML = '<p class="text-red-500">加载文档结构失败!</p>';
        return;
    }
    
    // 生成侧边栏
    generateSidebar(pathData);
    
    // 监听URL变化（使用popstate替代hashchange）
    window.addEventListener('popstate', loadContentFromUrl);
    
    // 全局事件监听，确保所有内部链接都使用无刷新导航
    document.addEventListener('click', (e) => {
        // 查找最近的a标签
        const link = e.target.closest('a');
        
        // 如果是站内链接（相同域名）
        if (link && link.href && link.href.startsWith(window.location.origin)) {
            const linkUrl = new URL(link.href);
            
            // 如果链接是同一页面的导航
            if (linkUrl.pathname === window.location.pathname) {
                e.preventDefault();
                
                // 使用新的URL解析函数比较路径
                const currentParsed = parseUrlPath();
                
                // 临时修改location来解析目标URL
                const originalHref = window.location.href;
                window.history.replaceState(null, '', link.href);
                const targetParsed = parseUrlPath();
                window.history.replaceState(null, '', originalHref);
                
                // 比较路径和根目录是否相同
                const isSamePath = currentParsed.path === targetParsed.path && 
                                 currentParsed.root === targetParsed.root;
                
                // 如果路径相同，且没有锚点，则无需重新加载
                if (isSamePath && !targetParsed.anchor) {
                    console.log('已经在当前文档，无需重新加载');
                    return;
                }
                
                // 使用pushState更新URL
                window.history.pushState({path: targetParsed.path}, '', link.href);
                
                // 手动触发内容加载
                loadContentFromUrl();
            }
        }
    });
    
    // 初始加载内容
    loadContentFromUrl();
    
    // 添加浏览器原生hash变化处理，用于处理浏览器中使用后退按钮等操作导致的hash变化
    window.addEventListener('hashchange', function(e) {
        // hash变化时，需要重新加载内容（可能涉及root参数变化）
        loadContentFromUrl();
    });

    // 设置目录宽度调整功能
    setupTocResizer();
    
    // 添加标题链接样式
    addHeadingStyles();
    
    // 设置对旧式heading-x链接的支持
    setupLegacyHeadingLinks();
    
    // 初始化缓存管理模块
    initCacheManager();
    
    // 初始化右键菜单模块
    initContextMenu();
});



// 应用布局配置
function applyLayoutConfig() {
    const root = document.documentElement;
    root.style.setProperty('--sidebar-width', config.layout.sidebar_width);
    root.style.setProperty('--toc-width', config.layout.toc_width);
    
    const sidebar = document.getElementById('sidebar-container');
    const toc = document.getElementById('toc-container');
    const mainContent = document.getElementById('main-content-area');
    const layoutContainer = document.querySelector('.main-layout');
    
    // 更新媒体查询断点
    updateMediaQueryBreakpoint();
    
    // 添加移动端菜单按钮
    setupMobileMenu();
    
    // 返回顶部按钮配置
    const backToTopButton = document.getElementById('back-to-top');
    if (!config.navigation.back_to_top && backToTopButton) {
        backToTopButton.remove();
    }
}

// 更新媒体查询断点
function updateMediaQueryBreakpoint() {
    // 判断值是否相同
    if (config.layout.mobile_breakpoint === '768px') {
        return;
    }
    // 获取所有样式表
    const styleSheets = document.styleSheets;
    const mobileBreakpoint = config.layout.mobile_breakpoint;
    
    // 遍历所有样式表
    for (let i = 0; i < styleSheets.length; i++) {
        const styleSheet = styleSheets[i];
        
        try {
            // 获取所有CSS规则
            const cssRules = styleSheet.cssRules || styleSheet.rules;
            if (!cssRules) continue;
            
            // 遍历所有规则
            for (let j = 0; j < cssRules.length; j++) {
                const rule = cssRules[j];
                
                // 检查是否是媒体查询规则
                if (rule instanceof CSSMediaRule) {
                    const mediaText = rule.conditionText || rule.media.mediaText;
                    
                    // 检查是否包含 max-width: 768px
                    if (mediaText.includes('max-width: 768px')) {
                        // 删除旧的媒体查询规则
                        styleSheet.deleteRule(j);
                        
                        // 创建新的媒体查询文本
                        const newMediaText = mediaText.replace('768px', mobileBreakpoint);
                        
                        // 获取原规则的CSS文本
                        let cssText = '';
                        for (let k = 0; k < rule.cssRules.length; k++) {
                            cssText += rule.cssRules[k].cssText;
                        }
                        
                        // 插入新的媒体查询规则
                        styleSheet.insertRule(`@media ${newMediaText} { ${cssText} }`, j);
                        
                        // 由于删除和插入操作会影响索引，需要调整j
                        j--;
                    }
                }
            }
        } catch (error) {
            // 跨域样式表会抛出安全错误，忽略它们
            continue;
        }
    }
}

// 设置侧边栏粘连控制，确保不会覆盖底栏
function setupStickyBars() {
    const sidebarContainer = document.getElementById('sidebar-container');
    const tocContainer = document.getElementById('toc-container');
    const mainContent = document.getElementById('main-content-area');
    const mainLayout = document.querySelector('.main-layout');
    
    // 如果元素不存在，直接返回
    if (!sidebarContainer || !tocContainer || !mainContent || !mainLayout) {
        return;
    }
    
    // 滚动事件处理函数
    function handleScroll() {
        // 检查当前屏幕宽度，如果是移动设备则不应用粘连效果
        const isMobile = window.innerWidth <= parseInt(config.layout.mobile_breakpoint);
        if (isMobile) return;
        
        // 获取主内容区位置和尺寸
        const mainRect = mainContent.getBoundingClientRect();
        const mainBottom = mainRect.bottom;
        const mainHeight = mainContent.offsetHeight;
        
        // 获取主布局位置和尺寸
        const layoutRect = mainLayout.getBoundingClientRect();
        const layoutTop = layoutRect.top;
        
        // 获取侧边栏的高度
        const sidebarHeight = sidebarContainer.offsetHeight;
        const tocHeight = tocContainer.offsetHeight;
        
        // 获取窗口高度
        const windowHeight = window.innerHeight;
        
        // 计算侧边栏底部相对于视口的位置
        const sidebarContainerBottom = 20 + sidebarHeight; // 顶部margin(20px) + 侧边栏高度
        const tocContainerBottom = 20 + tocHeight;
        
        // 如果主内容区底部已进入视口且低于侧边栏底部
        if (mainBottom < windowHeight && sidebarContainerBottom > mainBottom) {
            // 调整侧边栏，使其底部对齐主内容区底部
            
            // 计算侧边栏应该的top值
            // 主内容区底部位置 - 侧边栏高度 
            const sidebarTop = mainBottom - sidebarHeight;
            const tocTop = mainBottom - tocHeight;
            
            if (sidebarTop > 20) { // 确保不高于粘连起始位置
                sidebarContainer.style.position = 'fixed';
                sidebarContainer.style.top = `${sidebarTop}px`;
                sidebarContainer.style.bottom = 'auto';
            }
            
            if (tocTop > 20) { // 确保不高于粘连起始位置
                tocContainer.style.position = 'fixed';
                tocContainer.style.top = `${tocTop}px`;
                tocContainer.style.bottom = 'auto';
            }
        } else {
            // 恢复粘性定位
            sidebarContainer.style.position = 'sticky';
            tocContainer.style.position = 'sticky';
            sidebarContainer.style.top = '20px';
            tocContainer.style.top = '20px';
            sidebarContainer.style.bottom = 'auto';
            tocContainer.style.bottom = 'auto';
        }
    }
    
    // 使用 ResizeObserver 监听主内容高度变化
    const resizeObserver = new ResizeObserver(debounce(() => {
        handleScroll();
    }, 100));
    
    // 监听主内容区域大小变化
    resizeObserver.observe(mainContent);
    
    // 监听滚动事件，使用防抖处理
    window.addEventListener('scroll', debounce(handleScroll, 10));
    
    // 监听窗口大小变化，适应响应式布局
    window.addEventListener('resize', debounce(handleScroll, 200));
    
    // 初始执行一次
    setTimeout(handleScroll, 200); // 延迟执行以确保布局已完成
}

// 设置移动端菜单
function setupMobileMenu() {
    // 检查是否已经存在菜单按钮
    if (document.getElementById('mobile-menu-toggle')) {
        return;
    }
    
    // 创建移动端左侧菜单按钮（文档树）
    const menuButton = document.createElement('button');
    menuButton.id = 'mobile-menu-toggle';
    menuButton.className = 'fixed z-50 bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-2 rounded-md shadow-md';
    menuButton.innerHTML = '<i class="fas fa-bars text-xl"></i>';
    document.body.appendChild(menuButton);
    
    // 创建移动端右侧目录按钮（TOC）
    const tocButton = document.createElement('button');
    tocButton.id = 'toc-toggle';
    tocButton.className = 'md:hidden';
    tocButton.innerHTML = '<i class="fas fa-list-ul"></i>';
    document.body.appendChild(tocButton);
    
    // 创建遮罩层
    const backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
    
    const sidebar = document.getElementById('sidebar-container');
    const tocContainer = document.getElementById('toc-container');
    
    // 确保侧边栏的初始状态是正确的
    sidebar.classList.remove('active');
    tocContainer.classList.remove('active');
    
    // 左侧菜单按钮点击事件
    menuButton.addEventListener('click', () => {
        // 如果右侧目录是打开的，先关闭它
        tocContainer.classList.remove('active');
        
        // 切换左侧菜单
        sidebar.classList.toggle('active');
        backdrop.classList.toggle('active');
    });
    
    // 右侧目录按钮点击事件
    tocButton.addEventListener('click', () => {
        // 如果左侧菜单是打开的，先关闭它
        sidebar.classList.remove('active');
        menuButton.querySelector('i').className = 'fas fa-bars text-xl';
        
        // 切换右侧目录
        tocContainer.classList.toggle('active');
        backdrop.classList.toggle('active');
    });
    
    // 点击遮罩层关闭所有菜单
    backdrop.addEventListener('click', () => {
        sidebar.classList.remove('active');
        tocContainer.classList.remove('active');
        backdrop.classList.remove('active');
        menuButton.querySelector('i').className = 'fas fa-bars text-xl';
    });
}

// 从URL加载内容
async function loadContentFromUrl() {
    // 使用新的URL解析函数获取当前URL信息
    const { path: initialPath, root, anchor } = parseUrlPath();
    

    
    // 如果已经在加载中，检查是否是root参数变化的情况
    if (isLoadingDocument) {
        // 如果root参数发生变化，需要强制重新生成侧边栏
        if (root !== currentRoot) {
            
            // 更新currentRoot
            currentRoot = root;
            
            // 更新工具模块中的currentRoot
            initUtils(pathData, currentRoot);
            
            // 重新初始化侧边栏导航模块
            initSidebarNavigation(pathData, currentRoot, {
                parseUrlPath,
                generateNewUrl,
                loadContentFromUrl,
                loadDocument,
                resolvePathFromData,
                isIndexFile,
                debounce,
                getAllDocumentLinks,
                generatePrevNextNavigation,
                updatePageTitle,
                generateBreadcrumb,
                updateGitInfo,
                setupHeadingIntersectionObserver,
                updateReadingProgress,
                createEnhancedImageModal,
                showEnhancedImageModal,
                isDarkMode,
                filePathToUrl,
                initUtils,
                initSundryModule,
                updateActiveHeading,
                handleUrlHash
            });
            
            // 重新生成侧边栏
            generateSidebar(pathData);
            
            // 重新初始化sundry模块（面包屑等）
            initSundryModule(pathData, currentRoot, updateActiveHeading);
            
            // 高亮当前文档（增加更长的延迟确保侧边栏完全生成）
            setTimeout(() => {
                highlightCurrentDocument();
            }, 500);
        }
        // console.log('文档正在加载中，跳过重复加载请求');
        return;
    }
    let path = initialPath; // 使用let，因为可能需要修改
    
    // 如果有root参数且path不为空，需要检查是否需要转换为完整路径
    if (root && path && !path.startsWith(root + '/')) {
        // 将相对路径转换为完整路径
        path = root + '/' + path;
    }
    
    // 根据path.json解析实际的文件路径
    if (path) {
        const { actualPath } = resolvePathFromData(path);
        if (actualPath && actualPath !== path) {
            path = actualPath;
        }
    }
    
    // 获取搜索参数（从旧的查询参数中获取，保持兼容性）
    const url = new URL(window.location.href);
    const searchQuery = url.searchParams.get('search');
    const searchOccurrence = url.searchParams.get('occurrence');
    
    // 如果root参数更改或从无到有，需要重新生成侧边栏（正常情况下的处理）
    if (root !== currentRoot) {
        currentRoot = root;
        
        // 更新工具模块中的currentRoot
        initUtils(pathData, currentRoot);
        
        // 重新初始化侧边栏导航模块
        initSidebarNavigation(pathData, currentRoot, {
            parseUrlPath,
            generateNewUrl,
            loadContentFromUrl,
            loadDocument,
            resolvePathFromData,
            isIndexFile,
            debounce,
            getAllDocumentLinks,
            generatePrevNextNavigation,
            updatePageTitle,
            generateBreadcrumb,
            updateGitInfo,
            setupHeadingIntersectionObserver,
            updateReadingProgress,
            createEnhancedImageModal,
            showEnhancedImageModal,
            isDarkMode,
            filePathToUrl,
            initUtils,
            initSundryModule,
            updateActiveHeading,
            handleUrlHash
        });
        
        // 重新生成侧边栏
        generateSidebar(pathData);
        
        // 重新初始化sundry模块（面包屑等）
        initSundryModule(pathData, currentRoot, updateActiveHeading);
    }
    
    // 处理默认页面或目录索引页
    if (!path) {
        // 如果没有指定页面，但有root参数，则加载root目录下的README.md
        if (currentRoot) {
            // 尝试查找root目录下的索引文件
            const rootDirNode = findNodeByPath(pathData, currentRoot);
            if (rootDirNode && rootDirNode.index) {
                path = rootDirNode.index.path;
            } else {
                // 如果没有找到索引文件，构造一个可能的路径 (不常用，但作为后备)
                for (const indexName of config.document.index_pages) {
                    const possiblePath = `${currentRoot}/${indexName}`;
                    path = possiblePath; // 暂时使用第一个可能的索引页
                    break;
                }
            }
        } else {
            // 没有root参数，加载根目录的索引页
            path = pathData?.index?.path || config.document.default_page;
        }
        
        // 更新URL以反映实际加载的路径 (如果path被修改了)
        if (path && initialPath !== path) {
            const newUrl = generateNewUrl(path, currentRoot);
            window.history.replaceState({ path: path }, '', newUrl);
        }
        
    } else {
        // 支持省略文件扩展名，检查路径是否为目录
        const hasExtension = hasSupportedExtension(path);
        if (!hasExtension) {
            // 尝试在目录后面添加索引文件
            const indexPath = findDirectoryIndexPath(path);
            if (indexPath) {
                // 如果找到了索引页，更新实际加载的路径，但保持URL中的文件夹路径
                // 不更新URL，保持显示文件夹路径
                const originalPath = path; // 保存原始的文件夹路径
                path = indexPath; // 用于加载内容
                // 不调用 window.history.replaceState，保持URL显示为文件夹路径
            }
        }
    }
    
    // 如果经过上述处理后仍然没有有效的路径，则显示欢迎信息
    if (!path) {
        document.getElementById('document-content').innerHTML = `
            <h1 class="text-2xl mb-4">欢迎</h1>
            <p class="mb-4">请从左侧导航栏选择一个文档开始浏览。</p>
        `;
        document.getElementById('breadcrumb-container').innerHTML = `
            <i class="fas fa-home mr-2 text-primary"></i>
            <span>首页</span>
        `;
        document.getElementById('toc-nav').innerHTML = '<p class="text-gray-400 text-sm">暂无目录</p>';
        document.title = `${config.site.name} - ${config.site.title}`;
        return; // 结束执行
    }
    
    // 使用 decodeURIComponent 处理最终路径
    const decodedPath = decodeURIComponent(path);
    
    try {
        // 显示进度条
        showProgressBar();
        
        // 标记加载状态
        isLoadingDocument = true;
        
        // 更新进度到50%
        setTimeout(() => {
            updateProgressBar(50);
        }, 2000);
        
        // 高亮侧边栏逻辑将在侧边栏生成完成后执行
        
        // 更新进度到70%
        setTimeout(() => {
            updateProgressBar(70);
        }, 4000);
        
        // 加载文档 - 添加重试逻辑，特别是针对Cloudflare环境
        let loadSuccess = false;
        let loadAttempt = 0;
        const maxAttempts = 2; // 最大重试次数
        
        while (!loadSuccess && loadAttempt < maxAttempts) {
            try {
                loadAttempt++;
                // 如果这是重试，添加一个小延迟
                if (loadAttempt > 1) {
                    console.log(`重试加载文档 (尝试 ${loadAttempt}/${maxAttempts}): ${decodedPath}`);
                    await new Promise(resolve => setTimeout(resolve, 500)); // 延迟500ms
                }
                
                await loadDocument(decodedPath);
                loadSuccess = true;
            } catch (err) {
                console.error(`文档加载失败 (尝试 ${loadAttempt}/${maxAttempts}):`, err);
                
                // 如果是最后一次尝试，尝试其他可能的方案
                if (loadAttempt >= maxAttempts) {
                    // 情况1: 如果是README.md文件，尝试访问其所在目录
                    if (decodedPath.toLowerCase().endsWith('readme.md') && decodedPath.includes('/')) {
                        try {
                            // 尝试使用大写的README.md
                            const folderPath = decodedPath.substring(0, decodedPath.lastIndexOf('/'));
                            const readmePath = `${folderPath}/README.md`;
                            if (readmePath !== decodedPath) { // 避免重复尝试相同路径
                                console.log(`尝试使用大写的README.md路径: ${readmePath}`);
                                await loadDocument(readmePath);
                                loadSuccess = true;
                            } else {
                                // 如果已经是大写，尝试使用其他索引文件名
                                for (const indexName of config.document.index_pages) {
                                    if (indexName.toLowerCase() !== 'readme.md') {
                                        const altPath = `${folderPath}/${indexName}`;
                                        console.log(`尝试使用备选索引文件: ${altPath}`);
                                        try {
                                            await loadDocument(altPath);
                                            loadSuccess = true;
                                            break;
                                        } catch (altErr) {
                                            console.warn(`备选索引文件加载失败: ${altPath}`);
                                        }
                                    }
                                }
                            }
                        } catch (finalErr) {
                            // 继续向上抛出错误前，尝试加载目录本身
                            try {
                                const folderPath = decodedPath.substring(0, decodedPath.lastIndexOf('/'));
                                if (folderPath) {
                                    console.log(`尝试加载目录: ${folderPath}`);
                                    await loadDocument(folderPath);
                                    loadSuccess = true;
                                }
                            } catch (dirErr) {
                                throw err; // 使用原始错误
                            }
                        }
                    } 
                    // 情况2: 如果是目录路径（无扩展名），尝试添加README.md或查找索引页
                    else if (!decodedPath.includes('.')) {
                        let tried = false;
                        
                        // 尝试各种索引文件名
                        for (const indexName of config.document.index_pages) {
                            try {
                                tried = true;
                                const indexPath = `${decodedPath}/${indexName}`;
                                console.log(`尝试目录索引文件: ${indexPath}`);
                                await loadDocument(indexPath);
                                loadSuccess = true;
                                break;
                            } catch (indexErr) {
                                console.warn(`索引文件加载失败: ${decodedPath}/${indexName}`);
                            }
                        }
                        
                        if (!tried || !loadSuccess) {
                            throw err; // 所有尝试都失败，使用原始错误
                        }
                    } else {
                        throw err; // 其他情况，直接抛出错误
                    }
                }
            }
        }
        
        // 处理搜索高亮和跳转
        if (searchQuery) {
            setTimeout(() => {
                highlightSearchTerms(searchQuery, searchOccurrence);
            }, 500); // 等待文档渲染完成
        }
        
        // 锚点滚动已经在loadDocument中处理，此处无需重复处理
        
        // 更新左侧目录的选中状态
        setTimeout(() => {
            highlightCurrentDocument();
        }, 100); // 等待DOM更新完成
        
        // 完成加载，隐藏进度条
        hideProgressBar();
    } catch (error) {
        console.error('加载内容出错:', error);
        hideProgressBar();
    } finally {
        // 重置加载状态
        isLoadingDocument = false;
    }
}



// 将loadContentFromUrl函数导出到window对象
window.loadContentFromUrl = loadContentFromUrl;

// 加载并渲染文档
async function loadDocument(relativePath) {
    // 如果路径没有支持的扩展名，尝试从path.json中解析实际路径
    if (relativePath && !hasSupportedExtension(relativePath)) {
        const { actualPath } = resolvePathFromData(relativePath);
        if (actualPath && actualPath !== relativePath) {
            relativePath = actualPath;
        }
    }
    
    const contentDiv = document.getElementById('document-content');
    const tocNav = document.getElementById('toc-nav');
    tocNav.innerHTML = '<p class="text-gray-400 text-sm">暂无目录</p>';
    
    // 创建文章加载动画（如果启用）
    if (config.animation?.article?.enable_skeleton !== false) {
        const articleLoader = createArticleLoader();
        contentDiv.innerHTML = '';
        contentDiv.appendChild(articleLoader);
    } else {
        // 如果未启用骨架屏，显示简单的加载文本
        contentDiv.innerHTML = '<div class="text-center py-8 text-gray-500">正在加载文档...</div>';
    }
    
    // 添加底部加载指示器
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'fixed bottom-4 left-4 z-40 bg-white dark:bg-gray-800 shadow-md rounded-lg p-2 text-sm transition-all duration-300';
    loadingIndicator.innerHTML = '<p class="text-gray-600 dark:text-gray-300 flex items-center"><i class="fas fa-spinner fa-spin mr-2"></i>正在加载文档...</p>';
    document.body.appendChild(loadingIndicator);
    
    // 构建完整的获取路径，正确处理相对路径和绝对路径
    let fetchPath;
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
        // 如果已经是完整URL，直接使用
        fetchPath = relativePath;
    } else {
        // 如果是相对路径，拼接上根目录
        // 确保路径中不会有双斜杠
        const rootDir = config.document.root_dir.replace(/\/$/, '');
        const cleanPath = relativePath.replace(/^\//, '');
        fetchPath = `${rootDir}/${cleanPath}`;
    }
    
    let successfullyLoaded = false; // 标记是否成功加载了内容
    
    // 从新格式URL中正确获取锚点
    const { anchor } = parseUrlPath();
    const currentHash = anchor ? `#${decodeURIComponent(anchor)}` : '';
    
    // 首先检查缓存中是否有该文档
    const cachedContent = documentCache.get(relativePath);
    if (cachedContent) {
        // console.log(`从缓存加载文档: ${relativePath}`);
        updateProgressBar(90);
        // 移除加载动画并渲染文档
        await replaceLoaderWithContent(contentDiv, () => renderDocument(relativePath, cachedContent, contentDiv, tocNav));
        successfullyLoaded = true;

        // 根据缓存开关状态和实际缓存情况显示状态
        if (documentCache.disableCache && documentCache.disablePreload) {
            addCacheStatusIndicator(contentDiv, 'not-enabled');
        } else {
            const isPreloaded = documentCache.isPreloaded(relativePath);
            const isCached = documentCache.isCached(relativePath);
            if (isPreloaded && !documentCache.disablePreload) {
                addCacheStatusIndicator(contentDiv, 'preloaded');
            } else if (isCached && !documentCache.disableCache) {
                addCacheStatusIndicator(contentDiv, 'cached');
            }
        }
        
    } else {
        // 不在缓存中，从网络获取
        try {
            updateProgressBar(60);
            // 添加防止缓存的随机参数，解决Cloudflare环境下的缓存问题
            // 确保URL使用与当前页面相同的协议（http/https）
            let fetchUrl = `${fetchPath}?_t=${Date.now()}`;
            
            // 检查是否是绝对URL，如果是则确保协议与当前页面一致
            if (fetchUrl.startsWith('http://') && window.location.protocol === 'https:') {
                fetchUrl = fetchUrl.replace('http://', 'https://');
                console.log(`已将请求URL从HTTP转换为HTTPS: ${fetchUrl}`);
            }
            
            const response = await fetch(fetchUrl, {
                method: 'GET',
                cache: 'no-store', // 显式禁用缓存
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });
            
            updateProgressBar(70);
            if (!response.ok) {
                // 详细记录错误信息
                console.error(`文档加载失败: 状态码=${response.status}, 状态文本=${response.statusText}, URL=${fetchUrl}, 相对路径=${relativePath}`);
                throw new Error(`无法加载文档: ${response.statusText} (路径: ${relativePath})`);
            }
            
            updateProgressBar(80);
            const content = await response.text();
            
            // 检查内容是否为空（可能是CDN返回了错误页面但状态码是200）
            if (!content) {
                console.error(`文档内容为空: URL=${fetchUrl}, 相对路径=${relativePath}`);
                throw new Error(`文档内容为空 (路径: ${relativePath})`);
            }
            
            // 内容非常短时只记录警告，但不阻止渲染
            if (content.trim().length < 10) {
                console.warn(`文档内容很短: URL=${fetchUrl}, 相对路径=${relativePath}, 内容长度=${content.length}`);
            }
            
            documentCache.set(relativePath, content); // 添加到持久缓存
            
            updateProgressBar(90);
            // 移除加载动画并渲染文档
            await replaceLoaderWithContent(contentDiv, () => renderDocument(relativePath, content, contentDiv, tocNav));
            successfullyLoaded = true;
            
            // 根据缓存开关状态显示状态
            if (documentCache.disableCache && documentCache.disablePreload) {
                addCacheStatusIndicator(contentDiv, 'not-enabled');
            } else if (!documentCache.disableCache) {
                addCacheStatusIndicator(contentDiv, 'cached');
            }

        } catch (error) {
            console.error("加载文档失败:", error);
            // 移除加载动画并显示错误信息
            const loader = contentDiv.querySelector('.article-loader');
            if (loader) {
                loader.style.transition = 'opacity 0.3s ease-out';
                loader.style.opacity = '0';
                setTimeout(() => {
                    contentDiv.innerHTML = `<p class="text-red-500">加载文档失败: ${error.message}</p>`;
                }, 300);
            } else {
                contentDiv.innerHTML = `<p class="text-red-500">加载文档失败: ${error.message}</p>`;
            }
            successfullyLoaded = false;
        }
    }

    // 移除加载指示器（添加淡出效果）
    loadingIndicator.style.opacity = '0';
    setTimeout(() => {
        if (loadingIndicator.parentNode) {
            loadingIndicator.remove();
        }
    }, 300);
    
    // 如果成功加载，触发自动预加载和更新侧边栏链接
    if (successfullyLoaded) {
        // 更新"返回完整目录"链接
        setTimeout(() => {
            updateBackToFullDirectoryLink();
        }, 100);
        
        setTimeout(() => {
            // **修改**: 调用新的自动预加载逻辑
            documentCache.autoPreloadDocuments(relativePath, pathData, 3);
        }, 1000);
    }

    // 如果URL中有hash，处理滚动到指定位置
    if (currentHash && currentHash.length > 1) {
        setTimeout(() => {
            handleUrlHash(currentHash);
        }, 800); // 增加延迟时间，确保文档完全渲染完成
    } else {
        // 没有hash时滚动到页面顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// 生成上一篇/下一篇导航
function generatePrevNextNavigation(currentPath) {
    const contentDiv = document.getElementById('document-content');
    
    // 移除现有的导航（如果有）
    const existingNav = document.getElementById('prev-next-navigation');
    if (existingNav) {
        existingNav.remove();
    }
    
    // 获取所有文档链接
    const allLinks = getAllDocumentLinks();
    
    // 找到当前文档的索引
    const currentIndex = allLinks.findIndex(link => link.path === currentPath);
    if (currentIndex === -1) return; // 未找到当前文档
    
    // 创建导航容器
    const navContainer = document.createElement('div');
    navContainer.id = 'prev-next-navigation';
    navContainer.className = 'mt-16 pt-8 border-t border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:justify-between';
    
    // 辅助函数：判断路径是否属于当前root
    const getAppropriateRoot = (targetPath) => {
        if (!currentRoot) return null;
        // 如果目标路径以当前root开头，则使用当前root
        if (targetPath && targetPath.startsWith(currentRoot + '/')) {
            return currentRoot;
        }
        // 否则不使用root，生成绝对路径
        return null;
    };

    // 上一篇
    if (currentIndex > 0) {
        const prevLink = allLinks[currentIndex - 1];
        const prevDiv = document.createElement('div');
        prevDiv.className = 'text-left';
        
        // 根据目标路径判断是否使用当前root
        const prevRoot = getAppropriateRoot(prevLink.path);
        const prevUrl = generateNewUrl(prevLink.path, prevRoot);
        
        prevDiv.innerHTML = `
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">上一篇</p>
            <a href="${prevUrl}" class="text-primary hover:underline flex items-center">
                <i class="fas fa-arrow-left mr-2"></i>
                ${prevLink.title}
            </a>
        `;
        navContainer.appendChild(prevDiv);
    } else {
        // 占位，保持布局
        const emptyDiv = document.createElement('div');
        navContainer.appendChild(emptyDiv);
    }
    
    // 下一篇
    if (currentIndex < allLinks.length - 1) {
        const nextLink = allLinks[currentIndex + 1];
        const nextDiv = document.createElement('div');
        nextDiv.className = 'text-right';
        
        // 根据目标路径判断是否使用当前root
        const nextRoot = getAppropriateRoot(nextLink.path);
        const nextUrl = generateNewUrl(nextLink.path, nextRoot);
        
        nextDiv.innerHTML = `
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">下一篇</p>
            <a href="${nextUrl}" class="text-primary hover:underline flex items-center justify-end">
                ${nextLink.title}
                <i class="fas fa-arrow-right ml-2"></i>
            </a>
        `;
        navContainer.appendChild(nextDiv);
    } else {
        // 占位，保持布局
        const emptyDiv = document.createElement('div');
        navContainer.appendChild(emptyDiv);
    }
    
    // 添加到文档底部
    contentDiv.appendChild(navContainer);
}

// 在mdContentLoaded事件监听器中添加处理调用
document.addEventListener('mdContentLoaded', function(event) {
    // 处理数学公式
    processKaTeXFormulas();
    
    // 处理Mermaid图表
    processMermaidDiagrams();
}); 

// 导出函数供其他模块使用
window.loadContentFromUrl = loadContentFromUrl;