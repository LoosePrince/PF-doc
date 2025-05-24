# Lagrange

> 编写者：CC

1、去Lagrange项目Release下载Lagrange ( https://github.com/LagrangeDev/Lagrange.Core/releases )选择Win-x64版本
2、解压，运行exe程序
3、编辑 `appsettings.json`

修改 `Account` 下的 `Uin`，把 `0` 改成机器人QQ号
修改 `Message` 下的 `StringPost`，将 `false` 改成 `true`
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

示例

![图片](/src/食用指南-Lagrange-1.png)

json语法两个 `{}` 间要注意加逗号！英文的逗号！

4、重启Lagrange
5、扫码登陆