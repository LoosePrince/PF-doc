/**
 * 导航相关功能
 * 负责生成导航链接和移动端菜单
 */

// 导入路径工具
import { getFullPath } from './path-utils.js';

// 处理链接URL，确保正确应用base_url
function processLinkUrl(url) {
    // 如果是外部链接，直接返回
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
        return url;
    }
    
    // 如果是绝对路径（以/开头），直接返回
    if (url.startsWith('/')) {
        return url;
    }
    
    // 如果是相对路径，使用getFullPath处理
    return getFullPath(url);
}

// 生成桌面端导航链接
export function generateNavLinks(links) {
    if (!links || !Array.isArray(links) || links.length === 0) {
        return '';
    }
    
    return links.map(link => {
        // 检查是否为折叠链接（url是数组）
        if (Array.isArray(link.url)) {
            return `
            <div class="relative" x-data="{ open: false }">
                <div @click="open = !open" @click.away="open = false" class="text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-primary flex items-center cursor-pointer">
                    ${link.icon ? `<i class="${link.icon} mr-1"></i> ` : ''}${link.text}
                    <i class="fas fa-chevron-down ml-1 text-xs transition-transform" :class="{'rotate-180': open}"></i>
                </div>
                <div x-show="open" 
                    x-transition:enter="transition ease-out duration-100"
                    x-transition:enter-start="opacity-0 transform scale-95"
                    x-transition:enter-end="opacity-100 transform scale-100"
                    x-transition:leave="transition ease-in duration-75"
                    x-transition:leave-start="opacity-100 transform scale-100"
                    x-transition:leave-end="opacity-0 transform scale-95"
                    class="absolute z-10 mt-2 py-2 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700" 
                    style="display: none; width: max-content;">
                    ${link.url.map(subLink => {
                        const target = subLink.external ? ' target="_blank"' : '';
                        const subIcon = subLink.icon ? `<i class="${subLink.icon} mr-1"></i> ` : '';
                        const processedUrl = processLinkUrl(subLink.url);
                        return `<a href="${processedUrl}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-primary"${target}>${subIcon}${subLink.text}</a>`;
                    }).join('')}
                </div>
            </div>`;
        } else {
            const icon = link.icon ? `<i class="${link.icon}"></i> ` : '';
            const target = link.external ? ' target="_blank"' : '';
            const processedUrl = processLinkUrl(link.url);
            return `<a href="${processedUrl}" class="text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-primary"${target}>${icon}${link.text}</a>`;
        }
    }).join('');
}

// 生成移动端导航链接
export function generateMobileNavLinks(links) {
    if (!links || !Array.isArray(links) || links.length === 0) {
        return '';
    }
    
    return links.map(link => {
        // 检查是否为折叠链接（url是数组）
        if (Array.isArray(link.url)) {
            return `
            <div x-data="{ subMenuOpen: false }">
                <div @click="subMenuOpen = !subMenuOpen" class="flex justify-between items-center w-full text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-primary transition-colors font-medium cursor-pointer">
                    <span>${link.icon ? `<i class="${link.icon} mr-1"></i>` : ''}${link.text}</span>
                    <i class="fas fa-chevron-down text-xs transition-transform" :class="{'rotate-180': subMenuOpen}"></i>
                </div>
                <div x-show="subMenuOpen" class="pl-4 mt-2 space-y-2" style="display: none;">
                    ${link.url.map(subLink => {
                        const target = subLink.external ? ' target="_blank"' : '';
                        const subIcon = subLink.icon ? `<i class="${subLink.icon} mr-1"></i>` : '';
                        const processedUrl = processLinkUrl(subLink.url);
                        return `<a href="${processedUrl}" class="block py-1 text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-primary transition-colors"${target}>${subIcon}${subLink.text}</a>`;
                    }).join('')}
                </div>
            </div>`;
        } else {
            const icon = link.icon ? `<i class="${link.icon} mr-1"></i>` : '';
            const target = link.external ? ' target="_blank"' : '';
            const processedUrl = processLinkUrl(link.url);
            return `<a href="${processedUrl}" class="text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-primary transition-colors font-medium"${target}>${icon}${link.text}</a>`;
        }
    }).join('');
}

// 更新页脚元素
export function updateFooterElements(config) {
    // 添加版权信息
    const copyrightElement = document.querySelector('.copyright-text');
    if (copyrightElement && config.footer.copyright) {
        copyrightElement.textContent = config.footer.copyright;
    }
    
    // 添加网站描述
    const descriptionElement = document.querySelector('.site-description');
    if (descriptionElement && config.site.description) {
        descriptionElement.textContent = config.site.description;
    }
    
    // 显示技术支持信息
    const poweredByElement = document.querySelector('.powered-by-text');
    if (poweredByElement) {
        if (!config.footer.show_powered_by) {
            poweredByElement.style.display = 'none';
        }
    }
    
    // 添加页脚链接
    const footerLinksContainer = document.querySelector('.footer-links');
    if (footerLinksContainer && config.footer.links && Array.isArray(config.footer.links)) {
        footerLinksContainer.innerHTML = '';
        config.footer.links.forEach(link => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = link.url;
            a.className = 'text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-primary transition-colors';
            a.target = '_blank';
            a.textContent = link.text;
            li.appendChild(a);
            footerLinksContainer.appendChild(li);
        });
    }
    
    // 添加导航链接
    const navLinksContainer = document.querySelector('.nav-links');
    if (navLinksContainer && config.navigation.nav_links && Array.isArray(config.navigation.nav_links)) {
        navLinksContainer.innerHTML = '';
        config.navigation.nav_links.forEach(link => {
            const li = document.createElement('li');
            
            // 检查是否为折叠链接（url是数组）
            if (Array.isArray(link.url)) {
                // 创建下拉菜单容器
                const dropdownContainer = document.createElement('div');
                dropdownContainer.className = 'relative';
                
                // 使用innerHTML方式添加完整的带有Alpine.js指令的下拉菜单
                dropdownContainer.innerHTML = `
                <div x-data="{ open: false }">
                    <div @click="open = !open" @click.away="open = false" 
                            class="text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-primary flex items-center cursor-pointer">
                        ${link.icon ? `<i class="${link.icon} mr-1"></i>` : ''}${link.text}
                        <i class="fas fa-chevron-down ml-1 text-xs transition-transform" :class="{'rotate-180': open}"></i>
                    </div>
                    <div x-show="open" 
                        x-transition:enter="transition ease-out duration-100"
                        x-transition:enter-start="opacity-0 transform scale-95"
                        x-transition:enter-end="opacity-100 transform scale-100"
                        x-transition:leave="transition ease-in duration-75"
                        x-transition:leave-start="opacity-100 transform scale-100"
                        x-transition:leave-end="opacity-0 transform scale-95"
                        class="absolute z-10 mt-2 py-2 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700" 
                        style="display: none; width: max-content;">
                        ${link.url.map(subLink => {
                            const target = subLink.external ? ' target="_blank"' : '';
                            const subIcon = subLink.icon ? `<i class="${subLink.icon} mr-1"></i>` : '';
                            const processedUrl = processLinkUrl(subLink.url);
                            return `<a href="${processedUrl}" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-primary"${target}>${subIcon}${subLink.text}</a>`;
                        }).join('')}
                    </div>
                </div>`;
                
                li.appendChild(dropdownContainer);
            } else {
                // 普通链接
                const a = document.createElement('a');
                a.href = processLinkUrl(link.url);
                a.className = 'text-gray-600 hover:text-primary dark:text-gray-300 dark:hover:text-primary transition-colors';
                
                if (link.external) {
                    a.target = '_blank';
                }
                
                if (link.icon) {
                    const icon = document.createElement('i');
                    icon.className = `${link.icon} mr-1`;
                    a.appendChild(icon);
                }
                
                a.appendChild(document.createTextNode(link.text));
                li.appendChild(a);
            }
            
            navLinksContainer.appendChild(li);
        });
    }
} 