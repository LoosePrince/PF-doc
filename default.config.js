/**
 * EasyDocument 配置文件
 */

const config = {
  // 网站基本信息
  site: {
    name: "EasyDocument", // 网站名称
    title: "简易静态文档系统", // 网站标题，显示在浏览器标签页
    description: "一个轻量级、免编译的纯静态前端文档系统", // 网站描述，用于SEO
    keywords: "文档,静态网站,Markdown,Alpine.js", // 网站关键词，用于SEO
    base_url: "index.html" // 网站基础URL，如果部署在子目录则需要修改
  },

  // 外观设置
  appearance: {
    logo: "assets/img/logo.svg", // 网站Logo路径
    favicon: "assets/img/favicon.ico", // 网站图标路径
    theme_color: "#3b82f6", // 主题色(蓝色)
    default_dark_mode: "auto", // 默认是否启用暗黑模式
    font_family: "system-ui, -apple-system, sans-serif" // 字体设置
  },

  // 布局设置
  layout: {
    show_header: true, // 是否显示顶栏
    use_custom_header: false, // 是否使用自定义的header.html文件
    header_file: "header.html", // 自定义顶栏文件路径
    show_footer: true, // 是否显示底栏
    use_custom_footer: true, // 是否使用自定义的footer.html文件
    footer_file: "footer.html", // 自定义底栏文件路径
    sidebar_width: "250px", // 侧边栏宽度
    toc_width: "220px", // 目录宽度
    mobile_breakpoint: "1024px" // 移动设备断点
  },

  // 导航设置
  navigation: {
    home_text: "首页", // 首页链接文本
    breadcrumb: true, // 是否显示面包屑导航
    auto_collapse: true, // 自动折叠非当前文档的目录
    back_to_top: true, // 显示返回顶部按钮
    prev_next_buttons: true, // 显示上一篇/下一篇导航
    folder_expand_mode: 5, // 文件夹默认展开方式：1-展开全部第一级文件夹，2-展开全部文件夹，3-展开第一个文件夹的第一级，4-展开第一个文件夹的全部文件夹，5-不默认展开任何文件夹
    nav_links: [ // 导航栏链接
      {
        text: "首页",
        url: "index.html",
      },
      {
        text: "文档",
        url: "main.html",
      },
      {
        text: "教程",
        url: [
          {
            text: "快速开始",
            url: "main.html?root=快速入门",
            icon: "fas fa-rocket"
          },
          {
            text: "使用指南",
            url: "main.html?root=使用指南",
            icon: "fas fa-book"
          },
          {
            text: "详细配置",
            url: "main.html?root=配置详解",
            icon: "fas fa-cog"
          }
        ],
        icon: "fas fa-graduation-cap"
      },
      {
        text: "GitHub",
        url: "https://github.com/LoosePrince/EasyDocument",
        icon: "fab fa-github",
        external: true
      }
    ]
  },

  // 文档设置
  document: {
    root_dir: "data", // 文档根目录
    default_page: "README.md", // 默认文档
    index_pages: ["README.md", "README.html", "index.md", "index.html"], // 索引页文件名
    supported_extensions: [".md", ".html"], // 支持的文档扩展名
    toc_depth: 3, // 目录深度，显示到几级（h1~hx）标题
    toc_numbering: true, // 目录是否显示编号（如1，2.3，5.1.3）
    toc_ignore_h1: true, // 生成目录编号时是否忽略h1标题，避免所有标题都以1开头
    toc_dynamic_expand: true, // 是否启用动态展开功能
    code_copy_button: true, // 代码块是否显示复制按钮
    code_block: {
      line_numbers: true, // 是否显示行号
      start_line: 1, // 起始行号
      theme: {
        light: "github", // 亮色主题
        dark: "github-dark" // 暗色主题
      }
    }
  },

  // 搜索功能
  search: {
    enable: true, // 已启用搜索
    min_chars: 2, // 最小搜索字符数
    max_results: 20, // 最大结果数
    placeholder: "搜索文档...", // 搜索框占位符文本
    search_cached: true, // 是否搜索缓存的文档内容
    search_on_type: true, // 是否在输入时自动搜索
    match_distance: 50 // 搜索结果中多个匹配项之间的最小字符距离
  },

  // 插件与扩展
  extensions: {
    math: true, // 数学公式支持(KaTeX)
    highlight: true, // 语法高亮
    mermaid: true, // Mermaid图表渲染
    github: {
      enable: true, // 是否启用GitHub相关功能
      repo_url: "https://github.com/LoosePrince/EasyDocument", // GitHub仓库地址
      edit_link: true, // 是否启用参与编辑链接（点击一键跳转github的编辑）
      branch: "main", // 默认分支名称
      show_avatar: true // 显示参与编辑者的github头像而不是名称
    },
    git: {
      enable: true, // 是否启用Git相关功能
      show_last_modified: true, // 启用文档最后编辑时间显示
      show_contributors: true // 启用参与者名称显示
    }
  },

  // 页脚设置
  footer: {
    copyright: "© 2025 EasyDocument", // 版权信息
    show_powered_by: true, // 显示技术支持信息
    links: [ // 页脚链接
      {
        text: "GitHub",
        url: "https://github.com/LoosePrince/EasyDocument"
      },
      {
        text: "报告问题",
        url: "https://github.com/LoosePrince/EasyDocument/issues"
      }
    ]
  }
};

// 导出配置
export default config; 