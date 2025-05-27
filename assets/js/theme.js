/**
 * 主题相关功能
 * 负责处理暗黑模式的初始化、切换和保存
 */

// 暗黑模式初始化
export function initDarkMode(config) {
    // 获取用户偏好
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // 设置初始模式
    let initialTheme;
    
    if (savedTheme) {
        // 如果用户已经设置了偏好，优先使用
        initialTheme = savedTheme;
    } else {
        // 否则根据配置决定
        switch(config.appearance.default_dark_mode) {
            case 'dark':
                initialTheme = 'dark';
                break;
            case 'light':
                initialTheme = 'light';
                break;
            case 'auto':
            default:
                initialTheme = systemPrefersDark ? 'dark' : 'light';
                break;
        }
    }
    
    // 应用主题
    applyTheme(initialTheme);
    
    // 监听系统主题变化（仅在auto模式下生效）
    if (config.appearance.default_dark_mode === 'auto' && !savedTheme) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            applyTheme(e.matches ? 'dark' : 'light');
        });
    }
}

// 应用主题
export function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    // 触发主题变化事件
    window.dispatchEvent(new CustomEvent('themeChanged', {
        detail: { theme }
    }));
    
    // 直接更新按钮图标状态
    updateThemeToggleButton();
}

// 更新主题按钮的状态
export function updateThemeToggleButton() {
    const isDarkMode = document.documentElement.classList.contains('dark');
    const toggleButtons = document.querySelectorAll('[id^="dark-mode-toggle"]');
    
    toggleButtons.forEach(button => {
        if (!button) return;
        
        const moonIcon = button.querySelector('.fa-moon');
        const sunIcon = button.querySelector('.fa-sun');
        
        if (moonIcon && sunIcon) {
            if (isDarkMode) {
                moonIcon.classList.add('hidden');
                sunIcon.classList.remove('hidden');
            } else {
                moonIcon.classList.remove('hidden');
                sunIcon.classList.add('hidden');
            }
        }
    });
}

// 切换暗黑模式
export function toggleDarkMode() {
    // 切换类
    document.documentElement.classList.toggle('dark');
    
    // 保存设置
    const isDarkMode = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    // 立即更新按钮图标状态
    updateThemeToggleButton();
    
    // 触发全局事件，用于通知其他组件
    window.dispatchEvent(new CustomEvent('themeChanged', {
        detail: { theme: isDarkMode ? 'dark' : 'light' }
    }));
    
    // 解决Alpine.js在暗黑模式切换后可能失效的问题
    if (window.Alpine) {
        try {
            // 尝试刷新Alpine.js实例
            document.querySelectorAll('[x-data]').forEach(el => {
                if (el.__x) {
                    // 重新初始化Alpine组件
                    setTimeout(() => {
                        try {
                            window.Alpine.initTree(el);
                            // 特别处理移动菜单的显示
                            if (el.getAttribute('x-data').includes('mobileMenuOpen')) {
                                const mobileMenuOpen = el.__x.$data.mobileMenuOpen;
                                if (mobileMenuOpen) {
                                    const menu = el.querySelector('[x-show="mobileMenuOpen"]');
                                    if (menu) {
                                        menu.style.display = 'block';
                                    }
                                }
                            }
                        } catch (e) {
                            console.error('Failed to reinitialize Alpine component:', e);
                        }
                    }, 50);
                }
            });
        } catch (e) {
            console.error('Failed to refresh Alpine.js:', e);
        }
    }
}

// 初始化事件监听
export function initThemeEvents() {
    // 监听主题变化事件
    window.addEventListener('themeChanged', function() {
        updateThemeToggleButton();
    });
    
    // 页面加载时初始化主题相关功能
    function initThemeOnLoad() {
        // 绑定切换按钮事件
        const toggleButtons = document.querySelectorAll('[id^="dark-mode-toggle"]');
        toggleButtons.forEach(button => {
            button.addEventListener('click', toggleDarkMode);
        });
        
        // 更新按钮状态
        updateThemeToggleButton();
    }

    // 立即执行初始化
    initThemeOnLoad();
} 