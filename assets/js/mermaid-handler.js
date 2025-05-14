/**
 * Mermaid图表处理模块
 */
import config from '../../config.js';

// 监听暗黑模式变化
const darkModeObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        if (mutation.attributeName === 'class') {
            const isDarkMode = document.documentElement.classList.contains('dark');
            // 切换代码高亮主题
            document.querySelector('link[href*="github.min.css"]').media = isDarkMode ? 'not all' : 'all';
            document.querySelector('link[href*="github-dark.min.css"]').media = isDarkMode ? 'all' : 'not all';
            
            // 重新初始化Mermaid以适应暗黑模式
            updateMermaidTheme(isDarkMode);
        }
    });
});

// 开始观察html元素上的class变化
darkModeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
});

// 更新Mermaid主题
export function updateMermaidTheme(isDarkMode) {
    // 检查是否启用了Mermaid支持
    if (!config.extensions.mermaid) return;

    // 更新Mermaid配置
    mermaid.initialize({ 
        startOnLoad: false,
        theme: isDarkMode ? 'dark' : 'default',
        darkMode: isDarkMode,
        themeVariables: {
            // 暗黑模式变量
            dark: {
                mainBkg: '#242424',
                nodeBkg: '#333',
                nodeBorder: '#555',
                lineColor: '#d3d3d3',  // 线条和箭头颜色
                edgeLabelBackground: '#333',
                textColor: '#e0e0e0'   // 文本颜色
            }
        }
    });
    
    // 尝试重新渲染页面上的所有Mermaid图表
    const mermaidDivs = document.querySelectorAll('.mermaid');
    if (mermaidDivs.length > 0) {
        // 清除旧内容，保存原始文本
        const mermaidContents = [];
        mermaidDivs.forEach(div => {
            // 如果还没有渲染过，div的类会包含"mermaid"
            if (div.getAttribute('data-processed') === 'true') {
                // 获取原始内容
                const originalContent = div.getAttribute('data-original') || div.textContent;
                mermaidContents.push(originalContent);
                // 重置div
                div.removeAttribute('data-processed');
                div.innerHTML = originalContent;
            } else {
                // 保存原始内容
                div.setAttribute('data-original', div.textContent);
                mermaidContents.push(div.textContent);
            }
        });
        
        // 重新渲染
        setTimeout(() => {
            mermaid.init(undefined, mermaidDivs);
        }, 100);
    }
}

// 初始化 Mermaid（全局配置）
export function initializeMermaid() {
    // 检查是否启用了Mermaid支持
    if (!config.extensions.mermaid) return;

    mermaid.initialize({ 
        startOnLoad: false,  // 改为false，我们会在文档加载后手动初始化
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
        darkMode: document.documentElement.classList.contains('dark'), // 明确设置暗黑模式
        themeVariables: {
            // 暗黑模式变量
            dark: {
                mainBkg: '#242424',
                nodeBkg: '#333',
                nodeBorder: '#555',
                lineColor: '#d3d3d3',  // 线条和箭头颜色
                edgeLabelBackground: '#333',
                textColor: '#e0e0e0'   // 文本颜色
            }
        }
    });
}

// 处理文档中的Mermaid图表
export function processMermaidDiagrams() {
    // 检查是否启用了Mermaid支持
    if (!config.extensions.mermaid) return;

    setTimeout(() => {
        try {
            // 选择所有mermaid代码块
            const mermaidBlocks = document.querySelectorAll('pre code.language-mermaid');
            mermaidBlocks.forEach((block, index) => {
                const originalCode = block.textContent;

                // 创建Mermaid渲染区域
                const mermaidDiv = document.createElement('div');
                mermaidDiv.className = 'mermaid';
                mermaidDiv.textContent = originalCode;
                mermaidDiv.setAttribute('data-original', originalCode);
                mermaidDiv.id = `mermaid-graph-${index}`; // 为SVG导出添加唯一ID

                // 创建按钮容器
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'mermaid-controls'; // 添加样式控制
                // buttonContainer.style.position = 'relative';
                // buttonContainer.style.textAlign = 'right';
                // buttonContainer.style.marginTop = '-30px'; // 根据需要调整位置
                // buttonContainer.style.marginBottom = '10px'; // 避免遮挡下面内容
                // buttonContainer.style.paddingRight = '10px';
                // buttonContainer.style.zIndex = '10'; // 确保在图表上方

                // 创建复制源码按钮
                const copyCodeButton = document.createElement('button');
                copyCodeButton.innerHTML = '<i class="fas fa-code"></i> 源码';
                copyCodeButton.className = 'copy-button'; // 使用通用复制按钮样式
                copyCodeButton.title = '复制Mermaid源码';
                copyCodeButton.onclick = () => {
                    navigator.clipboard.writeText(originalCode).then(() => {
                        copyCodeButton.innerHTML = '<i class="fas fa-check"></i> 已复制';
                        setTimeout(() => { copyCodeButton.innerHTML = '<i class="fas fa-code"></i> 源码'; }, 2000);
                    }).catch(err => console.error('无法复制源码:', err));
                };

                // 创建复制图像按钮 - 现在改为使用SVG方法
                const copyImageButton = document.createElement('button');
                copyImageButton.innerHTML = '<i class="fas fa-copy"></i> 复制';
                copyImageButton.className = 'copy-button';
                copyImageButton.title = '复制图表为图像';
                copyImageButton.onclick = async () => {
                    const svgElement = document.getElementById(`mermaid-graph-${index}`)?.querySelector('svg');
                    
                    if (!svgElement) {
                        console.warn('SVG element not found for copy.');
                        alert('无法找到渲染后的SVG图表，请稍后再试。');
                        return;
                    }

                    copyImageButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中';
                    copyImageButton.disabled = true;

                    try {
                        // 创建一个深拷贝的SVG元素，以避免修改原始SVG
                        const clonedSvg = svgElement.cloneNode(true);
                        
                        // 确保SVG有正确的尺寸属性
                        const bbox = svgElement.getBoundingClientRect();
                        clonedSvg.setAttribute('width', bbox.width);
                        clonedSvg.setAttribute('height', bbox.height);
                        
                        // 转换为字符串
                        const svgData = new XMLSerializer().serializeToString(clonedSvg);
                        
                        // 转换为base64编码的Data URL (这避免了tainted canvas问题)
                        const svgBase64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                        
                        // 创建图像元素
                        const img = new Image();
                        img.width = bbox.width;
                        img.height = bbox.height;
                        
                        // 设置加载完成事件
                        img.onload = () => {
                            // 创建Canvas
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            
                            // 设置高分辨率
                            const scaleFactor = 2;
                            canvas.width = img.width * scaleFactor;
                            canvas.height = img.height * scaleFactor;
                            
                            // 添加透明背景
                            ctx.fillStyle = '#00000000';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            
                            // 按比例放大绘制
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            
                            // 试图将图像复制到剪贴板
                            canvas.toBlob(async (blob) => {
                                if (!blob) {
                                    console.error('无法创建Blob');
                                    alert('处理图像失败，请尝试使用下载按钮。');
                                    copyImageButton.innerHTML = '<i class="fas fa-times"></i> 失败';
                                } else {
                                    try {
                                        // 复制到剪贴板
                                        await navigator.clipboard.write([
                                            new ClipboardItem({ 'image/png': blob })
                                        ]);
                                        copyImageButton.innerHTML = '<i class="fas fa-check"></i> 已复制';
                                    } catch (err) {
                                        console.warn('无法复制到剪贴板:', err);
                                        alert('无法复制到剪贴板，请使用下载按钮。\n错误: ' + err.message);
                                        copyImageButton.innerHTML = '<i class="fas fa-times"></i> 失败';
                                    }
                                }
                                
                                // 重置按钮状态
                                setTimeout(() => {
                                    copyImageButton.innerHTML = '<i class="fas fa-copy"></i> 复制';
                                    copyImageButton.disabled = false;
                                }, 2000);
                            }, 'image/png', 1.0);
                        };
                        
                        // 加载错误处理
                        img.onerror = (err) => {
                            console.error('加载SVG图像失败:', err);
                            alert('处理SVG图像失败，请尝试使用下载按钮。');
                            copyImageButton.innerHTML = '<i class="fas fa-times"></i> 失败';
                            setTimeout(() => {
                                copyImageButton.innerHTML = '<i class="fas fa-copy"></i> 复制';
                                copyImageButton.disabled = false;
                            }, 2000);
                        };
                        
                        // 设置图像源为SVG的base64编码
                        img.src = svgBase64;
                        
                    } catch (error) {
                        console.error('复制图像时出错:', error);
                        alert('复制图像时发生错误: ' + error.message);
                        copyImageButton.innerHTML = '<i class="fas fa-times"></i> 失败';
                        setTimeout(() => {
                            copyImageButton.innerHTML = '<i class="fas fa-copy"></i> 复制';
                            copyImageButton.disabled = false;
                        }, 2000);
                    }
                };

                // 创建下载图像按钮 - 使用同样的方法避免tainted canvas问题
                const downloadButton = document.createElement('button');
                downloadButton.innerHTML = '<i class="fas fa-download"></i> 下载';
                downloadButton.className = 'copy-button';
                downloadButton.title = '下载图表为PNG图像';
                downloadButton.onclick = async () => {
                    const svgElement = document.getElementById(`mermaid-graph-${index}`)?.querySelector('svg');
                    
                    if (!svgElement) {
                        console.warn('SVG element not found for download.');
                        alert('无法找到渲染后的SVG图表，请稍后再试。');
                        return;
                    }

                    downloadButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中';
                    downloadButton.disabled = true;

                    try {
                        // 创建一个深拷贝的SVG元素
                        const clonedSvg = svgElement.cloneNode(true);
                        
                        // 确保SVG有正确的尺寸属性
                        const bbox = svgElement.getBoundingClientRect();
                        clonedSvg.setAttribute('width', bbox.width);
                        clonedSvg.setAttribute('height', bbox.height);
                        
                        // 转换为字符串
                        const svgData = new XMLSerializer().serializeToString(clonedSvg);
                        
                        // 转换为base64编码的Data URL (这避免了tainted canvas问题)
                        const svgBase64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
                        
                        // 创建图像元素
                        const img = new Image();
                        img.width = bbox.width;
                        img.height = bbox.height;
                        
                        // 设置加载完成事件
                        img.onload = () => {
                            // 创建Canvas
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            
                            // 设置高分辨率
                            const scaleFactor = 2;
                            canvas.width = img.width * scaleFactor;
                            canvas.height = img.height * scaleFactor;
                            
                            // 添加透明背景
                            ctx.fillStyle = '#00000000';
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            
                            // 按比例放大绘制
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            
                            try {
                                // 创建图像的Data URL
                                const dataUrl = canvas.toDataURL('image/png');
                                
                                // 创建下载链接
                                const link = document.createElement('a');
                                link.href = dataUrl;
                                link.download = `mermaid-diagram-${index}.png`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                
                                downloadButton.innerHTML = '<i class="fas fa-check"></i> 已下载';
                            } catch (err) {
                                console.error('下载图像失败:', err);
                                alert('下载图像失败: ' + err.message);
                                downloadButton.innerHTML = '<i class="fas fa-times"></i> 失败';
                            }
                            
                            // 重置按钮状态
                            setTimeout(() => {
                                downloadButton.innerHTML = '<i class="fas fa-download"></i> 下载';
                                downloadButton.disabled = false;
                            }, 2000);
                        };
                        
                        // 加载错误处理
                        img.onerror = (err) => {
                            console.error('加载SVG图像失败:', err);
                            alert('处理SVG图像失败，无法下载。');
                            downloadButton.innerHTML = '<i class="fas fa-times"></i> 失败';
                            setTimeout(() => {
                                downloadButton.innerHTML = '<i class="fas fa-download"></i> 下载';
                                downloadButton.disabled = false;
                            }, 2000);
                        };
                        
                        // 设置图像源为SVG的base64编码
                        img.src = svgBase64;
                        
                    } catch (error) {
                        console.error('准备下载时出错:', error);
                        alert('准备下载时发生错误: ' + error.message);
                        downloadButton.innerHTML = '<i class="fas fa-times"></i> 失败';
                        setTimeout(() => {
                            downloadButton.innerHTML = '<i class="fas fa-download"></i> 下载';
                            downloadButton.disabled = false;
                        }, 2000);
                    }
                };

                // 添加按钮到容器
                buttonContainer.appendChild(copyCodeButton);
                buttonContainer.appendChild(copyImageButton);
                buttonContainer.appendChild(downloadButton);

                // 创建整体容器
                const container = document.createElement('div');
                container.className = 'mermaid-container'; // 外层容器
                container.appendChild(buttonContainer); // 按钮在图表外部、逻辑上在其之前
                container.appendChild(mermaidDiv); // 图表在其后

                // 替换 pre 元素
                const preBlock = block.closest('pre');
                if (preBlock && preBlock.parentNode) {
                    preBlock.parentNode.replaceChild(container, preBlock);
                }
            });
            
            // 获取当前主题
            const isDarkMode = document.documentElement.classList.contains('dark');
            
            // 使用新的容器选择器或保持原样（如果 init 仍能找到 .mermaid 类）
            const mermaidElementsToRender = document.querySelectorAll('.mermaid-container .mermaid');

            if (mermaidElementsToRender.length > 0) {
                // 调用 mermaid.init 来渲染图表
                mermaid.init(undefined, mermaidElementsToRender);
            } /** else {
                console.log("No mermaid diagrams found to render after processing.");
            }**/

        } catch (err) {
            console.error('Mermaid处理或初始化错误:', err);
        }
    }, 100); // 延迟以确保DOM准备就绪
}

// 添加基础样式
// 确保只添加一次
if (!document.getElementById('mermaid-handler-styles')) {
    const style = document.createElement('style');
    style.id = 'mermaid-handler-styles';
    style.textContent = `
    .mermaid-container {
        position: relative;
        margin-bottom: 1rem; 
        border: 1px solid #e5e7eb;
        border-radius: 0.375rem; 
        background-color: #f9fafb; 
        padding-top: 35px; /* 为按钮留出空间 */
    }
    html.dark .mermaid-container {
        border-color: #374151;
        background-color: #1f2937; 
    }
    .mermaid-controls {
        position: absolute; 
        top: 5px; 
        right: 5px; 
        z-index: 10;
        display: flex;
        gap: 5px; 
    }
    .copy-button {
        padding: 2px 6px;
        border-radius: 4px;
        background-color: rgba(200, 200, 200, 0.7); 
        color: #333;
        border: none;
        font-size: 0.75rem; 
        cursor: pointer;
        transition: background-color 0.2s;
        display: inline-flex; 
        align-items: center;
        gap: 4px; 
    }
    html.dark .copy-button {
         background-color: rgba(100, 100, 100, 0.7);
         color: #eee;
    }
    .copy-button:hover {
        background-color: rgba(180, 180, 180, 0.9);
    }
    html.dark .copy-button:hover {
        background-color: rgba(80, 80, 80, 0.9);
    }
    .copy-button:disabled {
        cursor: not-allowed;
        opacity: 0.7;
    }
    .copy-button i {
         font-size: 0.8em; 
    }
    .mermaid {
        /* 移除之前的内边距，因为外层容器处理了 */
        padding-top: 0;
        display: flex; /* 尝试居中SVG */
        justify-content: center; /* 水平居中 */
        align-items: center; /* 垂直居中 */
        /* 可能需要设置最小高度 */
         min-height: 50px; 
    }
    `;
    document.head.appendChild(style);
} 