# GUGUbot 疑难解答

## 后台遇到无法使!!指令的问题

卸载GUGUbot试试，若还是不行请到 GitHub 提交 issue

## 关于 MC → 群内 转发时，玩家ID包裹方式不一

[[BUG] MC→Q群信息，玩家名字格式偶尔不一致 · Issue #136 · LoosePrince/PF-GUGUBot](https://github.com/LoosePrince/PF-GUGUBot/issues/136)
这是刻意而为之，并非bug，为了对腾讯对重复相同风格的风控（连续发相同格式的内容）
若是不喜请修改插件内 `data/text.py` 文件中 `mc2qq_template` 的模板
`.mcdr`本质是个压缩包，使用解压工具进行查找，可参考如下（7z）：

![图片](/src/疑难解答-2.png)

`mc2qq_template` 应该如下：

```python
mc2qq_template = [
    "({}) {}",
    "[{}] {}",
    "{} 说：{}",
    "{} : {}",
    "冒着爱心眼的{}说：{}"
]
```

前四行出现概率一致的，第一个 `{}` 对应的是玩家ID，第二个 `{}` 对应的是发送的内容
第五个的出现概率是 `0.3%`

## 如何配置RCON，如何连接到RCON，提示 "开启RCON以显示结果" 怎么办？

server - server.properties

```yaml
enable-rcon=true
rcon.password=23333
rcon.port=25575
```

注意，`enable-rcon`需要为`true`，`rcon.password`和`rcon.port`都要填写

MCDR - config.yml

```yaml
# RCON设置
# 如果启用，插件可以使用RCON从服务器查询命令
rcon:
  enable: true
  address: 127.0.0.1
  port: 25575
  password: 23333
```

参照如下对应

`enable` = `true`
`port` → `rcon.port`
`password` → `rcon.password`
`address`：服务器IP或本地IP，通常为 `127.0.0.1`

## 艾特（@）机器人时发现群名片没有更新 / 群名片还是老名称

腾讯的缓存，需要机器人发送消息才会更新名片，或者您点击查看机器人个人资料才会刷新，否则将不会自动变化


## 为什么服里有人，GUGUbot 就是说没人

格式不匹配导致的，例如换行到下一行

例如：

```
[MCDR] [xx:xx:xx] [TaskExecutor/INFO] [gugubot]: 123456:#服务器
[Server] [xx:xx:xx] [Server thread/INFO] [minecraft/DedicatedServer]: There are 1/10 players online:
[Server] [xx:xx:xx] [Server thread/INFO] [minecraft/DedicatedServer]: abc
```

## 为什么 GUGUbot 不支持官方机器人？

官方机器人个人申请无法在QQ群中使用，所以不支持