/**
 * 右键菜单处理器
 * 为左右侧边栏和文章中的链接添加右键菜单功能
 */

class ContextMenuManager {
    constructor() {
        this.contextMenu = null;
        this.previewModal = null;
        this.currentLink = null;
        this.init();
    }

    init() {
        this.createContextMenu();
        this.createPreviewModal();
        this.bindEvents();
        this.bindThemeEvents();
    }

    createContextMenu() {
        this.contextMenu = document.createElement('div');
        this.contextMenu.className = 'context-menu';
        this.contextMenu.innerHTML = `
            <div class="context-menu-item" data-action="copy-link">
                <i class="icon fas fa-copy text-primary"></i>
                <span>复制链接</span>
            </div>
            <div class="context-menu-item" data-action="copy-md-link">
                <i class="icon fas fa-file-alt text-primary"></i>
                <span>复制MD格式链接</span>
            </div>
            <div class="context-menu-separator"></div>
            <div class="context-menu-item" data-action="preview">
                <i class="icon fas fa-eye text-primary"></i>
                <span>预览</span>
            </div>
        `;
        document.body.appendChild(this.contextMenu);
    }

    createPreviewModal() {
        this.previewModal = document.createElement('div');
        this.previewModal.className = 'preview-modal';
        this.previewModal.innerHTML = `
            <div class="preview-modal-overlay"></div>
            <div class="preview-modal-content">
                <div class="preview-modal-header">
                    <h3 class="preview-modal-title">文档预览</h3>
                    <button class="preview-modal-close">×</button>
                </div>
                <div class="preview-modal-body">
                    <iframe class="preview-iframe" sandbox="allow-same-origin allow-scripts"></iframe>
                </div>
            </div>
        `;
        document.body.appendChild(this.previewModal);

        // 绑定关闭事件
        this.previewModal.querySelector('.preview-modal-close').addEventListener('click', () => {
            this.hidePreview();
        });

        this.previewModal.querySelector('.preview-modal-overlay').addEventListener('click', () => {
            this.hidePreview();
        });
    }

    bindEvents() {
        // 全局右键事件
        document.addEventListener('contextmenu', (e) => {
            const link = this.findLinkElement(e.target);
            if (link && this.isValidLink(link)) {
                e.preventDefault();
                this.currentLink = link;
                this.showContextMenu(e.clientX, e.clientY);
            } else {
                // 如果没有找到有效链接，确保菜单被隐藏
                if (this.contextMenu.classList.contains('show')) {
                    this.hideContextMenu();
                }
            }
        });

        // 全局点击事件隐藏菜单
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });

        // 右键菜单点击事件
        this.contextMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = e.target.closest('.context-menu-item');
            if (item) {
                const action = item.dataset.action;
                this.handleAction(action);
            }
        });

        // ESC键关闭预览
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hidePreview();
                this.hideContextMenu();
            }
        });
    }

    bindThemeEvents() {
        // 监听主题变化事件
        window.addEventListener('themeChanged', () => {
            this.updateModalTheme();
        });

        // 监听DOM类变化（兼容其他主题切换方式）
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class' && mutation.target === document.documentElement) {
                    this.updateModalTheme();
                }
            });
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        // 初始化时应用当前主题
        this.updateModalTheme();
    }

    updateModalTheme() {
        // 这个方法主要是为了确保模态窗能正确响应主题变化
        // CSS已经通过.dark类自动处理，这里可以添加额外的逻辑
        const isDarkMode = document.documentElement.classList.contains('dark');
        
        // 如果需要对模态窗进行额外的主题处理，可以在这里添加
        if (this.previewModal) {
            // 触发重新渲染以确保样式更新
            if (this.previewModal.style.display === 'flex') {
                // 如果模态窗正在显示，强制更新样式
                this.previewModal.style.display = 'none';
                setTimeout(() => {
                    this.previewModal.style.display = 'flex';
                }, 10);
            }
        }
    }

    findLinkElement(element) {
        // 向上查找链接元素或文件夹元素
        let current = element;
        while (current && current !== document.body) {
            // 检查是否是普通链接
            if (current.tagName === 'A' && current.href) {
                return current;
            }
            
            // 检查是否是文件夹标题div
            if (current.tagName === 'DIV' && current.classList.contains('folder-title') && current.closest('#sidebar-nav')) {
                return current;
            }
            
            // 检查是否是文件夹标题span（有cursor-pointer类且在侧边栏中）
            if (current.tagName === 'SPAN' && 
                current.classList.contains('cursor-pointer') && 
                current.closest('#sidebar-nav') &&
                current.dataset.folderPath) {
                return current;
            }
            
            current = current.parentElement;
        }
        return null;
    }

    isValidLink(link) {
        const href = link.getAttribute('href');
        
        // 如果没有href，检查是否是文件夹元素
        if (!href) {
            // 检查是否是文件夹标题div或span
            const isFolderTitleDiv = link.classList.contains('folder-title') && link.closest('#sidebar-nav');
            const isFolderSpan = link.tagName === 'SPAN' && 
                                link.classList.contains('cursor-pointer') && 
                                link.closest('#sidebar-nav') &&
                                link.dataset.folderPath;
            
            return isFolderTitleDiv || isFolderSpan;
        }
        
        // 检查是否是文档链接（内部链接或相对路径）
        const isInternalLink = href.includes('main.html') || 
                              href.startsWith('#') || 
                              href.includes('.md');
        
        // 检查是否在相关的容器中（左侧边栏、右侧目录、内容区域、面包屑）
        const isInRelevantContainer = link.closest('#sidebar-nav') || 
                                     link.closest('#toc-nav') || 
                                     link.closest('#content') ||
                                     link.closest('#breadcrumb-container');
        
        // 检查是否是导航栏中的内部链接
        const isNavInternalLink = link.closest('header') && isInternalLink;
        
        return isInternalLink || isInRelevantContainer || isNavInternalLink;
    }

    showContextMenu(x, y) {
        // 如果菜单已经显示，先隐藏它
        if (this.contextMenu.classList.contains('show')) {
            this.hideContextMenu();
            // 延迟后再显示新菜单，确保隐藏动画完成
            setTimeout(() => {
                this.displayContextMenu(x, y);
            }, 150);
        } else {
            // 直接显示菜单
            this.displayContextMenu(x, y);
        }
    }

    displayContextMenu(x, y) {
        // 设置位置
        this.contextMenu.style.left = x + 'px';
        this.contextMenu.style.top = y + 'px';
        
        // 显示菜单
        this.contextMenu.style.display = 'block';
        
        // 强制重新计算布局
        this.contextMenu.offsetHeight;
        
        // 添加显示类触发动画
        this.contextMenu.classList.add('show');
        this.contextMenu.classList.remove('hide');

        // 确保菜单不超出屏幕边界
        setTimeout(() => {
            const rect = this.contextMenu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                this.contextMenu.style.left = (window.innerWidth - rect.width - 10) + 'px';
            }
            if (rect.bottom > window.innerHeight) {
                this.contextMenu.style.top = (window.innerHeight - rect.height - 10) + 'px';
            }
        }, 10);
    }

    hideContextMenu() {
        if (this.contextMenu && this.contextMenu.style.display !== 'none') {
            // 添加隐藏类触发动画
            this.contextMenu.classList.add('hide');
            this.contextMenu.classList.remove('show');
            
            // 动画结束后真正隐藏元素
            setTimeout(() => {
                this.contextMenu.style.display = 'none';
                this.contextMenu.classList.remove('hide');
            }, 150);
        }
    }

    async handleAction(action) {
        if (!this.currentLink) return;

        this.hideContextMenu();

        switch (action) {
            case 'copy-link':
                await this.copyLink();
                break;
            case 'copy-md-link':
                await this.copyMdLink();
                break;
            case 'preview':
                this.showPreview();
                break;
        }
    }

    async copyLink() {
        try {
            const fullUrl = this.getFullUrl();
            await navigator.clipboard.writeText(fullUrl);
            this.showToast('链接已复制到剪贴板');
        } catch (err) {
            console.error('复制链接失败:', err);
            this.showToast('复制链接失败', 'error');
        }
    }

    async copyMdLink() {
        try {
            const fullUrl = this.getFullUrl();
            const title = this.getLinkTitle();
            const mdLink = `[${title}](${fullUrl})`;
            await navigator.clipboard.writeText(mdLink);
            this.showToast('MD格式链接已复制到剪贴板');
        } catch (err) {
            console.error('复制MD链接失败:', err);
            this.showToast('复制MD链接失败', 'error');
        }
    }

    getFullUrl() {
        const href = this.currentLink.getAttribute('href');
        
        // 处理文件夹标题链接（没有href属性）
        if (!href) {
            let folderPath = this.currentLink.dataset.folderPath;
            
            // 如果当前元素没有folderPath，尝试从父元素或子元素获取
            if (!folderPath) {
                const folderTitleDiv = this.currentLink.closest('.folder-title') || 
                                      this.currentLink.querySelector('.folder-title');
                if (folderTitleDiv) {
                    folderPath = folderTitleDiv.dataset.folderPath;
                }
                
                // 如果还是没有，尝试从span子元素获取
                if (!folderPath) {
                    const spanWithPath = this.currentLink.querySelector('span[data-folder-path]');
                    if (spanWithPath) {
                        folderPath = spanWithPath.dataset.folderPath;
                    }
                }
            }
            
            if (folderPath) {
                // 构建文件夹链接URL
                const baseUrl = window.location.origin + window.location.pathname;
                return `${baseUrl}#${folderPath}/`;
            }
            return window.location.href; // 兜底返回当前页面URL
        }
        
        if (href.startsWith('http')) {
            return href;
        }
        
        // 构建完整URL
        const baseUrl = window.location.origin + window.location.pathname.replace('/main.html', '');
        if (href.startsWith('#')) {
            return window.location.origin + window.location.pathname + href;
        }
        return baseUrl + '/' + href.replace(/^\//, '');
    }

    getLinkTitle() {
        // 优先使用链接文本
        let title = this.currentLink.textContent.trim();
        
        // 过滤掉图标字符和多余空格
        title = title.replace(/[📁📄🔗▶◀]/g, '').trim();
        
        if (title) return title;

        // 处理没有文本的情况，从数据属性或href中提取
        const href = this.currentLink.getAttribute('href');
        
        // 如果是文件夹链接，尝试从dataset中获取
        let folderPath = this.currentLink.dataset.folderPath;
        
        // 如果当前元素没有folderPath，尝试从相关元素获取
        if (!folderPath) {
            const folderTitleDiv = this.currentLink.closest('.folder-title') || 
                                  this.currentLink.querySelector('.folder-title');
            if (folderTitleDiv) {
                folderPath = folderTitleDiv.dataset.folderPath;
            }
            
            // 尝试从span子元素获取
            if (!folderPath) {
                const spanWithPath = this.currentLink.querySelector('span[data-folder-path]');
                if (spanWithPath) {
                    folderPath = spanWithPath.dataset.folderPath;
                    // 同时尝试获取span的文本
                    const spanText = spanWithPath.textContent.trim().replace(/[📁📄🔗▶◀]/g, '').trim();
                    if (spanText) return spanText;
                }
            }
        }
        
        if (folderPath) {
            const pathParts = folderPath.split('/');
            return pathParts[pathParts.length - 1] || '文件夹';
        }
        
        if (href) {
            // 从href中提取文件名
            if (href.includes('.md')) {
                const match = href.match(/([^\/]+)\.md/);
                if (match) {
                    return match[1];
                }
            }

            // 从hash中提取
            if (href.includes('#')) {
                const parts = href.split('#');
                const lastPart = parts[parts.length - 1];
                if (lastPart) {
                    return decodeURIComponent(lastPart);
                }
            }
        }

        return '文档链接';
    }

    showPreview() {
        const href = this.currentLink.getAttribute('href');
        const fullUrl = this.getFullUrl();
        const title = this.getLinkTitle();

        // 检查是否是文件夹链接
        const isFolderLink = !href && (this.currentLink.dataset.folderPath || 
                                      this.currentLink.closest('.folder-title') ||
                                      this.currentLink.classList.contains('folder-title'));
        
        // 设置预览标题
        const titleSuffix = isFolderLink ? ' (文件夹)' : '';
        this.previewModal.querySelector('.preview-modal-title').textContent = `预览: ${title}${titleSuffix}`;

        // 设置iframe
        const iframe = this.previewModal.querySelector('.preview-iframe');
        iframe.src = fullUrl;
        
        // 显示模态框
        this.previewModal.style.display = 'flex';
    }

    hidePreview() {
        if (this.previewModal) {
            this.previewModal.style.display = 'none';
            const iframe = this.previewModal.querySelector('.preview-iframe');
            iframe.src = '';
        }
    }

    showToast(message, type = 'success') {
        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // 添加到页面
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
}

// 当DOM加载完成后初始化右键菜单管理器
document.addEventListener('DOMContentLoaded', () => {
    window.contextMenuManager = new ContextMenuManager();
}); 