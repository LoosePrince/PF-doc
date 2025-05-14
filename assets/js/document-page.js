/**
 * 文档页面交互逻辑
 */
import config from '../../config.js';
import { initializeMermaid, processMermaidDiagrams } from './mermaid-handler.js';
import { processKaTeXFormulas } from './katex-handler.js';
import documentCache from './document-cache.js';

let pathData = null; // 存储文档结构数据
let currentRoot = null; // 当前根目录
let isLoadingDocument = false; // 是否正在加载文档
let progressBar = null; // 进度条元素

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
        const response = await fetch('path.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        pathData = await response.json();
        
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
            const url = new URL(link.href);
            
            // 如果链接是导航路径查询参数
            if (url.pathname === window.location.pathname) {
                e.preventDefault();
                const path = url.searchParams.get('path') || '';
                
                // 使用pushState更新URL，而不是直接改变location
                window.history.pushState({path}, '', link.href);
                
                // 手动触发内容加载
                loadContentFromUrl();
            }
        }
    });
    
    // 初始加载内容
    loadContentFromUrl();
    
    // 添加浏览器原生hash变化处理，用于处理浏览器中使用后退按钮等操作导致的hash变化
    window.addEventListener('hashchange', function(e) {
        // 获取新的哈希值
        const newHash = window.location.hash;
        if (newHash && newHash.length > 1) {
            // 处理哈希变化
            handleUrlHash(newHash);
        }
    });

    // 设置目录宽度调整功能
    setupTocResizer();
});

// 创建顶部进度条
function createProgressBar() {
    // 创建进度条容器
    progressBar = document.createElement('div');
    progressBar.id = 'top-progress-bar';
    progressBar.className = 'fixed top-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 z-50 hidden';
    
    // 创建进度条内部填充
    const progressFill = document.createElement('div');
    progressFill.id = 'progress-fill';
    progressFill.className = 'h-full bg-primary transition-all duration-300 ease-out';
    progressFill.style.width = '0%';
    
    // 组装进度条
    progressBar.appendChild(progressFill);
    document.body.appendChild(progressBar);
}

// 创建阅读进度条
function createReadingProgressBar() {
    // 创建进度条容器
    const readingProgressBar = document.createElement('div');
    readingProgressBar.id = 'reading-progress-bar';
    readingProgressBar.className = 'fixed top-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 z-40';
    
    // 创建进度条内部填充
    const progressFill = document.createElement('div');
    progressFill.id = 'reading-progress-fill';
    progressFill.className = 'h-full bg-primary transition-all duration-100 ease-out';
    progressFill.style.width = '0%';
    
    // 组装进度条
    readingProgressBar.appendChild(progressFill);
    document.body.appendChild(readingProgressBar);
    
    // 添加滚动监听器
    window.addEventListener('scroll', updateReadingProgress);
    
    // 初始更新一次进度
    setTimeout(updateReadingProgress, 500);
}

// 更新阅读进度
function updateReadingProgress() {
    const contentDiv = document.getElementById('document-content');
    if (!contentDiv) return;

    // 获取文档内容区域的位置和尺寸
    const contentRect = contentDiv.getBoundingClientRect();
    const contentTop = contentRect.top + window.pageYOffset;
    const contentHeight = contentDiv.offsetHeight;
    
    // 如果内容高度太小，不显示进度条
    if (contentHeight < window.innerHeight * 1.5) {
        const progressBar = document.getElementById('reading-progress-bar');
        if (progressBar) progressBar.style.opacity = '0';
        return;
    } else {
        const progressBar = document.getElementById('reading-progress-bar');
        if (progressBar) progressBar.style.opacity = '1';
    }
    
    // 获取当前滚动位置
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // 计算阅读进度
    // 考虑到窗口高度，我们应该在用户接近底部时显示为100%
    const viewportHeight = window.innerHeight;
    const readableHeight = contentHeight - viewportHeight;
    
    // 计算已阅读的高度（当前滚动位置减去内容区域顶部位置）
    const readHeight = Math.max(0, scrollTop - contentTop);
    
    // 计算阅读进度百分比
    const progress = Math.min(100, Math.round((readHeight / readableHeight) * 100));
    
    // 更新进度条
    const progressFill = document.getElementById('reading-progress-fill');
    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }
}

// 显示进度条
function showProgressBar() {
    if (!progressBar) return;
    
    // 重置进度
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
        progressFill.style.width = '0%';
    }
    
    // 显示进度条
    progressBar.classList.remove('hidden');
    
    // 快速初始进度
    setTimeout(() => {
        if (progressFill) {
            progressFill.style.width = '30%';
        }
    }, 50);
}

// 更新进度条
function updateProgressBar(percentage) {
    if (!progressBar) return;
    
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
}

// 隐藏进度条
function hideProgressBar() {
    if (!progressBar) return;
    
    // 先完成进度
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
        progressFill.style.width = '100%';
    }
    
    // 延迟隐藏，确保动画完成
    setTimeout(() => {
        progressBar.classList.add('hidden');
    }, 300);
}

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

// 生成侧边栏导航
function generateSidebar(node) {
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = ''; // 清空加载中
    
    // 处理root参数
    if (currentRoot) {
        // 查找指定的根目录节点
        const rootNode = findNodeByPath(node, currentRoot);
        if (rootNode) {
            // 添加当前根目录标题到导航顶部
            const rootHeader = document.createElement('div');
            rootHeader.className = 'py-2 px-3 mb-4 bg-gray-100 dark:bg-gray-700 rounded-md font-medium text-gray-800 dark:text-gray-200 flex items-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600';
            
            // 创建根目录标题内容
            rootHeader.innerHTML = `
                <i class="fas fa-folder-open mr-2 text-primary"></i>
                <span>${rootNode.title || currentRoot}</span>
            `;
            
            // 添加点击事件，跳转到根目录索引页
            rootHeader.addEventListener('click', () => {
                if (rootNode.index) {
                    navigateToFolderIndex(rootNode);
                }
            });
            
            nav.appendChild(rootHeader);
            
            // 显示该节点下的内容
            const ul = createNavList(rootNode.children, 0);
            nav.appendChild(ul);
            
            // 添加返回完整目录的链接
            const backDiv = document.createElement('div');
            backDiv.className = 'py-2 px-3 mb-4 border-t border-gray-200 dark:border-gray-700 mt-4';
            
            const backLink = document.createElement('a');
            backLink.href = 'main.html'; // 直接跳转到main.html，不带任何参数
            backLink.className = 'flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-primary';
            backLink.innerHTML = '<i class="fas fa-arrow-left mr-2"></i> 返回完整目录';
            
            // 添加点击事件处理，重置侧边栏状态
            backLink.addEventListener('click', function(e) {
                e.preventDefault();
                
                // 移除所有激活状态
                document.querySelectorAll('#sidebar-nav a').forEach(a => a.classList.remove('active'));
                document.querySelectorAll('#sidebar-nav div.folder-title').forEach(div => div.classList.remove('active-folder'));
                
                // 重置文件夹展开状态
                collapseAllFolders();
            });
            
            backDiv.appendChild(backLink);
            nav.appendChild(backDiv);
            
            // 根据配置处理默认文件夹展开
            handleFolderExpandMode(true);
            
            return;
        }
    }
    
    // 没有指定root参数或root参数无效，显示完整目录
    
    // 添加根目录标题到导航顶部
    const rootHeader = document.createElement('div');
    rootHeader.className = 'py-2 px-3 mb-4 bg-gray-100 dark:bg-gray-700 rounded-md font-medium text-gray-800 dark:text-gray-200 flex items-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600';
    
    // 创建根目录标题内容
    rootHeader.innerHTML = `
        <i class="fas fa-book mr-2 text-primary"></i>
        <span>文档目录</span>
    `;
    
    // 添加点击事件，跳转到总根目录索引页
    rootHeader.addEventListener('click', () => {
        if (node.index) {
            // 创建一个临时对象，模拟folder结构，用于导航到根索引页
            const rootFolder = {
                index: node.index
            };
            navigateToFolderIndex(rootFolder);
        } else {
            // 如果没有索引页，直接跳转到首页
            window.location.href = 'main.html';
        }
    });
    
    nav.appendChild(rootHeader);
    
    const ul = createNavList(node.children, 0);
    nav.appendChild(ul);
    
    // 根据配置处理默认文件夹展开
    handleFolderExpandMode(false);
}

// 处理默认文件夹展开模式
function handleFolderExpandMode(isSubRoot) {
    // 获取配置的展开模式
    const expandMode = config.navigation.folder_expand_mode || 5;
    
    // 如果设置为不默认展开任何文件夹，直接返回
    if (expandMode === 5) {
        return;
    }
    
    // 获取所有顶级文件夹
    const folderDivs = document.querySelectorAll('#sidebar-nav > ul.level-0 > li > div.folder-title');
    
    switch(expandMode) {
        case 1: // 展开全部第一级文件夹
            folderDivs.forEach(folderDiv => {
                toggleFolder(folderDiv, true);
            });
            break;
            
        case 2: // 展开全部文件夹（所有层级）
            expandAllFolders();
            break;
            
        case 3: // 展开第一个文件夹的第一级（在root_dir或根目录时）
            if (folderDivs.length > 0) {
                toggleFolder(folderDivs[0], true);
            }
            break;
            
        case 4: // 展开第一个文件夹的全部文件夹（在root_dir或根目录时）
            if (folderDivs.length > 0) {
                // 先展开第一个顶级文件夹
                toggleFolder(folderDivs[0], true);
                
                // 然后展开该文件夹下的所有子文件夹
                const firstFolder = folderDivs[0].closest('li');
                if (firstFolder) {
                    const subFolders = firstFolder.querySelectorAll('div.folder-title');
                    subFolders.forEach(subFolder => {
                        toggleFolder(subFolder, true);
                    });
                }
            }
            break;
    }
}

// 递归展开所有文件夹
function expandAllFolders() {
    const allFolderDivs = document.querySelectorAll('#sidebar-nav div.folder-title');
    
    allFolderDivs.forEach(folderDiv => {
        toggleFolder(folderDiv, true);
    });
}

// 根据路径查找节点
function findNodeByPath(rootNode, targetPath) {
    // 清理路径确保兼容性
    const normalizedPath = targetPath.replace(/\/+$/, '');
    
    function traverse(node, currentPath) {
        // 检查是否有索引页
        if (node.index && node.index.path) {
            const folderPath = getFolderPathFromIndexPath(node.index.path);
            if (folderPath === normalizedPath) {
                return node;
            }
        }
        
        // 递归查找子节点
        if (node.children) {
            for (const child of node.children) {
                const found = traverse(child, '');
                if (found) return found;
            }
        }
        
        return null;
    }
    
    // 特殊情况：如果目标路径是完全一样的索引文件
    function checkExactPath(node) {
        // 直接检查节点本身
        if (node.path === normalizedPath) {
            return node;
        }
        
        // 检查子节点
        if (node.children) {
            for (const child of node.children) {
                // 检查子节点是否匹配
                if (child.path === normalizedPath) {
                    return child;
                }
                
                // 递归检查
                const found = checkExactPath(child);
                if (found) return found;
            }
        }
        
        return null;
    }
    
    // 先尝试直接查找目录名称
    let result = checkExactPath(rootNode);
    if (result) return result;
    
    // 如果没找到，再尝试通过索引页路径查找
    return traverse(rootNode);
}

// 从索引页路径获取文件夹路径
function getFolderPathFromIndexPath(indexPath) {
    const parts = indexPath.split('/');
    if (parts.length > 0 && isIndexFile(parts[parts.length - 1])) {
        parts.pop();
    }
    return parts.join('/');
}

// 递归创建导航列表
function createNavList(items, level) {
    const ul = document.createElement('ul');
    ul.classList.add('nav-list', `level-${level}`);
    
    if (level > 0) {
        ul.classList.add('nested-list'); // 添加嵌套类名
        ul.style.display = 'none'; // 默认折叠
    }
    
    items.forEach(item => {
        const li = document.createElement('li');
        li.classList.add('nav-item', 'my-1');
        
        if (item.children && item.children.length > 0) {
            // 目录
            const div = document.createElement('div');
            div.classList.add('flex', 'items-center', 'cursor-pointer', 'hover:text-primary', 'dark:hover:text-primary', 'folder-title');
            div.classList.add(`folder-level-${level}`); // 添加层级类名，用于CSS控制缩进
            
            const icon = document.createElement('i');
            icon.classList.add('fas', 'fa-chevron-right', 'text-xs', 'mr-2', 'transition-transform');
            div.appendChild(icon);
            
            // 创建span元素
            const span = document.createElement('span');
            span.textContent = item.title;
            
            // 存储文件夹路径，用于高亮匹配
            // 通过索引页路径推断文件夹路径
            if (item.index && item.index.path) {
                const pathParts = item.index.path.split('/');
                // 如果最后一个部分是README.md，则移除它得到文件夹路径
                if (pathParts.length > 0) {
                    if (pathParts[pathParts.length - 1].toLowerCase() === 'readme.md') {
                        pathParts.pop();
                    }
                    span.dataset.folderPath = pathParts.join('/');
                    // 存储路径到div上，方便查找
                    div.dataset.folderPath = pathParts.join('/');
                }
            }
            
            div.appendChild(span);
            
            // 如果文件夹有索引页，点击文件夹标题直接跳转到索引页
            if (item.index) {
                span.classList.add('cursor-pointer');
                span.addEventListener('click', (e) => {
                    e.stopPropagation();
                    navigateToFolderIndex(item);
                });
            }
            
            // 点击图标展开/折叠子目录
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFolder(div);
            });
            
            // 点击文件夹名称展开子目录
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFolder(div);
            });
            
            li.appendChild(div);
            
            // 创建子列表（不包含索引页在顶层）
            const filteredChildren = item.index ? 
                item.children.filter(child => child.path !== item.index.path) : 
                item.children;
                
            const subUl = createNavList(filteredChildren, level + 1);
            li.appendChild(subUl);
            
        } else {
            // 文件
            const link = createNavLink(item, level);
            li.appendChild(link);
        }
        ul.appendChild(li);
    });
    return ul;
}

// 创建导航链接
function createNavLink(item, level, isIndex = false) {
    const a = document.createElement('a');
    
    // 构建URL，保留root参数
    let url = `?path=${encodeURIComponent(item.path)}`;
    if (currentRoot) {
        url += `&root=${encodeURIComponent(currentRoot)}`;
    }
    
    a.href = url;
    a.textContent = item.title;
    a.classList.add('block', 'text-gray-700', 'dark:text-gray-300', 'hover:text-primary', 'dark:hover:text-primary');
    a.classList.add(`file-level-${level}`); // 添加层级类名，用于CSS控制缩进
    
    if (isIndex) {
        a.classList.add('italic', 'text-sm'); // 索引页样式
    }
    a.dataset.path = item.path;
    a.addEventListener('click', (e) => {
        e.preventDefault();
        
        // 如果启用了自动折叠功能，先折叠所有目录
        if (config.navigation.auto_collapse && config.navigation.folder_expand_mode === 5) {
            collapseAllFolders();
        } 
        // 如果启用了自动折叠但同时设置了展开模式，先折叠后根据展开模式重新展开
        else if (config.navigation.auto_collapse && config.navigation.folder_expand_mode !== 5) {
            collapseAllFolders();
            // 延迟一点点再重新应用展开模式
            setTimeout(() => {
                handleFolderExpandMode(!!currentRoot);
            }, 50);
        }
        
        // 清除所有高亮状态
        document.querySelectorAll('#sidebar-nav a').forEach(link => link.classList.remove('active'));
        document.querySelectorAll('#sidebar-nav div.folder-title').forEach(div => div.classList.remove('active-folder'));
        
        // 设置当前链接为激活状态
        a.classList.add('active');
        
        // 展开所有父级文件夹
        expandParentFolders(a);
        
        // 更新URL，保留root参数
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('path', item.path);
        if (currentRoot) {
            newUrl.searchParams.set('root', currentRoot);
        }
        // 清除URL中的hash部分，确保不会保留之前的#heading-xx
        newUrl.hash = '';
        window.history.pushState({path: item.path}, '', newUrl.toString());
        
        // 加载文档
        loadDocument(item.path);
        
        // 滚动到顶部
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    return a;
}

// 点击文件夹名称切换到文件夹描述页面的处理函数
function navigateToFolderIndex(item) {
    // 如果启用了自动折叠功能，先折叠所有目录
    if (config.navigation.auto_collapse && config.navigation.folder_expand_mode === 5) {
        collapseAllFolders();
    }
    // 如果启用了自动折叠但同时设置了展开模式，先折叠后根据展开模式重新展开
    else if (config.navigation.auto_collapse && config.navigation.folder_expand_mode !== 5) {
        collapseAllFolders();
        // 延迟一点点再重新应用展开模式
        setTimeout(() => {
            handleFolderExpandMode(!!currentRoot);
        }, 50);
    }
    
    // 清除所有高亮状态
    document.querySelectorAll('#sidebar-nav a').forEach(link => link.classList.remove('active'));
    document.querySelectorAll('#sidebar-nav div.folder-title').forEach(div => div.classList.remove('active-folder'));
    
    // 添加文件夹的高亮状态
    const folderPath = getFolderPathFromIndexPath(item.index.path);
    let folderDiv = document.querySelector(`#sidebar-nav div.folder-title[data-folder-path="${folderPath}"]`);
    
    // 检查是否是根目录标题
    if (!folderDiv) {
        // 如果在侧边栏中找不到对应的文件夹div，可能是点击了根目录标题
        const rootTitles = document.querySelectorAll('#sidebar-nav > div');
        if (rootTitles.length > 0) {
            // 找到第一个根目录标题，通常是第一个div
            folderDiv = rootTitles[0];
            folderDiv.classList.add('active-folder');
        }
    } else {
        folderDiv.classList.add('active-folder');
        // 确保文件夹展开
        toggleFolder(folderDiv, true);
        // 展开所有父级文件夹
        expandParentFolders(folderDiv);
    }
    
    // 自动滚动侧边栏，确保文件夹在视图中
    if (folderDiv) {
        const sidebarContainer = document.getElementById('sidebar-container');
        if (sidebarContainer) {
            // 计算需要滚动的位置
            const folderTop = folderDiv.offsetTop - sidebarContainer.offsetHeight / 2 + folderDiv.offsetHeight / 2;
            
            // 平滑滚动到该位置
            sidebarContainer.scrollTo({
                top: Math.max(0, folderTop),
                behavior: 'smooth'
            });
        }
    }
    
    // 更新URL，添加path参数并保留root参数
    const url = new URL(window.location.href);
    url.searchParams.set('path', item.index.path);
    if (currentRoot) {
        url.searchParams.set('root', currentRoot);
    }
    // 清除URL中的hash部分，确保不会保留之前的#heading-xx
    url.hash = '';
    window.history.pushState({path: item.index.path}, '', url.toString());
    
    // 加载文档
    loadDocument(item.index.path);
    
    // 滚动到顶部
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 展开/折叠文件夹
function toggleFolder(div, forceExpand = false) {
    const icon = div.querySelector('i');
    const subUl = div.nextElementSibling; // 对应的子列表
    
    if (subUl && subUl.tagName === 'UL') {
        const isExpanded = subUl.style.display !== 'none';
        
        // 如果强制展开，或者需要切换状态
        if ((forceExpand && !isExpanded) || (!forceExpand)) {
            subUl.style.display = forceExpand ? 'block' : (isExpanded ? 'none' : 'block');
            icon.classList.toggle('rotate-90', forceExpand || !isExpanded);
        }
    }
}

// 设置当前激活的链接或文件夹
function setActiveLink(activeElement, isFolder = false) {
    // 清除所有链接的激活状态
    document.querySelectorAll('#sidebar-nav a').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('#sidebar-nav div.folder-title').forEach(div => div.classList.remove('active-folder'));
    
    if (activeElement) {
        if (isFolder) {
            activeElement.classList.add('active-folder');
        } else {
            activeElement.classList.add('active');
        }
        
        // 展开所有父级目录
        expandParentFolders(activeElement);
        
        // 自动滚动侧边栏，确保活动元素在视图中
        const sidebarContainer = document.getElementById('sidebar-container');
        if (sidebarContainer) {
            // 计算元素在侧边栏中的相对位置
            const elementRect = activeElement.getBoundingClientRect();
            const containerRect = sidebarContainer.getBoundingClientRect();
            
            // 检查元素是否在视图中
            const isInView = (
                elementRect.top >= containerRect.top &&
                elementRect.bottom <= containerRect.bottom
            );
            
            // 如果不在视图中，滚动侧边栏
            if (!isInView) {
                // 计算需要滚动的位置
                // 滚动到元素位于容器中央的位置
                const scrollTop = activeElement.offsetTop - sidebarContainer.offsetHeight / 2 + activeElement.offsetHeight / 2;
                
                // 平滑滚动到该位置
                sidebarContainer.scrollTo({
                    top: Math.max(0, scrollTop),
                    behavior: 'smooth'
                });
            }
        }
    }
}

// 展开当前元素的所有父级文件夹
function expandParentFolders(element) {
    // 首先找到element所在的li元素
    let currentLi = element.closest('li');
    
    while (currentLi) {
        // 获取父级ul
        const parentUl = currentLi.parentElement;
        
        // 如果父级ul是隐藏的，找到控制它的文件夹标题并展开
        if (parentUl && parentUl.style.display === 'none') {
            // 往上查找到父级li
            const parentLi = parentUl.closest('li');
            if (parentLi) {
                // 找到文件夹标题
                const folderDiv = parentLi.querySelector('.folder-title');
                if (folderDiv) {
                    // 展开文件夹
                    toggleFolder(folderDiv, true);
                }
            }
        }
        
        // 继续向上查找父级
        if (parentUl) {
            currentLi = parentUl.closest('li');
        } else {
            break;
        }
    }
}

// 从URL加载内容
async function loadContentFromUrl() {
    // 如果已经在加载中，则不重复加载
    if (isLoadingDocument) {
        // console.log('文档正在加载中，跳过重复加载请求');
        return;
    }
    
    // 获取URL中的path参数
    const url = new URL(window.location.href);
    let path = url.searchParams.get('path') || ''; // 使用let，因为可能需要修改
    const root = url.searchParams.get('root') || null;
    
    // 获取搜索参数
    const searchQuery = url.searchParams.get('search');
    const searchOccurrence = url.searchParams.get('occurrence');
    
    // 保存URL中的hash部分以便稍后处理
    const urlHash = window.location.hash;
    
    // 如果root参数更改或从无到有，需要重新生成侧边栏
    if (root !== currentRoot) {
        currentRoot = root;
        
        // 重新生成侧边栏
        generateSidebar(pathData);
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
        if (path && !url.searchParams.has('path')) {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('path', path);
            // 清除URL中的hash部分，确保不会保留之前的#heading-xx
            newUrl.hash = '';
            window.history.replaceState({ path: path }, '', newUrl.toString());
        }
        
    } else {
        // 支持省略/README.md，检查路径是否为目录
        const hasExtension = /\.(md|html)$/i.test(path);
        if (!hasExtension) {
            // 尝试在目录后面添加索引文件
            const indexPath = findDirectoryIndexPath(path);
            if (indexPath) {
                // 如果找到了索引页，更新路径
                path = indexPath;
                
                // 更新URL，但不触发新的导航
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set('path', path);
                // 清除URL中的hash部分，确保不会保留之前的#heading-xx
                newUrl.hash = '';
                window.history.replaceState({path: path}, '', newUrl.toString());
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
        }, 200);
        
        // 高亮侧边栏
        const isReadmeFile = decodedPath.toLowerCase().endsWith('readme.md');
        if (isReadmeFile && decodedPath.includes('/')) {
            const folderPath = decodedPath.substring(0, decodedPath.lastIndexOf('/'));
            const folderDiv = document.querySelector(`#sidebar-nav div.folder-title[data-folder-path="${folderPath}"]`);
            if (folderDiv) setActiveLink(folderDiv, true);
        } else {
            const docLink = document.querySelector(`#sidebar-nav a[data-path="${decodedPath}"]`);
            if (docLink) setActiveLink(docLink);
        }
        
        // 更新进度到70%
        setTimeout(() => {
            updateProgressBar(70);
        }, 400);
        
        // 加载文档
        await loadDocument(decodedPath);
        
        // 处理搜索高亮和跳转
        if (searchQuery) {
            setTimeout(() => {
                highlightSearchTerms(searchQuery, searchOccurrence);
            }, 500); // 等待文档渲染完成
        }
        
        // 处理URL中的锚点，应用自定义滚动偏移
        if (urlHash && urlHash.length > 1) {
            setTimeout(() => {
                handleUrlHash(urlHash);
            }, 300); // 等待内容渲染完成再滚动
        }
        
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

// 折叠所有文件夹
function collapseAllFolders() {
    const allFolderDivs = document.querySelectorAll('#sidebar-nav div.folder-title');
    
    allFolderDivs.forEach(folderDiv => {
        const icon = folderDiv.querySelector('i');
        const subUl = folderDiv.nextElementSibling;
        
        if (subUl && subUl.tagName === 'UL' && subUl.style.display !== 'none') {
            // 折叠文件夹
            subUl.style.display = 'none';
            // 更新图标
            if (icon) {
                icon.classList.remove('rotate-90');
            }
        }
    });
}

// 高亮一个路径的所有父级文件夹
function highlightParentFolders(path) {
    // 分割路径为各个部分
    const pathParts = path.split('/');
    let currentPath = '';
    
    // 逐级处理路径部分
    for (let i = 0; i < pathParts.length - 1; i++) {
        currentPath += (i > 0 ? '/' : '') + pathParts[i];
        
        // 查找并高亮对应的文件夹
        document.querySelectorAll('#sidebar-nav div.folder-title').forEach(folderDiv => {
            const span = folderDiv.querySelector('span');
            if (span && span.dataset.folderPath === currentPath) {
                // 高亮文件夹
                folderDiv.classList.add('active-folder');
                
                // 展开该文件夹
                toggleFolder(folderDiv, true);
            }
        });
    }
    
    // 尝试查找文件本身的链接
    const fileLink = document.querySelector(`#sidebar-nav a[data-path="${path}"]`);
    if (fileLink) {
        setActiveLink(fileLink);
    }
}

// 查找目录对应的索引页路径
function findDirectoryIndexPath(dirPath) {
    // 标准化路径，确保没有结尾的斜杠
    dirPath = dirPath.replace(/\/$/, '');
    
    // 检查pathData中是否存在对应的目录节点
    function findNode(node, currentPath) {
        // 如果有索引文件，直接返回
        if (node.path === dirPath && node.index) {
            return node.index.path;
        }
        
        // 递归查找子节点
        if (node.children) {
            for (const child of node.children) {
                const result = findNode(child, currentPath);
                if (result) return result;
            }
        }
        
        return null;
    }
    
    // 从路径数据中查找
    const indexPath = findNode(pathData, '');
    if (indexPath) return indexPath;
    
    // 如果在路径数据中没找到，尝试一些常见的索引文件名
    for (const indexName of config.document.index_pages) {
        const possiblePath = `${dirPath}/${indexName}`;
        // 这里我们只返回可能的路径，不检查文件是否实际存在
        // 文件存在性检查会在loadDocument中进行
        return possiblePath; // 返回第一个可能的索引页
    }
    
    return null;
}

// 加载并渲染文档
async function loadDocument(relativePath) {
    const contentDiv = document.getElementById('document-content');
    const tocNav = document.getElementById('toc-nav');
    tocNav.innerHTML = '<p class="text-gray-400 text-sm">暂无目录</p>';
    
    // 添加一个加载指示器，但不清空现有内容
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'fixed bottom-4 left-4 z-40 bg-white dark:bg-gray-800 shadow-md rounded-lg p-2 text-sm';
    loadingIndicator.innerHTML = '<p class="text-gray-600 dark:text-gray-300 flex items-center"><i class="fas fa-spinner fa-spin mr-2"></i>正在加载文档...</p>';
    document.body.appendChild(loadingIndicator);
    
    // 确保路径是相对于根目录的，而不是 data/ 目录
    const fetchPath = `${config.document.root_dir}/${relativePath}`;
    let successfullyLoaded = false; // 标记是否成功加载了内容
    
    // 保存当前URL中的hash
    const currentHash = window.location.hash;
    
    // 首先检查缓存中是否有该文档
    const cachedContent = documentCache.get(relativePath);
    if (cachedContent) {
        // console.log(`从缓存加载文档: ${relativePath}`);
        updateProgressBar(90);
        contentDiv.innerHTML = ''; // 清空旧内容
        await renderDocument(relativePath, cachedContent, contentDiv, tocNav);
        successfullyLoaded = true;

        const isPreloaded = documentCache.isPreloaded(relativePath);
        const isCached = documentCache.isCached(relativePath);
        if (isPreloaded) addCacheStatusIndicator(contentDiv, 'preloaded');
        else if (isCached) addCacheStatusIndicator(contentDiv, 'cached');
        
    } else {
        // 不在缓存中，从网络获取
        try {
            updateProgressBar(60);
            const response = await fetch(fetchPath);
            
            updateProgressBar(70);
            if (!response.ok) {
                // ... 省略 404 和其他错误处理 (与之前类似) ...
                // 重要的: 在错误处理中也要设置 successfullyLoaded = false 或抛出错误
                throw new Error(`无法加载文档: ${response.statusText} (路径: ${fetchPath})`);
            }
            
            updateProgressBar(80);
            const content = await response.text();
            documentCache.set(relativePath, content); // 添加到持久缓存
            
            updateProgressBar(90);
            contentDiv.innerHTML = ''; // 清空旧内容
            await renderDocument(relativePath, content, contentDiv, tocNav);
            successfullyLoaded = true;
            addCacheStatusIndicator(contentDiv, 'cached');

        } catch (error) {
            console.error("加载文档失败:", error);
            contentDiv.innerHTML = `<p class="text-red-500">加载文档失败: ${error.message}</p>`;
            successfullyLoaded = false;
        }
    }

    // 移除加载指示器
    loadingIndicator.remove();
    
    // 如果成功加载，触发自动预加载
    if (successfullyLoaded) {
        setTimeout(() => {
            // **修改**: 调用新的自动预加载逻辑
            documentCache.autoPreloadDocuments(relativePath, pathData, 3);
        }, 1000);
    }

    // 如果URL中有hash，处理滚动到指定位置
    if (currentHash && currentHash.length > 1) {
        setTimeout(() => {
            handleUrlHash(currentHash);
        }, 300); // 给内容渲染一点时间
    } else {
        // 没有hash时滚动到页面顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

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
                    return hljs.highlight(lang || 'plaintext', code).value;
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
            if (config.extensions.highlight) {
                hljs.highlightElement(block);
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
        if (mermaidDivs.length > 0 && typeof mermaid !== 'undefined' && config.extensions.mermaid) {
            mermaid.init(undefined, mermaidDivs);
        }
        
        // 处理图片链接
        fixExternalImageLinks(markdownBody);
        
        // 处理内部链接
        fixInternalLinks(markdownBody);
        
        // 处理外部链接
        fixExternalLinks(markdownBody);
        
        // 生成目录
        generateToc(markdownBody);
        
        // 设置标题观察器(使用交叉观察API提高准确性)
        setupHeadingIntersectionObserver(contentDiv);
        
        // 初始化一次处理目录高亮
        handleTocScrollHighlight();
        
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
        
        // 添加图片点击放大功能
        const images = contentDiv.querySelectorAll('img:not(a > img)'); // 选择不在链接内的图片
        
        // 确保模态框只创建一次
        let imageModal = document.getElementById('custom-image-modal');
        if (!imageModal) {
            // 创建自定义图片放大模态框
            imageModal = document.createElement('div');
            imageModal.id = 'custom-image-modal';
            imageModal.className = 'custom-image-modal';
            
            // 添加关闭按钮
            const closeBtn = document.createElement('div');
            closeBtn.className = 'close-btn';
            closeBtn.innerHTML = '<i class="fas fa-times"></i>';
            closeBtn.onclick = () => {
                imageModal.classList.remove('active');
                setTimeout(() => {
                    modalImg.src = ''; // 清空图像源，减少内存占用
                }, 300); // 等待transition完成
            };
            
            // 添加图片元素
            const modalImg = document.createElement('img');
            modalImg.alt = '放大图片';
            
            // 点击图片也可以关闭模态框
            modalImg.onclick = () => {
                imageModal.classList.remove('active');
                setTimeout(() => {
                    modalImg.src = ''; // 清空图像源
                }, 300);
            };
            
            // 按ESC键关闭模态框
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && imageModal.classList.contains('active')) {
                    imageModal.classList.remove('active');
                    setTimeout(() => {
                        modalImg.src = ''; // 清空图像源
                    }, 300);
                }
            });
            
            // 组装模态框
            imageModal.appendChild(modalImg);
            imageModal.appendChild(closeBtn);
            document.body.appendChild(imageModal);
        }
        
        // 为每个图片添加点击事件
        images.forEach(img => {
            img.style.cursor = 'zoom-in'; // 添加鼠标样式
            img.addEventListener('click', () => {
                const modalImg = imageModal.querySelector('img');
                modalImg.src = img.src;
                modalImg.alt = img.alt || '放大图片';
                
                // 显示模态框（延迟一点点以确保图片已加载）
                setTimeout(() => {
                    imageModal.classList.add('active');
                }, 50);
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

// 更新页面标题
function updatePageTitle(path) {
    const activeLink = document.querySelector(`#sidebar-nav a[data-path="${path}"]`);
    let title = activeLink ? activeLink.textContent : '文档';
    document.title = `${title} - ${config.site.name}`;
}

// 生成面包屑导航
function generateBreadcrumb(path) {
    const container = document.getElementById('breadcrumb-container');
    container.innerHTML = '';
    if (!config.navigation.breadcrumb) return;
    
    // 分解路径，提取目录结构
    const parts = path.split('/');
    const breadcrumbParts = [];
    
    // 添加首页
    let homeUrl = '?';
    if (currentRoot) {
        homeUrl += `root=${encodeURIComponent(currentRoot)}`;
    }
    
    breadcrumbParts.push({
        text: config.navigation.home_text || '首页',
        path: '',
        url: homeUrl,
        isLast: false,
        isHome: true
    });
    
    // 如果有root参数，添加根目录面包屑
    if (currentRoot) {
        const rootNode = findNodeByPath(pathData, currentRoot);
        if (rootNode) {
            // 构建根目录URL
            let rootUrl = '?';
            if (rootNode.index) {
                rootUrl = `?path=${encodeURIComponent(rootNode.index.path)}`;
            } else {
                rootUrl = `?root=${encodeURIComponent(currentRoot)}`;
            }
            
            breadcrumbParts.push({
                text: rootNode.title || currentRoot,
                path: currentRoot,
                url: rootUrl,
                isRoot: true,
                isLast: parts.length === 1 && isIndexFile(parts[0])
            });
        }
    }
    
    // 构建去重后的面包屑路径
    let currentPath = '';
    let lastTitle = '';
    
    // 确定起始索引，如果有root参数，从该目录之后开始
    let startIndex = 0;
    if (currentRoot) {
        const rootParts = currentRoot.split('/');
        startIndex = rootParts.length;
    }
    
    for (let i = startIndex; i < parts.length; i++) {
        const part = parts[i];
        
        // 如果是README.md或类似索引文件，跳过
        if (i === parts.length - 1 && isIndexFile(part)) {
            continue;
        }
        
        // 构建当前路径，需要考虑root参数
        if (currentRoot) {
            currentPath = currentRoot + '/' + parts.slice(startIndex, i + 1).join('/');
        } else {
            currentPath += (i > 0 ? '/' : '') + part;
        }
        
        // 获取当前路径的标题
        const title = getTitleFromPath(currentPath) || part;
        
        // 避免添加重复的标题（如README.md与其父目录名称相同的情况）
        if (title !== lastTitle) {
            breadcrumbParts.push({
                text: title,
                path: currentPath,
                url: filePathToUrl(currentPath),
                isLast: i === parts.length - 1 || (i === parts.length - 2 && isIndexFile(parts[parts.length - 1]))
            });
            lastTitle = title;
        }
    }
    
    // 创建面包屑HTML元素
    breadcrumbParts.forEach((item, index) => {
        // 添加分隔符（除了第一项）
        if (index > 0) {
            const separator = document.createElement('span');
            separator.textContent = ' / ';
            separator.classList.add('mx-1');
            container.appendChild(separator);
        }
        
        if (item.isLast) {
            // 当前页面（最后一项）
            const span = document.createElement('span');
            span.textContent = item.text;
            span.classList.add('text-gray-800', 'dark:text-white');
            container.appendChild(span);
        } else {
            // 链接项
            const link = document.createElement('a');
            link.href = item.url;
            link.textContent = item.text;
            
            // 为根目录添加特殊样式
            if (item.isRoot) {
                link.classList.add('hover:text-primary', 'font-medium');
                // 添加文件夹图标
                const icon = document.createElement('i');
                icon.className = 'fas fa-folder-open mr-1 text-primary';
                link.insertBefore(icon, link.firstChild);
            } else if (index === 0) {
                // 首页添加首页图标
                link.classList.add('hover:text-primary');
                const icon = document.createElement('i');
                icon.className = 'fas fa-home mr-1 text-primary';
                link.insertBefore(icon, link.firstChild);
            } else {
                link.classList.add('hover:text-primary');
            }
            
            // 添加点击事件处理程序
            if (item.isHome) {
                // 首页需要特殊处理，点击时重置侧边栏状态
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    // 移除所有激活状态
                    document.querySelectorAll('#sidebar-nav a').forEach(a => a.classList.remove('active'));
                    document.querySelectorAll('#sidebar-nav div.folder-title').forEach(div => div.classList.remove('active-folder'));
                    
                    // 根据配置，判断是否需要折叠所有目录
                    if (config.navigation.auto_collapse && config.navigation.folder_expand_mode === 5) {
                        collapseAllFolders();
                    } else if (config.navigation.auto_collapse && config.navigation.folder_expand_mode !== 5) {
                        collapseAllFolders();
                        setTimeout(() => {
                            handleFolderExpandMode(!!currentRoot);
                        }, 50);
                    }
                    
                    // 跳转到首页
                    window.location.href = item.url;
                });
            }
            
            container.appendChild(link);
        }
    });
}

// 检查文件名是否为索引文件
function isIndexFile(filename) {
    return config.document.index_pages.some(indexName => 
        filename.toLowerCase() === indexName.toLowerCase());
}

// 从路径获取标题（基于侧边栏数据）
function getTitleFromPath(path) {
    const link = document.querySelector(`#sidebar-nav a[data-path="${path}"]`);
    return link ? link.textContent : null;
}

// 查找目录的索引页路径
function findIndexPath(dirPath) {
    function find(node, targetPath) {
        if (node.path === targetPath && node.index) {
            return node.index.path;  // 返回索引页的路径，不带'#'前缀
        }
        if (node.children) {
            for (const child of node.children) {
                const found = find(child, targetPath);
                if (found) return found;
            }
        }
        return null;
    }
    return find(pathData, dirPath);
}

// 生成右侧目录 (TOC)
function generateToc(contentElement) {
    const tocNav = document.getElementById('toc-nav');
    tocNav.innerHTML = '';
    
    // **修改**: 直接在 contentElement 中查找标题
    const headings = contentElement.querySelectorAll(`h1, h2, h3, h4, h5, h6`);
    
    const tocDepth = config.document.toc_depth || 3;
    // 是否显示标题编号
    const showNumbering = config.document.toc_numbering || false;
    // 是否忽略h1标题计数
    const ignoreH1 = config.document.toc_ignore_h1 || false;
    // 是否启用动态展开功能
    const dynamicExpand = config.document.toc_dynamic_expand !== false;
    
    // 用于生成标题编号的计数器
    const counters = [0, 0, 0, 0, 0, 0];
    let lastLevel = 0;
    
    const headingsArray = Array.from(headings); // 直接转换
    
    if (headingsArray.length === 0) {
        tocNav.innerHTML = '<p class="text-gray-400 text-sm">暂无目录</p>';
        return; // 如果没有标题，直接返回
    }
    
    // 记录标题层级结构，用于后续动态展开功能
    const headingHierarchy = {};
    let currentParents = [null, null, null, null, null, null]; // 每个级别的当前父级标题
    
    headingsArray.forEach((heading, index) => { // 使用转换后的数组
        const level = parseInt(heading.tagName.substring(1));

        // 如果标题没有ID，添加一个
        if (!heading.id) {
            heading.id = `heading-${index}`;
        }
        const id = heading.id;
        
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
        li.classList.add('toc-item', `toc-level-${level}`);
        const a = document.createElement('a');
        a.href = `#${id}`; // 直接跳转到ID
        a.innerHTML = prefix + heading.textContent;  // 使用innerHTML以支持编号+标题文本
        a.classList.add('block', 'text-sm', 'py-1', 'hover:text-primary', 'dark:hover:text-primary');
        a.style.marginLeft = `${(level - 1) * 0.75}rem`; // 缩进
        a.dataset.headingId = id;
        a.dataset.level = level;
        
        // 如果级别大于tocDepth且动态展开功能开启，则隐藏（但仍然生成）
        if (level > tocDepth && dynamicExpand) {
            li.classList.add('hidden');
            li.dataset.hidden = 'true';
        }
        
        // 记录当前标题的层级关系，用于后续动态展开
        currentParents[level-1] = id;
        if (level > 1 && currentParents[level-2]) {
            // 记录该标题的父级标题
            headingHierarchy[id] = {
                parent: currentParents[level-2],
                level: level
            };
        }
        
        // 点击目录条目时滚动到对应标题
        a.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // 阻止冒泡，防止触发document的全局点击事件处理
            const targetHeading = document.getElementById(id);
            if (targetHeading) {
                // 计算目标位置，使标题显示在屏幕上方25%的位置
                const targetPosition = targetHeading.getBoundingClientRect().top + window.pageYOffset;
                const offset = window.innerHeight * 0.25; // 屏幕高度的25%
                window.scrollTo({
                    top: targetPosition - offset,
                    behavior: 'smooth'
                });
                
                // 更新URL hash但不触发页面跳转
                history.pushState(null, null, `#${id}`);
                
                // 高亮当前目录项
                document.querySelectorAll('#toc-nav a').forEach(link => link.classList.remove('active'));
                a.classList.add('active');
                
                // 确保当前目录项在视图中
                scrollTocToActiveItem(a);
                
                // 如果启用了动态展开功能，展开下一级标题
                if (dynamicExpand) {
                    expandChildHeadings(id, level);
                }
            }
        });
        
        li.appendChild(a);
        tocNav.appendChild(li);
    });
    
    // 保存标题层级结构到window对象，方便其他函数访问
    window.headingHierarchy = headingHierarchy;
    
    // 移除旧的滚动监听器（如果有）
    window.removeEventListener('scroll', handleTocScrollHighlight);
    // 添加滚动监听，高亮当前章节
    window.addEventListener('scroll', handleTocScrollHighlight);
}

// 展开指定标题的子标题
function expandChildHeadings(headingId, level) {
    if (!config.document.toc_dynamic_expand) return;
    
    const tocNav = document.getElementById('toc-nav');
    if (!tocNav) return;
    
    // 查找所有相关的父级标题ID（形成一个路径）
    const relevantParentIds = new Set([headingId]);
    const activeHeadings = new Set();
    
    // 获取当前活动的标题
    const activeLink = tocNav.querySelector('a.active');
    if (activeLink) {
        const activeId = activeLink.dataset.headingId;
        if (activeId) {
            activeHeadings.add(activeId);
            
            // 向上收集所有父级标题
            let currentId = activeId;
            while (currentId && window.headingHierarchy && window.headingHierarchy[currentId]) {
                const parentId = window.headingHierarchy[currentId].parent;
                if (parentId) {
                    relevantParentIds.add(parentId);
                    currentId = parentId;
                } else {
                    break;
                }
            }
        }
    }
    
    // 首先隐藏所有当前可见的深层级标题，但保留相关的标题
    const visibleDeepHeadings = tocNav.querySelectorAll('.toc-item[data-hidden="true"]:not(.hidden)');
    
    visibleDeepHeadings.forEach(item => {
        const itemLink = item.querySelector('a');
        if (!itemLink) return;
        
        const itemId = itemLink.dataset.headingId;
        const itemLevel = parseInt(itemLink.dataset.level || '0');
        
        // 检查是否是需要保留的标题
        let shouldKeep = false;
        
        // 获取标题的层级链
        let headingChain = [];
        let currentId = itemId;
        
        // 收集父级链
        while (currentId && window.headingHierarchy && window.headingHierarchy[currentId]) {
            headingChain.unshift(currentId);
            currentId = window.headingHierarchy[currentId].parent;
        }
        
        // 如果是当前展开标题的直接子标题，保留它
        if (window.headingHierarchy && 
            window.headingHierarchy[itemId] && 
            window.headingHierarchy[itemId].parent === headingId &&
            window.headingHierarchy[itemId].level === level + 1) {
            shouldKeep = true;
        }
        
        // 如果是相关标题路径上的标题，也保留它
        for (const parentId of relevantParentIds) {
            if (window.headingHierarchy && 
                window.headingHierarchy[itemId] && 
                window.headingHierarchy[itemId].parent === parentId) {
                shouldKeep = true;
                break;
            }
        }
        
        // 如果是活动标题的子标题，也保留它
        for (const activeId of activeHeadings) {
            if (window.headingHierarchy && 
                window.headingHierarchy[itemId] && 
                window.headingHierarchy[itemId].parent === activeId) {
                shouldKeep = true;
                break;
            }
        }
        
        // 如果不需要保留，则隐藏
        if (!shouldKeep) {
            item.classList.add('hidden');
        }
    });
    
    // 查找当前标题的直接子标题
    const childLevel = level + 1;
    const allHeadings = Array.from(tocNav.querySelectorAll('.toc-item'));
    
    // 遍历所有标题，找到当前标题的子标题并显示它们
    let foundChildren = false;
    let isWithinSameSection = false;
    
    for (let i = 0; i < allHeadings.length; i++) {
        const item = allHeadings[i];
        const itemLink = item.querySelector('a');
        if (!itemLink) continue;
        
        const itemId = itemLink.dataset.headingId;
        const itemLevel = parseInt(itemLink.dataset.level);
        
        // 如果找到了当前标题
        if (itemId === headingId) {
            isWithinSameSection = true;
            continue; // 跳过当前标题自身
        }
        
        // 如果遇到了同级或更高级的标题，说明当前标题的区域已经结束
        if (isWithinSameSection && itemLevel <= level) {
            isWithinSameSection = false;
            break; // 退出循环，不再处理后续标题
        }
        
        // 如果在当前标题区域内，且是直接子标题
        if (isWithinSameSection && itemLevel === childLevel) {
            // 如果是隐藏的，则显示出来
            if (item.dataset.hidden === 'true') {
                item.classList.remove('hidden');
                foundChildren = true;
            }
        }
    }
    
    return foundChildren;
}

// 当标题激活时，确保其父级标题的子标题都可见
function ensureParentHeadingChildrenVisible(headingId) {
    if (!config.document.toc_dynamic_expand) return;
    
    const headingHierarchy = window.headingHierarchy;
    if (!headingHierarchy || !headingHierarchy[headingId]) return;
    
    // 获取当前标题的父级标题
    const parentId = headingHierarchy[headingId].parent;
    const currentLevel = headingHierarchy[headingId].level;
    
    // 确保父级标题的子标题可见
    if (parentId) {
        expandChildHeadings(parentId, currentLevel - 1);
        
        // 递归确保所有父级标题链都展开
        ensureParentHeadingChildrenVisible(parentId);
    }
}

// 更新活动标题
function updateActiveHeading(id) {
    if (!id) return;
    
    // 更新目录高亮
    document.querySelectorAll('#toc-nav a').forEach(link => {
        const isActive = link.dataset.headingId === id;
        link.classList.toggle('active', isActive);
        
        // 如果是活动链接，确保它在视图中
        if (isActive) {
            // 如果标题项是隐藏的，确保其父级标题的子标题可见
            const tocItem = link.closest('.toc-item');
            if (tocItem && tocItem.classList.contains('hidden')) {
                ensureParentHeadingChildrenVisible(id);
            }
            
            // 如果动态展开功能开启，处理当前标题
            if (config.document.toc_dynamic_expand) {
                const level = parseInt(link.dataset.level || '0');
                
                // 如果当前标题有父级，先展开父级的所有子标题（即当前标题的所有同级标题）
                const headingHierarchy = window.headingHierarchy;
                if (headingHierarchy && headingHierarchy[id] && headingHierarchy[id].parent) {
                    const parentId = headingHierarchy[id].parent;
                    const parentLevel = headingHierarchy[id].level - 1;
                    expandChildHeadings(parentId, parentLevel);
                }
                
                // 然后再展开当前标题的子标题
                expandChildHeadings(id, level);
            }
            
            // 确保当前目录项在视图中
            scrollTocToActiveItem(link);
        }
    });
}

// 处理TOC滚动高亮的函数
const handleTocScrollHighlight = debounce(() => {
    const tocNav = document.getElementById('toc-nav');
    if (!tocNav || tocNav.children.length <= 1) return; // 没有足够的目录项

    const scrollPosition = window.scrollY;
    let currentHeadingId = null;
    let headingFound = false;

    // 获取所有内容标题元素
    const contentElement = document.getElementById('document-content');
    const headingElements = contentElement ? Array.from(contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6')) : [];

    if (headingElements.length === 0) return;

    // 计算视口的位置
    const windowHeight = window.innerHeight;
    const viewportTop = scrollPosition;
    const viewportMiddle = viewportTop + (windowHeight * 0.3); // 使用视口上部30%作为参考点
    
    // 获取当前活动的标题ID和级别
    let currentActiveHeadingId = null;
    let currentActiveHeadingLevel = 0;
    const activeLink = tocNav.querySelector('a.active');
    if (activeLink) {
        currentActiveHeadingId = activeLink.dataset.headingId;
        currentActiveHeadingLevel = parseInt(activeLink.dataset.level || '0');
    }

    // 查找视口范围内的所有标题
    const visibleHeadings = [];
    for (let i = 0; i < headingElements.length; i++) {
        const heading = headingElements[i];
        const headingTop = heading.getBoundingClientRect().top + scrollPosition;
        const headingBottom = headingTop + heading.offsetHeight;
        
        // 检查标题是否在视口区域内或刚刚通过视口上方
        if ((headingTop <= viewportMiddle && headingBottom >= viewportTop) || 
            (i > 0 && headingTop > viewportMiddle && headingElements[i-1].getBoundingClientRect().top + scrollPosition < viewportMiddle)) {
            
            visibleHeadings.push({
                id: heading.id,
                level: parseInt(heading.tagName.substring(1)),
                top: headingTop,
                element: heading
            });
        }
    }
    
    // 没有找到可见标题，尝试确定最接近的标题
    if (visibleHeadings.length === 0) {
        // 特殊情况处理：如果在页面底部
        if (scrollPosition + windowHeight > document.body.offsetHeight - 100) {
            // 使用最后一个标题
            const lastHeading = headingElements[headingElements.length - 1];
            currentHeadingId = lastHeading.id;
        }
        // 特殊情况处理：如果在页面顶部
        else if (scrollPosition < 100) {
            // 使用第一个标题
            currentHeadingId = headingElements[0].id;
        }
        // 如果没有找到可见标题，尝试找最后一个已经滚过的标题
        else {
            let closestHeading = null;
            let closestDistance = Infinity;
            
            for (let i = 0; i < headingElements.length; i++) {
                const heading = headingElements[i];
                const headingTop = heading.getBoundingClientRect().top + scrollPosition;
                const distance = viewportMiddle - headingTop;
                
                // 如果标题已经过去（在视口上方），且距离比当前找到的最近
                if (distance > 0 && distance < closestDistance) {
                    closestHeading = heading;
                    closestDistance = distance;
                }
            }
            
            if (closestHeading) {
                currentHeadingId = closestHeading.id;
            }
        }
    } else {
        // 有可见标题，按以下优先级处理：
        // 1. 优先选择与当前活动标题相同的标题，避免频繁切换
        // 2. 优先选择更高层级的标题（如h2优先于h3）
        // 3. 优先选择位置更靠前的标题
        
        let selectedHeading = null;
        
        // 如果当前有活动标题，查找它是否在可见标题中
        if (currentActiveHeadingId) {
            for (const heading of visibleHeadings) {
                if (heading.id === currentActiveHeadingId) {
                    selectedHeading = heading;
                    break;
                }
            }
        }
        
        // 如果没有找到当前活动标题或没有活动标题，应用优先级规则
        if (!selectedHeading) {
            // 优先选择更高级别的标题
            visibleHeadings.sort((a, b) => {
                // 先按级别排序（更低的数字表示更高级别，如h2比h3更高级）
                if (a.level !== b.level) {
                    return a.level - b.level;
                }
                // 级别相同时，按位置排序
                return a.top - b.top;
            });
            
            // 选择排序后的第一个标题
            selectedHeading = visibleHeadings[0];
        }
        
        // 平滑过渡：如果选中的标题与当前活动标题不同，检查是否需要应用防跳动策略
        if (selectedHeading && selectedHeading.id !== currentActiveHeadingId) {
            // 获取选中标题和当前活动标题的层级关系
            const selectedLevel = selectedHeading.level;
            
            // 标题之间的层级差异很大时，允许直接切换
            const levelDifference = Math.abs(selectedLevel - currentActiveHeadingLevel);
            
            // 如果当前活动的是父标题，且选中的是其子标题，且两者非常接近，保持父标题高亮
            if (currentActiveHeadingLevel < selectedLevel && levelDifference === 1) {
                // 检查两个标题的距离是否很近
                const activeHeadingElement = document.getElementById(currentActiveHeadingId);
                if (activeHeadingElement) {
                    const activeHeadingTop = activeHeadingElement.getBoundingClientRect().top + scrollPosition;
                    const selectedHeadingTop = selectedHeading.top;
                    const distance = Math.abs(selectedHeadingTop - activeHeadingTop);
                    
                    // 如果距离很近（例如小于视口高度的30%），保持当前活动标题不变
                    if (distance < windowHeight * 0.15) {
                        // 保持当前高亮不变
                        return;
                    }
                }
            }
            
            // 普通情况：采用新选择的标题
            currentHeadingId = selectedHeading.id;
        } else if (selectedHeading) {
            currentHeadingId = selectedHeading.id;
        }
    }

    // 更新目录高亮
    if (currentHeadingId) {
        updateActiveHeading(currentHeadingId);
    }
}, 100);

// 滚动TOC，确保活动项在视图中
function scrollTocToActiveItem(activeItem) {
    const tocContainer = document.getElementById('toc-container');
    if (!tocContainer || !activeItem) return;
    
    // 计算元素在TOC中的相对位置
    const itemRect = activeItem.getBoundingClientRect();
    const containerRect = tocContainer.getBoundingClientRect();
    
    // 检查元素是否 *完全* 在视图中
    const isFullyInView = (
        itemRect.top >= containerRect.top &&
        itemRect.bottom <= containerRect.bottom
    );
    
    // 如果不在视图中，滚动TOC
    if (!isFullyInView) {
        // 计算需要滚动的位置
        // 目标：将活动项滚动到TOC容器的中间位置
        const scrollTop = activeItem.offsetTop - tocContainer.offsetHeight / 2 + activeItem.offsetHeight / 2;
        
        // 平滑滚动到该位置
        tocContainer.scrollTo({
            top: Math.max(0, scrollTop),
            behavior: 'smooth'
        });
    }
}

// 检查当前是否为暗黑模式
function isDarkMode() {
    return document.documentElement.classList.contains('dark');
}

// 将文件路径转换为URL基础路径
function filePathToUrl(path) {
    let url = `?path=${encodeURIComponent(path)}`;
    if (currentRoot) {
        url += `&root=${encodeURIComponent(currentRoot)}`;
    }
    return url;
}

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

// 防抖函数，避免滚动事件过于频繁
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
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
    
    // 上一篇
    if (currentIndex > 0) {
        const prevLink = allLinks[currentIndex - 1];
        const prevDiv = document.createElement('div');
        prevDiv.className = 'mb-4 md:mb-0';
        
        // 构建URL，保留root参数
        let prevUrl = `?path=${encodeURIComponent(prevLink.path)}`;
        if (currentRoot) {
            prevUrl += `&root=${encodeURIComponent(currentRoot)}`;
        }
        
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
        
        // 构建URL，保留root参数
        let nextUrl = `?path=${encodeURIComponent(nextLink.path)}`;
        if (currentRoot) {
            nextUrl += `&root=${encodeURIComponent(currentRoot)}`;
        }
        
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

// 获取所有文档链接，按照path.json中从上到下的顺序
function getAllDocumentLinks() {
    const links = [];
    const addedPaths = new Set(); // 防止重复添加
    
    // 辅助函数：添加文档到列表（如果尚未添加）
    function addDoc(path, title) {
        if (!addedPaths.has(path)) {
            links.push({ path, title });
            addedPaths.add(path);
            return true;
        }
        return false;
    }
    
    // 按照定义顺序遍历整个文档树
    function traverseInOrder(node) {
        // 1. 首先添加当前节点的索引页（如果是目录且有索引页）
        if (node.index) {
            addDoc(node.index.path, node.index.title);
        }
        
        // 2. 然后添加所有子节点
        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                // 如果是文件（没有children），直接添加
                if (!child.children || child.children.length === 0) {
                    addDoc(child.path, child.title);
                } else {
                    // 如果是目录，先添加其索引页
                    if (child.index) {
                        addDoc(child.index.path, child.index.title);
                    }
                    
                    // 然后遍历其子节点
                    traverseInOrder(child);
                }
            }
        }
    }
    
    // 开始遍历
    traverseInOrder(pathData);
    
    return links;
}

// 修复内部链接，维持root参数
function fixInternalLinks(container) {
    const links = container.querySelectorAll('a');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        
        // 如果已经是完整URL或仅锚点链接，不处理
        if (href.startsWith('http://') || href.startsWith('https://') || href === '#' || (href.startsWith('#') && !href.includes('?'))) {
            // 标记为外部链接
            if (href.startsWith('http')) {
                if (!link.classList.contains('external-link') && !link.querySelector('.external-link-icon')) {
                    link.classList.add('external-link');
                    
                    // 添加外部链接图标
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-external-link-alt ml-1 text-xs external-link-icon';
                    icon.style.fontSize = '0.75em';
                    icon.setAttribute('aria-hidden', 'true');
                    link.appendChild(icon);
                    
                    // 如果没有设置target，设置为_blank
                    if (!link.getAttribute('target')) {
                        link.setAttribute('target', '_blank');
                        link.setAttribute('rel', 'noopener noreferrer');
                    }
                }
            }
            return;
        }
        
        // 处理相对路径链接 - 支持常规Markdown格式的链接
        if (!href.startsWith('?')) {
            // 提取链接中的锚点部分(如果有)
            let path = href;
            let hashPart = '';
            
            if (href.includes('#')) {
                const parts = href.split('#');
                path = parts[0];
                hashPart = parts.length > 1 ? `#${parts[1]}` : '';
            }
            
            // 如果链接有扩展名，保留；否则尝试推断为目录
            const hasExtension = /\.(md|html)$/i.test(path);
            if (!hasExtension) {
                // 可能是目录链接，尝试将其视为目录
                if (!path.endsWith('/')) {
                    // 尝试添加默认索引文件
                    for (const indexName of config.document.index_pages) {
                        // 先检查是否以/结尾，如果不是，添加/
                        const dirPath = path.endsWith('/') ? path : `${path}/`;
                        const possiblePath = `${dirPath}${indexName}`;
                        path = possiblePath;  // 使用第一个可能的索引页
                        break;
                    }
                }
            }
            
            // 获取完整路径并编码
            let newHref = `?path=${encodeURIComponent(path)}`;
            if (currentRoot) {
                newHref += `&root=${encodeURIComponent(currentRoot)}`;
            }
            
            // 附加锚点部分到URL
            if (hashPart) {
                newHref += hashPart;
            }
            
            link.setAttribute('href', newHref);
            
            // 标记为内部链接
            if (!link.classList.contains('internal-link') && !link.querySelector('.internal-link-icon')) {
                link.classList.add('internal-link');
            }
            
        } else if (href.includes('path=')) {
            // 处理已有path参数的链接
            let newHref = href;
            
            // 添加root参数(如果尚未添加)
            if (currentRoot && !href.includes('root=')) {
                newHref = `${href}&root=${encodeURIComponent(currentRoot)}`;
            }
            
            // 标记为内部链接
            if (!link.classList.contains('internal-link')) {
                link.classList.add('internal-link');
            }
            
            link.setAttribute('href', newHref);
        } else {
            // 其他?开头的链接也标记为内部链接
            if (!link.classList.contains('internal-link')) {
                link.classList.add('internal-link');
            }
        }
    });
}

// 查找文档信息对象（文件节点或索引对象）
function findDocInfoByPath(node, targetPath) {
    // 检查当前节点本身是否是目标文件（非索引）
    if (node.path === targetPath && (!node.children || node.children.length === 0)) { 
        return node;
    }

    // 检查当前节点的索引文件是否是目标
    if (node.index && node.index.path === targetPath) {
        return node.index; // 返回index对象，它包含git信息
    }

    // 递归检查子节点
    if (node.children) {
        for (const child of node.children) {
            const found = findDocInfoByPath(child, targetPath);
            if (found) {
                return found;
            }
        }
    }

    return null; // 未找到
}

// 格式化时间戳
function formatTimestamp(timestamp, options = {}) {
    const date = new Date(timestamp * 1000); // Git时间戳是秒级的
    const now = new Date();
    const diff = now - date;
    
    // 如果是当前时区的时间，使用相对时间
    if (options.relative) {
        // 1分钟内
        if (diff < 60 * 1000) {
            return '刚刚';
        }
        // 1小时内
        if (diff < 60 * 60 * 1000) {
            const minutes = Math.floor(diff / (60 * 1000));
            return `${minutes}分钟前`;
        }
        // 24小时内
        if (diff < 24 * 60 * 60 * 1000) {
            const hours = Math.floor(diff / (60 * 60 * 1000));
            return `${hours}小时前`;
        }
        // 30天内
        if (diff < 30 * 24 * 60 * 60 * 1000) {
            const days = Math.floor(diff / (24 * 60 * 60 * 1000));
            return `${days}天前`;
        }
    }
    
    // 默认使用完整日期时间格式
    const userLocale = navigator.language || 'zh-CN';
    return date.toLocaleString(userLocale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

// 更新Git和GitHub相关信息
function updateGitInfo(relativePath) {
    // 查找当前文档的Git信息
    const docInfo = findDocInfoByPath(pathData, relativePath);
    
    // 检查docInfo是否存在，以及是否有git属性
    if (!docInfo || !docInfo.git) {
        // 隐藏Git信息区域
        hideGitInfoElements();
        return;
    }
    
    // 是否启用Git和GitHub功能
    const gitEnabled = config.extensions?.git?.enable !== false;
    const githubEnabled = config.extensions?.github?.enable !== false;
    
    // 如果Git和GitHub都禁用，则不显示
    if (!gitEnabled && !githubEnabled) {
        hideGitInfoElements();
        return;
    }
    
    // 处理最后修改时间信息
    // 只有当git启用且显示最后修改时间时才处理
    if (gitEnabled && config.extensions?.git?.show_last_modified !== false && docInfo.git.last_modified) {
        const lastModified = docInfo.git.last_modified;
        const modifiedTime = document.getElementById('modified-time');
        const modifiedAuthor = document.getElementById('modified-author');
        const lastModifiedContainer = document.getElementById('last-modified');
        
        if (modifiedTime && modifiedAuthor && lastModifiedContainer) {
            // 格式化时间戳，使用相对时间
            const formattedDate = formatTimestamp(lastModified.timestamp, { relative: true });
            
            modifiedTime.textContent = formattedDate;
            modifiedAuthor.textContent = lastModified.author;
            
            // 添加完整时间提示
            modifiedTime.title = formatTimestamp(lastModified.timestamp);
            
            // 显示最后修改时间区域
            lastModifiedContainer.style.display = 'flex';
        } else {
            // 如果元素不存在，确保容器隐藏
            const lastModifiedContainer = document.getElementById('last-modified');
            if (lastModifiedContainer) lastModifiedContainer.style.display = 'none';
        }
    } else {
        // 如果不显示，确保容器隐藏
        const lastModifiedContainer = document.getElementById('last-modified');
        if (lastModifiedContainer) lastModifiedContainer.style.display = 'none';
    }
    
    // 处理贡献者信息
    const contributorsList = document.getElementById('contributors-list');
    const contributorsContainer = document.getElementById('contributors-container');
    
    // 检查贡献者列表和容器是否存在，以及是否有贡献者数据
    if (contributorsList && contributorsContainer && docInfo.git.contributors && docInfo.git.contributors.length > 0) {
        // 判断是否显示头像 - 受github.enable影响
        const showAvatar = githubEnabled && config.extensions?.github?.show_avatar === true;
        
        // 判断是否显示贡献者列表 - 当显示头像时忽略git.enable和git.show_contributors设置
        const showContributors = showAvatar || (gitEnabled && config.extensions?.git?.show_contributors !== false);
        
        if (showContributors) {
            // 清空现有贡献者列表
            contributorsList.innerHTML = '';
            
            // 添加所有贡献者
            docInfo.git.contributors.forEach(contributor => {
                if (showAvatar) {
                    // 如果有GitHub头像
                    if (contributor.github_avatar) {
                        // 创建头像元素
                        const avatar = document.createElement('img');
                        avatar.src = contributor.github_avatar;
                        avatar.alt = contributor.name;
                        avatar.title = `${contributor.name} (${contributor.commits} commits) - 最后贡献: ${formatTimestamp(contributor.last_commit_timestamp)}`;
                        avatar.className = 'w-6 h-6 rounded-full';
                        
                        // 图片加载失败时的处理
                        avatar.onerror = function() {
                            // 移除失败的图片
                            this.parentNode?.removeChild(this);
                            
                            // 创建替代的昵称标签
                            const nameSpan = document.createElement('span');
                            nameSpan.textContent = contributor.name;
                            nameSpan.title = `${contributor.commits} commits - 最后贡献: ${formatTimestamp(contributor.last_commit_timestamp)}`;
                            nameSpan.className = 'px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-xs';
                            
                            // 如果是链接内的图片，将标签加入链接
                            if (this.parentNode && this.parentNode.tagName === 'A') {
                                this.parentNode.appendChild(nameSpan);
                            } else {
                                contributorsList.appendChild(nameSpan);
                            }
                        };
                        
                        // 设置头像链接
                        if (contributor.github_username) {
                            const avatarLink = document.createElement('a');
                            avatarLink.href = `https://github.com/${contributor.github_username}`;
                            avatarLink.target = '_blank';
                            avatarLink.title = `${contributor.name} (${contributor.commits} commits) - 最后贡献: ${formatTimestamp(contributor.last_commit_timestamp)}`;
                            avatarLink.appendChild(avatar);
                            contributorsList.appendChild(avatarLink);
                        } else {
                            contributorsList.appendChild(avatar);
                        }
                    } else {
                        // 没有GitHub头像，直接显示昵称
                        const nameSpan = document.createElement('span');
                        nameSpan.textContent = contributor.name;
                        nameSpan.title = `${contributor.commits} commits - 最后贡献: ${formatTimestamp(contributor.last_commit_timestamp)}`;
                        nameSpan.className = 'px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-xs';
                        
                        // 如果有GitHub用户名，添加链接
                        if (contributor.github_username) {
                            const nameLink = document.createElement('a');
                            nameLink.href = `https://github.com/${contributor.github_username}`;
                            nameLink.target = '_blank';
                            nameLink.appendChild(nameSpan);
                            contributorsList.appendChild(nameLink);
                        } else {
                            contributorsList.appendChild(nameSpan);
                        }
                    }
                } else {
                    // 显示昵称模式，保持不变
                    // 创建名称标签
                    const nameSpan = document.createElement('span');
                    nameSpan.textContent = contributor.name;
                    nameSpan.title = `${contributor.commits} commits - 最后贡献: ${formatTimestamp(contributor.last_commit_timestamp)}`;
                    nameSpan.className = 'px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-xs';
                    
                    // 如果有GitHub用户名，创建链接
                    if (contributor.github_username) {
                        const nameLink = document.createElement('a');
                        nameLink.href = `https://github.com/${contributor.github_username}`;
                        nameLink.target = '_blank';
                        nameLink.appendChild(nameSpan);
                        contributorsList.appendChild(nameLink);
                    } else {
                        contributorsList.appendChild(nameSpan);
                    }
                }
            });
            
            // 显示贡献者区域
            contributorsContainer.style.display = 'flex';
        } else {
            // 如果不显示贡献者，隐藏容器
            contributorsContainer.style.display = 'none';
        }
    } else {
        // 如果没有贡献者数据或元素不存在，确保容器隐藏
        if (contributorsContainer) contributorsContainer.style.display = 'none';
    }
    
    // 处理GitHub编辑链接
    // 只有当github启用且显示编辑链接时才处理
    if (githubEnabled && config.extensions?.github?.edit_link !== false) {
        const githubEditLink = document.getElementById('github-edit-link');
        const githubEditContainer = document.getElementById('github-edit-container');
        
        if (githubEditLink && githubEditContainer) {
            // 获取GitHub配置
            const repoUrl = config.extensions?.github?.repo_url || '';
            const branch = config.extensions?.github?.branch || 'main';
            
            if (repoUrl) {
                // 构建GitHub编辑链接
                const rootDir = config.document?.root_dir || 'data';
                const editUrl = `${repoUrl.replace(/\/$/, '')}/edit/${branch}/${rootDir}/${relativePath}`;
                
                githubEditLink.href = editUrl;
                
                // 显示GitHub编辑链接区域
                githubEditContainer.style.display = 'flex';
            } else {
                 // 如果没有配置repoUrl，隐藏容器
                 githubEditContainer.style.display = 'none';
            }
        } else {
            // 如果元素不存在，确保容器隐藏
            const githubEditContainer = document.getElementById('github-edit-container');
            if (githubEditContainer) githubEditContainer.style.display = 'none';
        }
    } else {
        // 如果不显示，确保容器隐藏
        const githubEditContainer = document.getElementById('github-edit-container');
        if (githubEditContainer) githubEditContainer.style.display = 'none';
    }
}

// 隐藏所有Git信息元素
function hideGitInfoElements() {
    const elements = [
        document.getElementById('last-modified'),
        document.getElementById('contributors-container'),
        document.getElementById('github-edit-container')
    ];
    
    elements.forEach(element => {
        if (element) {
            // 使用普通DOM操作替代Alpine.js
            element.style.display = 'none';
        }
    });
}

// 在mdContentLoaded事件监听器中添加处理调用
document.addEventListener('mdContentLoaded', function(event) {
    // 处理数学公式
    processKaTeXFormulas();
    
    // 处理Mermaid图表
    processMermaidDiagrams();
}); 

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

// 从iframe中生成目录
function generateTocFromIframe(iframeDoc, tocNav) {
    tocNav.innerHTML = '';
    
    // 获取配置的目录深度
    const tocDepth = config.document.toc_depth || 3;
    
    // 构建标题选择器，仅选择配置的深度内的标题
    let headingSelector = '';
    for (let i = 1; i <= tocDepth; i++) {
        headingSelector += (headingSelector ? ', ' : '') + 'h' + i;
    }
    
    // 查找iframe中符合深度要求的标题元素
    const headings = iframeDoc.querySelectorAll(headingSelector);
    
    // 是否显示标题编号
    const showNumbering = config.document.toc_numbering || false;
    // 是否忽略h1标题计数
    const ignoreH1 = config.document.toc_ignore_h1 || false;
    
    // 用于生成标题编号的计数器
    const counters = [0, 0, 0, 0, 0, 0];
    let lastLevel = 0;
    
    const headingsArray = Array.from(headings);
    
    if (headingsArray.length === 0) {
        tocNav.innerHTML = '<p class="text-gray-400 text-sm">暂无目录</p>';
        return; // 如果没有标题，直接返回
    }
    
    headingsArray.forEach((heading, index) => {
        const level = parseInt(heading.tagName.substring(1));

        // 如果标题没有ID，添加一个
        if (!heading.id) {
            heading.id = `iframe-heading-${index}`;
        }
        const id = heading.id;
        
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
        a.href = `javascript:void(0);`; // 改为使用JavaScript事件而不是锚链接
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
                            
                            // 更新URL hash但不触发页面跳转
                            history.pushState(null, null, `#${id}`);
                            
                            // 高亮当前目录项
                            document.querySelectorAll('#toc-nav a').forEach(link => link.classList.remove('active'));
                            a.classList.add('active');
                            
                            // 确保当前目录项在视图中
                            scrollTocToActiveItem(a);
                        } else {
                            console.error('未找到目标标题元素:', id);
                        }
                    } catch (error) {
                        console.error('滚动到iframe标题错误:', error);
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
}

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

// 高亮搜索关键词并跳转到指定位置
function highlightSearchTerms(searchQuery, occurrence = null) {
    const contentElement = document.getElementById('document-content');
    if (!contentElement || !searchQuery) return;
    
    // 跟踪匹配次数
    let occurrenceCount = 0;
    let targetElement = null;
    
    // 查找所有文本节点
    const textNodes = [];
    const walker = document.createTreeWalker(
        contentElement,
        NodeFilter.SHOW_TEXT,
        { 
            acceptNode: function(node) {
                // 忽略script和style标签内的文本节点
                if (node.parentNode.nodeName === 'SCRIPT' || 
                    node.parentNode.nodeName === 'STYLE' ||
                    node.parentNode.classList.contains('hljs') || // 忽略代码高亮中的文本
                    node.parentNode.nodeName === 'CODE') { 
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );
    
    // 收集所有文本节点
    let currentNode;
    while (currentNode = walker.nextNode()) {
        textNodes.push(currentNode);
    }
    
    // 存储所有创建的高亮元素，以便后续移除
    const highlightSpans = [];
    
    // 在节点中查找并高亮搜索关键词
    const targetOccurrence = occurrence ? parseInt(occurrence) : null;
    for (let i = 0; i < textNodes.length; i++) {
        const node = textNodes[i];
        const text = node.nodeValue;
        
        // 查找当前节点中的所有匹配项
        let lastIndex = 0;
        let match;
        const searchRegex = new RegExp(searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
        
        // 收集当前节点中的所有匹配
        const matches = [];
        while ((match = searchRegex.exec(text)) !== null) {
            matches.push({
                index: match.index,
                length: searchQuery.length
            });
        }
        
        // 如果有匹配项，处理高亮
        if (matches.length > 0) {
            // 从后向前处理替换，避免索引变化
            const fragment = document.createDocumentFragment();
            let lastPos = text.length;
            
            for (let j = matches.length - 1; j >= 0; j--) {
                const match = matches[j];
                occurrenceCount++;
                
                // 检查是否是目标匹配项
                const isTargetMatch = targetOccurrence && occurrenceCount === targetOccurrence;
                
                // 创建后面的文本节点
                if (match.index + match.length < lastPos) {
                    const textAfter = document.createTextNode(
                        text.substring(match.index + match.length, lastPos)
                    );
                    fragment.prepend(textAfter);
                }
                
                // 创建高亮的匹配文本
                const matchText = text.substring(match.index, match.index + match.length);
                const highlightSpan = document.createElement('span');
                highlightSpan.textContent = matchText;
                highlightSpan.className = `bg-yellow-200 dark:bg-yellow-800 search-highlight occurrence-${occurrenceCount}`;
                highlightSpan.setAttribute('data-occurrence', occurrenceCount);
                
                // 添加过渡效果
                highlightSpan.style.transition = 'background-color 0.5s ease';
                
                // 存储到数组中
                highlightSpans.push(highlightSpan);
                
                // 如果是目标匹配项，记录元素引用
                if (isTargetMatch) {
                    targetElement = highlightSpan;
                    highlightSpan.classList.add('target-highlight');
                }
                
                fragment.prepend(highlightSpan);
                
                // 更新lastPos
                lastPos = match.index;
            }
            
            // 添加最前面的文本
            if (lastPos > 0) {
                const textBefore = document.createTextNode(text.substring(0, lastPos));
                fragment.prepend(textBefore);
            }
            
            // 替换原节点
            node.parentNode.replaceChild(fragment, node);
        }
    }
    
    // 显示一个搜索结果摘要
    const summaryElement = showSearchSummary(searchQuery, occurrenceCount);
    
    // 如果有目标元素，滚动到目标位置
    if (targetElement) {
        setTimeout(() => {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // 为目标元素添加临时闪烁动画
            targetElement.style.animation = 'highlight-pulse 1.5s 3';
            targetElement.style.animationTimingFunction = 'ease-in-out';
            
            // 创建新的样式元素，而不是尝试访问现有样式表
            const styleElement = document.createElement('style');
            styleElement.textContent = `
                @keyframes highlight-pulse {
                    0% { background-color: var(--color-primary); color: white; }
                    50% { background-color: var(--bg-yellow-200, #fef9c3); color: var(--text-gray-900, #111827); }
                    100% { background-color: var(--color-primary); color: white; }
                }
                
                .dark @keyframes highlight-pulse {
                    0% { background-color: var(--color-primary); color: white; }
                    50% { background-color: var(--bg-yellow-800, #854d0e); color: var(--text-gray-100, #f3f4f6); }
                    100% { background-color: var(--color-primary); color: white; }
                }
            `;
            
            // 将样式添加到文档头部
            document.head.appendChild(styleElement);
        }, 300);
    } else if (occurrenceCount > 0) {
        // 如果没有指定目标但有匹配项，滚动到第一个匹配项
        const firstMatch = document.querySelector('.search-highlight');
        if (firstMatch) {
            setTimeout(() => {
                firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }
    
    // 5秒后移除高亮
    setTimeout(() => {
        // 淡出效果
        highlightSpans.forEach(span => {
            span.style.backgroundColor = 'transparent';
            span.style.color = span.parentNode ? 
                window.getComputedStyle(span.parentNode).color : 
                (isDarkMode() ? '#f3f4f6' : '#111827');
        });
        
        // 淡出完成后完全移除高亮标记
        setTimeout(() => {
            // 检查元素是否还在DOM中，避免错误
            highlightSpans.forEach(span => {
                if (span && span.parentNode) {
                    const parent = span.parentNode;
                    const textNode = document.createTextNode(span.textContent);
                    parent.replaceChild(textNode, span);
                }
            });
            
            // 如果摘要元素还存在，移除它
            if (summaryElement && summaryElement.parentNode) {
                summaryElement.remove();
            }
        }, 500); // 等待0.5秒淡出动画完成
    }, 5000); // 5秒后开始移除
}

// 显示搜索结果摘要
function showSearchSummary(searchQuery, totalOccurrences) {
    // 只有在有匹配项时才显示摘要
    if (totalOccurrences === 0) return null;
    
    // 创建摘要元素
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'search-summary fixed top-16 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 z-40 py-2 px-4 rounded-full shadow-md flex items-center';
    summaryDiv.style.maxWidth = '90%';
    summaryDiv.style.transition = 'opacity 0.5s ease-out';
    
    // 创建摘要内容
    summaryDiv.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-search text-primary mr-2"></i>
            <span class="text-sm">找到 <strong>${totalOccurrences}</strong> 处匹配 "<span class="text-primary">${searchQuery}</span>"</span>
            <span class="ml-1 text-xs text-gray-500">(5秒后自动消失)</span>
            <button class="ml-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // 添加到文档中
    document.body.appendChild(summaryDiv);
    
    // 添加关闭按钮事件
    const closeButton = summaryDiv.querySelector('button');
    closeButton.addEventListener('click', () => {
        summaryDiv.remove();
    });
    
    // 5秒后自动淡出
    setTimeout(() => {
        summaryDiv.style.opacity = '0';
        setTimeout(() => {
            if (summaryDiv.parentNode) {
                summaryDiv.remove();
            }
        }, 500);
    }, 5000);
    
    return summaryDiv;
}

// 初始化交叉观察器，用于更精确地检测标题的可见性
let headingObserver = null;

// 创建交叉观察器来监听标题元素
function setupHeadingIntersectionObserver(contentElement) {
    // 先断开之前的观察器
    if (headingObserver) {
        headingObserver.disconnect();
    }
    
    // 获取所有标题元素
    const headingElements = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headingElements.length === 0) return;
    
    // 创建观察选项
    const options = {
        root: null,  // 使用视口作为根
        rootMargin: '-10% 0px -80% 0px',  // 标题在视口上方20%到下方80%之间时被视为可见
        threshold: 0  // 当有任何部分可见时触发
    };
    
    // 用于记录上次激活的标题和激活时间
    let lastActivatedHeading = null;
    let lastActivationTime = 0;
    const activationDelay = 150; // 最短激活间隔时间（毫秒）
    
    // 创建观察器
    headingObserver = new IntersectionObserver((entries) => {
        // 如果正在通过scroll事件处理高亮，忽略交叉观察器的调用
        if (window.isHandlingTocScroll) return;
        
        // 当前时间
        const now = Date.now();
        
        // 找到所有当前可见的标题
        const visibleHeadings = entries
            .filter(entry => entry.isIntersecting)
            .map(entry => {
                return {
                    id: entry.target.id,
                    level: parseInt(entry.target.tagName.substring(1)),
                    ratio: entry.intersectionRatio,
                    target: entry.target
                };
            });
        
        // 如果有可见标题，更新活动标题
        if (visibleHeadings.length > 0) {
            // 优先选择层级更高的标题
            visibleHeadings.sort((a, b) => {
                // 先按级别排序（h1, h2比h3优先）
                if (a.level !== b.level) {
                    return a.level - b.level;
                }
                // 再按可见比例排序
                return b.ratio - a.ratio;
            });
            
            // 获取最优先的标题
            const topHeading = visibleHeadings[0];
            
            // 防止频繁切换：检查是否与上次激活的标题相同且时间间隔很短
            if (lastActivatedHeading === topHeading.id && now - lastActivationTime < activationDelay) {
                return; // 时间间隔太短，忽略此次更新
            }
            
            // 防止相邻标题快速切换：如果当前有激活标题，检查层级关系
            const activeLink = document.querySelector('#toc-nav a.active');
            if (activeLink && lastActivatedHeading) {
                const activeHeadingId = activeLink.dataset.headingId;
                const activeHeadingLevel = parseInt(activeLink.dataset.level || '0');
                
                // 如果当前激活的是更高级别的标题（如h2），且新标题是其子级（如h3）且时间间隔很短
                if (activeHeadingLevel < topHeading.level && now - lastActivationTime < activationDelay * 2) {
                    // 检查层级关系
                    if (window.headingHierarchy && 
                        window.headingHierarchy[topHeading.id] && 
                        window.headingHierarchy[topHeading.id].parent === activeHeadingId) {
                        // 保持父级标题的高亮
                        return;
                    }
                }
            }
            
            // 更新活动标题
            updateActiveHeading(topHeading.id);
            
            // 更新最后激活的标题和时间
            lastActivatedHeading = topHeading.id;
            lastActivationTime = now;
        }
    }, options);
    
    // 观察所有标题元素
    headingElements.forEach(heading => {
        headingObserver.observe(heading);
    });
}

// 处理URL中的锚点，应用自定义滚动偏移
function handleUrlHash(hash) {
    if (!hash || hash.length <= 1) return;
    
    // 移除开头的#号
    const targetId = hash.substring(1);
    const targetElement = document.getElementById(targetId);
    
    if (targetElement) {
        // 计算目标位置，使标题显示在屏幕上方30%的位置
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
        const offset = window.innerHeight * 0.3; // 屏幕高度的30%
        
        // 平滑滚动到目标位置
        window.scrollTo({
            top: targetPosition - offset,
            behavior: 'smooth'
        });
        
        // 高亮对应的目录项
        const tocItem = document.querySelector(`#toc-nav a[data-heading-id="${targetId}"]`);
        if (tocItem) {
            document.querySelectorAll('#toc-nav a').forEach(link => link.classList.remove('active'));
            tocItem.classList.add('active');
            scrollTocToActiveItem(tocItem);
            
            // 如果启用了动态展开功能，展开目录
            if (config.document.toc_dynamic_expand) {
                const level = parseInt(tocItem.dataset.level || '0');
                // 展开父级目录
                ensureParentHeadingChildrenVisible(targetId);
                // 展开子目录
                expandChildHeadings(targetId, level);
            }
        }
    }
}

// 设置目录宽度调整功能
function setupTocResizer() {
    const tocContainer = document.getElementById('toc-container');
    if (!tocContainer) return;

    // 创建拖动器元素
    const resizer = document.createElement('div');
    resizer.className = 'toc-resizer';
    tocContainer.appendChild(resizer);

    let startX, startWidth;

    // 鼠标按下事件
    resizer.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        let cssVar = getComputedStyle(document.documentElement).getPropertyValue('--toc-width');
        if (cssVar) {
            startWidth = parseInt(cssVar, 10);
        } else {
            startWidth = parseInt(getComputedStyle(tocContainer).width, 10);
        }
        tocContainer.classList.add('resizing');
        resizer.classList.add('resizing');
        
        // 添加临时事件监听器
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });

    // 鼠标移动事件处理
    function handleMouseMove(e) {
        const width = startWidth - (e.clientX - startX);
        if (width >= 150 && width <= 400) { // 限制最小和最大宽度
            document.documentElement.style.setProperty('--toc-width', `${width}px`);
        }
    }

    // 鼠标释放事件处理
    function handleMouseUp() {
        tocContainer.classList.remove('resizing');
        resizer.classList.remove('resizing');
        
        // 移除临时事件监听器
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }

    // 双击恢复默认宽度
    resizer.addEventListener('dblclick', (e) => {
        e.preventDefault();
        // 直接恢复为配置的默认宽度
        document.documentElement.style.setProperty('--toc-width', config.layout.toc_width);
    });
}

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
            card.className = `admonition admonition-${type} border-l-4 pl-4 py-2 my-4 bg-gray-50 rounded-r-md`;
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