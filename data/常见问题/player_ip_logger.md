# Player IP Logger 常见问题

## 如何解Ban？

**解Ban流程：**

1. 到 `config.json` 将对应的玩家ID和IP删除（一定删干净）
2. 到MC原版的 `banned-ips.json` 和 `banned-players.json` 删除对应的玩家ID和IP（一定删干净） 
3. 重启MC服务器

**为什么会这样？**

因为Player IP Logger本质是替你执行原版的ban命令，所以机制是原版的。必须同时删除ID和IP是因为只删其中一个的话，Player IP Logger会在对应玩家登录时自动ban另一个（基于IP ban ID或基于ID ban IP），所以必须两个都删干净。

## ban完玩家后，玩家还是能登录吗？

不能，只要玩家不同时更换IP和ID，就依然会被连带ban（封禁）。