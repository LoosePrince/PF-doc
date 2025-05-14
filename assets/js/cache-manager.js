/**
 * 缓存管理模块
 * 负责处理缓存管理界面和相关功能
 */
import documentCache from './document-cache.js';
import config from '../../config.js';

document.addEventListener('DOMContentLoaded', () => {
    // 绑定缓存管理模态窗口事件
    bindCacheModalEvents();
});

/**
 * 打开缓存管理模态窗口
 */
function openCacheModal() {
    const modal = document.getElementById('cache-modal');
    if (modal) {
        modal.classList.remove('hidden');
        updateCacheList();
    }
}

/**
 * 关闭缓存管理模态窗口
 */
function closeCacheModal() {
    const modal = document.getElementById('cache-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * 绑定缓存管理模态窗口事件
 */
function bindCacheModalEvents() {
    // 关闭按钮事件
    const closeButtons = [
        document.getElementById('close-cache-modal'),
        document.getElementById('close-cache-button')
    ];
    
    closeButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', closeCacheModal);
        }
    });
    
    // 点击模态窗口外部关闭
    const modal = document.getElementById('cache-modal');
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeCacheModal();
            }
        });
    }
    
    // 清除所有预加载按钮事件
    const clearPreloadedButton = document.getElementById('clear-preloaded');
    if (clearPreloadedButton) {
        clearPreloadedButton.addEventListener('click', () => {
            if (confirm('确定要清除所有预加载文档吗？')) {
                // 清除预加载缓存
                documentCache.clearAllPreloaded();
                
                // 更新列表
                updateCacheList();
            }
        });
    }
    
    // 清除所有缓存按钮事件
    const clearCacheButton = document.getElementById('clear-cache');
    if (clearCacheButton) {
        clearCacheButton.addEventListener('click', () => {
            if (confirm('确定要清除所有缓存吗？')) {
                documentCache.clearAllCache();
                updateCacheList();
            }
        });
    }
    
    // 开始手动预加载按钮
    const startPreloadButton = document.getElementById('start-preload');
    if (startPreloadButton) {
        startPreloadButton.addEventListener('click', () => {
            // 加载path.json并开始预加载
            fetch('path.json')
                .then(response => response.json())
                .then(pathData => {
                    documentCache.preloadAllDocuments(pathData);
                    updateCacheList();
                    
                    // 显示通知
                    showNotification('已开始预加载所有文档', 'success');
                })
                .catch(error => {
                    console.error('加载path.json失败:', error);
                    showNotification('预加载失败', 'error');
                });
        });
    }
}

/**
 * 显示通知
 * @param {string} message 通知消息
 * @param {string} type 通知类型 ('success', 'info', 'warning', 'error')
 */
function showNotification(message, type = 'info') {
    // 移除已有的通知
    const existingNotification = document.getElementById('cache-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 设置图标和颜色
    let icon, bgClass, textClass;
    switch (type) {
        case 'success':
            icon = 'fa-check-circle';
            bgClass = 'bg-green-100 dark:bg-green-900';
            textClass = 'text-green-700 dark:text-green-300';
            break;
        case 'error':
            icon = 'fa-exclamation-circle';
            bgClass = 'bg-red-100 dark:bg-red-900';
            textClass = 'text-red-700 dark:text-red-300';
            break;
        case 'warning':
            icon = 'fa-exclamation-triangle';
            bgClass = 'bg-yellow-100 dark:bg-yellow-900';
            textClass = 'text-yellow-700 dark:text-yellow-300';
            break;
        default: // info
            icon = 'fa-info-circle';
            bgClass = 'bg-opacity-10 bg-primary dark:bg-opacity-20';
            textClass = 'text-primary dark:text-primary';
    }
    
    // 创建通知元素
    const notification = document.createElement('div');
    notification.id = 'cache-notification';
    notification.className = `fixed top-4 right-4 ${bgClass} ${textClass} px-4 py-3 rounded shadow-md z-50`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${icon} mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
        notification.classList.add('opacity-0', 'transition-opacity', 'duration-300');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * 更新缓存列表
 */
function updateCacheList() {
    // 获取缓存信息
    const persistentCachedPaths = documentCache.getPersistentCachedPaths();
    const preloadedPaths = documentCache.getPreloadedPaths();
    
    // 更新预加载文档列表
    const preloadedList = document.getElementById('preloaded-docs-list');
    if (preloadedList) {
        if (preloadedPaths.length > 0) {
            let html = '<ul class="text-gray-700 dark:text-gray-300">';
            
            preloadedPaths.forEach(path => {
                html += `
                <li class="flex items-center justify-between py-1">
                    <span class="truncate flex-1" title="${path}">${path}</span>
                    <div class="flex items-center">
                        <span class="text-xs text-primary mr-2">
                            <i class="fas fa-bolt"></i> 预加载
                        </span>
                        <button class="remove-preload text-red-500 hover:text-red-700" data-path="${path}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </li>`;
            });
            
            html += '</ul>';
            preloadedList.innerHTML = html;
            
            // 为删除按钮添加事件
            document.querySelectorAll('.remove-preload').forEach(button => {
                button.addEventListener('click', function() {
                    const path = this.getAttribute('data-path');
                    delete documentCache.preloadCache[path];
                    updateCacheList();
                });
            });
        } else {
            preloadedList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-2">无预加载文档</p>';
        }
    }
    
    // 更新持久缓存文档列表
    const cachedList = document.getElementById('cached-docs-list');
    if (cachedList) {
        if (persistentCachedPaths.length > 0) {
            let html = '<ul class="text-gray-700 dark:text-gray-300">';
            
            persistentCachedPaths.forEach(path => {
                const cacheItem = documentCache.cache[path];
                const timeAgo = cacheItem ? formatTimeAgo(cacheItem.timestamp) : '未知';
                
                html += `
                <li class="flex items-center justify-between py-1">
                    <span class="truncate flex-1" title="${path}">${path}</span>
                    <div class="flex items-center">
                        <span class="text-xs text-primary mr-2" title="缓存时间">
                            <i class="fas fa-clock"></i> ${timeAgo}
                        </span>
                        <button class="remove-cache text-red-500 hover:text-red-700" data-path="${path}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </li>`;
            });
            
            html += '</ul>';
            cachedList.innerHTML = html;
            
            // 为删除按钮添加事件
            document.querySelectorAll('.remove-cache').forEach(button => {
                button.addEventListener('click', function() {
                    const path = this.getAttribute('data-path');
                    documentCache.removeFromCache(path);
                    updateCacheList();
                });
            });
        } else {
            cachedList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-2">无缓存文档</p>';
        }
    }
    
    // 更新缓存统计
    const cacheStats = document.getElementById('cache-stats');
    if (cacheStats) {
        cacheStats.innerHTML = `
        <p>预加载文档: <span class="font-medium">${preloadedPaths.length}</span> 个，持久缓存: <span class="font-medium">${persistentCachedPaths.length}</span> 个</p>`;
    }
}

/**
 * 格式化时间为相对时间（如：5分钟前）
 * @param {number} timestamp 时间戳
 * @returns {string} 格式化后的时间字符串
 */
function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return "刚刚";
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分钟前`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    
    const days = Math.floor(hours / 24);
    return `${days}天前`;
}

// 将updateCacheList函数导出到全局
window.updateCacheList = updateCacheList; 