/**
 * 文档缓存管理模块
 * 负责处理文档的预加载和缓存功能
 */
import config from '/config.js';

// 全局缓存对象
const documentCache = {
    // 存储缓存的文档内容（持久化到localStorage）
    cache: {},
    
    // 存储预加载的文档内容（只在内存中，刷新后丢失）
    preloadCache: {},
    
    // 缓存时间设置（10分钟）
    cacheTime: 10 * 60 * 1000,
    
    // 正在预加载的文档
    loadingDocs: new Set(),

    // 缓存控制开关
    disableCache: false,
    disablePreload: false,
    
    /**
     * 获取文档内容（先检查预加载缓存，再检查持久缓存）
     * @param {string} path 文档路径
     * @returns {string|null} 文档内容或null
     */
    get(path) {
        // 如果禁用了缓存，直接返回null
        if (this.disableCache) {
            return null;
        }

        // 先检查预加载缓存
        if (!this.disablePreload && this.preloadCache[path]) {
            // console.log(`从预加载缓存获取文档: ${path}`);
            return this.preloadCache[path];
        }
        
        // 再检查持久缓存
        const cachedDoc = this.cache[path];
        if (cachedDoc) {
            // 检查缓存是否过期
            const now = Date.now();
            if (now - cachedDoc.timestamp < this.cacheTime) {
                // console.log(`从持久缓存获取文档: ${path}`);
                return cachedDoc.content;
            }
            
            // 缓存已过期，删除
            delete this.cache[path];
            this._saveToLocalStorage();
        }
        
        return null;
    },
    
    /**
     * 将文档内容设置到持久缓存
     * @param {string} path 文档路径
     * @param {string} content 文档内容
     */
    set(path, content) {
        // 如果禁用了缓存，不进行缓存
        if (this.disableCache) {
            return;
        }

        this.cache[path] = {
            content: content,
            timestamp: Date.now()
        };
        
        // 保存到localStorage
        this._saveToLocalStorage();
    },
    
    /**
     * 将文档内容设置到预加载缓存（仅内存中）
     * @param {string} path 文档路径
     * @param {string} content 文档内容
     */
    setPreloaded(path, content) {
        // 如果禁用了预加载，不进行缓存
        if (this.disablePreload) {
            return;
        }

        this.preloadCache[path] = content;
        this.loadingDocs.delete(path);
    },
    
    /**
     * 获取所有缓存的文档路径（包括预加载和持久缓存）
     * @returns {string[]} 缓存的文档路径数组
     */
    getAllCachedPaths() {
        // 合并预加载和持久缓存的路径
        return [...new Set([
            ...Object.keys(this.cache),
            ...Object.keys(this.preloadCache)
        ])];
    },
    
    /**
     * 获取所有持久缓存的文档路径
     * @returns {string[]} 持久缓存的文档路径数组
     */
    getPersistentCachedPaths() {
        return Object.keys(this.cache);
    },
    
    /**
     * 获取所有预加载的文档路径
     * @returns {string[]} 预加载的文档路径数组
     */
    getPreloadedPaths() {
        return Object.keys(this.preloadCache);
    },
    
    /**
     * 检查文档是否在预加载缓存中
     * @param {string} path 文档路径
     * @returns {boolean} 是否在预加载缓存中
     */
    isPreloaded(path) {
        return !!this.preloadCache[path];
    },
    
    /**
     * 检查文档是否在持久缓存中
     * @param {string} path 文档路径
     * @returns {boolean} 是否在持久缓存中
     */
    isCached(path) {
        return !!this.cache[path];
    },
    
    /**
     * 清理过期的缓存
     */
    clearExpired() {
        const now = Date.now();
        
        for (const path in this.cache) {
            // 检查是否过期
            if (now - this.cache[path].timestamp > this.cacheTime) {
                delete this.cache[path];
            }
        }
        
        // 更新localStorage
        this._saveToLocalStorage();
    },
    
    /**
     * 清理所有持久缓存
     */
    clearAllCache() {
        this.cache = {};
        localStorage.removeItem('document_cache');
        localStorage.removeItem('document_cache_info');
    },
    
    /**
     * 清理所有预加载缓存
     */
    clearAllPreloaded() {
        this.preloadCache = {};
    },
    
    /**
     * 清理所有缓存（预加载和持久缓存）
     */
    clearAll() {
        this.clearAllCache();
        this.clearAllPreloaded();
    },
    
    /**
     * 查找路径在pathData中的节点及其父节点
     * @private
     */
    _findNodeAndParent(pathData, targetPath) {
        function find(node, parent = null) {
            // 检查当前节点是否是文件或索引
            if (node.path === targetPath) return { node, parent };
            if (node.index && node.index.path === targetPath) return { node: node.index, parent };

            // 递归查找子节点
            if (node.children) {
                for (const child of node.children) {
                    const found = find(child, node); // 传递当前节点作为父节点
                    if (found) return found;
                }
            }
            return null;
        }
        return find(pathData);
    },
    
    /**
     * 自动预加载相关文档（同级文件、父级索引、直接子级索引）
     * @param {string} currentPath 当前查看的文档路径
     * @param {Object} pathData 完整的文档结构数据
     * @param {number} maxPreload 最大预加载数量
     */
    autoPreloadDocuments(currentPath, pathData, maxPreload = 5) {
        if (!currentPath || !pathData) return;

        const result = this._findNodeAndParent(pathData, currentPath);
        if (!result || !result.parent) {
            // console.log('自动预加载：未找到当前路径的父节点', currentPath);
            return; // 无法确定同级
        }

        const parentNode = result.parent;
        const pathsToPreload = new Set();

        // 1. 添加同级文件和父级索引
        if (parentNode.children) {
            parentNode.children.forEach(sibling => {
                if (sibling.path !== currentPath && sibling.path && sibling.path.includes('.')) { // 是文件且不是当前文件
                    pathsToPreload.add(sibling.path);
                }
            });
        }
        if (parentNode.index && parentNode.index.path !== currentPath) {
            pathsToPreload.add(parentNode.index.path);
        }

        // 2. 添加直接子文件夹的索引文件
        if (parentNode.children) {
             parentNode.children.forEach(sibling => {
                // 检查sibling是否为文件夹（有children或有index）且不是当前文件/目录本身对应的节点
                if ((sibling.children || sibling.index) && sibling.path !== currentPath && (!result.node || sibling.path !== result.node.path)) {
                    if(sibling.index && sibling.index.path) {
                        pathsToPreload.add(sibling.index.path);
                    }
                }
            });
        }

        // 过滤掉已缓存/预加载/正在加载的
        const filteredPaths = [...pathsToPreload].filter(path => 
            !this.preloadCache[path] && 
            !this.cache[path] && 
            !this.loadingDocs.has(path)
        );

        // 限制数量并开始预加载
        const limitedPaths = filteredPaths.slice(0, maxPreload);
        if (limitedPaths.length > 0) {
            // console.log(`自动预加载 ${limitedPaths.length} 个相关文档:`, limitedPaths);
            limitedPaths.forEach(path => this.preloadDocument(path));
        }
    },

    /**
     * 预加载所有在path.json中定义的文档
     * @param {Object} pathData 完整的文档结构数据
     * @param {number} maxPreload 最大预加载数量（可选，默认无限制）
     */
    preloadAllDocuments(pathData, maxPreload = Infinity) {
        if (!pathData) return;

        const allPaths = new Set();

        // 递归收集所有路径
        const collectPaths = (node) => {
            if (node.path && node.path.includes('.')) allPaths.add(node.path); // 文件
            if (node.index && node.index.path) allPaths.add(node.index.path); // 索引
            if (node.children) node.children.forEach(collectPaths);
        };

        collectPaths(pathData);

        // 过滤掉已缓存/预加载/正在加载的
        const filteredPaths = [...allPaths].filter(path => 
            !this.preloadCache[path] && 
            !this.cache[path] && 
            !this.loadingDocs.has(path)
        );

        // 限制数量并开始预加载
        const limitedPaths = filteredPaths.slice(0, maxPreload);
         if (limitedPaths.length > 0) {
            console.log(`手动预加载 ${limitedPaths.length} 个文档:`, limitedPaths);
            limitedPaths.forEach(path => this.preloadDocument(path));
        } else {
             console.log('没有需要手动预加载的新文档。');
         }
    },
    
    /**
     * 预加载单个文档
     * @param {string} path 文档路径
     */
    preloadDocument(path) {
        // 防止重复添加加载任务
        if(this.loadingDocs.has(path) || this.preloadCache[path] || this.cache[path]){
            return;
        }
        
        // 标记为正在加载
        this.loadingDocs.add(path);
        
        // 构建完整路径，使用配置的根目录
        const rootDir = config.document.root_dir.replace(/\/$/, '');
        const cleanPath = path.replace(/^\//, '');
        const fetchPath = `${rootDir}/${cleanPath}`;
        
        fetch(fetchPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`预加载失败: ${response.status}`);
                }
                return response.text();
            })
            .then(content => {
                // 将内容存储到预加载缓存
                this.setPreloaded(path, content);
                // console.log(`文档预加载成功: ${path}`);
            })
            .catch(error => {
                // 移除标记
                this.loadingDocs.delete(path);
                console.error(`文档预加载失败: ${path}`, error);
            });
    },
    
    /**
     * 将缓存信息保存到localStorage
     * @private
     */
    _saveToLocalStorage() {
        try {
            // 创建缓存信息对象
            const cacheData = {};
            for (const path in this.cache) {
                cacheData[path] = {
                    content: this.cache[path].content,
                    timestamp: this.cache[path].timestamp
                };
            }
            
            // 保存到localStorage (分片存储避免超过大小限制)
            const cacheString = JSON.stringify(cacheData);
            const chunkSize = 500000; // 约500KB一片
            const chunks = Math.ceil(cacheString.length / chunkSize);
            
            // 先清除旧的缓存数据
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('document_cache_chunk_')) {
                    localStorage.removeItem(key);
                }
            }
            
            // 记录缓存信息
            localStorage.setItem('document_cache_info', JSON.stringify({
                timestamp: Date.now(),
                chunks: chunks,
                paths: Object.keys(this.cache)
            }));
            
            // 分片存储内容
            for (let i = 0; i < chunks; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, cacheString.length);
                const chunk = cacheString.substring(start, end);
                localStorage.setItem(`document_cache_chunk_${i}`, chunk);
            }
        } catch (e) {
            console.error('保存缓存信息到localStorage失败:', e);
        }
    },
    
    /**
     * 从localStorage加载缓存信息
     * @private
     */
    _loadFromLocalStorage() {
        try {
            // 检查缓存信息
            const cacheInfoStr = localStorage.getItem('document_cache_info');
            if (!cacheInfoStr) return;
            
            const cacheInfo = JSON.parse(cacheInfoStr);
            if (!cacheInfo || !cacheInfo.chunks) return;
            
            // 从分片中还原缓存数据
            let cacheString = '';
            for (let i = 0; i < cacheInfo.chunks; i++) {
                const chunkKey = `document_cache_chunk_${i}`;
                const chunk = localStorage.getItem(chunkKey);
                if (chunk) {
                    cacheString += chunk;
                } else {
                    console.warn(`缓存分片 ${i} 未找到`);
                }
            }
            
            // 解析缓存数据
            if (cacheString) {
                const cacheData = JSON.parse(cacheString);
                this.cache = cacheData;
                // console.log(`从localStorage加载了 ${Object.keys(this.cache).length} 个缓存文档`);
            }
        } catch (e) {
            console.error('从localStorage加载缓存信息失败:', e);
            // 出错时清除可能损坏的缓存
            this.clearAllCache();
        }
    },
    
    /**
     * 初始化缓存管理器
     */
    init() {
        // 从localStorage加载缓存选项
        try {
            const options = JSON.parse(localStorage.getItem('document_cache_options'));
            if (options) {
                this.disableCache = options.disableCache;
                this.disablePreload = options.disablePreload;
            }
        } catch (e) {
            console.error('加载缓存选项失败:', e);
        }

        // 从localStorage加载缓存信息
        this._loadFromLocalStorage();
        
        // 清理过期缓存
        this.clearExpired();
        
        // 设置定期清理
        setInterval(() => this.clearExpired(), 5 * 60 * 1000); // 5分钟清理一次
        
        console.log(`缓存管理器初始化完成，持久缓存文档数: ${Object.keys(this.cache).length}`);
    },

    /**
     * 设置缓存功能开关
     * @param {boolean} disableCache 是否禁用文档缓存
     * @param {boolean} disablePreload 是否禁用预加载
     */
    setOptions(disableCache, disablePreload) {
        this.disableCache = disableCache;
        this.disablePreload = disablePreload;

        // 如果禁用了缓存，清除所有缓存
        if (disableCache) {
            this.clearAllCache();
        }

        // 如果禁用了预加载，清除所有预加载
        if (disablePreload) {
            this.clearAllPreloaded();
        }

        // 保存设置到localStorage
        localStorage.setItem('document_cache_options', JSON.stringify({
            disableCache,
            disablePreload
        }));
    },

    /**
     * 从持久缓存中删除指定文档
     * @param {string} path 文档路径
     */
    removeFromCache(path) {
        if (this.cache[path]) {
            delete this.cache[path];
            this._saveToLocalStorage();
        }
    },

    /**
     * 从预加载缓存中删除指定文档
     * @param {string} path 文档路径
     */
    removeFromPreload(path) {
        if (this.preloadCache[path]) {
            delete this.preloadCache[path];
        }
    }
};

// 初始化缓存管理器
documentCache.init();

export default documentCache; 