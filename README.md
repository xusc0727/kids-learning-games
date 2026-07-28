# 童趣成长乐园

一个面向 3～6 岁儿童及其家庭的成长内容项目。项目通过游戏、故事、语音和亲子互动，把认知、语言、社会情感、生活习惯与安全意识等学习目标转化为儿童容易理解、愿意参与的体验。

正式网站：[playmori.online](https://playmori.online)

## 产品方向

| 模块 | 服务对象 | 当前状态 |
| --- | --- | --- |
| 童趣游戏乐园 | 儿童直接体验，家长陪伴 | 原有 10 款学习游戏保留；童趣森林第一季五章已实现 |
| 小小寓言屋 | 家长操作，儿童收听与互动 | 25 篇固定故事已上线；个性故事生成暂时关闭 |
| 汉字小森林 | 儿童直接体验，家长陪伴 | 30 字首版已实现 |
| 账号与家庭 | 成人用户与家庭共同使用 | 登录、同步、同意撤回和账号注销已实现；正式短信与运营者信息待配置 |
| 家庭成长工具 | 家长与儿童共同使用 | 待探索 |

项目总规划见 [`docs/项目总览.md`](docs/项目总览.md)，AI 故事产品方案见 [`docs/产品规划/AI寓言故事工坊.md`](docs/产品规划/AI寓言故事工坊.md)，识字产品方案见 [`docs/产品规划/汉字小森林.md`](docs/产品规划/汉字小森林.md)，完整数据库字典见 [`docs/数据库表结构.md`](docs/数据库表结构.md)，生产操作见 [`docs/生产发布指引.md`](docs/生产发布指引.md)，发布验收见 [`docs/生产发布清单.md`](docs/生产发布清单.md)。

## 本地运行

游戏可以作为静态页面访问；故事和识字内容需要使用项目自带的 Node 服务与 MySQL：

```bash
cp .env.example .env
npm install
# 在 .env 中填写本地 MySQL 配置
npm run db:migrate
npm run db:check
npm start
```

然后访问 `http://localhost:4173`。

## 已上线游戏

- 小动物的彩虹餐厅：颜色、形状、数量和分类
- 森林寻宝队：方向、空间和路线规划
- 森林找不同：观察、专注和视觉辨别
- 动物图形数独：排除、逻辑和空间认知
- 动物排排队：倾听、顺序和方位推理
- 听指令小火车：倾听、记忆和连续执行
- 森林小超市：计数、分类和生活数学
- 故事排排队：图片排序、因果和语言表达
- 小小整理家：分类、任务执行和检查习惯
- 图形建筑师：图形辨认、空间位置和组合

所有游戏都采用语音与图形优先、温和反馈、不扣分、不设置失败压力的设计原则，并适配手机、平板和电脑。童趣森林、10 款小游戏和汉字小森林共用儿童友好普通话音色选择模块，优先设备上的自然女声；识字发音会进一步放慢。

童趣森林把五章任务串联成一条完整的成长故事，并使用项目内原创绘本素材。每章通关后会一次获得该章全部三件装饰；儿童可以通过装饰背包在地图中自由摆放、拖动或收回装饰，章节进度和装饰位置会保存在当前浏览器。

## 项目结构

```text
.
├── index.html、site.css           # 产品平台入口
├── account.html/css/js            # 手机号登录、家庭空间与设备数据同步
├── terms.html、privacy.html        # 用户协议、隐私政策和儿童数据规则
├── package.json、server/          # Node 服务、账号与 MySQL 数据访问
├── database/                      # 原生 SQL 迁移、预设故事种子与授权脚本
├── ops/                           # Nginx、systemd 与备份定时器示例
├── docs/                          # 跨产品规划与设计文档
│   ├── 项目总览.md
│   ├── 数据库表结构.md
│   └── 产品规划/
└── products/                      # 独立产品模块
    ├── shared/                    # 跨产品共用的儿童友好语音模块
    ├── games/                     # 童趣游戏乐园
    │   ├── index.html             # 游戏中心首页
    │   ├── home.css
    │   ├── assets/                # 游戏图片资源
    │   ├── shared/                # 多款游戏共用的样式与逻辑
    │   └── <game>/                # 每款游戏独立目录
    │       ├── index.html
    │       ├── styles.css         # 有独立样式时存在
    │       └── game.js
    ├── ai-story/                  # 小小寓言屋页面、交互与领域展示配置
    └── literacy/                  # 汉字小森林页面、语音学习和识字小游戏
```

游戏模块已经完成目录迁移。新增游戏时必须使用独立目录，不再向仓库根目录堆放页面、样式和脚本。

## 技术现状

- 当前形态：原生 HTML、CSS、JavaScript + Node 服务
- 数据库：MySQL 8.0，使用 `mysql2` 连接池和原生 SQL 迁移，不使用 ORM
- AI 故事：实现暂时保留，`AI_STORY_GENERATION_ENABLED=false` 时页面无入口且接口拒绝生成
- 密钥：仅存放在不会提交 Git 的根目录 `.env`
- 访客统计：MySQL 主存储，数据库异常时自动降级为本地日志
- 故事存储：25 篇预设故事和以往生成结果统一保存在 `stories` 表；当前不接收家庭事件
- 识字内容：30 个汉字保存在 `literacy_characters` 表；登录后学习进度可保存到家庭默认儿童档案
- 账号体系：手机号验证码登录、加密登录身份、服务端会话、家庭成员、最小儿童档案和监护人同意记录已实现
- 家庭同步：首次登录不会自动上传；仅在成人明确勾选并确认后，合并当前设备的以往故事、收藏和识字进度
- 权利响应：支持清空家庭成长数据、撤回同步同意和注销单成员家庭账号
- 生产安全：静态资源白名单、通用 500 错误、安全响应头和生产配置启动校验已实现
- 渠道扩展：微信公众号和未来小程序身份仍可通过 `auth_identities` 绑定到同一账号主体
- 生产环境：阿里云 ECS、Nginx、Let's Encrypt HTTPS
- 当前 GitHub 仓库名与服务器目录仍沿用 `kids-learning-games`，不影响新的代码结构
- 没有前端构建步骤；运行前需要执行一次 `npm install`

## MySQL 配置

本地 MySQL 与阿里云 RDS 使用同一组环境变量，只需更换 `.env`：

```text
DB_ENABLED=true
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=playmori
DB_USER=playmori
DB_PASSWORD=<数据库密码>
DB_CONNECTION_LIMIT=5
DB_CONNECT_TIMEOUT=10000
DB_SSL=false

NODE_ENV=production
HOST=127.0.0.1

SESSION_COOKIE_NAME=playmori_session
SESSION_COOKIE_SECURE=true
SESSION_TTL_DAYS=30
ACCOUNT_IDENTITY_HASH_SECRET=<至少 32 字节的独立随机密钥>
ACCOUNT_IDENTITY_ENCRYPTION_KEY=<32 字节密钥；使用 Base64 或 64 位十六进制格式>

PHONE_OTP_SECRET=<至少 32 字节的独立随机密钥>
PHONE_OTP_TTL_MINUTES=5
PHONE_CHALLENGE_RETENTION_DAYS=30
SMS_PROVIDER=aliyun-auth
ALIBABA_CLOUD_ACCESS_KEY_ID=<号码认证服务 RAM AccessKey ID>
ALIBABA_CLOUD_ACCESS_KEY_SECRET=<号码认证服务 RAM AccessKey Secret>
ALIYUN_SMS_AUTH_SIGN_NAME=<短信认证参数配置中的当前可用赠送签名>
ALIYUN_SMS_AUTH_TEMPLATE_CODE=<短信认证登录/注册模板编号>
ALIYUN_SMS_AUTH_SCHEME_NAME=<可选；留空使用默认方案>
PUBLIC_OPERATOR_NAME=<个体工商户完整登记名称>
PUBLIC_CONTACT_CHANNEL=<公众号、电话或其他可用联系渠道>
PUBLIC_PRIVACY_EMAIL=<可实际收件的隐私联系邮箱>
BACKUP_DIR=/var/backups/playmori
BACKUP_RETENTION_DAYS=30
```

正式 RDS 建议使用独立应用账号、内网地址和 ECS 白名单；如启用 TLS，可设置 `DB_SSL=true` 和 CA 文件路径。数据库结构通过 `database/migrations/` 管理：

```bash
npm run db:migrate
npm run db:check
```

`npm run db:migrate` 会在应用结构迁移后自动同步 25 篇系统预设故事和 30 个识字内容；只需要重新同步内容时可以运行 `npm run db:seed`。

所有表、字段、索引和关系统一记录在 [`docs/数据库表结构.md`](docs/数据库表结构.md)。以后新增或修改表结构时，SQL 迁移和数据库字典必须在同一次提交中更新。

`ACCOUNT_IDENTITY_HASH_SECRET` 和 `ACCOUNT_IDENTITY_ENCRYPTION_KEY` 只用于登录身份保护，不能与数据库密码、访客统计盐值共用，也不能提交到 Git。生产环境必须保持加密密钥稳定；更换密钥前需先设计数据轮换流程。网站 Session 使用 `HttpOnly` Cookie，生产环境必须保持 `SESSION_COOKIE_SECURE=true`。

## 手机号登录与家庭同步

本地联调可把短信提供商设为控制台模式。验证码只会返回给非生产环境的家庭空间页面，不会发送真实短信：

```text
NODE_ENV=development
SMS_PROVIDER=console
SESSION_COOKIE_SECURE=false
PHONE_OTP_SECRET=<至少 32 字节的独立随机密钥>
```

打开 `http://localhost:4173/account.html` 即可完成手机号登录。生产环境必须改用 `SMS_PROVIDER=aliyun-auth`，开通阿里云号码认证服务中的“短信认证”，并配置最小权限 RAM AccessKey、控制台当前可用的赠送签名及登录/注册模板。生产验证码由阿里云生成并通过 `CheckSmsVerifyCode` 核验，项目数据库不保存验证码或验证码摘要；本地 `console` 模式仍只保存与请求编号绑定的 HMAC 摘要。验证码默认 5 分钟失效、最多尝试 5 次，同时按手机号和请求网络限流，手机号不以明文写入数据库。

登录成功后，成人可以明确选择是否把当前设备数据同步到家庭空间。同步采用合并策略且可以安全重试：不会删除浏览器数据，也不会覆盖家庭中已有的收藏或识字进度。同一个设备只能归入一个家庭。

成人在首次请求验证码前必须同意当前版本用户协议与隐私政策；同步儿童相关数据时，服务端会记录儿童个人信息处理规则的版本、正文哈希和监护人决定。家庭空间支持撤回同意并清空成长数据，也支持刚登录 15 分钟内自助注销单成员家庭账号。

## 生产发布准备

生产环境会执行强制配置校验。缺少数据库、独立密钥、阿里云短信认证、运营者信息、安全 Cookie 或本机监听设置时，服务会拒绝启动。推送到 `prd` 分支后，GitHub Actions 会自动执行测试，并通过 SSH 按以下顺序发布到生产服务器：

```bash
npm ci
npm audit --omit=dev
npm test
npm run db:backup
npm run db:migrate
npm run db:check
npm run check:production
```

Nginx、systemd 和每日备份示例位于 `ops/`。完整上线和回滚操作见 [`docs/生产发布指引.md`](docs/生产发布指引.md)，逐项验收见 [`docs/生产发布清单.md`](docs/生产发布清单.md)。项目 Node 服务只公开根目录明确列出的页面、`products/` 中的网页资源和 `assets/` 中的图片；`.env`、`.git`、服务端源码、迁移和文档均不能通过 HTTP 读取。

## 访客统计

统计需要在 `.env` 中配置至少 16 位的 `ANALYTICS_SALT` 才会启用。访客首次访问时可以选择同意或拒绝；拒绝不影响网站功能。

记录内容限于访问时间、页面、来源域名、设备/浏览器/系统大类、语言、屏幕尺寸分组、会话编号和每日变化的 IP 散列值。数据优先写入 MySQL；连接失败时自动写入本地 JSONL，保证网站可用。原始 IP、完整来源地址和 URL 查询参数不会写入日志，数据默认保留 30 天。

```bash
npm run analytics -- --days=7
npm run analytics -- --days=30
```

完整说明见 [`privacy.html`](privacy.html)。

## 故事数据

- 系统预设故事由 `database/fixed-stories.mjs` 维护，部署时同步到 MySQL，网站运行时只通过 API 读取数据库。
- 当前公开页面不提供个性故事生成，不接收故事素材，也不读取以往生成历史。
- 服务端生成接口由 `AI_STORY_GENERATION_ENABLED=false` 默认关闭；直接请求会返回“故事生成功能暂未开放”。
- 以往已经保存的生成故事不会因关闭功能而自动删除，成人仍可通过家庭空间清空相关数据。
- 未登录收藏保存在当前浏览器；成人确认首次同步后，收藏会合并到家庭空间，后续登录状态下的收藏变更实时写入服务端。

## 识字功能

- 汉字小森林包含自然、动物、身体、家人和大小方向五个主题，共 30 个汉字。
- 每个字包含拼音、图形、词语、短句和字形联想提示。
- 支持点字普通话朗读、“我认识了”记录，以及看图、听音、词语三类五轮小游戏。
- 未登录时进度只保存在浏览器；成人确认首次同步后合并到家庭空间，登录状态下的进度变更实时写入服务端。
- 不采集儿童录音，也不做识字能力排名。
