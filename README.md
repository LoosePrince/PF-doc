# PFingan系列插件

## 项目概述

PFingan服务器提供和开发的MCDR插件，包括但不限于QQ群管、聊天互通、服务器管理、IP记录、IP封禁、WebUI等。这些插件旨在为Minecraft服务器管理员提供全面的服务器管理解决方案。

## 插件列表

### PF-gugubot

MCDR的QQ机器人插件，集QQ群管理和白名单管理一体，添加许多功能。

主要功能:

- QQ群和游戏内聊天双向互通
- 白名单管理（绑定、解绑、查询）
- QQ群管理（禁言、踢人、群公告）
- 自定义命令和回复
- 定时任务和提醒
- 服务器状态查询

### PF-webui

MCDR的WebUI管理插件，管理PF系列插件配置和其它配置，提供插件管理和配置修改功能。

主要功能:

- 可视化配置界面
- 插件开关和状态管理
- 用户权限管理
- 服务器性能监控
- 日志查看和搜索
- 备份管理

### PF-cq-api

MCDR的QQ机器人API插件，支持OneBot协议的正向WebSocketQQ。

主要功能:

- OneBot协议支持
- 提供API接口与其他插件交互
- 事件监听和触发
- 消息格式转换
- 支持多种QQ机器人框架

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

如果您在使用过程中遇到问题，请先查看[常见问题](main.html?root=常见问题)页面，或到[支持与反馈](main.html?root=支持与反馈)页面获取帮助。

## 贡献

我们欢迎任何形式的贡献，包括但不限于:

- 提交问题和Bug报告
- 改进建议
- 代码贡献
- 文档完善

## 许可证

MIT License