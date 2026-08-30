# Visd AR 广告替代方案

调研日期：2026-08-30。平台条件可能变化，以下区分官方公开条件与针对本站的建议；没有流量报表和真实投放数据，不能保证审批、填充率或收入。

## 本次已完成

- Donation 的界面和支付逻辑保留在 `src/components/home-desktop-sidebar.tsx`，通过 `SHOW_HOMEPAGE_DONATION = false` 隐藏；隐藏时不加载它的 PayPal Hosted Buttons 脚本。正常商品付款不受影响。
- 原位置展示 Nouveauté：按 `created_at` 降序从 `books` 和 `resource_items` 合并选出最新两件公开、未删除商品。不是每类各一件，不按后台手工排序，也不使用演示商品冒充最新商品。
- 商品信息在服务端读取，每次访问重新查询；数据库故障时显示目录入口，不影响页面其余部分。
- 手机手机版继续隐藏整个左栏；电脑／平板电脑版和手机切换后的电脑版展示左栏。原有两个手机模式切换按钮和缩放逻辑未修改。
- 已停止在页面布局加载 AdSense 脚本，原 GoogleAdsSlot 组件和 `public/ads.txt` 保留，便于将来重新审核。
- 首页、目录及图书／工具详情页的原广告位置改为合作广告卡。没有专属联盟链接时，仅展示合作联系入口，**不代表已经有广告收入**。新卡不会自动加载第三方广告脚本、像素、弹窗或通知订阅。

## 候选平台

| 平台 | 官方条件 / 收益方式 | 本站建议 |
| --- | --- | --- |
| [Fnac / Awin](https://www.fnac.com/affiliation) | 通过 Awin 参加 Fnac 联盟；访客点击并产生符合条件的购买后获得佣金。Fnac 提供[联盟链接和横幅工具](https://www.fnac.com/affiliation/outils)。实际商品佣金以后台规则为准，不能把宣传的最高比例当成图书统一佣金。 | 优先考虑。根据本站法语、图书和学习工具主题判断，相关商品推荐比不相关的随机广告更契合读者。仍需账号及商家批准，并生成归属于站主的链接。 |
| [Adsterra](https://adsterra.com/blog/set-up-publishers-dashboard/) | 官方不设最低流量要求；支持 Banner、Native Banner 等，禁止机器和激励流量。需站主注册、提交网站、取得专属广告代码。 | 若优先考虑展示广告，可先小规模试验普通横幅。上线前确认并屏蔽成人、赌博等不适合读者的类别，检查移动端跳转、落地页和性能。不建议本站启用 Popunder、强制跳转或通知诱导。 |
| [Monetag](https://monetag.com/) | 官方说明没有严格最低流量要求，格式包括 SmartLink、Popunder、Push、In-Page Push 和 Vignette Banner。 | 备选。其格式中有较强打扰性的广告，不适合直接替代本站左栏的普通内容卡；必须先确认格式和内容控制能力。 |
| [Journey by Mediavine](https://journeymv.zendesk.com/hc/en-us/articles/24633185741723-Journey-Minimum-Requirements) | 2026-08 更新的要求包括：30 天至少 1,000 次 premium sessions、连接 GA4、原创且适合品牌的内容和持续更新。达到最低要求不等于获批。 | 内容和优质流量积累后再申请；还需确认 Next.js 接入支持及 Google 相关资格，不能承诺能绕开原来的审核问题。 |
| [The Moneytizer](https://www.themoneytizer.com/faq/criteres-de-validation) | 法语官方 FAQ 当前要求申请前 30 天至少 30,000 独立访客，并有足量、优质、经常更新的内容；仅三四篇文章不被接受。不同地区页面条件不同。 | 不把旧文章中的“10,000 访客”当作当前标准。先核实本站流量再考虑。 |
| [Ezoic](https://www.ezoic.com/services) | 当前完整服务公开门槛为每月 250,000 用户；[支持文档](https://support.ezoic.com/kb/article/getting-started-ezoics-requirements%3Fid%3Dgetting-started-ezoics-requirements%26lang%3Den-US)另述低于门槛可申请 Incubator。 | 不是当前低流量网站的直接替代方案；不要沿用旧的“无流量门槛”介绍。 |

## 现有合作广告位接入

在 Vercel 的项目环境变量里配置以下**公开信息**，然后重新部署 Production：

```dotenv
NEXT_PUBLIC_PARTNER_AD_URL=站主获批后生成的完整HTTPS联盟链接
NEXT_PUBLIC_PARTNER_AD_TITLE=读者看到的广告标题
NEXT_PUBLIC_PARTNER_AD_DESCRIPTION=对应产品的简短说明
```

代码仅接受 HTTPS 链接，不接受脚本或含用户名密码的 URL。卡片标题统一显示“Ads”，已配置联盟链接时附佣金说明，链接标记 `rel="sponsored noopener noreferrer"`。不要把 Awin API 密钥、账号密码或收款资料放入这些变量。

只有商家明确允许直链归因时才使用此入口；需要脚本、展示像素或特殊素材时，按商家要求另行集成。当前入口不支持把 Adsterra/Monetag 的 JavaScript 粘贴进 URL，也不应把会随机跳向不相关广告的 SmartLink 伪装为产品推荐。

## 接入广告脚本前

1. 站主本人完成平台注册、条款确认、收款信息及必要的身份验证，提供该网站的专属广告单元代码。这里没有代为创建金融账户或签署平台协议。
2. 核对被拒原因：网站未通过审核与账号被封禁是不同情况；更换平台不会自动解决版权、无效流量、内容质量等问题。
3. 对拟上线广告测试法国地区及手机流量，不启用弹窗、自动下载或强制跳转；原左栏宽 280px，内部可用宽度更小，不能直接塞入固定 300px 横幅导致溢出。
4. 按平台说明更新 `ads.txt`，不要猜测 publisher ID 或复制别人的记录。
5. 对需同意的广告追踪先配置有效同意管理，拒绝与接受应同样容易，且可撤回。参见 [CNIL 官方说明](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/FAQ)。现有 GTM 和其他隐私事项未在本次做全面合规审计；“新卡不加跟踪”不等于全站已经完成合规认证。
6. 记录真实展示、点击、有效成交和到账收入，再比较是否值得保留；不要根据广告网络宣传的 CPM 预测本站收入。

## 后续所需

选定平台后，需要站主自己的已获批联盟链接（适用于当前卡片），或专属广告代码和平台同意管理要求（需要进一步接入）。不需要在聊天里提供密码、收款账号或私钥。

## Adsterra 注册操作

[官方发布者注册入口](https://profit.adsterra.com/sign-up)：选择 Publisher / Webmaster，使用自己的邮箱和真实账户信息注册、验证邮箱，再添加 https://www.visdar.fr。优先申请 Native Banner 或尺寸适合左栏的普通 Banner。不要启用弹出窗口、强制跳转和通知订阅。获批后提供本站广告单元代码及 ads.txt 指示，不能将脚本填进联盟 URL 环境变量。收款及身份核验在平台直接完成，无需向开发者提供密码或证件。
