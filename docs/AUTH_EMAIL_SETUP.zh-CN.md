# Visd AR 登录与认证邮件配置

2026-08-30。本轮统一了首页与全站的登录窗口，区分注册确认成功与登录错误，保留原密码登录兼容性，增加密码可见切换、键盘焦点管理、专门找回密码界面和请求冷却。没有修改用户密码，没有发送真实测试邮件。

## 已准备的品牌邮件

`supabase/email-templates/confirmation.html`、`recovery.html`、`magic-link.html` 分别用于注册确认、重置密码、魔法链接登录。主题分别为：

- Confirmez votre compte Visd AR
- Réinitialisez votre mot de passe Visd AR
- Votre lien de connexion Visd AR

模板包含 Visd AR 名称、Logo、官网域名和法语安全说明。按钮先打开官网 `/auth/confirmer`，用户主动确认后才向 Supabase 验证一次性令牌。令牌放在 URL fragment，不进入服务器请求 URL，页面读取后立即移除；不写入日志或应用本地存储。认证和重置页面不加载 GTM 脚本。现有 Supabase 默认重置链接仍兼容。

## 需要在 Supabase 管理端应用

本地的 HTML 文件和 Vercel 的 SMTP 环境变量**不会自动修改 Supabase Auth 发出的邮件**。目前尚未应用以下管理端配置，也未验证真实投递结果。

1. Authentication → URL Configuration：Site URL 设为 `https://www.visdar.fr`。将实际使用的生产回跳路径加入 Redirect URLs，包括首页、`/account`、`/reinitialiser-mot-de-passe`、`/tests-google-play` 及网站中需要 OAuth 返回的工具详情路径。开发环境单独列明，不把 localhost 当生产 Site URL。
2. Authentication → Email Templates：将上面的三份 HTML 和对应主题填入 Confirm signup、Reset password、Magic link。先部署 `/auth/confirmer` 再启用模板，避免邮件指向不存在的页面。
3. 配置 Custom SMTP。发件人显示名用 `Visd AR`；发件地址应是你已验证、可用的域名邮箱，例如完成验证后的 `no-reply@visdar.fr`。这是建议地址，不表示已创建邮箱。
4. 在邮件服务商完成域名 SPF、DKIM 和 DMARC 配置；以该服务商给出的准确 DNS 值为准，不能猜测密钥或覆盖现有 SPF。关闭邮件链接追踪，避免改写一次性链接。
5. 分别使用专用测试账号验证注册确认、忘记密码、邮件在手机／另一浏览器打开、过期链接和重复点击。不用真实买家的账号做测试，不在截图中保留令牌。

这些设置可改善识别度和送达条件，但不能保证所有邮件永远不进入垃圾箱。默认 Supabase 邮件服务不是生产投递方案；实际限制与配置参见官方文档。

官方资料：[邮件模板与预取限制](https://supabase.com/docs/guides/auth/auth-email-templates)、[自定义 SMTP](https://supabase.com/docs/guides/auth/auth-smtp)、[回跳 URL](https://supabase.com/docs/guides/auth/redirect-urls)。
