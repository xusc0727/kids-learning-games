# 童趣成长乐园

一个面向 3～6 岁儿童及其家庭的成长内容项目。项目通过游戏、故事、语音和亲子互动，把认知、语言、社会情感、生活习惯与安全意识等学习目标转化为儿童容易理解、愿意参与的体验。

正式网站：[playmori.online](https://playmori.online)

## 产品方向

| 模块 | 服务对象 | 当前状态 |
| --- | --- | --- |
| 童趣游戏乐园 | 儿童直接体验，家长陪伴 | 已上线 10 款学习游戏 |
| 小小寓言屋 | 家长操作，儿童收听与互动 | 已上线，持续扩展数据能力 |
| 家庭成长工具 | 家长与儿童共同使用 | 待探索 |

项目总规划见 [`docs/项目总览.md`](docs/项目总览.md)，AI 故事产品方案见 [`docs/产品规划/AI寓言故事工坊.md`](docs/产品规划/AI寓言故事工坊.md)，完整数据库字典见 [`docs/数据库表结构.md`](docs/数据库表结构.md)。

## 本地运行

固定故事和游戏可以作为静态页面访问；AI 生成需要使用项目自带的 Node 服务：

```bash
cp .env.example .env
npm install
# 在 .env 中填写 DeepSeek 和本地 MySQL 配置
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

所有游戏都采用语音与图形优先、温和反馈、不扣分、不设置失败压力的设计原则，并适配手机、平板和电脑。

## 项目结构

```text
.
├── index.html、site.css           # 游戏与故事的双产品平台入口
├── package.json、server/          # Node 服务、DeepSeek 与 MySQL 数据访问
├── database/migrations/           # 可追踪的原生 SQL 迁移
├── docs/                          # 跨产品规划与设计文档
│   ├── 项目总览.md
│   ├── 数据库表结构.md
│   └── 产品规划/
└── products/                      # 独立产品模块
    ├── games/                     # 童趣游戏乐园
    │   ├── index.html             # 游戏中心首页
    │   ├── home.css
    │   ├── assets/                # 游戏图片资源
    │   ├── shared/                # 多款游戏共用的样式与逻辑
    │   └── <game>/                # 每款游戏独立目录
    │       ├── index.html
    │       ├── styles.css         # 有独立样式时存在
    │       └── game.js
    └── ai-story/                  # 小小寓言屋：页面、交互与25篇固定故事
```

游戏模块已经完成目录迁移。新增游戏时必须使用独立目录，不再向仓库根目录堆放页面、样式和脚本。

## 技术现状

- 当前形态：原生 HTML、CSS、JavaScript + Node 服务
- 数据库：MySQL 8.0，使用 `mysql2` 连接池和原生 SQL 迁移，不使用 ORM
- AI 模型：DeepSeek 官方 `deepseek-v4-flash`
- 密钥：仅存放在不会提交 Git 的根目录 `.env`
- 访客统计：MySQL 主存储，数据库异常时自动降级为本地日志
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
```

正式 RDS 建议使用独立应用账号、内网地址和 ECS 白名单；如启用 TLS，可设置 `DB_SSL=true` 和 CA 文件路径。数据库结构通过 `database/migrations/` 管理：

```bash
npm run db:migrate
npm run db:check
```

所有表、字段、索引和关系统一记录在 [`docs/数据库表结构.md`](docs/数据库表结构.md)。以后新增或修改表结构时，SQL 迁移和数据库字典必须在同一次提交中更新。

## 访客统计

统计需要在 `.env` 中配置至少 16 位的 `ANALYTICS_SALT` 才会启用。访客首次访问时可以选择同意或拒绝；拒绝不影响网站功能。

记录内容限于访问时间、页面、来源域名、设备/浏览器/系统大类、语言、屏幕尺寸分组、会话编号和每日变化的 IP 散列值。数据优先写入 MySQL；连接失败时自动写入本地 JSONL，保证网站可用。原始 IP、完整来源地址和 URL 查询参数不会写入日志，数据默认保留 30 天。

```bash
npm run analytics -- --days=7
npm run analytics -- --days=30
```

完整说明见 [`privacy.html`](privacy.html)。
