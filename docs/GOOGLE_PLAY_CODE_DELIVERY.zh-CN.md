# Google Play 兑换码与封闭测试交付方案

日期：2026-08-30。

**最新决定：封闭测试阶段改为免费申请，不向测试者收款。** 本轮页面保留原价并划线，提供免费申请入口和同账号加群 → App opt-in → 兑换／安装说明。申请写入现有私有 `admin_messages` 收件箱，使用用户与包名生成的固定记录 ID 防止重复提交；邮箱是用户声明的 Play 邮箱，管理员仍需核实。尚未自动发码、导入／消费真实兑换码或邀请群成员。下文支付方案仅为未来需要时的设计，不是当前测试流程。

收到 5 个包名与对应文件说明：calendrier、heures、manuscrits、couleurs、famille。heures／manuscrits／couleurs／famille 各 40 条、四组共 160 条且无重复；日历原文件最初读取 40 条，随后原路径消失，需确认是否改名为 Calendar Web promotion_codes.csv。代码原文没有进入 GitHub。

公开商品目前只有日历、颜色、手写识别三款 App，已按真实数据库 ID／slug 精确映射；世界时钟、亲属关系可在统一申请页选择，但没有虚构它们的商品价格。

## 先确认交付范围与平台条款

用户希望在网站购买 App 后获得一枚 Play Console 生成的一次性兑换码。技术上可以建立唯一分配库存，但商业上线前还需查看生成该批代码时接受的 **Promo codes Terms of Service**，确认“网站收款后交付该码”的用途被允许；公开帮助页要求开发者接受这些条款，但不足以单独证明允许付费分发。这里不把赠送测试资格、应用兑换码、网站折扣码或 Google Play 礼品卡混为一谈。

Google 官方说明：一次性码只能兑换一次；单个 App 的非订阅推广每季度上限为 500 枚；代码受活动启用状态和截止日期限制。参见[创建推广活动](https://support.google.com/googleplay/android-developer/answer/6321495?hl=zh-Hans)。因此兑换码不能作为无限库存卖出，网站需要截止日期校验、库存预警和无库存停售机制。

## 买家实际流程

1. 商品页明确标注这是 Android App、当前处于封闭测试，以及交付方式和等待加群的时长。不能在付费后才告知限制。
2. 登录网站后，填写并验证**手机 Google Play 正在使用的 Google 账号邮箱**。这可能不同于网站、PayPal 或 Stripe 的邮箱，也不一定以 gmail.com 结尾。记录该邮箱与订单的绑定关系、用途说明和用户授权。
3. 在结账前原子保留一枚该 App 的有效兑换码；无库存时禁止创建收费会话。保留必须绑定具体支付会话及服务端订单，超时不能简单释放仍可付款的会话；要先关闭支付会话并处理迟到的成功回调。
4. 服务端验证支付成功后完成分配，同一订单重试返回同一枚码，同一用户同一 App 的再次领取也返回原有分配。不同 App 可以分别领取一枚。验证金额、币种、产品和购买者，绝不能信任前端 `success=1`。
5. 封闭测试期先完成群资格与测试 opt-in，再显示兑换步骤。若群还未处理，订单页显示“等待测试资格开通”，不能谎报已加入。
6. 用户以同一个 Google 账号加入 `Visdar@googlegroups.com`，打开对应 App 的测试链接并主动选择成为测试者，然后在 Play 中兑换并安装。
7. 订单页长期保留步骤、该枚兑换码、活动截止日期和售后入口。刷新、重新登录、邮件补发都不能消耗新码。

Google 的[封闭测试文档](https://support.google.com/googleplay/android-developer/answer/9845334?hl=zh-Hans)明确：使用 Google Groups 时，先加入群，再通过链接 opt-in。封闭测试中未公开发布的 App 不能依赖商店搜索找到。加群、参加测试、兑换应用是三件不同的事。

## Google Groups 的实施选择

对于当前 `@googlegroups.com` 群，第一版建议采取**管理员处理队列**或**用户自行申请加入**。网站收集必要且已验证的邮箱与授权，后台列出待处理订单，管理员通过 Google Groups 添加／批准后标记完成。不得把“发出邀请”标记为“已加入”。

完整自动化需要先确认可管理的群类型、管理员权限和 Google 支持的接口。Google 的 [Directory API](https://developers.google.com/workspace/admin/directory/v1/guides/manage-group-members)及[先决条件](https://developers.google.com/workspace/admin/directory/v1/guides/prerequisites)面向 Google Workspace 管理环境；不要把普通消费群的地址直接填入该 API 并承诺一定能用。若以后采用受管理的 Workspace 群，仍需正确配置外部成员权限、授权范围、重试与审计，并在每个 App 的测试轨道更新群地址。

群成员具有测试资格不代表成为 License tester。不要为了跳过付款而把真实买家加入开发者的模拟计费测试名单。

一个群若同时列在多个 App 的测试名单中，成员可能获得这些 App 的测试资格；它不是逐个商品的购买权限。逐 App 的代码库存与订单权限仍需独立管理。用户也可能退出群，要明确后续测试更新的影响。

## Supabase 数据结构

沿用现有 `resource_items` 作为 App 商品，现有 `downloads` 保存支付记录。新增独立的 Play 交付表，不复用现有网站折扣用的 `promo_codes`：

| 表 | 内容 |
| --- | --- |
| `play_app_delivery_configs` | `resource_id`、包名、Play 商店链接、官方测试加入链接、群地址、`closed/production` 状态、是否启用兑换码交付 |
| `play_code_batches` | 每批对应 App、活动名、开始与到期时间、来源文件指纹、导入数量；不公开原文件 |
| `play_redemption_codes` | 代码密文、不可逆指纹用于去重、批次、库存状态、保留订单、分配记录；代码不能只存哈希，因为还需交付给买家 |
| `play_code_assignments` | 已验证购买者 `user_id`、`resource_id`、支付记录、绑定的 Play 邮箱、唯一 code ID、交付时间 |
| `play_tester_requests` | Play 邮箱、用户用途授权、待处理／已邀请／已确认成员／失败、管理员处理记录 |
| `fulfillment_jobs` | 重试支付后交付、资格处理、通知任务；幂等键与错误信息，日志不写完整兑换码 |

核心约束：代码指纹唯一；代码只能对应一个分配；每个用户每款 App 最多一份分配；支付订单与分配有唯一关联。使用 Postgres 事务与行锁（例如 `FOR UPDATE SKIP LOCKED`）完成取码和状态迁移，防止两个付款并发拿到同一枚码。

代码库存仅允许服务端访问。RLS 禁止匿名和普通登录用户查询原码表；订单接口以登录用户 ID 校验购买所有权，只解密和返回属于他的单枚码。禁止客户端直接提交某个 code ID 来领取，不依靠前端按钮隐藏实现安全。Service role 密钥与加密密钥只放 Vercel 服务端环境变量，不使用 `NEXT_PUBLIC_`。

“已分配”和“已在 Google Play 兑换”分开记录。没有来自 Google 的可靠确认时，只能显示已交付／用户反馈已兑换，不能根据链接点击或复制按钮推断真正兑换成功。一次性码并不锁定指定 Google 邮箱：网站可约束领取账号，不能保证买家不转发代码。

已向用户展示的代码，退款后也不能自动放回库存；该代码可能已经被复制或兑换。与 Play 商店权利撤销有关的能力必须另行核实，不能承诺网站退款即撤销 Play 应用所有权。

## 现有项目接入点

- `src/app/api/checkout/route.ts` 与 `src/app/api/paypal/purchase/start/route.ts`：验证交付配置、Play 邮箱和库存，在服务器上绑定支付会话。
- `src/lib/stripe-purchases.ts`、Stripe webhook 与 `src/app/api/paypal/complete/route.ts`：支付记录确认后幂等触发交付。不把浏览器返回作为唯一支付通知；关闭浏览器后仍需可靠完成。
- `src/app/api/account/purchases/route.ts`：只向订单所有者提供交付状态，不把原码加入通用列表或公共查询。
- `src/app/outils/[id]/page.tsx`、`src/app/account/page.tsx`：付款前说明、验证 Play 邮箱、订单中按顺序展示步骤和单枚码。
- 管理后台：按 App 导入、校验重复与到期码、库存不足预警、加群待办、重试记录。默认不显示全库明码。

GitHub 私有大文件下载继续走现有鉴权交付流程。兑换码不放入公开仓库、前端 bundle、`public/` 或可公开下载的 CSV，也不需要和 APK／PDF 大文件放在一起。

## 给买家的法语步骤草案

> Cette application est actuellement en phase de test avant son lancement officiel sur Google Play. Utilisez le même compte Google à chaque étape, y compris dans l’application Play Store de votre téléphone.
>
> 1. Rejoignez le groupe de test Visd AR avec l’adresse Google indiquée dans votre commande. Si une invitation est nécessaire, attendez la confirmation d’adhésion.
> 2. Ouvrez le lien de test de cette application, puis choisissez de devenir testeur.
> 3. Copiez votre code personnel et utilisez l’option « Utiliser un code » de Google Play. Vérifiez le nom de l’application et le résultat de la promotion avant de confirmer. Si un montant inattendu apparaît, ne payez pas une seconde fois et contactez-nous.
> 4. Installez l’application depuis le lien Google Play fourni. Votre code ne peut être utilisé qu’une seule fois et doit être échangé avant sa date d’expiration.

实际按钮和完整链接必须来自该 App 的 Play Console，不猜测包名或测试轨道链接。公开版本上线后，配置切换为 `production`，新订单不再要求加群／opt-in，但仍按库存与活动规则交付代码。

## 上线前必须验证

- 两笔并发付款得到不同代码；同一回调重复、刷新订单、重发通知都不重复领码。
- 未付款、他人订单、隐藏商品、过期码、无库存不能领取；非服务端无法读库。
- 最后一枚被保留后的售罄处理、支付超时、迟到成功、Google 加群失败的处理路径。
- 网站登录邮箱、支付邮箱和 Play 邮箱各不相同时的流程；邮箱变更不能重新取码。
- 群成员仍需 opt-in；设备不兼容／国家不支持／活动暂停时显示可理解的帮助，避免重复付款。
- 未确认平台用途条款前，不将这条路径启用为生产付费商品的唯一交付方式。

等待材料：每个 App 的代码原文档、活动开始／截止日期、代码用途、官方测试加入与商店链接，以及生成兑换码时的用途条款。只用专门指定的测试码做真实兑换验收，不能随意消耗待售库存。
