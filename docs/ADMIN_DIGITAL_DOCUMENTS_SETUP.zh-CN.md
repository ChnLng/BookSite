# 私有数码文档上线与后台操作手册

## 先确认文件到底存在哪里

- 最终付费文件保存在 **GitHub 私有仓库的私有 Release Assets**。
- Vercel 不长期保存文件，只负责管理员身份验证、协调转存和买家购买权验证。
- 管理员的大文件先进入 Supabase 的私有临时桶 `admin-upload-staging`，转入 GitHub 成功后立即删除。
- 如果上传过程异常中断，系统会在下一次上传时清理超过 24 小时的同一管理员临时文件。
- 数据库只保存 GitHub Asset 的内部引用，不保存公开下载链接；普通访客无权读取该引用。
- 买家下载时，网站验证购买记录后跳转到 GitHub 临时私有地址；在线浏览使用限定文档、限定操作的 HttpOnly 安全 Cookie。

GitHub 官方限制是每个 Release Asset 必须小于 2 GiB。Supabase 免费项目的全局单文件上限最高为 50 MB；要上传更大的模型、视频或压缩包，需要 Supabase Pro 并提高全局上限。

## 第一次上线：必须按顺序完成

### 一、确认 GitHub 付费文件仓库是私有仓库

1. 登录 GitHub。
2. 打开仓库 `ChnLng/BookSite-Paid-Files`。
3. 仓库名称旁必须显示 **Private**。
4. 如果仓库不存在，点击 GitHub 右上角 `+` → `New repository`：
   - Repository name：`BookSite-Paid-Files`
   - Visibility：务必选择 **Private**
   - 点击 `Create repository`
5. 不需要手工创建 Release。第一次从网站后台上传文档时，系统会自动创建 `paid-downloads` Release。

### 二、创建只允许访问付费文件仓库的 GitHub Token

1. GitHub 头像 → `Settings`。
2. 左侧最下方 `Developer settings`。
3. `Personal access tokens` → `Fine-grained tokens`。
4. 点击 `Generate new token`。
5. 推荐填写：
   - Token name：`BookSite paid files`
   - Expiration：按你的维护习惯选择，例如 90 天；到期前必须更新 Vercel 变量。
   - Repository access：`Only select repositories`
   - 只选择 `BookSite-Paid-Files`
6. `Repository permissions` 中将 `Contents` 设为 **Read and write**。
7. 创建后立即复制 Token。GitHub 只会完整显示一次。
8. 不要把 Token 发到聊天、截图、代码或任何 `NEXT_PUBLIC_*` 变量里。

成功标准：Token 只可以访问私有付费文件仓库，并拥有 Release Asset 的读取、上传和删除权限。

### 三、在 Supabase 执行数据库迁移

1. 打开 Supabase Dashboard，进入 BookSite 对应项目。
2. 左侧打开 `SQL Editor`。
3. 点击 `New query`。
4. 打开项目文件：
   `supabase/migrations/20260808_unified_private_product_documents.sql`
5. 全选文件内容，复制到 SQL Editor。
6. 点击 `Run`，等待显示成功；不要只执行其中一部分。

迁移会自动完成：

- 给类目增加允许的交付方式。
- 创建统一的 `product_documents` 私有文档表。
- 将现有图书 PDF 和旧资源文件记录迁入统一文档表。
- 创建私有临时上传桶 `admin-upload-staging`。
- 建立仅管理员可管理文档和临时文件的 RLS 策略。

在 SQL Editor 新建查询，逐条验证：

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'categories'
  and column_name = 'allowed_delivery_modes';

select count(*) as document_count
from public.product_documents
where deleted_at is null;

select id, name, public, file_size_limit
from storage.buckets
where id = 'admin-upload-staging';
```

成功标准：

- 第一条返回 `allowed_delivery_modes`。
- 第二条能正常返回数字，不报“表不存在”。
- 第三条返回一行，`public` 必须为 `false`。
- `file_size_limit` 显示空是正常的，表示服从 Supabase 项目的全局文件上限。

### 四、设置 Supabase 大文件全局上限

1. Supabase Dashboard 左侧打开 `Storage`。
2. 打开 Storage 设置页面中的 `Global file size limit`。
3. 把上限设置为你实际最大商品文件以上，但单文件不要达到 2 GiB。
4. 推荐留余量：例如最大文件 500 MB，可设置为 600 MB 或 1 GB。
5. 保存。

注意：

- Supabase Free 的单文件全局上限最高 50 MB。
- 上传超过 50 MB 的模型、视频、安装包或压缩包，需要升级 Supabase Pro。
- Supabase 这里只是临时中转，成功后文件会被删除；最终文件仍在 GitHub 私有 Release。

### 五、取得 Supabase 服务器密钥

1. Supabase 项目 → `Project Settings` → `API Keys`。
2. 复制服务器端 Secret / `service_role` 密钥。
3. 这个密钥只能放进 Vercel 服务器环境变量。
4. 绝对不要放入 `NEXT_PUBLIC_*`，不要粘贴到浏览器页面或提交到 Git。

### 六、配置 Vercel 环境变量

1. 登录 Vercel。
2. 打开 BookSite 项目。
3. `Settings` → `Environment Variables`。
4. 以下变量至少勾选 `Production`；如果你使用 Preview 测试，也同时勾选 `Preview`。

| 变量名 | 填写内容 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名/Publishable Key |
| `SUPABASE_SERVICE_ROLE_KEY` | 上一步复制的服务器 Secret / service_role |
| `ADMIN_EMAILS` | 管理员登录邮箱；多个邮箱用英文逗号分隔 |
| `PRODUCT_DOWNLOAD_SIGNING_SECRET` | 自己生成的 64 位随机十六进制字符串 |
| `GITHUB_TOKEN` | 上面创建的 GitHub Fine-grained Token |
| `GITHUB_PAID_OWNER` | `ChnLng` |
| `GITHUB_PAID_REPO` | `BookSite-Paid-Files` |
| `GITHUB_PAID_RELEASE_TAG` | `paid-downloads` |

在 Mac 生成下载签名 Secret：

1. 打开“终端 Terminal”。
2. 输入：

```bash
openssl rand -hex 32
```

3. 复制输出的 64 个字符，填进 `PRODUCT_DOWNLOAD_SIGNING_SECRET`。
4. 不要把输出发给任何人。

成功标准：所有服务器密钥变量都没有 `NEXT_PUBLIC_` 前缀，并且 Vercel 中显示为加密值。

### 七、确认 Vercel Functions 使用 Fluid Compute

1. Vercel 项目 → `Settings` → `Functions`。
2. 确认 Fluid Compute 已启用。
3. 当前转存接口最长执行 300 秒，通常足够转存数百 MB 文件。
4. 如果接近 2 GiB 的文件经常在“3/3 转入 GitHub”阶段超时，需要使用 Vercel Pro 的更长函数时限，再调整代码中的 `maxDuration`。

管理员电脑上传到 Supabase 不经过 Vercel 请求体，因此不会触发 Vercel 4.5 MB 上传请求限制。

### 八、部署代码

环境变量和数据库迁移都完成后，再提交并推送代码：

```bash
cd /Volumes/Seagate1TB/BookSite
git status
git add .
git commit -m "feat: unified private product documents"
git push origin main
```

如果 Vercel 没有自动部署：Vercel 项目 → `Deployments` → 最新部署右侧菜单 → `Redeploy`。

## 后台日常操作

### 新增类目并规定文档类型

1. 管理员登录网站，进入 `/admin`。
2. 打开 `类目 Categories`。
3. 新建类目，选择用途：
   - 图书使用 `book`
   - 数码资源、模型、软件、音视频等使用 `resource`
4. 在“Formats autorisés”中用英文逗号填写扩展名，例如：

```text
.pdf, .epub, .svg, .zip, .glb, .gltf, .fbx, .obj, .stl, .blend
```

5. 勾选交付方式：
   - `允许付费后下载`：所有格式都可以使用。
   - `允许付费后在线浏览`：适用于 PDF、图片和文本。
6. 保存类目。

模型、压缩包、安装程序、音视频等不能安全地直接由浏览器阅读时，后台会强制选择“下载”，避免付费后出现没有可用按钮的文档。

### 新增商品并上传第一份文档

1. 在后台创建图书或资源商品。
2. 给商品选择刚才配置好的类目。
3. 先保存商品。
4. 打开“编辑已有”，找到该商品。
5. 在 `文档 Documents numériques privés` 区域填写：
   - 法语显示名称
   - 中文显示名称（可选）
   - 下载、在线浏览或两者
   - 选择文件
6. 点击 `上传到私有 GitHub并绑定`。
7. 等待三个阶段全部完成：
   - 1/3 准备私有上传
   - 2/3 分块可续传，并显示百分比
   - 3/3 转入 GitHub 私有 Release 并写入数据库
8. 看到“Document privé enregistré”后才可以关闭页面。

### 给同一商品增加多份文档

重复“Ajouter un document”。同一商品可以同时拥有 PDF、SVG、模型、压缩包、说明书、素材等多份文件，每份文件有独立名称、交付方式、排序和可见性。

### 安全替换新版本

1. 找到要替换的文档。
2. 在该文档下选择新文件。
3. 点击 `安全替换新版本`。
4. 系统先上传并登记新文件，成功后才删除 GitHub 中的旧文件。
5. 版本号会自动加一。

如果新文件上传失败，旧文件仍然保持可用。

### 临时隐藏或重新显示文档

1. 取消或勾选 `文档可见 Visible`。
2. 点击 `保存名称/隐藏/模式`。

隐藏后：

- 商品仍可出售。
- 买家文档列表不再显示该文件。
- 已经签发的浏览请求也会重新检查可见状态。
- 文件仍安全保留在 GitHub 私有仓库，重新勾选即可恢复。

### 永久删除文档

1. 点击该文档的 `永久删除文档`。
2. 仔细核对文件名。
3. 确认删除。

系统会立即隐藏数据库记录，并删除 GitHub 私有 Release 中的真实文件。如果 GitHub 临时故障，后台会给出清理警告；此时文件对买家已经不可见，但需要稍后重试或在 GitHub Release 中手工清理旧 Asset。

## 上线后的完整验收

1. 用管理员账号打开一个已上传文档的商品页。
2. 页面应显示 `Documents numériques`，管理员无需购买即可检查。
3. PDF、SVG、图片或文本应出现“Consulter”。
4. 允许下载的文件应出现“Télécharger”。
5. 在后台隐藏其中一份，刷新商品页；该文件应立即消失。
6. 再恢复显示并刷新；文件应重新出现。
7. 使用普通测试账号完成一次真实或沙盒支付。
8. 支付后进入商品页或“Ma page”，点击“Voir les documents”。
9. 下载应跳转到临时 GitHub 私有地址；复制原商品文档 API 网址给未登录浏览器应无法打开。
10. GitHub 私有仓库 → `Releases` → `paid-downloads`，应能看到上传后的 Asset，但仓库对未授权访客不可见。
11. Supabase Storage → `admin-upload-staging`，成功上传后不应长期保留该文件。

## 常见报错对照

- `SUPABASE_SERVICE_ROLE_KEY manquant`：Vercel 没有配置服务器密钥，或配置后没有重新部署。
- `product_documents does not exist`：没有完整执行数据库迁移。
- `allowed_delivery_modes does not exist`：数据库迁移没有完整执行或 Schema 尚未刷新。
- `maximum file size exceeded`：Supabase 全局文件上限小于所选文件；Free 项目最大 50 MB。
- `Configuration GitHub privée incomplète`：`GITHUB_TOKEN`、`GITHUB_PAID_OWNER` 或 `GITHUB_PAID_REPO` 缺失。
- `Échec du transfert vers GitHub`：Token 过期、没有 Contents 写权限、仓库名错误，或文件达到 GitHub 2 GiB 单文件上限。
- 一直停在 2/3：网络不稳定时 TUS 会自动重试；不要关闭页面。
- 3/3 超时：Supabase 到 GitHub 的服务器转存超过 Vercel 函数时限；先检查 Fluid Compute，再考虑 Pro 更长时限。
- 买家看得到商品但没有文件：确认文档 `Visible` 已勾选、商品本身已上架，并确认文档已成功完成 3/3。
