# Lagrange

> 编写者：CC

1、去Lagrange项目Release下载Lagrange ( https://github.com/LagrangeDev/Lagrange.Core/releases )选择Win-x64版本
2、解压，运行exe程序
3、编辑 `appsettings.json`

修改 `Account` 下的 `Uin`，把 `0` 改成机器人QQ号
~~修改 `Message` 下的 `StringPost`，将 `false` 改成 `true`~~ （不需要了，保持默认即可）
修改 `QrCode` 下的 `ConsoleCompatibilityMode`，将 `false` 改成 `true`
然后在 `Implementations` 下添加

```json
{
    "Type": "ForwardWebSocket",
    "Host": "*",
    "Port": 8081,
    "HeartBeatInterval": 5000,
    "HeartBeatEnable": true,
    "AccessToken": ""
}
```

4. 修改 cq-qq-api 的 `config.json` 中的 `port` 为 `8081`（默认是8080）

> [TIP]
>
> 是修改 `cq-qq-api` 的 `config.json` 中的 `port` 和 `Lagrange` 中 `ForwardWebSocket` 的 `Port` 一致，端口多少随你喜欢

示例

![图片](/src/食用指南-Lagrange-1.png)

json语法两个 `{}` 间要注意加逗号！英文的逗号！

5. 重启Lagrange
6. 扫码登陆