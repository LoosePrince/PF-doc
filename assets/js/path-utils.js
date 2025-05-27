/**
 * 路径工具模块
 * 确保所有路径都正确使用 base_url 配置
 */
import config from '/config.js';

/**
 * 获取完整的站点路径
 * @param {string} relativePath 相对路径
 * @returns {string} 完整路径
 */
export function getFullPath(relativePath = '') {
    const baseUrl = config.site.base_url.replace(/\/$/, ''); // 移除末尾斜杠
    const cleanPath = relativePath.replace(/^\//, ''); // 移除开头斜杠
    
    if (!cleanPath) {
        return baseUrl || '/';
    }
    
    return baseUrl ? `${baseUrl}/${cleanPath}` : `/${cleanPath}`;
}

/**
 * 获取文档页面的完整路径
 * @param {string} hash 哈希部分（可选）
 * @returns {string} 文档页面完整路径
 */
export function getDocumentPagePath(hash = '') {
    const fullPath = getFullPath('main/');
    return hash ? `${fullPath}${hash}` : fullPath;
}

/**
 * 获取静态资源的完整路径
 * @param {string} assetPath 资源相对路径
 * @returns {string} 资源完整路径
 */
export function getAssetPath(assetPath) {
    return getFullPath(assetPath);
}

/**
 * 生成新格式的文档URL
 * @param {string} path 文档路径
 * @param {string} root 根目录（可选）
 * @param {string} anchor 锚点（可选）
 * @returns {string} 新格式URL
 */
export function generateNewUrl(path, root = null, anchor = '') {
    const baseUrl = getDocumentPagePath();
    
    // 移除扩展名的函数
    const removeExtension = (filePath) => {
        if (!filePath) return filePath;
        return filePath.replace(/\.(md|html)$/i, '');
    };
    
    // 构建新的hash格式
    let hash = '';
    
    if (root) {
        // 当有root时，需要检查path是否已经包含了root前缀
        let relativePath = path;
        if (path && path.startsWith(root + '/')) {
            // 如果path已经包含root前缀，则移除它
            relativePath = path.substring(root.length + 1);
        }
        
        // 移除扩展名
        relativePath = removeExtension(relativePath);
        
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
            const cleanPath = removeExtension(path);
            hash = '/' + cleanPath;
            if (anchor) {
                hash += '#' + anchor;
            }
        } else if (anchor) {
            hash = '#' + anchor;
        }
    }
    
    return hash ? `${baseUrl}#${hash}` : baseUrl;
} 