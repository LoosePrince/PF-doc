/**
 * 杂项模块
 * 包含搜索高亮、Git信息、面包屑导航等功能
 */

// 导入依赖的工具函数
import config from '/config.js';
import { formatTimestamp, filePathToUrl } from './utils.js';

// 需要从主文件导入的函数
let pathData = null;
let currentRoot = null;

// 交叉观察器变量
let headingObserver = null;

// 从主文件导入的函数
let updateActiveHeading = null;

// 初始化函数，从主文件获取数据
export function initSundryModule(data, root, updateActiveHeadingFn) {
    pathData = data;
    currentRoot = root;
    updateActiveHeading = updateActiveHeadingFn;
}

// 导入路径工具
import { generateNewUrl as pathGenerateNewUrl } from './path-utils.js';

/**
 * 生成新格式URL
 */
function generateNewUrl(path, root = null, anchor = '') {
    return pathGenerateNewUrl(path, root, anchor);
}

/**
 * 检查是否为索引文件
 */
function isIndexFile(filename) {
    return config.document.index_pages.some(indexName => 
        filename.toLowerCase() === indexName.toLowerCase());
}

/**
 * 从路径获取标题
 */
function getTitleFromPath(path) {
    // 从pathData中查找对应的节点标题
    const node = findNodeByPath(pathData, path);
    return node ? node.title : null;
}

/**
 * 查找路径对应的节点
 */
function findNodeByPath(rootNode, targetPath) {
    if (!rootNode || !targetPath) return null;
    
    function traverse(node, currentPath) {
        // 检查当前节点的路径
        if (node.path === targetPath) {
            return node;
        }
        
        // 检查索引文件
        if (node.index && node.index.path === targetPath) {
            return node.index;
        }
        
        // 递归检查子节点
        if (node.children) {
            for (const child of node.children) {
                const found = traverse(child, currentPath + '/' + child.name);
                if (found) return found;
            }
        }
        
        return null;
    }
    
    return traverse(rootNode, '');
}

// ===== 搜索高亮模块 =====

/**
 * 高亮搜索关键词并跳转到指定位置
 */
export function highlightSearchTerms(searchQuery, occurrence = null) {
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

/**
 * 显示搜索结果摘要
 */
export function showSearchSummary(searchQuery, totalOccurrences) {
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

// ===== Git信息模块 =====

/**
 * 查找文档信息对象（文件节点或索引对象）
 */
export function findDocInfoByPath(node, targetPath) {
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

/**
 * 更新Git和GitHub相关信息
 */
export function updateGitInfo(relativePath) {
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
    if (gitEnabled && config.extensions?.git?.show_last_modified !== false && docInfo.git.last_modified) {
        const lastModified = docInfo.git.last_modified;
        const modifiedTime = document.getElementById('modified-time');
        const modifiedAuthor = document.getElementById('modified-author');
        const lastModifiedContainer = document.getElementById('last-modified');
        
        if (modifiedTime && modifiedAuthor && lastModifiedContainer) {
            const formattedDate = formatTimestamp(lastModified.timestamp, { relative: true });
            
            modifiedTime.textContent = formattedDate;
            modifiedAuthor.textContent = lastModified.author;
            modifiedTime.title = formatTimestamp(lastModified.timestamp);
            
            lastModifiedContainer.style.display = 'flex';
        } else {
            const lastModifiedContainer = document.getElementById('last-modified');
            if (lastModifiedContainer) lastModifiedContainer.style.display = 'none';
        }
    } else {
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
    const githubEditContainer = document.getElementById('github-edit-container');
    const githubEditLink = document.getElementById('github-edit-link');
    
    if (githubEnabled && config.extensions?.github?.show_edit_link !== false && 
        config.extensions?.github?.repo_url && githubEditContainer && githubEditLink) {
        
        const repoUrl = config.extensions.github.repo_url;
        const branch = config.extensions.github.branch || 'main';
        // 获取文档根目录配置，并确保路径格式正确
        const rootDir = config.document?.root_dir || 'data';
        // 移除根目录路径开头的斜杠（如果有）
        const cleanRootDir = rootDir.replace(/^\/+/, '');
        const editUrl = `${repoUrl}/edit/${branch}/${cleanRootDir}/${relativePath}`;
        
        githubEditLink.href = editUrl;
        githubEditContainer.style.display = 'flex';
    } else {
        if (githubEditContainer) githubEditContainer.style.display = 'none';
    }
}

/**
 * 隐藏Git信息元素
 */
export function hideGitInfoElements() {
    const elementsToHide = ['last-modified', 'contributors-container', 'github-edit-container'];
    
    elementsToHide.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
        }
    });
}

// ===== 面包屑导航模块 =====

/**
 * 生成面包屑导航
 */
export function generateBreadcrumb(path) {
    const container = document.getElementById('breadcrumb-container');
    container.innerHTML = '';
    if (!config.navigation.breadcrumb) return;
    
    // 分解路径，提取目录结构
    const parts = path.split('/');
    const breadcrumbParts = [];
    
    // 添加首页
    let homeUrl = generateNewUrl('', currentRoot);
    
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
            let rootUrl = '';
            if (rootNode.index) {
                rootUrl = generateNewUrl(rootNode.index.path, currentRoot);
            } else {
                rootUrl = generateNewUrl('', currentRoot);
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
    
    // 确定起始索引
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
        
        // 构建当前路径
        if (currentRoot) {
            currentPath = currentRoot + '/' + parts.slice(startIndex, i + 1).join('/');
        } else {
            currentPath += (i > 0 ? '/' : '') + part;
        }
        
        // 获取当前路径的标题
        const title = getTitleFromPath(currentPath) || part;
        
        // 避免添加重复的标题
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
    
    // 创建面包屑元素
    const breadcrumbWrapper = document.createElement('div');
    breadcrumbWrapper.className = 'breadcrumb-wrapper';
    breadcrumbWrapper.style.cssText = 'display: flex; align-items: center; width: 100%; overflow: hidden;';
    
    const breadcrumbContent = document.createElement('div');
    breadcrumbContent.className = 'breadcrumb-content';
    breadcrumbContent.style.cssText = 'display: flex; align-items: center; overflow: hidden; white-space: nowrap;';
    
    breadcrumbWrapper.appendChild(breadcrumbContent);
    container.appendChild(breadcrumbWrapper);
    
    // 创建所有面包屑项目
    breadcrumbParts.forEach((item, index) => {
        const itemWrapper = document.createElement('div');
        itemWrapper.className = 'breadcrumb-item';
        itemWrapper.style.cssText = 'display: flex; align-items: center; flex-shrink: 0;';
        
        // 添加分隔符（除了第一项）
        if (index > 0) {
            const separator = document.createElement('span');
            separator.textContent = ' / ';
            separator.classList.add('mx-1', 'text-gray-400');
            itemWrapper.appendChild(separator);
        }
        
        if (item.isLast) {
            // 当前页面（最后一项）
            const span = document.createElement('span');
            span.textContent = item.text;
            span.classList.add('text-gray-800', 'dark:text-white', 'font-medium');
            itemWrapper.appendChild(span);
        } else {
            // 链接项
            const link = document.createElement('a');
            link.href = item.url;
            link.textContent = item.text;
            
            // 为根目录添加特殊样式
            if (item.isRoot) {
                link.classList.add('hover:text-primary', 'font-medium');
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
            
            itemWrapper.appendChild(link);
        }
        
        breadcrumbContent.appendChild(itemWrapper);
    });
} 

// 创建交叉观察器来监听标题元素
export function setupHeadingIntersectionObserver(contentElement) {
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