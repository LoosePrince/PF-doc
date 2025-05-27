/**
 * 工具函数模块
 * 提供整个应用程序中使用的通用工具函数
 */
import config from '/config.js';
import { generateNewUrl as pathGenerateNewUrl } from './path-utils.js';

// 全局变量
let pathData = null;
let currentRoot = null;

// 初始化工具模块（允许其他模块设置全局数据）
export function initUtils(data, root) {
    pathData = data;
    currentRoot = root;
}

// 通用工具函数
// 这些函数将由用户从各个文件移动到这里

// URL 和路径相关工具函数

/**
 * 解析URL路径，支持新的URL格式
 * 新格式: main.html#root/path/to/file.md#anchor
 * 兼容格式: main.html#/path/to/file.md#anchor (无root)
 * 旧格式兼容: main.html?path=xxx&root=xxx#anchor
 */
/**
 * 根据path.json解析路径，返回实际文件路径
 * @param {string} cleanPath 无扩展名的路径
 * @returns {object} { actualPath: 实际文件路径, isDirectory: 是否为目录 }
 */
function resolvePathFromData(cleanPath) {
    if (!pathData || !cleanPath) {
        return { actualPath: cleanPath, isDirectory: false };
    }
    
    // 递归查找路径对应的节点
    function findNode(node, targetPath) {
        if (!node) return null;
        
        // 移除扩展名的函数
        const removeExtension = (path) => {
            return path.replace(/\.(md|html)$/i, '');
        };
        
        // 检查当前节点的文件
        if (node.children) {
            for (const child of node.children) {
                if (child.path) {
                    const childCleanPath = removeExtension(child.path);
                    if (childCleanPath === targetPath) {
                        return { node: child, isDirectory: !!child.children };
                    }
                }
                
                // 递归检查子节点
                const result = findNode(child, targetPath);
                if (result) return result;
            }
        }
        
        // 检查节点的索引文件
        if (node.index && node.index.path) {
            const indexCleanPath = removeExtension(node.index.path);
            if (indexCleanPath === targetPath) {
                return { node: node.index, isDirectory: false };
            }
        }
        
        // 检查是否匹配目录路径
        if (node.path) {
            const nodeCleanPath = removeExtension(node.path);
            if (nodeCleanPath === targetPath) {
                // 这是一个目录，返回其索引文件
                if (node.index) {
                    return { node: node.index, isDirectory: true };
                }
            }
        }
        
        return null;
    }
    
    const result = findNode(pathData, cleanPath);
    if (result) {
        return {
            actualPath: result.node.path,
            isDirectory: result.isDirectory
        };
    }
    
    // 如果没找到，检查是否是目录路径，尝试查找目录的索引文件
    if (cleanPath && !cleanPath.includes('.')) {
        // 查找目录节点
        function findDirNode(node, targetPath) {
            if (!node) return null;
            
            // 检查当前节点是否为目标目录
            if (node.path === targetPath && node.index) {
                return node;
            }
            
            // 递归检查子节点
            if (node.children) {
                for (const child of node.children) {
                    const result = findDirNode(child, targetPath);
                    if (result) return result;
                }
            }
            
            return null;
        }
        
        const dirNode = findDirNode(pathData, cleanPath);
        if (dirNode && dirNode.index) {
            return {
                actualPath: dirNode.index.path,
                isDirectory: true
            };
        }
    }
    
    // 如果都没找到，返回原路径
    return { actualPath: cleanPath, isDirectory: false };
}

function parseUrlPath() {
    const url = new URL(window.location.href);
    const hash = decodeURIComponent(url.hash.substring(1)); // 去掉#并解码
    
    let path = '';
    let root = null;
    let anchor = '';
    
    if (hash) {
        // 处理新格式: #root/path/to/file#anchor 或 #/path/to/file#anchor (无扩展名)
        if (hash.startsWith('/')) {
            // 无root的情况: #/path/to/file#anchor
            const anchorIndex = hash.indexOf('#', 1);
            if (anchorIndex !== -1) {
                path = hash.substring(1, anchorIndex); // 去掉开头的/
                anchor = hash.substring(anchorIndex + 1);
            } else {
                path = hash.substring(1); // 去掉开头的/
            }
        } else {
            // 有root的情况: #root/path/to/file#anchor
            const anchorIndex = hash.indexOf('#');
            let pathPart = anchorIndex !== -1 ? hash.substring(0, anchorIndex) : hash;
            
            if (anchorIndex !== -1) {
                anchor = hash.substring(anchorIndex + 1);
            }
            
            // 解析root和path
            const slashIndex = pathPart.indexOf('/');
            if (slashIndex !== -1) {
                root = pathPart.substring(0, slashIndex);
                path = pathPart.substring(slashIndex + 1);
            } else {
                // 只有root，没有具体文档
                root = pathPart;
                path = '';
            }
        }
    } else {
        // 旧格式兼容: ?path=xxx&root=xxx
        path = url.searchParams.get('path') || '';
        root = url.searchParams.get('root') || null;
    }
    
    return { path, root, anchor };
}

/**
 * 生成新格式URL（不包含扩展名）
 * @param {string} path 文档路径
 * @param {string} root 根目录（可选）
 * @param {string} anchor 锚点（可选）
 * @returns {string} 新格式URL
 */
function generateNewUrl(path, root = null, anchor = '') {
    return pathGenerateNewUrl(path, root, anchor);
}

// 查找目录对应的索引页路径
function findDirectoryIndexPath(dirPath) {
    // 标准化路径，确保没有结尾的斜杠
    dirPath = dirPath.replace(/\/$/, '');
    
    // 检查pathData中是否存在对应的目录节点
    function findNode(node, currentPath) {
        // 路径比较应该不区分大小写
        const normalizedDirPath = dirPath.toLowerCase();
        const normalizedNodePath = (node.path || '').toLowerCase();
        
        // 如果有索引文件，直接返回
        if (normalizedNodePath === normalizedDirPath && node.index) {
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
    // 创建可能的索引文件路径数组
    const possiblePaths = [];
    for (const indexName of config.document.index_pages) {
        possiblePaths.push(`${dirPath}/${indexName}`);
    }
    
    // 返回第一个可能的路径，后续在loadDocument中会检查文件是否存在
    // 如果需要更精确，可以在此处使用fetch检查文件是否存在，但会增加额外网络请求
    if (possiblePaths.length > 0) {
        return possiblePaths[0];
    }
    
    return null;
}

// 文件和文档相关工具函数

// 检查文件名是否为索引文件
function isIndexFile(filename) {
    return config.document.index_pages.some(indexName => 
        filename.toLowerCase() === indexName.toLowerCase());
}

// 检查文件是否有支持的扩展名
function hasSupportedExtension(filename) {
    if (!filename) return false;
    return config.document.supported_extensions.some(ext => 
        filename.toLowerCase().endsWith(ext.toLowerCase()));
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

// 用户界面和主题相关工具函数

// 检查当前是否为暗黑模式
function isDarkMode() {
    return document.documentElement.classList.contains('dark');
}

// 更新页面标题
function updatePageTitle(path) {
    const activeLink = document.querySelector(`#sidebar-nav a[data-path="${path}"]`);
    let title = activeLink ? activeLink.textContent : '文档';
    document.title = `${title} - ${config.site.name}`;
}

// DOM 和元素相关工具函数

// 处理URL中的锚点，应用自定义滚动偏移
function handleUrlHash(hash) {
    if (!hash || hash.length <= 1) return;
    
    // 移除开头的#号
    const targetId = hash.substring(1);
    
    // 首先尝试在主文档中查找元素（普通Markdown文章）
    const targetElement = document.getElementById(targetId);
    
    if (targetElement) {
        // 在主文档中找到元素，按原有逻辑处理
        // 计算目标位置，使标题显示在屏幕上方30%的位置
        const targetPosition = targetElement.getBoundingClientRect().top + window.scrollY;
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
            // scrollTocToActiveItem函数在sidebar-navigation模块中
            // 这里暂时注释，需要时可以从外部传入
            // scrollTocToActiveItem(tocItem);
            
            // 如果启用了动态展开功能，展开目录
            if (config.document.toc_dynamic_expand) {
                const level = parseInt(tocItem.dataset.level || '0');
                // 这些函数在sidebar-navigation模块中
                // ensureParentHeadingChildrenVisible(targetId);
                // expandChildHeadings(targetId, level);
            }
        }
    } else {
        // 在主文档中未找到，尝试在iframe中查找（HTML文档）
        const iframe = document.querySelector('.iframe-container iframe');
        if (iframe) {
            // 创建重试函数，等待iframe加载完成
            const tryScrollToIframeElement = (retryCount = 0) => {
                const maxRetries = 5;
                
                if (iframe.contentWindow && iframe.contentWindow.document) {
                    try {
                        const iframeTargetElement = iframe.contentWindow.document.getElementById(targetId);
                        if (iframeTargetElement) {
                            // 在iframe中找到目标元素
                            // 获取iframe在页面中的位置
                            const iframeRect = iframe.getBoundingClientRect();
                            // 获取标题在iframe中的位置
                            const headingRect = iframeTargetElement.getBoundingClientRect();
                            
                            // 计算标题在页面中的绝对位置 = iframe在页面中的位置 + 标题在iframe中的位置
                            const absoluteHeadingTop = window.scrollY + iframeRect.top + headingRect.top;
                            const offset = window.innerHeight * 0.3; // 屏幕高度的30%
                            
                            // 滚动主页面到标题位置
                            window.scrollTo({
                                top: absoluteHeadingTop - offset,
                                behavior: 'smooth'
                            });
                            
                            // 高亮对应的目录项
                            const tocItem = document.querySelector(`#toc-nav a[data-heading-id="${targetId}"]`);
                            if (tocItem) {
                                document.querySelectorAll('#toc-nav a').forEach(link => link.classList.remove('active'));
                                tocItem.classList.add('active');
                                // scrollTocToActiveItem函数在sidebar-navigation模块中
                                // scrollTocToActiveItem(tocItem);
                            }
                            return; // 成功找到并滚动，退出
                        }
                    } catch (error) {
                        console.warn('访问iframe内容失败:', error);
                    }
                }
                
                // 如果还没有找到元素且未达到最大重试次数，继续重试
                if (retryCount < maxRetries) {
                    setTimeout(() => tryScrollToIframeElement(retryCount + 1), 200);
                } else {
                    console.warn(`未找到锚点元素: ${targetId}`);
                }
            };
            
            // 开始尝试滚动
            tryScrollToIframeElement();
        } else {
            console.warn(`未找到锚点元素: ${targetId}`);
        }
    }
}

// 添加CSS样式
function addHeadingStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        /* 标题链接样式 */
        .heading-link {
            font-size: 0.8em;
            vertical-align: middle;
        }
        
        /* 淡入淡出动画 */
        .animate-fade-in {
            animation: fadeIn 0.3s ease-in-out;
        }
        
        .animate-fade-out {
            animation: fadeOut 0.3s ease-in-out;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `;
    document.head.appendChild(styleElement);
}

// 添加对旧式"#heading-x"链接的支持
function setupLegacyHeadingLinks() {
    // 在加载完页面后，创建旧式heading-x的锚点映射
    window.addEventListener('load', () => {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        // 创建旧式ID映射（heading-0, heading-1, heading-2...）到新ID
        const headingMap = new Map();
        headings.forEach((heading, index) => {
            const legacyId = `heading-${index}`;
            const actualId = heading.id;
            
            // 如果ID不同，记录映射
            if (legacyId !== actualId) {
                headingMap.set(legacyId, actualId);
            }
        });
        
        // 如果有映射存在，处理锚点变更
        if (headingMap.size > 0) {
            // 检查当前URL中是否有旧式锚点
            const hash = window.location.hash;
            if (hash && hash.match(/^#heading-\d+$/)) {
                const legacyId = hash.substring(1); // 移除#符号
                const actualId = headingMap.get(legacyId);
                
                if (actualId) {
                    // 替换URL中的锚点，但不触发滚动（防止页面跳动）
                    const newUrl = window.location.href.replace(hash, `#${actualId}`);
                    window.history.replaceState(null, '', newUrl);
                    
                    // 延迟滚动到正确位置
                    setTimeout(() => {
                        const targetHeading = document.getElementById(actualId);
                        if (targetHeading) {
                            // 计算目标位置，使标题显示在屏幕上方30%的位置
                            const targetPosition = targetHeading.getBoundingClientRect().top + window.scrollY;
                            const offset = window.innerHeight * 0.3; // 屏幕高度的30%
                            
                            window.scrollTo({
                                top: targetPosition - offset,
                                behavior: 'smooth'
                            });
                        }
                    }, 100);
                }
            }
            
            // 添加全局click事件监听器，拦截旧式锚点链接点击
            document.addEventListener('click', (e) => {
                // 查找被点击的a标签
                const link = e.target.closest('a');
                if (!link) return;
                
                const href = link.getAttribute('href');
                if (!href) return;
                
                // 检查是否是旧式锚点链接（内部或外部）
                if (href.match(/^#heading-\d+$/) || href.match(/\?.*#heading-\d+$/)) {
                    e.preventDefault(); // 阻止默认导航
                    
                    // 提取旧式锚点ID
                    const hashMatch = href.match(/#(heading-\d+)$/);
                    if (hashMatch && hashMatch[1]) {
                        const legacyId = hashMatch[1];
                        const actualId = headingMap.get(legacyId);
                        
                        if (actualId) {
                            // 构建新的链接URL
                            let newHref = '';
                            if (href.startsWith('#')) {
                                // 内部锚点链接
                                newHref = `#${actualId}`;
                            } else {
                                // 带查询参数的链接
                                newHref = href.replace(/#heading-\d+$/, `#${actualId}`);
                            }
                            
                            // 更新URL并滚动到目标位置
                            window.history.pushState(null, '', newHref);
                            
                            const targetHeading = document.getElementById(actualId);
                            if (targetHeading) {
                                // 计算目标位置，使标题显示在屏幕上方30%的位置
                                const targetPosition = targetHeading.getBoundingClientRect().top + window.scrollY;
                                const offset = window.innerHeight * 0.3; // 屏幕高度的30%
                                
                                window.scrollTo({
                                    top: targetPosition - offset,
                                    behavior: 'smooth'
                                });
                            }
                        }
                    }
                }
            });
        }
    });
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

// 事件处理相关工具函数

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

// 将文件路径转换为URL基础路径
function filePathToUrl(path) {
    return generateNewUrl(path, currentRoot);
}

/**
 * 格式化时间戳
 */
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

// 导出所有工具函数
export {
    // URL 和路径相关
    filePathToUrl,
    resolvePathFromData,
    findDirectoryIndexPath,
    parseUrlPath,
    generateNewUrl,
    
    // 文件和文档相关
    isIndexFile,
    hasSupportedExtension,
    getTitleFromPath,
    findIndexPath,
    getAllDocumentLinks,
    
    // 用户界面和主题相关
    isDarkMode,
    updatePageTitle,
    
    // 时间和格式化相关
    formatTimestamp,
    
    // DOM 和元素相关
    handleUrlHash,
    addHeadingStyles,
    setupLegacyHeadingLinks,
    setupTocResizer,
    
    // 事件处理相关
    debounce
}; 