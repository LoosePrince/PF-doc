# PFingan系列插件

## 项目概述

PFingan服务器提供和开发的MCDR插件，包括但不限于QQ群管、聊天互通、服务器管理、IP记录、IP封禁、WebUI等。这些插件旨在为Minecraft服务器管理员提供全面的服务器管理解决方案。

## 插件列表

### PF-gugubot

MCDR的QQ机器人插件，集QQ群管理和白名单管理一体，添加许多功能。

仓库地址：https://github.com/LoosePrince/PF-GUGUBot

### PF-webui

MCDR的WebUI管理插件，管理PF系列插件配置和其它配置，提供插件管理和配置修改功能。

仓库地址：https://github.com/LoosePrince/PF-MCDR-WebUI


### PF-cq-api

MCDR的QQ机器人API插件，支持OneBot协议的正向WebSocketQQ。

仓库地址：https://github.com/XueK66/PF-cq_qq_api


## 安装要求

- [MCDReforged](https://github.com/Fallen-Breath/MCDReforged)
- Python 3.8+
- 对应的QQ机器人框架（对于PF-gugubot和PF-cq-api）

## 快速开始

1. 确保已安装MCDReforged
2. 下载插件并放入plugins目录
3. 重启MCDR或使用`!!MCDR load plugin`加载插件
4. 根据各插件文档进行配置

## 配置

各插件配置文件位于`config/插件名/`目录下，具体配置项请参考各插件的文档。

## 常见问题

如果您在使用过程中遇到问题，请先查看[常见问题](https://pf-doc.pfingan.com/main/#常见问题/)页面，或到[支持与反馈](https://pf-doc.pfingan.com/main/#支持与反馈/)页面获取帮助。

## 如何为本文档进行贡献

### 文档结构

本文档基于[EasyDocument](https://github.com/LoosePrince/EasyDocument)系统构建，支持Markdown格式。文档文件存放在`data/`目录中。

### 修改现有文章

1. **直接在GitHub编辑**：点击文档页面左下角的"在GitHub上编辑此页面"按钮，将直接跳转到GitHub编辑页面
2. **本地编辑**：
   - Fork本仓库到您的GitHub账户
   - 克隆到本地：`git clone https://github.com/LoosePrince/PF-doc.git`
   - 在`data/`目录中找到对应的`.md`文件进行编辑
   - 提交更改并创建Pull Request

### 添加新文章

1. 在`data/`目录的适当位置创建新的`.md`文件
2. 文件命名建议：
   - 使用有意义的英文名称
   - 避免特殊字符和空格
   - 示例：`plugin-installation.md`、`troubleshooting.md`
   - 可以使用中文作为文件名（由于目前大部分文章的文件名都是中文，所以建议使用中文）
3. 文件内容格式：

   ```markdown
   # 文章标题
   
   文章内容...
   ```

### 需要进行的操作

- ✅ 使用标准的Markdown语法编写内容
- ✅ 在文档中添加适当的标题层级（H1、H2、H3等）
- ✅ 为代码块指定编程语言以便语法高亮
- ✅ 使用相对路径链接到其他文档页面
- ✅ 提交前检查Markdown语法的正确性

### 不需要进行的操作

- ❌ 修改`default.config.js`、`config.js`等配置文件（除非涉及站点级配置）
- ❌ 编译或构建文档（系统自动处理）
- ❌ 处理导航菜单（系统自动生成）
- ❌ 修改样式和主题（由系统统一管理）
- ❌ 手动生成目录（系统自动从标题生成）

### 贡献流程

1. Fork本仓库
2. git到本地或者直接在GitHub上编辑
3. 进行文档修改或添加
4. 提交更改
5. 创建Pull Request到主仓库

### 注意事项

- 请确保新增内容与现有文档风格保持一致
- 建议在提交前本地预览效果（可以直接在浏览器中打开`index.html`）
- 本地预览推荐使用VSCode的Live Server插件
- 如有疑问，可以先创建Issue讨论

## 贡献

我们欢迎任何形式的贡献，包括但不限于:

- 提交问题和Bug报告
- 改进建议
- 代码贡献
- 文档完善

## 本文档许可证

> 此许可证为本文档的许可证，与插件无关。

MIT License