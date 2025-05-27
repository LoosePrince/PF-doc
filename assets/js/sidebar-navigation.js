/**
 * 侧边栏导航模块
 * 负责生成和管理侧边栏导航、目录(TOC)以及相关的交互功能
 */
import config from '/config.js';
import { getDocumentPagePath } from './path-utils.js';

// 存储模块数据
let pathData = null;
let currentRoot = null;
let mainFunctions = null;

/**
 * 初始化侧边栏导航模块
 * @param {Object} data - 文档路径数据
 * @param {string} root - 当前根目录
 * @param {Object} functions - 主模块提供的函数集合
 */
export function initSidebarNavigation(data, root, functions) {
    pathData = data;
    currentRoot = root;
    mainFunctions = functions;
}

// 从主函数集合中获取需要的函数
const getMainFunction = (name) => {
    return mainFunctions && mainFunctions[name] ? mainFunctions[name] : (() => {
        console.warn(`Function ${name} not found in mainFunctions`);
        return null;
    });
};

// 创建便捷的函数引用
const parseUrlPath = () => getMainFunction('parseUrlPath')();
const generateNewUrl = (...args) => getMainFunction('generateNewUrl')(...args);
const loadContentFromUrl = () => getMainFunction('loadContentFromUrl')();
const loadDocument = (...args) => getMainFunction('loadDocument')(...args);
const resolvePathFromData = (...args) => getMainFunction('resolvePathFromData')(...args);
const isIndexFile = (...args) => getMainFunction('isIndexFile')(...args);
const debounce = (...args) => getMainFunction('debounce')(...args);

// EasyDocument - 文档页面处理
// 管理文档页面的主要功能，包括URL路由、文档加载、导航生成等


// 侧边栏相关函数
// 这些函数将由用户从document-page.js移动到这里
// 生成侧边栏导航
function generateSidebar(node) {
    const nav = document.getElementById('sidebar-nav');
    
    // 显示加载动画
    showSidebarLoading();
    
    // 使用平滑切换动画
    setTimeout(async () => {
        await fadeOutLoadingAndShowContent(nav, () => {
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
                    // 生成去掉root参数但保留当前文档完整路径的URL
                    const currentParsed = parseUrlPath();
                    
                    // 构造完整路径：如果当前在root模式下，需要加上root前缀
                    let fullPath = currentParsed.path;
                    if (currentParsed.root && currentParsed.path && !currentParsed.path.startsWith(currentParsed.root + '/')) {
                        fullPath = currentParsed.root + '/' + currentParsed.path;
                    }
                    
                    const backUrl = generateNewUrl(fullPath, null, currentParsed.anchor);
                    backLink.href = backUrl;
                    backLink.className = 'flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-primary';
                    backLink.innerHTML = '<i class="fas fa-arrow-left mr-2"></i> 返回完整目录';
                    
                    // 添加点击事件处理，切换到完整目录视图
                    backLink.addEventListener('click', function(e) {
                        e.preventDefault();
                        
                        // 先保存要跳转的完整路径
                        const targetFullPath = fullPath;
                        const targetAnchor = currentParsed.anchor;
                        
                        // 更新URL去掉root参数，但保持完整路径
                        window.history.pushState({path: targetFullPath}, '', backUrl);
                        
                        // 重置currentRoot为null（切换到完整目录模式）
                        currentRoot = null;
                        
                        // 同步更新其他模块的currentRoot
                        const initUtilsFunction = getMainFunction('initUtils');
                        const initSundryFunction = getMainFunction('initSundryModule');
                        const updateActiveHeadingFunction = getMainFunction('updateActiveHeading');
                        
                        if (initUtilsFunction) initUtilsFunction(pathData, null);
                        if (initSundryFunction && updateActiveHeadingFunction) {
                            initSundryFunction(pathData, null, updateActiveHeadingFunction);
                        }
                        
                        // 重新生成侧边栏（不带root参数）
                        generateSidebar(pathData);
                        
                        // 延迟重新加载内容，确保侧边栏生成完成
                        setTimeout(() => {
                            // 直接加载目标文档而不是通过loadContentFromUrl
                            // 这样可以避免URL解析可能的时序问题
                            if (targetFullPath) {
                                // 根据path.json解析实际的文件路径
                                const { actualPath } = resolvePathFromData(targetFullPath);
                                const loadPath = actualPath || targetFullPath;
                                
                                // 直接加载文档
                                loadDocument(loadPath);
                                
                                // 更新页面标题和面包屑
                                const titleFunction = getMainFunction('updatePageTitle');
                                const breadcrumbFunction = getMainFunction('generateBreadcrumb');
                                const gitInfoFunction = getMainFunction('updateGitInfo');
                                
                                if (titleFunction) titleFunction(targetFullPath);
                                if (breadcrumbFunction) breadcrumbFunction(targetFullPath);
                                if (gitInfoFunction) gitInfoFunction(targetFullPath);
                                
                                // 处理锚点滚动
                                if (targetAnchor) {
                                    setTimeout(() => {
                                        const handleUrlHashFunction = getMainFunction('handleUrlHash');
                                        if (handleUrlHashFunction) {
                                            handleUrlHashFunction(`#${targetAnchor}`);
                                        }
                                    }, 500);
                                }
                            } else {
                                // 如果没有路径，加载默认页面
                                loadContentFromUrl();
                            }
                        }, 100);
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
                    window.location.href = getDocumentPagePath();
                }
            });
            
            nav.appendChild(rootHeader);
            
            const ul = createNavList(node.children, 0);
            nav.appendChild(ul);
            
            // 根据配置处理默认文件夹展开
            handleFolderExpandMode(false);
        }, true, 'li'); // 使用交错动画，选择器为 'li'
        
        // 移除这行，因为动画已经在 fadeOutLoadingAndShowContent 中处理了
        // addStaggerAnimation(nav, 'li');
        
        // 侧边栏生成完成后，高亮当前文档
        setTimeout(() => {
            highlightCurrentDocument();
        }, 100); // 稍微延迟确保DOM完全渲染
    }, config.animation?.general?.min_duration || 300); // 根据配置设置加载动画显示时间
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
    
    // 对于模式1和2（展开全部），始终无条件应用，忽略auto_collapse设置
    if (expandMode === 1 || expandMode === 2) {
        if (expandMode === 1) {
            // 展开全部第一级文件夹
            folderDivs.forEach(folderDiv => {
                toggleFolder(folderDiv, true);
            });
        } else {
            // 展开全部文件夹（所有层级）
            expandAllFolders();
        }
        return; // 处理完模式1和2后直接返回
    }
    
    // 对于模式3和4，判断当前位置来决定是否应用
    let shouldApplyExpandMode = true;
    
    // 检查是否启用了自动折叠功能且当前不是首次加载（有当前文档）
    if (config.navigation.auto_collapse && !isSubRoot) {
        // 使用新的URL解析函数获取当前路径
        const { path: currentPath, root } = parseUrlPath();
        
        // 如果存在当前路径，且不是根目录文档，则不应用默认展开模式
        if (currentPath) {
            // 如果路径不为空且不是首页文档，则认为不需要应用默认展开模式
            const isHomePage = isIndexFile(currentPath) && !currentPath.includes('/');
            shouldApplyExpandMode = isHomePage;
        }
    }
    
    // 如果不应用展开模式，直接退出
    if (!shouldApplyExpandMode) {
        return;
    }
    
    // 处理模式3和4的逻辑
    switch(expandMode) {
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
        
        // 检查是否为文件夹：有子文件或有索引文件的节点都视为文件夹
        if ((item.children && item.children.length > 0) || item.index) {
            // 目录
            const div = document.createElement('div');
            div.classList.add('flex', 'items-center', 'cursor-pointer', 'hover:text-primary', 'dark:hover:text-primary', 'folder-title');
            div.classList.add(`folder-level-${level}`); // 添加层级类名，用于CSS控制缩进
            
            const icon = document.createElement('i');
            // 如果文件夹只有索引文件而没有子文件，显示文件夹图标而不是展开图标
            const hasChildren = item.children && item.children.length > 0;
            if (hasChildren) {
                icon.classList.add('fas', 'fa-chevron-right', 'text-xs', 'mr-2', 'transition-transform');
            }
            div.appendChild(icon);
            
            // 创建span元素
            const span = document.createElement('span');
            span.textContent = item.title;
            
            // 存储文件夹路径，用于高亮匹配
            // 通过索引页路径推断文件夹路径
            if (item.index && item.index.path) {
                const pathParts = item.index.path.split('/');
                // 如果最后一个部分是索引文件，则移除它得到文件夹路径
                if (pathParts.length > 0) {
                    const lastPart = pathParts[pathParts.length - 1];
                    if (isIndexFile(lastPart)) {
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
            // 如果没有children数组，则初始化为空数组
            const children = item.children || [];
            const filteredChildren = item.index ? 
                children.filter(child => child.path !== item.index.path) : 
                children;
                
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
    
    // 使用新的URL格式
    a.href = generateNewUrl(item.path, currentRoot);
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
        
        // 确保当前链接在侧边栏视图中
        scrollSidebarToActiveItem(a);
        
        // 使用新的URL格式更新浏览器地址栏
        const newUrl = generateNewUrl(item.path, currentRoot);
        window.history.pushState({path: item.path}, '', newUrl);
        
        // 使用原始路径，让loadDocument函数根据path.json自动解析
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
            // 确保根目录标题在侧边栏视图中
            scrollSidebarToActiveItem(folderDiv);
        }
    } else {
        folderDiv.classList.add('active-folder');
        // 确保文件夹展开
        toggleFolder(folderDiv, true);
        // 展开所有父级文件夹
        expandParentFolders(folderDiv);
        // 确保文件夹在侧边栏视图中
        scrollSidebarToActiveItem(folderDiv);
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
    
    // 更新URL
    // 使用与面包屑导航相同的逻辑：直接使用索引文件路径
    const targetUrl = generateNewUrl(item.index.path, currentRoot);
    window.history.pushState({path: item.index.path}, '', targetUrl);
    
    // 但实际加载的是索引文件
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
        const shouldExpand = forceExpand || !isExpanded;
        
        // 如果强制展开，或者需要切换状态
        if ((forceExpand && !isExpanded) || (!forceExpand)) {
            subUl.style.display = shouldExpand ? 'block' : 'none';
            icon.classList.toggle('rotate-90', shouldExpand);
            
            // 如果是展开操作且动画已启用，为子项添加从头开始的交错动画
            if (shouldExpand && config.animation?.sidebar?.enable !== false) {
                applyFreshStaggerAnimation(subUl);
            }
        }
    }
}

// 为文件夹子项应用从头开始的交错动画
function applyFreshStaggerAnimation(container) {
    const items = container.querySelectorAll('li');
    if (items.length === 0) return;
    
    items.forEach((item, index) => {
        // 清除之前的动画样式
        item.classList.remove('stagger-animation');
        item.style.animationDelay = '';
        item.style.animationDuration = '';
        
        // 使用 requestAnimationFrame 确保样式重置后再添加新动画
        requestAnimationFrame(() => {
            item.classList.add('stagger-animation');
            
            // 根据配置设置动画时长
            const animationDuration = config.animation?.sidebar?.duration || 200;
            item.style.animationDuration = `${animationDuration}ms`;
            
            // 根据配置获取交错延迟时间，从头开始计算
            const baseDelay = config.animation?.sidebar?.stagger_delay || 50;
            
            // 重新开始的动画延迟计算
            let delay;
            if (index < 8) {
                // 前8个元素，间隔稍短一些以快速显示
                delay = (index + 1) * (baseDelay / 1000);
            } else {
                // 8个以上的元素，间隔更短，避免等待过久
                delay = 0.4 + (index - 7) * (baseDelay * 0.5 / 1000);
                delay = Math.min(delay, 0.8); // 最大延迟0.8秒
            }
            
            item.style.animationDelay = `${delay}s`;
        });
    });
}

// 设置当前激活的链接或文件夹
function setActiveLink(activeElement, isFolder = false) {
    // 判断是否需要先折叠其他文件夹 - 仅当folder_expand_mode不是1或2时
    const expandMode = config.navigation.folder_expand_mode || 5;
    const shouldAutoCollapse = config.navigation.auto_collapse && expandMode > 2;
    
    // 如果启用了自动折叠功能且不是全局展开模式，先折叠所有文件夹
    if (shouldAutoCollapse) {
        collapseAllFolders();
    }
    
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
        scrollSidebarToActiveItem(activeElement);
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
                    // 展开文件夹（会自动应用优化的动画）
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

// 更新"返回完整目录"链接
function updateBackToFullDirectoryLink() {
    if (!currentRoot) return; // 如果不在子目录模式，不需要更新
    
    // 查找包含"返回完整目录"文本的链接
    const backLink = document.querySelector('#sidebar-nav a[href*="#/"]');
    if (!backLink || !backLink.textContent.includes('返回完整目录')) return;
    
    // 获取当前解析的路径信息
    const currentParsed = parseUrlPath();
    
    // 构造完整路径：如果当前在root模式下，需要加上root前缀
    let fullPath = currentParsed.path;
    if (currentParsed.root && currentParsed.path && !currentParsed.path.startsWith(currentParsed.root + '/')) {
        fullPath = currentParsed.root + '/' + currentParsed.path;
    }
    
    // 生成新的返回链接URL
    const backUrl = generateNewUrl(fullPath, null, currentParsed.anchor);
    backLink.href = backUrl;
    
    // 更新点击事件处理器中使用的路径
    const newClickHandler = function(e) {
        e.preventDefault();
        
        // 先保存要跳转的完整路径
        const targetFullPath = fullPath;
        const targetAnchor = currentParsed.anchor;
        
        // 更新URL去掉root参数，但保持完整路径
        window.history.pushState({path: targetFullPath}, '', backUrl);
        
        // 重置currentRoot为null（切换到完整目录模式）
        currentRoot = null;
        
        // 同步更新其他模块的currentRoot
        const initUtilsFunction = getMainFunction('initUtils');
        const initSundryFunction = getMainFunction('initSundryModule');
        const updateActiveHeadingFunction = getMainFunction('updateActiveHeading');
        
        if (initUtilsFunction) initUtilsFunction(pathData, null);
        if (initSundryFunction && updateActiveHeadingFunction) {
            initSundryFunction(pathData, null, updateActiveHeadingFunction);
        }
        
        // 重新生成侧边栏（不带root参数）
        generateSidebar(pathData);
        
        // 延迟重新加载内容，确保侧边栏生成完成
        setTimeout(() => {
            // 直接加载目标文档而不是通过loadContentFromUrl
            // 这样可以避免URL解析可能的时序问题
            if (targetFullPath) {
                // 根据path.json解析实际的文件路径
                const { actualPath } = resolvePathFromData(targetFullPath);
                const loadPath = actualPath || targetFullPath;
                
                // 直接加载文档
                loadDocument(loadPath);
                
                // 更新页面标题和面包屑
                const titleFunction = getMainFunction('updatePageTitle');
                const breadcrumbFunction = getMainFunction('generateBreadcrumb');
                const gitInfoFunction = getMainFunction('updateGitInfo');
                
                if (titleFunction) titleFunction(targetFullPath);
                if (breadcrumbFunction) breadcrumbFunction(targetFullPath);
                if (gitInfoFunction) gitInfoFunction(targetFullPath);
                
                // 处理锚点滚动
                if (targetAnchor) {
                    setTimeout(() => {
                        const handleUrlHashFunction = getMainFunction('handleUrlHash');
                        if (handleUrlHashFunction) {
                            handleUrlHashFunction(`#${targetAnchor}`);
                        }
                    }, 500);
                }
            } else {
                // 如果没有路径，加载默认页面
                loadContentFromUrl();
            }
        }, 100);
    };
    
    // 移除旧的事件监听器并添加新的
    const clonedBackLink = backLink.cloneNode(true);
    backLink.parentNode.replaceChild(clonedBackLink, backLink);
    clonedBackLink.addEventListener('click', newClickHandler);
}

// 高亮当前文档在侧边栏中的链接
function highlightCurrentDocument() {
    const { path: currentPath, root } = parseUrlPath();
    if (!currentPath) return;
    
    // 更新"返回完整目录"链接（如果在子目录模式下）
    updateBackToFullDirectoryLink();
    
    // 清除所有现有的高亮状态
    document.querySelectorAll('#sidebar-nav a').forEach(link => link.classList.remove('active'));
    document.querySelectorAll('#sidebar-nav div.folder-title').forEach(div => div.classList.remove('active-folder'));
    
    let decodedPath = decodeURIComponent(currentPath);
    
    // 如果有root参数且path不是完整路径，需要构造完整路径
    if (root && !decodedPath.startsWith(root + '/')) {
        decodedPath = root + '/' + decodedPath;
    }
    
    // 根据path.json解析实际的文件路径
    const { actualPath, isDirectory } = resolvePathFromData(decodedPath);
    const actualDecodedPath = actualPath || decodedPath;
    
    // 如果在子根目录模式下，需要查找相对路径
    let searchPath = actualDecodedPath;
    let originalSearchPath = decodedPath;
    if (currentRoot && actualDecodedPath.startsWith(currentRoot + '/')) {
        // 在子根目录模式下，侧边栏显示的是相对路径
        searchPath = actualDecodedPath.substring(currentRoot.length + 1);
    }
    if (currentRoot && decodedPath.startsWith(currentRoot + '/')) {
        originalSearchPath = decodedPath.substring(currentRoot.length + 1);
    }
    
    // 优先处理文件夹路径的情况
    if (isDirectory || (!decodedPath.includes('.') && actualPath && actualPath.includes('.'))) {
        // 这是一个文件夹路径，需要高亮对应的文件夹
        const folderPath = originalSearchPath.replace(/\/$/, ''); // 移除结尾的斜杠
        const folderDiv = document.querySelector(`#sidebar-nav div.folder-title[data-folder-path="${folderPath}"]`);
        if (folderDiv) {
            setActiveLink(folderDiv, true);
            return; // 成功找到文件夹，直接返回
        }
    }
    
    // 高亮侧边栏并处理文件夹展开
    const isIndexFileCheck = isIndexFile(searchPath.split('/').pop() || '');
    if (isIndexFileCheck && searchPath.includes('/')) {
        const folderPath = searchPath.substring(0, searchPath.lastIndexOf('/'));
        const folderDiv = document.querySelector(`#sidebar-nav div.folder-title[data-folder-path="${folderPath}"]`);
        if (folderDiv) {
            setActiveLink(folderDiv, true);
        }
    } else {
        // 先尝试用相对路径查找
        let docLink = document.querySelector(`#sidebar-nav a[data-path="${searchPath}"]`);
        // 如果找不到，再尝试用完整路径查找
        if (!docLink) {
            docLink = document.querySelector(`#sidebar-nav a[data-path="${actualDecodedPath}"]`);
        }
        // 再尝试用原始路径查找
        if (!docLink) {
            docLink = document.querySelector(`#sidebar-nav a[data-path="${decodedPath}"]`);
        }
        // 最后尝试用原始相对路径查找
        if (!docLink) {
            docLink = document.querySelector(`#sidebar-nav a[data-path="${originalSearchPath}"]`);
        }
        if (docLink) {
            setActiveLink(docLink);
        }
    }
}

// 折叠所有文件夹
function collapseAllFolders() {
    // 如果folder_expand_mode是1或2，不执行折叠操作
    const expandMode = config.navigation.folder_expand_mode || 5;
    if (expandMode === 1 || expandMode === 2) {
        return;
    }
    
    // 使用新的URL解析函数获取当前路径
    const { path: currentPath, root } = parseUrlPath();
    
    // 如果没有当前文档路径，则折叠所有文件夹
    if (!currentPath) {
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
        return;
    }
    
    // 如果有当前文档路径，先找出需要保持展开状态的文件夹（当前文档的父级文件夹）
    const pathParts = currentPath.split('/');
    const foldersToKeepOpen = new Set();
    
    // 构建需要保持打开的文件夹路径集合
    let parentPath = '';
    for (let i = 0; i < pathParts.length - 1; i++) {
        parentPath += (i > 0 ? '/' : '') + pathParts[i];
        foldersToKeepOpen.add(parentPath);
    }
    
    // 折叠所有非当前文档父级文件夹
    const allFolderDivs = document.querySelectorAll('#sidebar-nav div.folder-title');
    
    allFolderDivs.forEach(folderDiv => {
        const folderPath = folderDiv.dataset.folderPath || '';
        const icon = folderDiv.querySelector('i');
        const subUl = folderDiv.nextElementSibling;
        
        if (subUl && subUl.tagName === 'UL' && subUl.style.display !== 'none') {
            // 检查是否是当前文档的父级文件夹
            const shouldKeepOpen = foldersToKeepOpen.has(folderPath);
            
            if (!shouldKeepOpen) {
                // 折叠非父级文件夹
                subUl.style.display = 'none';
                // 更新图标
                if (icon) {
                    icon.classList.remove('rotate-90');
                }
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

// 滚动左侧侧边栏，确保活动项在视图中
function scrollSidebarToActiveItem(activeItem) {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer || !activeItem) return;
    
    // 计算元素在侧边栏中的相对位置
    const itemRect = activeItem.getBoundingClientRect();
    const containerRect = sidebarContainer.getBoundingClientRect();
    
    // 检查元素是否 *完全* 在视图中
    const isFullyInView = (
        itemRect.top >= containerRect.top &&
        itemRect.bottom <= containerRect.bottom
    );
    
    // 如果不在视图中，滚动侧边栏
    if (!isFullyInView) {
        // 获取当前滚动位置
        const currentScrollTop = sidebarContainer.scrollTop;
        
        // 计算活动项相对于容器内容顶部的位置
        // 使用getBoundingClientRect()来获取准确的相对位置
        const itemTop = itemRect.top - containerRect.top + currentScrollTop;
        
        // 计算目标滚动位置：将活动项滚动到侧边栏容器的中间位置
        const targetScrollTop = itemTop - sidebarContainer.clientHeight / 2 + activeItem.offsetHeight / 2;
        
        // 平滑滚动到该位置
        sidebarContainer.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth'
        });
    }
}

// 目录(TOC)相关函数
// 这些函数将由用户从document-page.js移动到这里

// 生成右侧目录 (TOC)
function generateToc(contentElement) {
    const tocNav = document.getElementById('toc-nav');
    if (!tocNav) return;

    // 显示TOC加载动画
    showTocLoading();

    // 使用平滑切换动画
    setTimeout(async () => {
        const headings = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        // 存储已使用的ID
        const usedIds = new Set();
        
        // 处理标题ID
        headings.forEach((heading, index) => {
            if (!heading.id) {
                // 如果没有ID，生成一个基于文本内容的ID
                const text = heading.textContent.trim();
                let baseId = text
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9\u4e00-\u9fff\-_]/g, '') // 保留中文字符
                    .replace(/^-+|-+$/g, ''); // 去掉开头和结尾的连字符
                
                if (!baseId) {
                    baseId = `heading-${index}`;
                }
                
                // 确保ID唯一
                let uniqueId = baseId;
                let counter = 1;
                while (usedIds.has(uniqueId)) {
                    uniqueId = `${baseId}-${counter}`;
                    counter++;
                }
                usedIds.add(uniqueId);
                heading.id = uniqueId;
            } else {
                // 如果已有ID但发生冲突，生成唯一ID
                let uniqueId = heading.id;
                let counter = 1;
                while (usedIds.has(uniqueId)) {
                    uniqueId = `${heading.id}-${counter}`;
                    counter++;
                }
                usedIds.add(uniqueId);
                
                // 设置新ID
                heading.id = uniqueId;
            }
        });
        
        const headingsArray = Array.from(headings);
        
        if (headingsArray.length === 0) {
            await fadeOutLoadingAndShowContent(tocNav, () => {
                tocNav.innerHTML = '<p class="text-gray-400 text-sm">暂无目录</p>';
            });
            return;
        }

        await fadeOutLoadingAndShowContent(tocNav, () => {
            // 生成目录
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
                
                // 生成新格式的链接：保留当前文档路径，添加锚点
                const currentParsed = parseUrlPath();
                const tocUrl = generateNewUrl(currentParsed.path, currentParsed.root, id);
                a.href = tocUrl;
                
                a.innerHTML = prefix + heading.textContent;  // 使用innerHTML以支持编号+标题文本
                a.classList.add('block', 'text-sm', 'py-1', 'hover:text-primary', 'dark:hover:text-primary');
                a.style.marginLeft = `${(level - 1) * 0.75}rem`; // 缩进
                a.dataset.headingId = id;
                a.dataset.level = level;
                
                // 如果级别大于tocDepth且动态展开功能开启，则隐藏（但仍然生成）
                if (level > tocDepth && dynamicExpand) {
                    li.classList.add('hidden');
                    li.dataset.hidden = 'true';
                    // 为超出深度的元素添加标记，避免应用动画
                    li.classList.add('toc-beyond-depth');
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
                        // 计算目标位置，使标题显示在屏幕上方30%的位置
                        const targetPosition = targetHeading.getBoundingClientRect().top + window.scrollY;
                        const offset = window.innerHeight * 0.30; // 屏幕高度的30%
                        window.scrollTo({
                            top: targetPosition - offset,
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
        }, true, '.toc-item:not(.toc-beyond-depth)'); // 使用交错动画，排除超出深度的元素
        
        // 移除这行，因为动画已经在 fadeOutLoadingAndShowContent 中处理了
        // addStaggerAnimation(tocNav, '.toc-item');
    }, config.animation?.general?.min_duration || 300); // 根据配置设置加载动画显示时间
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
                // 如果是超出深度的元素，移除可能的动画样式以确保立即显示
                if (item.classList.contains('toc-beyond-depth')) {
                    item.style.animationDelay = '';
                    item.style.animationDuration = '';
                    item.classList.remove('stagger-animation');
                }
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
        // 获取当前滚动位置
        const currentScrollTop = tocContainer.scrollTop;
        
        // 计算活动项相对于容器内容顶部的位置
        // 使用getBoundingClientRect()来获取准确的相对位置
        const itemTop = itemRect.top - containerRect.top + currentScrollTop;
        
        // 计算目标滚动位置：将活动项滚动到TOC容器的中间位置
        const targetScrollTop = itemTop - tocContainer.clientHeight / 2 + activeItem.offsetHeight / 2;
        
        // 平滑滚动到该位置
        tocContainer.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth'
        });
    }
}

// 共用的工具函数
// 这些函数将由用户从document-page.js移动到这里

// 加载动画辅助函数
function showSidebarLoading() {
    const nav = document.getElementById('sidebar-nav');
    
    // 检查是否启用骨架屏动画
    const enableSkeleton = config.animation?.sidebar?.enable_skeleton !== false;
    
    if (enableSkeleton) {
        nav.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">正在加载目录...</div>
            </div>
            <div class="skeleton-loading px-3">
                ${generateSkeletonItems(6)}
            </div>
        `;
        
        // 应用骨架屏动画持续时间
        const skeletonDuration = config.animation?.sidebar?.skeleton_duration || 1500;
        const skeletonContainer = nav.querySelector('.skeleton-loading');
        if (skeletonContainer) {
            skeletonContainer.style.setProperty('--skeleton-duration', `${skeletonDuration}ms`);
        }
    } else {
        nav.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">正在加载目录...</div>
            </div>
        `;
    }
}

function showTocLoading() {
    const tocNav = document.getElementById('toc-nav');
    
    // 检查是否启用骨架屏动画
    const enableSkeleton = config.animation?.toc?.enable_skeleton !== false;
    
    if (enableSkeleton) {
        tocNav.innerHTML = `
            <div class="toc-loading">
                <div class="loading-text" style="margin-bottom: 1rem; font-size: 0.75rem;">正在生成目录...</div>
                ${generateTocSkeletonItems(4)}
            </div>
        `;
        
        // 应用骨架屏动画持续时间
        const skeletonDuration = config.animation?.toc?.skeleton_duration || 1500;
        const skeletonContainer = tocNav.querySelector('.toc-loading');
        if (skeletonContainer) {
            skeletonContainer.style.setProperty('--skeleton-duration', `${skeletonDuration}ms`);
        }
    } else {
        tocNav.innerHTML = `
            <div class="toc-loading">
                <div class="loading-text" style="margin-bottom: 1rem; font-size: 0.75rem;">正在生成目录...</div>
            </div>
        `;
    }
}

// 平滑切换到实际内容
function fadeOutLoadingAndShowContent(container, contentGenerator, useStaggerAnimation = false, staggerSelector = 'li') {
    return new Promise((resolve) => {
        // 检查配置中的动画开关
        const animationEnabled = useStaggerAnimation && (
            (container.id === 'sidebar-nav' && config.animation?.sidebar?.enable !== false) ||
            (container.id === 'toc-nav' && config.animation?.toc?.enable !== false) ||
            (!container.id && true) // 其他容器默认启用
        );
        
        // 为加载动画元素添加淡出类
        const loadingContainer = container.querySelector('.loading-container');
        const skeletonLoading = container.querySelector('.skeleton-loading, .toc-loading');
        
        if (loadingContainer) loadingContainer.classList.add('fade-out');
        
        // 检查是否启用了骨架屏动画，如果启用了才添加淡出效果
        if (skeletonLoading) {
            const isSkeletonEnabled = (container.id === 'sidebar-nav' && config.animation?.sidebar?.enable_skeleton !== false) ||
                                     (container.id === 'toc-nav' && config.animation?.toc?.enable_skeleton !== false) ||
                                     (!container.id); // 其他容器默认启用
            
            if (isSkeletonEnabled) {
                skeletonLoading.classList.add('fade-out');
            }
        }
        
        // 等待淡出动画完成
        setTimeout(() => {
            // 清空容器并生成新内容
            container.innerHTML = '';
            
            if (animationEnabled) {
                // 先暂时隐藏容器，防止内容闪现
                container.style.visibility = 'hidden';
                
                // 生成内容
                contentGenerator();
                
                // 立即为所有项目添加动画类
                const items = container.querySelectorAll(staggerSelector);
                items.forEach((item, index) => {
                    item.classList.add('stagger-animation');
                    
                    // 根据配置设置动画时长
                    const animationDuration = container.id === 'sidebar-nav' 
                        ? (config.animation?.sidebar?.duration || 200)
                        : (config.animation?.toc?.duration || 200);
                    item.style.animationDuration = `${animationDuration}ms`;
                    
                    // 根据配置获取交错延迟时间
                    const baseDelay = container.id === 'sidebar-nav' 
                        ? (config.animation?.sidebar?.stagger_delay || 50)
                        : (config.animation?.toc?.stagger_delay || 50);
                    
                    // 动态计算延迟时间
                    let delay;
                    if (index < 10) {
                        delay = (index + 1) * (baseDelay / 1000);
                    } else if (index < 20) {
                        delay = 0.5 + (index - 9) * (baseDelay * 0.6 / 1000);
                    } else {
                        delay = Math.min(0.8 + (index - 19) * (baseDelay * 0.4 / 1000), 1.2);
                    }
                    
                    item.style.animationDelay = `${delay}s`;
                });
                
                // 使用requestAnimationFrame确保DOM更新完成后再显示容器
                requestAnimationFrame(() => {
                    container.style.visibility = 'visible';
                });
            } else {
                // 生成内容
                contentGenerator();
                
                // 使用普通淡入动画或直接显示
                const newContent = container.children;
                for (let i = 0; i < newContent.length; i++) {
                    newContent[i].classList.add('content-container');
                    // 使用requestAnimationFrame确保类被应用
                    requestAnimationFrame(() => {
                        newContent[i].classList.add('fade-in');
                    });
                }
            }
            
            resolve();
        }, 400); // 等待淡出动画完成（0.4s）
    });
}

// 为导航项添加交错动画
function addStaggerAnimation(container, selector = 'li, .nav-item') {
    const items = container.querySelectorAll(selector);
    items.forEach((item, index) => {
        // 为所有元素应用交错动画
        item.classList.add('stagger-animation');
        
        // 动态计算延迟时间
        // 前面的元素间隔较短，后面的元素间隔逐渐减少，避免等待时间过长
        let delay;
        if (index < 10) {
            // 前10个元素，间隔0.05秒
            delay = (index + 1) * 0.05;
        } else if (index < 20) {
            // 11-20个元素，间隔0.03秒
            delay = 0.5 + (index - 9) * 0.03;
        } else {
            // 20个以上，间隔0.02秒，最大延迟1.2秒
            delay = Math.min(0.8 + (index - 19) * 0.02, 1.2);
        }
        
        item.style.animationDelay = `${delay}s`;
    });
}

function generateSkeletonItems(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
        const textClass = ['short', 'medium', 'long'][i % 3];
        html += `
            <div class="skeleton-item">
                <div class="skeleton-icon"></div>
                <div class="skeleton-text ${textClass}"></div>
            </div>
        `;
    }
    return html;
}

function generateTocSkeletonItems(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
        const indent = i % 3 === 0 ? '' : (i % 3 === 1 ? 'ml-4' : 'ml-8');
        html += `
            <div class="toc-skeleton-item ${indent}">
                <div class="toc-skeleton-level"></div>
                <div class="toc-skeleton-text" style="width: ${60 + (i % 3) * 15}%"></div>
            </div>
        `;
    }
    return html;
}

// 导出所有函数
export {
    // 侧边栏相关
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
    
    // 目录(TOC)相关
    generateToc,
    expandChildHeadings,
    ensureParentHeadingChildrenVisible,
    updateActiveHeading,
    handleTocScrollHighlight,
    scrollTocToActiveItem,
    
    // 工具函数
    showSidebarLoading,
    showTocLoading,
    fadeOutLoadingAndShowContent,
    addStaggerAnimation,
    generateSkeletonItems,
    generateTocSkeletonItems
}; 