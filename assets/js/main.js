/**
 * 主应用入口文件
 * 负责初始化应用和加载配置
 */
import config from '/config.js';
import { initDarkMode, initThemeEvents } from './theme.js';
import { generateNavLinks, generateMobileNavLinks, updateFooterElements } from './navigation.js';
import documentCache from './document-cache.js';

// 搜索数据
let searchData = null;

// 应用初始化
export async function initApp() {
    // 设置页面标题和元数据
    document.title = `${config.site.name} - ${config.site.title}`;
    document.querySelector('meta[name="description"]').content = config.site.description;
    document.querySelector('meta[name="keywords"]').content = config.site.keywords;
    document.querySelector('link[rel="icon"]').href = config.appearance.favicon;
    
    // 初始化主题
    initDarkMode(config);
    
    // 应用主题色
    const themeColor = config.appearance.theme_color;
    document.documentElement.style.setProperty('--color-primary', themeColor);
    
    // 提取主题色的RGB值并设置为CSS变量
    const rgbValues = hexToRgb(themeColor);
    if (rgbValues) {
        document.documentElement.style.setProperty('--color-primary-rgb', `${rgbValues.r}, ${rgbValues.g}, ${rgbValues.b}`);
    }
    
    // 应用字体设置
    if (config.appearance.font_family) {
        document.body.style.fontFamily = config.appearance.font_family;
    }
    
    // 加载头部和底部
    await loadHeaderAndFooter();
    
    // 初始化搜索功能
    initSearch();
    
    // Alpine.js初始化问题修复
    fixAlpineInit();
}

// 将十六进制颜色转换为RGB
function hexToRgb(hex) {
    // 移除#前缀（如果有）
    hex = hex.replace(/^#/, '');
    
    // 解析短格式（例如 #fff）
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
    
    // 解析十六进制颜色值
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // 返回RGB对象
    return { r, g, b };
}

// 加载头部和底部
async function loadHeaderAndFooter() {
    try {
        // 加载头部
        if (config.layout.show_header) {
            if (config.layout.use_custom_header) {
                await loadCustomHeader();
            } else {
                loadDefaultHeader();
            }
        }
        
        // 加载底部
        if (config.layout.show_footer) {
            if (config.layout.use_custom_footer) {
                await loadCustomFooter();
            } else {
                loadDefaultFooter();
            }
        }
    } catch (error) {
        console.error('加载头部或底部失败:', error);
    }
}

// 加载自定义头部
async function loadCustomHeader() {
    const headerFile = config.layout.header_file;
    const headerResponse = await fetch(headerFile);
    const headerHtml = await headerResponse.text();
    document.getElementById('header-container').innerHTML = headerHtml;
    
    // 延迟执行绑定切换按钮事件，确保DOM元素已加载完成
    setTimeout(() => {
        bindThemeToggleEvents();
        bindSearchEvents(); // 绑定搜索事件
    }, 100);
}

// 加载默认头部
function loadDefaultHeader() {
    document.getElementById('header-container').innerHTML = `
    <header class="bg-white dark:bg-gray-800 shadow-sm h-16" x-data="{ mobileMenuOpen: false }">
        <div class="container mx-auto px-4 h-full relative">
            <div class="flex justify-between items-center h-full">
                <a href="${config.site.base_url}">
                    <div class="flex items-center space-x-2">
                        <img src="${config.appearance.logo}" alt="${config.site.name}" class="site-logo h-8 w-8">
                        <span class="text-lg font-bold">
                            ${formatSiteName(config.site.name)}
                        </span>
                    </div>
                </a>
                <div class="flex items-center space-x-4">
                    <nav class="hidden md:flex space-x-6">
                        ${generateNavLinks(config.navigation.nav_links)}
                    </nav>
                    
                    <!-- 搜索按钮 -->
                    <button id="search-button" class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none">
                        <i class="fas fa-search text-gray-600 dark:text-gray-300"></i>
                    </button>
                    
                    <button id="dark-mode-toggle" class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none">
                        <i class="fas fa-moon dark:hidden text-gray-600"></i>
                        <i class="fas fa-sun hidden dark:block text-yellow-300"></i>
                    </button>
                    
                    <!-- 移动端菜单按钮 -->
                    <button @click="mobileMenuOpen = !mobileMenuOpen" class="md:hidden w-10 h-10 rounded flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none">
                        <i class="fas fa-bars text-gray-600 dark:text-gray-300"></i>
                    </button>
                </div>
            </div>
            
            <!-- 移动端菜单 -->
            <div x-show="mobileMenuOpen" 
                x-transition:enter="transition ease-out duration-200" 
                x-transition:enter-start="opacity-0 -translate-y-2" 
                x-transition:enter-end="opacity-100 translate-y-0" 
                x-transition:leave="transition ease-in duration-150" 
                x-transition:leave-start="opacity-100 translate-y-0" 
                x-transition:leave-end="opacity-0 -translate-y-2" 
                class="md:hidden py-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800 absolute left-0 right-0 z-50 shadow-md" 
                style="display: none; top: 4rem;">
                <div class="container mx-auto px-4">
                    <nav class="flex flex-col space-y-4">
                        ${generateMobileNavLinks(config.navigation.nav_links)}
                    </nav>
                </div>
            </div>
        </div>
    </header>
    
    <!-- 搜索模态窗口 -->
    <div id="search-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 hidden">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
            <div class="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">搜索文档</h3>
                <button id="close-search-modal" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    <i class="fas fa-times text-gray-600 dark:text-gray-300"></i>
                </button>
            </div>
            <div class="p-4">
                <div class="relative">
                    <input id="search-input" type="text" placeholder="输入关键词..." class="w-full px-4 py-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary">
                    <button id="do-search" class="absolute right-2 top-2 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
                <div id="search-results" class="mt-4 max-h-96 overflow-y-auto">
                    <!-- 搜索结果将在这里显示 -->
                </div>
            </div>
        </div>
    </div>`;
    
    // 绑定主题切换事件
    setTimeout(() => {
        bindThemeToggleEvents();
        bindSearchEvents(); // 绑定搜索事件
    }, 100);
}

// 绑定主题切换按钮事件
function bindThemeToggleEvents() {
    const toggleButtons = document.querySelectorAll('[id^="dark-mode-toggle"]');
    
    toggleButtons.forEach(button => {
        // 移除已有的事件监听器，避免重复绑定
        button.removeEventListener('click', handleThemeToggle);
        
        // 添加新的事件监听器
        button.addEventListener('click', handleThemeToggle);
    });
    
    // 更新按钮的初始状态
    import('./theme.js').then(({ updateThemeToggleButton }) => {
        updateThemeToggleButton();
    });
}

// 初始化搜索功能
function initSearch() {
    // 加载搜索数据
    loadSearchData();
    
    // 绑定搜索相关事件
    bindSearchEvents();
}

// 加载搜索数据
async function loadSearchData() {
    try {
        const response = await fetch('/search.json');
        if (response.ok) {
            searchData = await response.json();
            console.log('搜索数据加载成功，共 ' + searchData.length + ' 条记录');
        } else {
            console.warn('搜索数据加载失败: ' + response.status);
        }
    } catch (error) {
        console.error('加载搜索数据出错:', error);
    }
}

// 绑定搜索相关事件
function bindSearchEvents() {
    // 搜索按钮点击事件
    const searchButton = document.getElementById('search-button');
    if (searchButton) {
        searchButton.addEventListener('click', openSearchModal);
    }
    
    // 关闭搜索模态窗口按钮事件
    const closeButton = document.getElementById('close-search-modal');
    if (closeButton) {
        closeButton.addEventListener('click', closeSearchModal);
    }
    
    // 执行搜索按钮点击事件
    const doSearchButton = document.getElementById('do-search');
    if (doSearchButton) {
        doSearchButton.addEventListener('click', performSearch);
    }
    
    // 输入框事件
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        // 回车键事件
        searchInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                performSearch();
            }
        });
        
        // 如果启用了实时搜索，添加输入事件监听器
        if (config.search.search_on_type) {
            // 使用防抖函数包装搜索功能，避免频繁搜索
            const debouncedSearch = debounce(function() {
                if (searchInput.value.trim().length >= config.search.min_chars) {
                    performSearch();
                } else {
                    // 清空搜索结果
                    const searchResultsContainer = document.getElementById('search-results');
                    if (searchResultsContainer) {
                        searchResultsContainer.innerHTML = `<p class="text-gray-500 dark:text-gray-400 text-center py-4">请输入至少${config.search.min_chars}个字符</p>`;
                    }
                }
            }, 300); // 300ms的防抖延迟
            
            // 在输入时执行防抖搜索
            searchInput.addEventListener('input', debouncedSearch);
        }
    }
    
    // 点击模态窗口外部关闭
    const searchModal = document.getElementById('search-modal');
    if (searchModal) {
        searchModal.addEventListener('click', function(event) {
            if (event.target === searchModal) {
                closeSearchModal();
            }
        });
    }
}

// 防抖函数，用于限制高频率事件的触发
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            func.apply(context, args);
        }, wait);
    };
}

// 打开搜索模态窗口
function openSearchModal() {
    const modal = document.getElementById('search-modal');
    if (modal) {
        modal.classList.remove('hidden');
        
        // 聚焦到搜索输入框
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            setTimeout(() => {
                searchInput.focus();
            }, 100);
        }
    }
}

// 关闭搜索模态窗口
function closeSearchModal() {
    const modal = document.getElementById('search-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// 执行搜索
function performSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResultsContainer = document.getElementById('search-results');
    
    if (!searchInput || !searchResultsContainer) return;
    
    const query = searchInput.value.trim().toLowerCase();
    
    if (query.length < config.search.min_chars) {
        searchResultsContainer.innerHTML = `<p class="text-gray-500 dark:text-gray-400 text-center py-4">请输入至少${config.search.min_chars}个字符</p>`;
        return;
    }
    
    // 检查搜索数据和缓存文档
    const hasSearchData = searchData && searchData.length > 0;
    const persistentCachedPaths = documentCache.getPersistentCachedPaths();
    const preloadedPaths = documentCache.getPreloadedPaths();
    const hasCachedDocs = persistentCachedPaths.length > 0 || preloadedPaths.length > 0;
    
    if (!hasSearchData && !hasCachedDocs) {
        searchResultsContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">搜索数据未加载，请稍后重试</p>';
        return;
    }
    
    // 存储搜索结果
    let results = [];
    
    // 搜索静态索引
    if (hasSearchData) {
        const indexResults = searchData.filter(item => {
            const titleMatch = item.title.toLowerCase().includes(query);
            const contentMatch = item.content.toLowerCase().includes(query);
            const keywordMatch = item.keywords && item.keywords.some(keyword => keyword.toLowerCase().includes(query));
            
            return titleMatch || contentMatch || keywordMatch;
        });
        
        // 将索引结果添加到总结果中
        results = results.concat(indexResults);
    }
    
    // 搜索缓存文档（如果有）
    if (hasCachedDocs && config.search.search_cached) {
        // 在页面上显示正在搜索缓存的提示
        const searchingIndicator = document.createElement('div');
        searchingIndicator.id = 'searching-indicator';
        searchingIndicator.className = 'text-gray-500 dark:text-gray-400 text-center py-2 italic';
        searchingIndicator.innerHTML = '正在搜索缓存文档...';
        
        // 如果结果为空，则直接显示搜索中提示
        if (results.length === 0) {
            searchResultsContainer.innerHTML = '';
            searchResultsContainer.appendChild(searchingIndicator);
        } else {
            // 如果已有结果，则添加到结果下方
            searchResultsContainer.appendChild(searchingIndicator);
        }
        
        // 由于可能搜索时间较长，使用setTimeout确保UI不会被阻塞
        setTimeout(() => {
            // 从缓存中搜索
            const cachedResults = searchCachedDocuments(query);
            
            // 合并结果并去重
            results = mergeAndDedupResults(results, cachedResults);
            
            // 显示最终搜索结果
            displaySearchResults(results, query, searchResultsContainer);
            
            // 移除搜索中提示
            const indicator = document.getElementById('searching-indicator');
            if (indicator) {
                indicator.remove();
            }
        }, 10);
    } else {
        // 如果没有缓存文档，直接显示结果
        displaySearchResults(results, query, searchResultsContainer);
    }
}

// 搜索缓存的文档
function searchCachedDocuments(query) {
    const results = [];
    
    // 获取持久缓存和预加载缓存的路径
    const persistentCachedPaths = documentCache.getPersistentCachedPaths();
    const preloadedPaths = documentCache.getPreloadedPaths();
    
    // 搜索持久缓存
    persistentCachedPaths.forEach(path => {
        const cachedDoc = documentCache.cache[path];
        if (!cachedDoc || !cachedDoc.content) return;
        
        const content = cachedDoc.content;
        
        // 简单解析标题（从内容中提取第一个标题）
        let title = getTitleFromContent(content) || path.split('/').pop() || '未命名文档';
        
        // 检查是否匹配
        const titleLower = title.toLowerCase();
        const contentLower = content.toLowerCase();
        
        const titleMatch = titleLower.includes(query);
        const contentMatch = contentLower.includes(query);
        
        if (titleMatch || contentMatch) {
            results.push({
                path: path,
                title: title,
                content: content,
                keywords: [], // 缓存文档没有关键词
                fromCache: true, // 标记为来自缓存
                cacheType: 'persistent' // 标记为持久缓存
            });
        }
    });
    
    // 搜索预加载缓存
    preloadedPaths.forEach(path => {
        const content = documentCache.preloadCache[path];
        if (!content) return;
        
        // 简单解析标题（从内容中提取第一个标题）
        let title = getTitleFromContent(content) || path.split('/').pop() || '未命名文档';
        
        // 检查是否匹配
        const titleLower = title.toLowerCase();
        const contentLower = content.toLowerCase();
        
        const titleMatch = titleLower.includes(query);
        const contentMatch = contentLower.includes(query);
        
        if (titleMatch || contentMatch) {
            results.push({
                path: path,
                title: title,
                content: content,
                keywords: [], // 缓存文档没有关键词
                fromCache: true, // 标记为来自缓存
                cacheType: 'preloaded' // 标记为预加载缓存
            });
        }
    });
    
    return results;
}

// 从文档内容中提取标题
function getTitleFromContent(content) {
    // 尝试提取第一个h1标题
    const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i) || content.match(/# (.*?)(?:\n|$)/);
    if (h1Match) return h1Match[1].trim();
    
    // 尝试提取title标签
    const titleMatch = content.match(/<title[^>]*>(.*?)<\/title>/i);
    if (titleMatch) return titleMatch[1].trim();
    
    return null;
}

// 合并并去重结果
function mergeAndDedupResults(results1, results2) {
    // 合并两个结果数组
    const combined = [...results1, ...results2];
    
    // 使用Map按路径去重
    const uniqueMap = new Map();
    combined.forEach(item => {
        // 如果已存在相同路径的项，且当前项来自缓存，则更新
        if (uniqueMap.has(item.path) && item.fromCache) {
            uniqueMap.set(item.path, item);
        } 
        // 如果不存在或当前项不是来自缓存，则添加
        else if (!uniqueMap.has(item.path)) {
            uniqueMap.set(item.path, item);
        }
    });
    
    // 转换回数组
    return Array.from(uniqueMap.values());
}

// 显示搜索结果
function displaySearchResults(results, query, searchResultsContainer) {
    if (results.length === 0) {
        searchResultsContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">未找到匹配的结果</p>';
    } else {
        let html = '<ul class="space-y-3 search-results-list">';
        
        // 限制结果数量
        const maxResults = config.search.max_results || 20;
        const limitedResults = results.slice(0, maxResults);
        
        limitedResults.forEach(result => {
            // 使用新的URL格式构建链接
            const url = generateNewDocumentUrl(result.path);
            
            // 提取匹配的内容片段
            let contentPreview = extractContentPreview(result.content, query);
            
            // 确定图标和CSS
            let cacheIcon = '', cacheClass = '';
            
            if (result.fromCache) {
                if (result.cacheType === 'preloaded') {
                    cacheIcon = '<span class="text-purple-500 dark:text-purple-400 ml-1" title="预加载文档"><i class="fas fa-bolt"></i></span>';
                    cacheClass = 'border-l-purple-400 dark:border-l-purple-500';
                } else {
                    cacheIcon = '<span class="text-blue-500 dark:text-blue-400 ml-1" title="缓存文档"><i class="fas fa-database"></i></span>';
                    cacheClass = 'border-l-blue-400 dark:border-l-blue-500';
                }
            } else {
                cacheClass = 'border-l-gray-300 dark:border-l-gray-600';
            }
            
            html += `
            <li class="border dark:border-gray-700 ${cacheClass} border-l-4 rounded-md shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                <div class="block hover:bg-gray-50 dark:hover:bg-gray-700 search-result-item p-0" data-path="${result.path}" data-query="${query}">
                    <div class="flex items-center p-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                        <h4 class="text-primary font-medium flex-grow">${highlightText(result.title, query)}</h4>
                        ${cacheIcon}
                    </div>
                    <div class="text-gray-600 dark:text-gray-300 text-sm p-3 search-preview">${contentPreview}</div>
                    <div class="text-gray-500 dark:text-gray-400 text-xs p-2 pt-0 flex items-center bg-gray-50 dark:bg-gray-800">
                        <i class="fas fa-file-alt mr-1"></i> ${result.path}
                    </div>
                </div>
            </li>`;
        });
        
        // 如果结果被截断，显示提示
        if (results.length > maxResults) {
            html += `<li class="text-center text-gray-500 dark:text-gray-400 text-sm py-2">
                        还有 ${results.length - maxResults} 条结果未显示
                    </li>`;
        }
        
        html += '</ul>';
        searchResultsContainer.innerHTML = html;
        
        // 为搜索结果中的项添加点击事件
        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                
                const path = this.getAttribute('data-path');
                const query = this.getAttribute('data-query');
                
                // 检查是否点击了特定的匹配项
                let occurrenceTarget = null;
                if (e.target.classList.contains('search-match') || e.target.closest('.search-match')) {
                    const matchElement = e.target.classList.contains('search-match') ? 
                                        e.target : e.target.closest('.search-match');
                    occurrenceTarget = matchElement.getAttribute('data-occurrence');
                }
                
                // 从当前URL中解析root参数(如果有) - 使用新的hash格式解析
                const currentUrl = new URL(window.location.href);
                const hash = decodeURIComponent(currentUrl.hash.substring(1)); // 去掉#并解码
                let root = null;
                
                if (hash && !hash.startsWith('/')) {
                    // 有root的情况: #root/path/to/file.md#anchor
                    const anchorIndex = hash.indexOf('#');
                    let pathPart = anchorIndex !== -1 ? hash.substring(0, anchorIndex) : hash;
                    
                    const slashIndex = pathPart.indexOf('/');
                    if (slashIndex !== -1) {
                        root = pathPart.substring(0, slashIndex);
                    } else {
                        // 只有root，没有具体文档
                        root = pathPart;
                    }
                }
                
                // 生成新格式的URL
                let targetUrl = generateNewDocumentUrl(path, root);
                
                // 添加搜索参数到URL查询参数中
                const newUrl = new URL(targetUrl);
                newUrl.searchParams.set('search', query);
                if (occurrenceTarget) {
                    newUrl.searchParams.set('occurrence', occurrenceTarget);
                }
                targetUrl = newUrl.toString();
                
                // 关闭搜索模态窗口
                closeSearchModal();
                
                // 使用history.pushState而不是直接跳转，避免页面刷新
                window.history.pushState({path, search: query, occurrence: occurrenceTarget}, '', targetUrl);
                
                // 手动触发内容加载
                // 从document-page.js导入loadContentFromUrl函数
                if (typeof window.loadContentFromUrl === 'function') {
                    window.loadContentFromUrl();
                    
                    // 15秒后移除URL中的search和occurrence参数，保留基本路径
                    setTimeout(() => {
                        const cleanUrl = new URL(window.location.href);
                        cleanUrl.searchParams.delete('search');
                        cleanUrl.searchParams.delete('occurrence');
                        window.history.replaceState(null, '', cleanUrl.toString());
                    }, 15000);
                } else {
                    // 如果函数不可用，退回到传统跳转方式
                    window.location.href = targetUrl;
                }
            });
        });
    }
}

// 提取匹配的内容片段
function extractContentPreview(content, query) {
    if (!content) return '';
    
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // 找出所有匹配位置
    let allMatches = [];
    let lastIndex = 0;
    let occurrenceCount = 0;
    
    while ((lastIndex = lowerContent.indexOf(lowerQuery, lastIndex)) !== -1) {
        occurrenceCount++;
        allMatches.push({
            index: lastIndex,
            occurrence: occurrenceCount // 记录这是文章中的第几个匹配项
        });
        lastIndex += lowerQuery.length;
    }
    
    // 如果没有匹配项，返回文章开头的内容
    if (allMatches.length === 0) return content.slice(0, 150) + '...';
    
    // 获取配置中设置的最小匹配距离，默认为50
    const minMatchDistance = config.search.match_distance || 50;
    
    // 筛选相距至少minMatchDistance个字符的匹配项
    let filteredMatches = [allMatches[0]];
    for (let i = 1; i < allMatches.length; i++) {
        const prevMatch = filteredMatches[filteredMatches.length - 1];
        if (allMatches[i].index - (prevMatch.index + lowerQuery.length) >= minMatchDistance) {
            filteredMatches.push(allMatches[i]);
        }
    }
    
    // 限制最多显示5个匹配项
    if (filteredMatches.length > 5) {
        filteredMatches = filteredMatches.slice(0, 5);
    }
    
    // 为每个匹配项生成预览内容，添加编号
    let previews = filteredMatches.map(match => {
        const startIndex = Math.max(0, match.index - 30);
        const endIndex = Math.min(content.length, match.index + query.length + 30);
        let preview = content.slice(startIndex, endIndex);
        
        // 在开头和结尾添加省略号
        if (startIndex > 0) preview = '...' + preview;
        if (endIndex < content.length) preview = preview + '...';
        
        // 高亮显示匹配词并添加编号
        const highlightedPreview = highlightText(preview, query, match.occurrence);
        
        return `<div class="search-match" data-occurrence="${match.occurrence}">
                  <span class="text-xs bg-gray-200 dark:bg-gray-600 rounded px-1 mr-1">第${match.occurrence}个</span>
                  ${highlightedPreview}
                </div>`;
    });
    
    return previews.join('');
}

// 高亮显示文本中的匹配部分
function highlightText(text, query, occurrence = null) {
    if (!text || !query) return text;
    
    const regex = new RegExp('(' + query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + ')', 'gi');
    
    // 如果提供了匹配序号，则添加data-occurrence属性用于跳转
    if (occurrence !== null) {
        return text.replace(regex, `<span class="bg-yellow-200 dark:bg-yellow-800 occurrence-${occurrence}" 
                                    data-occurrence="${occurrence}">$1</span>`);
    } else {
        return text.replace(regex, '<span class="bg-yellow-200 dark:bg-yellow-800">$1</span>');
    }
}

// 处理主题切换点击事件
function handleThemeToggle() {
    import('./theme.js').then(({ toggleDarkMode }) => {
        toggleDarkMode();
    });
}

// 加载自定义底部
async function loadCustomFooter() {
    const footerFile = config.layout.footer_file;
    const footerResponse = await fetch(footerFile);
    const footerHtml = await footerResponse.text();
    document.getElementById('footer-container').innerHTML = footerHtml;
    
    // 更新页脚元素
    updateFooterElements(config);
}

// 加载默认底部
function loadDefaultFooter() {
    document.getElementById('footer-container').innerHTML = `
    <footer class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
        <div class="container mx-auto px-4 py-8">
            <div class="flex flex-col md:flex-row md:justify-between md:items-center">
                <!-- 版权信息 -->
                <div class="mb-6 md:mb-0">
                    <div class="flex items-center space-x-2 mb-3">
                        <img src="assets/img/logo.svg" alt="EasyDocument" class="site-logo h-8 w-8" onerror="this.src='data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'%3E%3Crect width=\\'100\\' height=\\'100\\' rx=\\'20\\' fill=\\'%233b82f6\\'/%3E%3Cpath d=\\'M30 40 L70 40 M30 50 L60 50 M30 60 L50 60\\' stroke=\\'%23fff\\' stroke-width=\\'8\\' stroke-linecap=\\'round\\'/%3E%3C/svg%3E'">
                        <span class="text-lg font-bold text-gray-800 dark:text-white">
                            <span class="text-primary">Easy</span>Document
                        </span>
                    </div>
                    <p class="text-gray-600 dark:text-gray-300 copyright-text">${config.footer.copyright || '© 2024 EasyDocument'}</p>
                    <p class="text-gray-500 dark:text-gray-400 text-sm mt-1 site-description">${config.site.description || '一个轻量级、免编译的纯静态前端文档系统'}</p>
                </div>
                
                <!-- 链接区域 -->
                <div class="grid grid-cols-2 gap-8 sm:grid-cols-2">
                    <!-- 导航链接 -->
                    <div>
                        <h3 class="text-sm font-semibold text-gray-800 dark:text-white tracking-wider uppercase mb-4">导航</h3>
                        <ul class="space-y-3 nav-links">
                            <!-- 由JS动态填充 -->
                        </ul>
                    </div>
                    
                    <!-- 相关资源 -->
                    <div>
                        <h3 class="text-sm font-semibold text-gray-800 dark:text-white tracking-wider uppercase mb-4">资源</h3>
                        <ul class="space-y-3 footer-links">
                            <!-- 由JS动态填充 -->
                        </ul>
                    </div>
                </div>
            </div>
            
            <!-- 底部信息 -->
            <div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-col-reverse md:flex-row md:justify-between md:items-center">
                <p class="text-gray-500 dark:text-gray-400 text-sm mt-4 md:mt-0 powered-by-text">
                    ${config.footer.show_powered_by ? 
                    `使用 
                    <a href="https://tailwindcss.com" target="_blank" class="text-primary hover:underline">TailwindCSS</a>, 
                    <a href="https://alpinejs.dev" target="_blank" class="text-primary hover:underline">Alpine.js</a>, 
                    <a href="https://fontawesome.com" target="_blank" class="text-primary hover:underline">FontAwesome</a> 
                    构建` : ''}
                </p>
                
                <div class="flex space-x-6">
                    ${config.extensions.github.repo_url ? 
                    `<a href="${config.extensions.github.repo_url}" target="_blank" class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                        <i class="fab fa-github text-xl"></i>
                    </a>` : ''}
                </div>
            </div>
        </div>
    </footer>`;
    
    // 更新页脚元素
    updateFooterElements(config);
}

// 修复Alpine.js初始化问题
function fixAlpineInit() {
    // 延迟执行以确保DOM已更新
    setTimeout(() => {
        // 如果Alpine可用，初始化动态添加的元素
        if (window.Alpine) {
            document.querySelectorAll('[x-data]').forEach(el => {
                if (!el.__x) {
                    window.Alpine.initTree(el);
                }
            });
        }
        
        // 重新绑定主题切换事件
        bindThemeToggleEvents();
        
        // 重新绑定搜索事件
        bindSearchEvents();
    }, 100);
}

// 格式化网站名称
function formatSiteName(siteName) {
    // 如果名称以Easy开头，保持原有的样式
    if (siteName.match(/^Easy/i)) {
        const firstPart = siteName.substring(0, 4);
        const restPart = siteName.substring(4);
        return `<span class="text-primary">${firstPart}</span><span class="dark:text-white">${restPart}</span>`;
    } else {
        return `<span class="text-primary">${siteName}</span>`;
    }
}

/**
 * 生成新格式的文档URL
 */
function generateNewDocumentUrl(path, root = null, anchor = '') {
    const baseUrl = '/main/';
    
    // 构建新的hash格式
    let hash = '';
    
    if (root) {
        // 当有root时，需要检查path是否已经包含了root前缀
        let relativePath = path;
        if (path && path.startsWith(root + '/')) {
            // 如果path已经包含root前缀，则移除它
            relativePath = path.substring(root.length + 1);
        }
        
        // 有root的情况: #root/path#anchor
        hash = root;
        if (relativePath) {
            hash += '/' + relativePath;
        }
        if (anchor) {
            hash += '#' + anchor;
        }
    } else {
        // 无root的情况: #/path#anchor (兼容原格式)
        if (path) {
            hash = '/' + path;
            if (anchor) {
                hash += '#' + anchor;
            }
        } else if (anchor) {
            hash = '#' + anchor;
        }
    }
    
    return hash ? `${baseUrl}#${hash}` : baseUrl;
}

// 监听DOM加载完成，初始化应用
document.addEventListener('DOMContentLoaded', initApp); 