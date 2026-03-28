// --- 配置与全局变量 ---
const MANIFEST_URL = 'manifest.json';
let dbData = null; 
let baseUrl = "";

// GitHub Raw URL 用于加载 .glb 3D模型 
const GITHUB_MODEL_BASE = "https://raw.githubusercontent.com/manqi8731-dotcom/3D_model/main/models/";

// DOM 元素引用
const appContent = document.getElementById('app-content');

// --- 初始化程序 ---
async function init() {
    try {
        const response = await fetch(MANIFEST_URL);
        dbData = await response.json();
        baseUrl = dbData.baseUrl;
        
        // 监听 URL Hash 变化进行前端路由
        window.addEventListener('hashchange', renderRoute);
        // 初始化当前页面
        if(!window.location.hash) {
            window.location.hash = '#home';
        } else {
            renderRoute();
        }
    } catch (error) {
        appContent.innerHTML = `<p style="color:red;">无法加载 manifest.json，请检查网络或文件路径。报错: ${error.message}</p>`;
    }
}

// --- 路由管理器 ---
function renderRoute() {
    const hash = window.location.hash || '#home';
    appContent.innerHTML = ''; // 清空内容

    // 更新导航栏激活状态
    document.querySelectorAll('.nav-links a').forEach(a => {
        a.classList.remove('active');
        if(a.getAttribute('href') === hash) a.classList.add('active');
    });

    // 路由分发
    switch(hash) {
        case '#home':
            renderHome(); break;
        case '#modeling':
            renderModeling(0); break; // 默认选中第一项
        case '#photos':
            renderPhotos('01刘氏宗祠'); break; // 默认选中宗祠
        case '#documents':
            renderDocuments(); break;
        default:
            renderHome();
    }
}

// --- 通用工具函数 ---
// URL 拼接规则 
function buildResourceUrl(relativePath, fileName) {
    return baseUrl + relativePath + fileName;
}

// 生成图片/文件网格卡片
function generateGalleryHtml(itemObj) {
    if(!itemObj || !itemObj.images || itemObj.images.length === 0) return '<p>暂无文件</p>';
    
    let html = `<div class="gallery-grid">`;
    itemObj.images.forEach((fileName, index) => {
        const fullUrl = buildResourceUrl(itemObj.relativePath, fileName);
        const fileExt = fileName.split('.').pop().toLowerCase();
        const displayName = fileName.split('.')[0]; // 去掉后缀名作为展示名称
        
        html += `<div class="gallery-item">`;
        
        if (fileExt === 'pdf') {
            html += `<img src="https://via.placeholder.com/200x150?text=PDF+Document" alt="PDF">`;
        } else {
            // 图片展示
            html += `<img src="${fullUrl}" alt="${fileName}" loading="lazy">`;
        }
        
        // 【修改点】：将 input 替换为普通的 div 标签，彻底禁止用户编辑
        // 【修改点】：直接去掉“在线预览”按钮，仅保留“下载”
        html += `
            <div class="img-name" title="${displayName}">${displayName}</div>
            <div class="actions">
                <a href="${fullUrl}" download="${fileName}" target="_blank">下载</a>
            </div>
        </div>`;
    });
    html += `</div>`;
    return html;
}
// --- 页面渲染函数 ---

// 1. 首页渲染 [cite: 13, 14, 15, 16]
function renderHome() {
    appContent.innerHTML = `
        <div class="home-intro">
            <h2>欢迎来到“潮韵厝影”数据库</h2>
            <p>本数据库收录了大量潮汕地区传统建筑的3D模型、CAD图纸、测绘影像及文献资料。</p>
        </div>
        <div class="card-container">
            <div class="card" onclick="window.location.hash='#modeling'">
                <h3>01 建模相关资料</h3>
                <p>包含刘氏宗祠的3D模型、CAD图纸以及各部件建模截图。</p>
            </div>
            <div class="card" onclick="window.location.hash='#photos'">
                <h3>02 建筑相关照片</h3>
                <p>包含传统民居、现代民居及空心村落的实地拍摄影像记录。</p>
            </div>
            <div class="card" onclick="window.location.hash='#documents'">
                <h3>03 文献收集整理资料</h3>
                <p>提供关于潮汕建筑结构、装饰艺术的文献整理归档下载。</p>
            </div>
        </div>
    `;
}

// 2. 建模相关资料页面渲染 [cite: 17]
function renderModeling(activeIndex) {
    const category = dbData.categories.find(c => c.name.includes("建模相关资料"));
    if(!category) return;
    const subItems = category.children;

    let html = `
        <div class="page-layout">
            <aside class="sidebar">
                <ul id="modeling-nav">
                    ${subItems.map((item, idx) => `
                        <li><a href="javascript:void(0)" class="${idx === activeIndex ? 'active' : ''}" onclick="switchModelingTab(${idx})">${item.name}</a></li>
                    `).join('')}
                </ul>
            </aside>
            <section class="content-area" id="modeling-content">
                </section>
        </div>
    `;
    appContent.innerHTML = html;
    updateModelingContent(subItems[activeIndex], activeIndex);
    
    // 挂载到全局供 onclick 调用
    window.switchModelingTab = (idx) => renderModeling(idx);
}

function updateModelingContent(item, idx) {
    const contentArea = document.getElementById('modeling-content');
    if (!contentArea) return;

    contentArea.innerHTML = `<h2>${item.name}</h2>`;

    // 1. 处理 3D 模型 (.glb)
    if (idx === 0) {
        const modelName = item.images[0];
        const modelUrl = GITHUB_MODEL_BASE + modelName;
        contentArea.innerHTML += `
            <model-viewer src="${modelUrl}" camera-controls auto-rotate shadow-intensity="1" ar></model-viewer>
            <p style="margin-top:1rem; color:#666;">提示：左键长按进行旋转，滚轮缩放。</p>
        `;
    } 
    // 2. 特殊处理：02 PDF 页面（上方显示 04 的图，下方下载 02 的 PDF）
    else if (item.name.includes("02刘氏宗祠CAD的pdf文件")) {
        // 【关键点 1】：直接从第一层根目录找 “04补充图片”
        const imgFolder = dbData.categories.find(c => c.name.includes("04补充图片"));

        let html = `<div class="gallery-grid">`;
        
        // 【关键点 2】：遍历当前的 PDF 文件列表 (item 就是 02pdf 文件夹)
        item.images.forEach((pdfFileName, i) => {
            // 生成 PDF 的下载链接 (来自当前文件夹 02)
            const pdfUrl = buildResourceUrl(item.relativePath, pdfFileName);
            
            // 生成图片的展示链接 (来自第一层的 04 文件夹，按索引 i 对应)
            let imgUrl = "";
            if (imgFolder && imgFolder.images && imgFolder.images[i]) {
                imgUrl = buildResourceUrl(imgFolder.relativePath, imgFolder.images[i]);
            }

            // 提取纯名称（去掉后缀）
            const displayName = pdfFileName.split('.')[0].trim();

            html += `
                <div class="gallery-item">
                    <div class="img-container" style="height:200px; overflow:hidden; background:#eee; border-radius:4px 4px 0 0;">
                        <img src="${imgUrl}" alt="${displayName}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://via.placeholder.com/300x200?text=图片加载失败'">
                    </div>
                    <div class="img-name" style="padding:10px; font-weight:bold; border-bottom:1px solid #eee;">${displayName}</div>
                    <div class="actions" style="padding:10px;">
                        <a href="${pdfUrl}" download="${pdfFileName}" target="_blank" style="display:block; width:100%; text-align:center; background-color:#B87C4F; color:white; text-decoration:none; padding:8px 0; border-radius:4px;">下载 PDF 档</a>
                    </div>
                </div>`;
        });
        
        html += `</div>`;
        contentArea.innerHTML += html;
    } 
    // 3. 其他常规页面
    else {
        contentArea.innerHTML += generateGalleryHtml(item);
    }
}

// 3. 建筑相关照片页面渲染 [cite: 23]
// 选项：01刘氏宗祠、02传统民居、03现代民居、04空心村
function renderPhotos(activeMainTab, activeSubTab = null) {
    const photoCategory = dbData.categories.find(c => c.name.includes("02建筑相关照片")).children;
    
    // 从 JSON 树中平铺提取指定的4个大类：
    const mainTabs = [
        { id: '01刘氏宗祠', data: photoCategory[0].children[0] }, // 01宗祠 -> 01刘氏宗祠 [cite: 24]
        { id: '02传统民居', data: photoCategory[1].children[0] }, // 02民居 -> 01传统民居 [cite: 25]
        { id: '03现代民居', data: photoCategory[1].children[1] }, // 02民居 -> 02现代民居 [cite: 26]
        { id: '04空心村', data: photoCategory[2].children[0] }    // 03其他 -> 01空心村 [cite: 27]
    ];

    const currentMainData = mainTabs.find(t => t.id === activeMainTab).data;
    
    let html = `<div class="page-layout"><aside class="sidebar"><ul>`;
    
    // 渲染左侧导航树
    mainTabs.forEach(tab => {
        const isActive = tab.id === activeMainTab;
        html += `<li>
            <a href="javascript:void(0)" class="${isActive && !activeSubTab ? 'active' : ''}" 
               onclick="switchPhotoTab('${tab.id}', null)">${tab.id}</a>`;
               
        // 如果有二级子菜单，且当前选中该大类，则展开二级菜单
        if (isActive && tab.data.children) {
            html += `<ul class="sub-menu">`;
            // 如果没有指定子菜单，默认选中第一个
            const targetSub = activeSubTab || tab.data.children[0].name;
            tab.data.children.forEach(sub => {
                const isSubActive = sub.name === targetSub;
                html += `<li><a href="javascript:void(0)" class="${isSubActive ? 'active' : ''}" 
                            onclick="switchPhotoTab('${tab.id}', '${sub.name}')">${sub.name}</a></li>`;
            });
            html += `</ul>`;
        }
        html += `</li>`;
    });

    html += `</ul></aside><section class="content-area" id="photo-content"></section></div>`;
    appContent.innerHTML = html;

    // 渲染具体内容
    const contentArea = document.getElementById('photo-content');
    if (currentMainData.children) {
        // 如果有子级，展示选中子级的网格
        const targetSub = activeSubTab || currentMainData.children[0].name;
        const subData = currentMainData.children.find(c => c.name === targetSub);
        contentArea.innerHTML = `<h2>${activeMainTab} - ${subData.name}</h2>`;
        
        // 注意：厝角头下还有三级目录，这里做一个递归扁平化提取或者直接展示子级images
        if(subData.children) {
             subData.children.forEach(deepChild => {
                 contentArea.innerHTML += `<h3>${deepChild.name}</h3>`;
                 contentArea.innerHTML += generateGalleryHtml(deepChild);
             });
        } else {
             contentArea.innerHTML += generateGalleryHtml(subData);
        }
    } else {
        // 03现代民居 没有子级，直接展示 [cite: 26]
        contentArea.innerHTML = `<h2>${activeMainTab}</h2>`;
        contentArea.innerHTML += generateGalleryHtml(currentMainData);
    }

    // 挂载到全局
    window.switchPhotoTab = (mainTab, subTab) => renderPhotos(mainTab, subTab);
}

// 4. 文献资料页面渲染 [cite: 28]
function renderDocuments() {
    const docCategory = dbData.categories.find(c => c.name.includes("文献收集整理资料"));
    if(!docCategory || !docCategory.images) return;

    let html = `
        <div class="content-area">
            <h2>文献收集整理资料</h2>
            <p>点击右侧按钮下载对应的 .docx 文献整理文件。</p>
            <div class="doc-list" style="margin-top: 2rem;">
    `;

    docCategory.images.forEach(fileName => {
        const fullUrl = buildResourceUrl(docCategory.relativePath, fileName);
        html += `
            <div class="doc-item">
                <span>📄 ${fileName}</span>
                <a href="${fullUrl}" download="${fileName}" target="_blank">点击下载</a>
            </div>
        `;
    });

    html += `</div></div>`;
    appContent.innerHTML = html;
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);
