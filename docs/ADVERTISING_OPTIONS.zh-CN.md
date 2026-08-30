# Visd AR 广告替代方案

调研日期：2026-08-30。平台条件可能变化，以下区分官方公开条件与针对本站的建议；没有流量报表和真实投放数据，不能保证审批、填充率或收入。

## 本次已完成

- Donation 的界面和支付逻辑保留在 `src/components/home-desktop-sidebar.tsx`，通过 `SHOW_HOMEPAGE_DONATION = false` 隐藏；隐藏时不加载它的 PayPal Hosted Buttons 脚本。正常商品付款不受影响。
- 原位置展示 Nouveauté：按 `created_at` 降序从 `books` 和 `resource_items` 合并选出最新两件公开、未删除商品。不是每类各一件，不按后台手工排序，也不使用演示商品冒充最新商品。
- 商品信息在服务端读取，每次访问重新查询；数据库故障时显示目录入口，不影响页面其余部分。
- 手机手机版继续隐藏整个左栏；电脑／平板电脑版和手机切换后的电脑版展示左栏。原有两个手机模式切换按钮和缩放逻辑未修改。
- 已停止在页面布局加载 AdSense 脚本，原 GoogleAdsSlot 组件和 `public/ads.txt` 保留，便于将来重新审核。
- 首页、目录及图书／工具详情页的原 Ads 位置接入站主提供的 Adsterra Native Banner。单元 ID `30994241`，网站 ID `6017866`，截图显示 Active、Books 类别、成人广告关闭。建议在平台保存 1:1 布局；字体和颜色使用 Inherit。平台当前状态与实际收益仍以平台后台为准。
- 默认不加载广告；接受和拒绝按钮外观一致，可在 Ads 中一键撤回。选择保存 180 天，过期或无效记录不会被当成同意。仅生产环境的 `visdar.fr`／`www.visdar.fr` 且广告位实际可见时加载。手机版隐藏侧栏、本地及 Vercel 预览环境均不请求真实广告。
- 广告在隔离的 sandbox iframe 中异步执行，不授予 `allow-same-origin`，避免访问网站登录存储和表单；允许广告点击打开独立窗口，但不允许改写顶层页面。撤回同意或隐藏广告位时移除 iframe。不能保证第三方始终填充广告、素材质量或浏览器不会拦截。

## 候选平台

| 平台 | 官方条件 / 收益方式 | 本站建议 |
| --- | --- | --- |
| [Fnac / Awin](https://www.fnac.com/affiliation) | 通过 Awin 参加 Fnac 联盟；访客点击并产生符合条件的购买后获得佣金。Fnac 提供[联盟链接和横幅工具](https://www.fnac.com/affiliation/outils)。实际商品佣金以后台规则为准，不能把宣传的最高比例当成图书统一佣金。 | 优先考虑。根据本站法语、图书和学习工具主题判断，相关商品推荐比不相关的随机广告更契合读者。仍需账号及商家批准，并生成归属于站主的链接。 |
| [Adsterra](https://adsterra.com/blog/set-up-publishers-dashboard/) | 官方不设最低流量要求；支持 Banner、Native Banner 等，禁止机器和激励流量。需站主注册、提交网站、取得专属广告代码。 | 若优先考虑展示广告，可先小规模试验普通横幅。上线前确认并屏蔽成人、赌博等不适合读者的类别，检查移动端跳转、落地页和性能。不建议本站启用 Popunder、强制跳转或通知诱导。 |
| [Monetag](https://monetag.com/) | 官方说明没有严格最低流量要求，格式包括 SmartLink、Popunder、Push、In-Page Push 和 Vignette Banner。 | 备选。其格式中有较强打扰性的广告，不适合直接替代本站左栏的普通内容卡；必须先确认格式和内容控制能力。 |
| [Journey by Mediavine](https://journeymv.zendesk.com/hc/en-us/articles/24633185741723-Journey-Minimum-Requirements) | 2026-08 更新的要求包括：30 天至少 1,000 次 premium sessions、连接 GA4、原创且适合品牌的内容和持续更新。达到最低要求不等于获批。 | 内容和优质流量积累后再申请；还需确认 Next.js 接入支持及 Google 相关资格，不能承诺能绕开原来的审核问题。 |
| [The Moneytizer](https://www.themoneytizer.com/faq/criteres-de-validation) | 法语官方 FAQ 当前要求申请前 30 天至少 30,000 独立访客，并有足量、优质、经常更新的内容；仅三四篇文章不被接受。不同地区页面条件不同。 | 不把旧文章中的“10,000 访客”当作当前标准。先核实本站流量再考虑。 |
| [Ezoic](https://www.ezoic.com/services) | 当前完整服务公开门槛为每月 250,000 用户；[支持文档](https://support.ezoic.com/kb/article/getting-started-ezoics-requirements%3Fid%3Dgetting-started-ezoics-requirements%26lang%3Den-US)另述低于门槛可申请 Incubator。 | 不是当前低流量网站的直接替代方案；不要沿用旧的“无流量门槛”介绍。 |

## 当前广告配置

公开配置在 `src/lib/advertising.ts`，展示组件在 `src/components/partner-ad-slot.tsx`。旧的 `NEXT_PUBLIC_PARTNER_AD_*` 合作卡环境变量已不再用于 Ads；友情链接板块仍独立保留。

脚本地址：`https://pl31094740.profitableratecpmnetwork.com/0cb5354fc99d2b62ae8e5ef57f726c6c/invoke.js`。
容器 ID：`container-0cb5354fc99d2b62ae8e5ef57f726c6c`。

这些是公开嵌入参数，不是账户凭据。更换单元时同步更新脚本、容器和配置，并重新部署。后台“展示广告”入口会列出配置和 Adsterra 管理入口，不伪造实时收益数据。

布局是平台侧配置，选择 1:1 后必须点击 SAVE。需用真实访客的正常访问观察兼容性和填充率；本地验收不点击广告、不制造广告收入。若广告服务拒绝隔离 iframe，应向平台确认受支持的隔离方式，不直接取消登录数据保护。

## 接入广告脚本前

1. 站主本人完成平台注册、条款确认、收款信息及必要的身份验证，提供该网站的专属广告单元代码。这里没有代为创建金融账户或签署平台协议。
2. 核对被拒原因：网站未通过审核与账号被封禁是不同情况；更换平台不会自动解决版权、无效流量、内容质量等问题。
3. 对拟上线广告测试法国地区及手机流量，不启用弹窗、自动下载或强制跳转；原左栏宽 280px，内部可用宽度更小，不能直接塞入固定 300px 横幅导致溢出。
4. 按平台说明更新 `ads.txt`，不要猜测 publisher ID 或复制别人的记录。
5. 对需同意的广告追踪先配置有效同意管理，拒绝与接受应同样容易，且可撤回。参见 [CNIL 官方说明](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/FAQ)。现有 GTM 和其他隐私事项未在本次做全面合规审计；“新卡不加跟踪”不等于全站已经完成合规认证。
6. 记录真实展示、点击、有效成交和到账收入，再比较是否值得保留；不要根据广告网络宣传的 CPM 预测本站收入。

## 后续所需

广告代码已经收到。后续如平台提供 ads.txt 内容，按其原文核对后添加；广告单元 ID 不等于 ads.txt 的发布商 ID，不能据此自行编写。收益和收款请在 Adsterra 后台查看，不需要在聊天里提供密码、收款账号或私钥。

## Adsterra 注册操作

[官方发布者注册入口](https://profit.adsterra.com/sign-up)：选择 Publisher / Webmaster，使用自己的邮箱和真实账户信息注册、验证邮箱，再添加 https://www.visdar.fr。优先申请 Native Banner 或尺寸适合左栏的普通 Banner。不要启用弹出窗口、强制跳转和通知订阅。获批后提供本站广告单元代码及 ads.txt 指示，不能将脚本填进联盟 URL 环境变量。收款及身份核验在平台直接完成，无需向开发者提供密码或证件。
