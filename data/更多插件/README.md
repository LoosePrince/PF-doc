# 更多插件

Q：为什么我在 [MCDR插件仓库](https://mcdreforged.com/zh-CN/plugins) 无法找到这些插件？

A：因为我觉得它们不适宜上传到 **官方仓库** ，如果有可能，未来可能会放到 [树梢的仓库](https://github.com/LoosePrince/Plugin-Catalogue)。

## PIM Helper (插件管理)

自定义的安装MCDR插件的辅助工具

### 说明

PIM Helper 是一个内置于 [WebUI](PF-webui) 的一个插件，用于在MCDR未开放插件的安装api时提供一套安装api

以下是 PIM Helper 在直接安装到 MCDR 时提供的功能，不过我们并不推荐您直接安装到 MCDR。

```bash
------ PIM辅助工具 ------
!!pim_helper list [关键词] - 列出插件
!!pim_helper install <插件ID> - 安装/更新插件
!!pim_helper uninstall <插件ID> - 卸载插件
!!pim_helper uninstall_force <插件ID> - 强制卸载插件(忽略依赖检查)
!!pim_helper uninstall_with_dependents <插件ID> - 卸载插件及所有依赖它的插件
!!pim_helper install_async <插件ID> - 异步安装插件(返回任务ID)
!!pim_helper uninstall_async <插件ID> - 异步卸载插件(返回任务ID)
!!pim_helper task_status <任务ID> - 查询任务状态
!!pim_helper task_list - 查询所有任务
!!pim_helper task_log <任务ID> - 查看任务的完整日志
!!pim_helper clean_cache - 清理缓存文件
-------------------------
```

### 下载

[PIM.py](https://github.com/LoosePrince/PF-MCDR-WebUI/blob/main/src/guguwebui/utils/PIM.py)

## Pip安装器 (pip管理)

一个允许在 MCDR 环境中管理 Python 包的插件。

### 说明

有些时候，您需要管理 pip 包，但是您又无法访问到 命令行（cmd） ，那么这个可以作为您的替代品

它只实现了最基础的管理功能

```bash
!!pip install <包名> - 安装指定的 Python 包
!!pip uninstall <包名> - 卸载指定的 Python 包
!!pip list - 列出已安装的 Python 包
```

### 下载

[pip_installer.py](https://github.com/LoosePrince/PF-MCDR-WebUI/blob/main/tool/pip_installer.py)

## 日志捕获模块(log_watcher.py)

MCDR完整日志获取

### 说明

虽然它不是一个插件，但是还是要在此提一下

这个模块提供的获取MCDR完整日志的功能，用于在不关闭 高级控制台(`advanced_console`) 和重定向日志输出的情况下捕获日志

### 下载

[log_watcher.py](https://github.com/LoosePrince/PF-MCDR-WebUI/blob/main/src/guguwebui/utils/log_watcher.py)

## PF-CoolQAPI

迁移和维护的CoolQAPI插件

### 说明

本插件修改自 `CoolQAPI`, `CoolQAPI` 目前已更新为 [QQAPI](https://github.com/AnzhiZhang/MCDReforgedPlugins/tree/master/src/qq_api) | `原作者：AnzhiZhang`

目前已废弃，可以去 **扫墓**

### 下载

[PF-CoolQAPI](https://github.com/LoosePrince/PF-CoolQAPI)

## Chat with DeepSeek

允许管理员通过命令与DeepSeek API进行对话的插件

### 说明

通过自然语言在聊天框中与AI对话并指令命令

### 下载

[加入QQ群](支持与反馈/README#加入交流群)

## Command Binding Plugin

将MC指令绑定到自定义名称，并赋予玩家使用。

### 说明

```bash
!!command/com add <cmd_name> <mc_command> - 注册命令
!!command/com remove <cmd_name> - 删除命令
!!command/com list - 列出所有注册的命令
!!command/com permission <cmd_name> <level> - 设置命令权限等级 (0-4)
!!command/com override <player> <cmd_name> - 允许玩家无视权限使用指定命令
!!command/com remove_override <player> <cmd_name> - 移除玩家的命令权限覆盖 (根据玩家ID识别,谨慎给予)
!!command/com <cmd_name> [args] - 执行注册的命令
```

### 下载

[加入QQ群](支持与反馈/README#加入交流群)

## Player Control

召唤和删除假人的插件

### 说明

可以授予指定的人管理假人的权限，并且使用 `#` 代替原本的 `/` 即可使用。

### 下载

[加入QQ群](支持与反馈/README#加入交流群)

## Show Item Pure

一个简单的物品展示插件，无需 `RCON`，使用 `终端` 数据即可显示手中的物品

### 说明

使用 `!!i` 展示自己手上的物品，带附魔时会与NoChatReports模组冲突，请注意使用

### 下载

[加入QQ群](支持与反馈/README#加入交流群)