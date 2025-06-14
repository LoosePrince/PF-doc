# WebUI 疑难解答

## 面板是怎么qq登录的？

例如：

![](/src/疑难解答-2-1.png)

创建账户时使用 `QQ号` 作为账户，例如

```bash
!!webui create 123456 <password>
```

此处 `123456` 填您的QQ号即可

## 登录webui后转到的界面显示{"detail":"There was an error parsing the body"}

重启服务器后重新登录

## 如何区分SSL证书和密钥

当 SSL 证书文件（如 `cert.pem` 和 `key.pem`）的文件名无法区分时，可以通过查看文件内容快速区分：

```bash
cat your_file.pem
```

- **证书文件（cert.pem）**：  
  通常以 `-----BEGIN CERTIFICATE-----` 开头，包含公钥和证书信息（如颁发者、有效期等）。  
  ```text
  -----BEGIN CERTIFICATE-----
  MIIDXTCCAkWgAwIBAgIJAN...（Base64编码数据）
  -----END CERTIFICATE-----
  ```

- **私钥文件（key.pem）**：  
  以 `-----BEGIN PRIVATE KEY-----` 或 `-----BEGIN RSA PRIVATE KEY-----` 开头，内容为敏感密钥数据。  
  ```text
  -----BEGIN PRIVATE KEY-----
  MIIEvQIBADANBgkqhk...（Base64编码数据）
  -----END PRIVATE KEY-----
  ```