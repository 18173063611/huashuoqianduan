# 华烁 AI 视频平台前端

华烁前端是 AI 爆款视频改造平台的 Web 工作台，提供普通用户内容生产流程和管理员运营后台。普通用户侧覆盖对标解析、文案/分镜、语音合成、数字人形象、视频制作、任务中心和资产中心；管理员侧覆盖用户、积分、模型、任务和操作日志管理。

## 技术栈

- Vue 3
- TypeScript
- Vite
- Vue Router
- Element Plus
- Element Plus Icons
- Fetch API
- `@microsoft/fetch-event-source`

## 环境要求

- Node.js 22+
- npm 10+

建议使用项目锁定的 `package-lock.json` 安装依赖，保证本地和构建环境一致。

## 目录结构

```text
huashuoqianduan
├─ src
│  ├─ assets          静态图片资源
│  ├─ components      通用组件、布局组件、任务浮窗
│  ├─ composables     组合式逻辑
│  ├─ pages
│  │  ├─ admin        管理员后台页面
│  │  ├─ asset        资产中心
│  │  ├─ auth         登录注册
│  │  ├─ avatar       数字人形象生成
│  │  ├─ project      项目工作台
│  │  ├─ render       视频制作
│  │  ├─ script       文案改写、分镜
│  │  ├─ task         任务中心
│  │  ├─ upload       上传中心
│  │  ├─ user         用户中心
│  │  ├─ video        对标视频解析
│  │  └─ voice        语音合成
│  ├─ router          路由与鉴权守卫
│  ├─ services        后端 API 封装、登录态、任务缓存
│  ├─ styles          全局样式
│  ├─ types           业务类型定义
│  ├─ App.vue
│  └─ main.ts
├─ index.html
├─ package.json
├─ package-lock.json
├─ tsconfig.json
└─ vite.config.ts
```

## 快速启动

先启动后端服务，默认地址：

```text
http://127.0.0.1:8080/api/v1
```

安装依赖：

```bash
cd huashuoqianduan
npm install
```

启动开发服务：

```bash
npm run dev
```

浏览器访问 Vite 输出的地址，通常是：

```text
http://127.0.0.1:5173
```

## 环境变量

前端请求后端 API 使用 `VITE_API_BASE_URL`。

新建 `.env.local`：

```env
VITE_API_BASE_URL=http://127.0.0.1:8080/api/v1
```

如果不配置：

- 开发环境默认请求 `http://127.0.0.1:8080/api/v1`
- 生产构建默认请求 `https://huashuohouduan.onrender.com/api/v1`

生产部署建议显式配置 `VITE_API_BASE_URL`，避免请求到错误后端。

## 可用脚本

```bash
# 开发启动
npm run dev

# 类型检查并生产构建
npm run build

# 本地预览 dist
npm run preview
```

## 登录账号

本地后端默认 `local` profile 下会创建内置管理员：

- 管理员账号：`admin`
- 管理员密码：`admin1234`

演示普通用户由后端种子数据创建，常见账号：

- `demo` / `demo1234`
- `alice` / `demo1234`
- `bob` / `demo1234`

如果后端使用 `prod` 或 `test` profile，管理员密码由 `HUASHUO_ADMIN_PASSWORD` 决定。

## 页面模块

### 普通用户工作台

| 页面 | 路由 | 说明 |
| --- | --- | --- |
| 登录 | `/login` | 普通用户登录 |
| 注册 | `/register` | 普通用户注册 |
| 爆款对标 | `/video-parse` | 对标视频解析与文案提取 |
| 分镜生成 | `/storyboard` | 根据脚本生成分镜 |
| 声音生成 | `/voice` | TTS 语音合成、音色试听 |
| 数字人形象 | `/avatar` | 上传或生成数字人形象 |
| 视频制作 | `/render` | 数字人口播视频生成 |
| 任务中心 | 浮窗进入 | 查看任务状态、重试、取消、查看资产 |
| 资产中心 | 顶部按钮进入 | 查看上传和生成资产 |

### 管理员后台

| 页面 | 路由 | 说明 |
| --- | --- | --- |
| 后台登录 | `/admin/login` | 管理员登录 |
| 运营概览 | `/admin/dashboard` | 用户、任务、积分、失败任务概览 |
| 用户管理 | `/admin/users` | 用户增删改查、启用禁用、重置密码、积分调整 |
| 用户详情 | `/admin/users/:userId` | 用户资料、积分账户、最近任务、最近流水 |
| 模型配置 | `/admin/models` | AI 模型配置、启停、默认模型 |
| 任务管理 | `/admin/tasks` | 全站任务查询 |
| 积分流水 | `/admin/credit-logs` | 全站积分流水查询 |
| 操作日志 | `/admin/operation-logs` | 管理员操作审计 |

## 鉴权说明

- 登录成功后，token 保存到 localStorage。
- 所有业务请求会自动携带 `Authorization: Bearer <token>`。
- 普通业务页面要求登录。
- 管理员后台进入前会调用 `/auth/me` 校验真实角色和账号状态。
- 后端仍会对 `/api/v1/admin/**` 做管理员权限校验，前端路由守卫只负责体验，不作为安全边界。

## API 封装约定

API 请求统一封装在 [src/services/request.ts](src/services/request.ts)。

业务接口按模块拆分：

```text
src/services
├─ adminApi.ts        管理员后台接口
├─ assetApi.ts        资产接口
├─ authApi.ts         登录注册接口
├─ avatarApi.ts       数字人形象接口
├─ scriptApi.ts       文案/分镜接口
├─ taskApi.ts         任务中心接口
├─ uploadApi.ts       上传接口
├─ videoApi.ts        视频接口
├─ voiceApi.ts        语音接口
└─ writerApi.ts       对标解析接口
```

后端统一响应格式由 `types/apiTypes.ts` 定义，页面只消费 `data` 部分。

## 构建与部署

生产构建：

```bash
npm run build
```

构建产物输出到：

```text
dist/
```

部署时需要注意：

1. 配置正确的 `VITE_API_BASE_URL`。
2. 后端需要允许前端域名跨域访问。
3. 如果前端是 HTTPS，后端 API 也应使用 HTTPS，否则浏览器会拦截 Mixed Content。
4. SPA 部署需要把未知路径回退到 `index.html`，否则刷新 `/admin/users` 等路由会 404。

## 常见问题

### 页面提示 `Failed to fetch`

通常是后端未启动、接口地址错误、CORS 拦截或 HTTPS 页面请求 HTTP 接口。先检查：

- 后端是否启动在 `8080`
- `.env.local` 中 `VITE_API_BASE_URL` 是否正确
- 浏览器 Network 面板里的请求地址和错误信息

### 进入后台被跳回 `/admin/login`

说明当前 token 无效，或当前账号不是 `ADMIN`，或账号状态不是 `ENABLED`。请使用管理员账号登录。

### 构建时出现 chunk 体积 warning

Vite 构建可能提示部分 chunk 超过 500KB，这是体积优化建议，不代表构建失败。后续可以按页面拆包或调整 `manualChunks`。

### 本地登录后接口仍返回 401

清理浏览器 localStorage 后重新登录，或确认后端没有切换数据库导致旧 token 对应 session 不存在。

