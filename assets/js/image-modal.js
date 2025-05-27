/**
 * 图片模态框模块
 * 提供图片查看、缩放、旋转、拖拽等功能
 */

/**
 * 创建增强图片模态框
 * @returns {HTMLElement} 模态框元素
 */
export function createEnhancedImageModal() {
    const imageModal = document.createElement('div');
    imageModal.id = 'custom-image-modal';
    imageModal.className = 'custom-image-modal';
    
    // 创建图片容器
    const viewerContainer = document.createElement('div');
    viewerContainer.className = 'image-viewer-container';
    
    // 创建图片元素
    const modalImg = document.createElement('img');
    modalImg.alt = '放大图片';
    modalImg.draggable = false;
    
    // 创建工具栏
    const toolbar = document.createElement('div');
    toolbar.className = 'image-toolbar';
    toolbar.innerHTML = `
        <button id="zoom-out-btn" title="缩小" aria-label="缩小">
            <i class="fas fa-search-minus"></i>
        </button>
        <button id="zoom-in-btn" title="放大" aria-label="放大">
            <i class="fas fa-search-plus"></i>
        </button>
        <button id="rotate-left-btn" title="向左旋转" aria-label="向左旋转">
            <i class="fas fa-undo"></i>
        </button>
        <button id="rotate-right-btn" title="向右旋转" aria-label="向右旋转">
            <i class="fas fa-redo"></i>
        </button>
        <button id="reset-btn" title="重置" aria-label="重置">
            <i class="fas fa-expand-arrows-alt"></i>
        </button>
    `;
    
    // 创建缩放信息显示
    const zoomInfo = document.createElement('div');
    zoomInfo.className = 'zoom-info';
    zoomInfo.textContent = '100%';
    
    // 创建关闭按钮
    const closeBtn = document.createElement('div');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    
    // 组装模态框
    viewerContainer.appendChild(modalImg);
    imageModal.appendChild(viewerContainer);
    imageModal.appendChild(toolbar);
    imageModal.appendChild(zoomInfo);
    imageModal.appendChild(closeBtn);
    document.body.appendChild(imageModal);
    
    // 初始化事件监听器
    setupImageModalEvents(imageModal, modalImg, toolbar, zoomInfo, closeBtn);
    
    return imageModal;
}

/**
 * 设置图片模态框事件监听器
 * @param {HTMLElement} modal 模态框元素
 * @param {HTMLElement} img 图片元素
 * @param {HTMLElement} toolbar 工具栏元素
 * @param {HTMLElement} zoomInfo 缩放信息元素
 * @param {HTMLElement} closeBtn 关闭按钮元素
 */
export function setupImageModalEvents(modal, img, toolbar, zoomInfo, closeBtn) {
    let imageState = {
        scale: 1,
        rotation: 0,
        x: 0,
        y: 0,
        isDragging: false,
        lastMouseX: 0,
        lastMouseY: 0,
        originalSrc: ''
    };
    
    // 关闭模态框函数
    const closeModal = () => {
        modal.classList.remove('active');
        setTimeout(() => {
            img.src = '';
            resetImageState();
        }, 300);
        document.body.style.overflow = '';
    };
    
    // 重置图片状态
    const resetImageState = () => {
        imageState = {
            scale: 0.5,
            rotation: 0,
            x: 0,
            y: 0,
            isDragging: false,
            lastMouseX: 0,
            lastMouseY: 0,
            originalSrc: ''
        };
        updateImageTransform();
        updateZoomInfo();
    };
    
    // 更新图片变换
    const updateImageTransform = () => {
        img.style.transform = `translate(${imageState.x}px, ${imageState.y}px) scale(${imageState.scale}) rotate(${imageState.rotation}deg)`;
    };
    
    // 更新缩放信息
    const updateZoomInfo = () => {
        zoomInfo.textContent = `${Math.round(imageState.scale * 100)}%`;
    };
    
    // 工具栏按钮事件
    toolbar.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        
        e.stopPropagation();
        
        switch (button.id) {
            case 'zoom-in-btn':
                imageState.scale = Math.min(imageState.scale * 1.2, 5);
                break;
            case 'zoom-out-btn':
                imageState.scale = Math.max(imageState.scale / 1.2, 0.1);
                break;
            case 'rotate-left-btn':
                imageState.rotation -= 90;
                break;
            case 'rotate-right-btn':
                imageState.rotation += 90;
                break;
            case 'reset-btn':
                resetImageState();
                return;
        }
        
        updateImageTransform();
        updateZoomInfo();
    });
    
    // 关闭按钮事件
    closeBtn.addEventListener('click', closeModal);
    
    // 点击模态框背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // 键盘事件
    document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('active')) return;
        
        switch (e.key) {
            case 'Escape':
                closeModal();
                break;
            case '+':
            case '=':
                imageState.scale = Math.min(imageState.scale * 1.2, 5);
                updateImageTransform();
                updateZoomInfo();
                break;
            case '-':
                imageState.scale = Math.max(imageState.scale / 1.2, 0.1);
                updateImageTransform();
                updateZoomInfo();
                break;
            case 'r':
            case 'R':
                imageState.rotation += 90;
                updateImageTransform();
                break;
            case '0':
                resetImageState();
                break;
        }
    });
    
    // 鼠标拖动事件
    img.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // 只处理左键
        e.preventDefault();
        imageState.isDragging = true;
        imageState.lastMouseX = e.clientX;
        imageState.lastMouseY = e.clientY;
        img.classList.add('dragging');
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!imageState.isDragging) return;
        
        const deltaX = e.clientX - imageState.lastMouseX;
        const deltaY = e.clientY - imageState.lastMouseY;
        
        imageState.x += deltaX;
        imageState.y += deltaY;
        imageState.lastMouseX = e.clientX;
        imageState.lastMouseY = e.clientY;
        
        updateImageTransform();
    });
    
    document.addEventListener('mouseup', () => {
        if (imageState.isDragging) {
            imageState.isDragging = false;
            img.classList.remove('dragging');
        }
    });
    
    // 滚轮缩放事件
    modal.addEventListener('wheel', (e) => {
        if (!modal.classList.contains('active')) return;
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        imageState.scale = Math.max(0.1, Math.min(5, imageState.scale * delta));
        
        updateImageTransform();
        updateZoomInfo();
    });
    
    // 触摸事件支持（移动端）
    let touchStartDistance = 0;
    let initialScale = 1;
    
    img.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            // 双指缩放
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            touchStartDistance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            initialScale = imageState.scale;
        } else if (e.touches.length === 1) {
            // 单指拖动
            imageState.isDragging = true;
            const touch = e.touches[0];
            imageState.lastMouseX = touch.clientX;
            imageState.lastMouseY = touch.clientY;
        }
    });
    
    img.addEventListener('touchmove', (e) => {
        e.preventDefault();
        
        if (e.touches.length === 2 && touchStartDistance > 0) {
            // 双指缩放
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            
            const scaleMultiplier = currentDistance / touchStartDistance;
            imageState.scale = Math.max(0.1, Math.min(5, initialScale * scaleMultiplier));
            
            updateImageTransform();
            updateZoomInfo();
        } else if (e.touches.length === 1 && imageState.isDragging) {
            // 单指拖动
            const touch = e.touches[0];
            const deltaX = touch.clientX - imageState.lastMouseX;
            const deltaY = touch.clientY - imageState.lastMouseY;
            
            imageState.x += deltaX;
            imageState.y += deltaY;
            imageState.lastMouseX = touch.clientX;
            imageState.lastMouseY = touch.clientY;
            
            updateImageTransform();
        }
    });
    
    img.addEventListener('touchend', () => {
        imageState.isDragging = false;
        touchStartDistance = 0;
    });
    
    // 存储模态框对象引用
    modal._imageState = imageState;
    modal._updateImageTransform = updateImageTransform;
    modal._updateZoomInfo = updateZoomInfo;
    modal._resetImageState = resetImageState;
}

/**
 * 显示增强图片模态框
 * @param {string} src 图片源地址
 * @param {string} alt 图片替代文字
 */
export function showEnhancedImageModal(src, alt = '放大图片') {
    const modal = document.getElementById('custom-image-modal');
    if (!modal) return;
    
    const img = modal.querySelector('img');
    img.src = src;
    img.alt = alt;
    
    // 重置图片状态
    modal._imageState.originalSrc = src;
    modal._resetImageState();
    
    // 禁止页面滚动
    document.body.style.overflow = 'hidden';
    
    // 显示模态框
    setTimeout(() => {
        modal.classList.add('active');
    }, 50);
} 