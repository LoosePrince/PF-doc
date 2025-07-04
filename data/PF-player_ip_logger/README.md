# Player IP Logger for MCDReforged

Player IP Logger 是一款为 MCDReforged (MCDR) 开发的插件，主要功能是记录玩家的 IP 地址。该插件通过监控玩家的登录和断开连接事件，记录玩家对应的 IP 地址，并提供便捷的 API 供服务器管理员进行查询、封禁或解禁操作。

## 善用搜索功能

![](/src/搜索示例-1.png)

## 功能

- 自动记录玩家 IP: 插件会自动监控玩家的登录和断线信息，捕获并保存 IP 地址。
- 封禁与解禁功能: 支持通过命令封禁或解禁玩家或 IP 地址，适用于服务器管理。
- 多格式支持: 支持多种日志格式解析，确保不同场景下都能正确提取玩家的 IP 地址。
- IP 地址存储: 将玩家所有历史 IP 地址保存到配置文件中，避免重复记录。
- 支持 API 调用: 提供了多种 API，方便插件调用，或让管理员查询玩家的 IP 信息。
- 假人判断： 假人一般没有IP，通过这个特性可以判断出假人，多用于玩家列表筛选。