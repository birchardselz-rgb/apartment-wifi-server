# Apple 风格管理后台重设计实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Next.js 项目中建立唯一、稳定、响应式的 `/guanli` 管理后台，采用苹果官网式浅色视觉，同时保留现有 API、数据库和权限能力。

**Architecture:** 新增 `app/guanli` 作为管理后台唯一源码边界，使用共享 Layout、导航配置、API 客户端、状态组件和业务模块页面；旧入口保留兼容跳转。Vercel 继续使用 Next.js 静态导出，生成唯一的 `dist/guanli`，不再依赖旧的独立管理后台 bundle。

**Tech Stack:** Next.js 15 App Router、React 19、TypeScript、Tailwind CSS、Framer Motion、Lucide React、现有 Express API、PostgreSQL/Neon。

---

## 约束与现状

- 项目路径：`H:\apartment-wifi-server`。
- 现有工作区有大量用户未提交改动，实施时只添加或修改本计划列出的文件，不使用 `git reset --hard`、`git checkout -- .` 或批量清理。
- `app/page.tsx` 是现有主站的大型客户端页面；`app/admin/page.tsx`、`app/client/page.tsx`、`app/maintenance/page.tsx`、`app/sales/page.tsx`、`app/system/page.tsx` 是已有角色页面，迁移期间保留。
- `dist/guanli` 当前是已提交的旧构建产物；新管理后台构建通过后才替换其内容。
- `next.config.js` 使用 `output: 'export'` 与 `distDir: 'dist'`，因此所有新路由必须支持静态导出，不能依赖服务端运行时渲染。
- `backend/server.js` 的源码路由很少，完整业务 API 主要由 `/api/data` 的数据读写和前端数据层承担；API 客户端必须兼容当前响应格式。

## 文件边界

### 新建

- `app/guanli/layout.tsx`：管理后台统一布局和权限入口。
- `app/guanli/page.tsx`：总览首页。
- `app/guanli/login/page.tsx`：登录页。
- `app/guanli/customers/page.tsx`：客户模块入口。
- `app/guanli/broadband/page.tsx`：宽带模块入口。
- `app/guanli/tickets/page.tsx`：工单模块入口。
- `app/guanli/properties/page.tsx`：楼栋与房间模块入口。
- `app/guanli/packages/page.tsx`：套餐模块入口。
- `app/guanli/finance/page.tsx`：财务模块入口。
- `app/guanli/settings/page.tsx`：系统设置和数据导出入口。
- `app/guanli/components/Sidebar.tsx`：桌面导航和移动导航。
- `app/guanli/components/TopBar.tsx`：顶部标题、面包屑、用户菜单。
- `app/guanli/components/MetricCard.tsx`：指标卡片。
- `app/guanli/components/SectionCard.tsx`：统一内容容器。
- `app/guanli/components/StateView.tsx`：加载、空数据、错误、无权限状态。
- `app/guanli/components/DataTable.tsx`：统一表格外壳、分页和响应式处理。
- `app/guanli/components/ConfirmDialog.tsx`：危险操作确认。
- `app/guanli/lib/api.ts`：统一 API 请求、超时、错误和响应解析。
- `app/guanli/lib/auth.ts`：会话读写、登录态和角色守卫。
- `app/guanli/lib/navigation.ts`：模块、图标、角色权限和旧路由映射。
- `app/guanli/types.ts`：管理后台页面所需的接口类型和视图模型。
- `app/guanli/styles.css`：苹果风格设计变量、动效和页面基础样式。
- `scripts/verify-guanli.mjs`：构建产物、关键页面和静态资源验证脚本。

### 修改

- `app/layout.tsx`：保留主站布局，移除管理后台不需要的全局样式污染，并加载统一中文字体栈。
- `app/globals.css`：补充全局基础变量和可访问性样式，避免覆盖管理后台局部设计。
- `vercel.json`：将 `/guanli`、`/guanli/` 和 `/guanli/*` 指向新的静态导出路径，并保留旧入口兼容跳转。
- `next.config.js`：仅在验证需要时调整导出配置，确保不破坏现有主站静态页面。
- `package.json`：增加验证脚本，不删除现有运行脚本。

### 保留

- `backend/server.js`、`backend/db.js`、`lib/mock-data.ts`、`lib/excel.ts`、`types/index.ts` 及数据库结构。
- 旧角色页面与现有 `dist` 其他目录，直到新后台完整验收后再决定是否清理。

---

## Task 1: 建立失败回归检查与构建基线

**Files:**
- Create: `scripts/verify-guanli.mjs`
- Modify: `package.json`

- [ ] **Step 1: 写入验证脚本**

脚本使用 Node 内置 `fetch` 读取构建后的本地服务或传入的 `BASE_URL`，依次检查 `/guanli/`、`/guanli/login/`、`/api/data`，并检查 HTML 中存在管理后台入口标记；任一非 2xx 返回或超时都退出码 1。

- [ ] **Step 2: 增加命令**

在 `package.json` 增加：

```json
"verify:guanli": "node scripts/verify-guanli.mjs"
```

- [ ] **Step 3: 运行基线检查**

运行：`npm run verify:guanli`

预期：在旧产物上至少记录当前 `/guanli` 路由和登录入口的实际状态；若失败，脚本输出具体 URL 和状态码，作为回归基线。

- [ ] **Step 4: 提交基线工具**

运行：`git add scripts/verify-guanli.mjs package.json && git commit -m "test: add guanli verification baseline"`

---

## Task 2: 建立管理后台设计系统与共享状态组件

**Files:**
- Create: `app/guanli/styles.css`
- Create: `app/guanli/components/SectionCard.tsx`
- Create: `app/guanli/components/MetricCard.tsx`
- Create: `app/guanli/components/StateView.tsx`
- Create: `app/guanli/components/ConfirmDialog.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: 定义设计变量**

在 `styles.css` 定义背景、正文、弱文本、边框、强调蓝、成功、警告和危险色；定义 4px 间距阶梯、统一圆角、阴影、焦点环和 `prefers-reduced-motion` 降级规则。

- [ ] **Step 2: 实现共享状态组件**

组件必须接收明确的 `title`、`description`、`actionLabel` 和 `onAction` 属性；错误状态必须支持重试，空状态不能使用无限旋转动画。

- [ ] **Step 3: 运行类型检查**

运行：`npx tsc --noEmit`

预期：新增组件无 TypeScript 错误；允许项目已有的忽略构建错误配置，不扩大 `any` 使用范围。

- [ ] **Step 4: 提交设计系统**

运行：`git add app/guanli app/layout.tsx app/globals.css && git commit -m "feat: add guanli apple-style design system"`

---

## Task 3: 实现 API 客户端、会话和权限导航

**Files:**
- Create: `app/guanli/types.ts`
- Create: `app/guanli/lib/api.ts`
- Create: `app/guanli/lib/auth.ts`
- Create: `app/guanli/lib/navigation.ts`
- Create: `app/guanli/components/Sidebar.tsx`
- Create: `app/guanli/components/TopBar.tsx`

- [ ] **Step 1: 定义接口类型**

从现有 `types/index.ts` 和 `lib/mock-data.ts` 提取客户、宽带、工单、套餐、订单、员工和总览统计的最小视图类型；页面组件只依赖 `app/guanli/types.ts`。

- [ ] **Step 2: 实现请求封装**

`api.ts` 使用同源 `/api`，默认 15 秒超时；对非 2xx 抛出包含 `status`、`message` 的错误；对 401、403、500 分别交给调用页面处理，不吞掉原始响应。

- [ ] **Step 3: 实现会话和角色守卫**

`auth.ts` 提供 `getSession()`、`setSession()`、`clearSession()`、`requireSession()` 和 `canAccess()`；登录态只读取现有登录接口返回的 token，不在导航组件内硬编码管理员权限。

- [ ] **Step 4: 实现导航**

导航配置固定模块顺序：总览、客户、宽带、工单、楼栋房间、套餐、财务、系统设置；桌面端显示侧栏，移动端显示底部导航，当前路径使用 `aria-current="page"`。

- [ ] **Step 5: 运行类型检查**

运行：`npx tsc --noEmit`

预期：API 返回类型、角色枚举和导航项类型一致，无隐式 `any`。

- [ ] **Step 6: 提交基础层**

运行：`git add app/guanli && git commit -m "feat: add guanli api auth and navigation foundation"`

---

## Task 4: 实现统一 Layout 和登录页

**Files:**
- Create: `app/guanli/layout.tsx`
- Create: `app/guanli/login/page.tsx`
- Modify: `vercel.json`

- [ ] **Step 1: 实现 Layout**

Layout 读取会话并根据 `navigation.ts` 显示菜单；未登录访问业务页面跳转到 `/guanli/login/`；页面主体使用 `main`、导航使用 `nav`，桌面和移动布局均不允许横向滚动。

- [ ] **Step 2: 实现登录页**

登录页包含品牌标题、账号、密码、提交按钮、加载状态和错误提示；提交成功后跳转 `/guanli/`，失败时保留输入值并显示可读错误。

- [ ] **Step 3: 更新 Vercel 路由**

将 `/guanli` 与 `/guanli/` 统一指向新静态入口；将旧 `/admin`、`/sales`、`/maintenance`、`/system` 映射到新后台对应模块或总览，不删除旧目录。

- [ ] **Step 4: 验证路由**

运行：`npx next build`

预期：生成 `dist/guanli/index.html`、`dist/guanli/login/index.html`，构建退出码为 0。

- [ ] **Step 5: 提交登录与布局**

运行：`git add app/guanli vercel.json && git commit -m "feat: add guanli shell and login"`

---

## Task 5: 实现苹果风格总览首页

**Files:**
- Create: `app/guanli/page.tsx`
- Create: `app/guanli/components/OverviewPanel.tsx`
- Create: `app/guanli/components/RecentTickets.tsx`
- Create: `app/guanli/components/ExpiryAlerts.tsx`

- [ ] **Step 1: 定义首页加载状态**

页面初始显示骨架；总览接口失败时保留页面壳层并显示 `StateView` 重试按钮；空数据使用明确的空状态，不显示 `undefined`、`NaN` 或空白卡片。

- [ ] **Step 2: 实现四个核心指标**

显示在线宽带、待处理工单、即将到期客户、今日收入；每个指标包含标题、数值、对比说明和语义化颜色，避免四张完全相同的卡片。

- [ ] **Step 3: 实现最近工单与到期提醒**

列表使用有限条数、清晰状态标签和进入模块的链接；没有数据时显示空状态，有数据加载错误时显示局部重试而不是整页白屏。

- [ ] **Step 4: 验证首页**

运行本地服务后执行：`$env:BASE_URL='http://127.0.0.1:3456'; npm run verify:guanli`

预期：`/guanli/` 和 API 检查通过，首页 HTML 可加载。

- [ ] **Step 5: 提交首页**

运行：`git add app/guanli && git commit -m "feat: add apple-style guanli overview"`

---

## Task 6: 迁移业务模块页面

**Files:**
- Modify: `app/guanli/customers/page.tsx`
- Modify: `app/guanli/broadband/page.tsx`
- Modify: `app/guanli/tickets/page.tsx`
- Modify: `app/guanli/properties/page.tsx`
- Modify: `app/guanli/packages/page.tsx`
- Modify: `app/guanli/finance/page.tsx`
- Modify: `app/guanli/settings/page.tsx`
- Create: `app/guanli/components/DataTable.tsx`

- [ ] **Step 1: 实现 DataTable**

统一处理表头、移动端卡片降级、搜索、筛选、分页、加载骨架、空状态、错误状态和行操作；所有按钮提供可见焦点和中文 `aria-label`。

- [ ] **Step 2: 迁移客户和宽带**

先从现有 `app/client/page.tsx` 和 `lib/mock-data.ts` 提取读取、搜索、状态变更逻辑，迁移到新页面；禁止在新页面直接复制整份大型主站组件。

- [ ] **Step 3: 迁移工单**

复用现有工单字段和状态，加入优先级、处理人、更新时间以及失败重试；删除操作必须通过 `ConfirmDialog`。

- [ ] **Step 4: 迁移楼栋、房间、套餐、财务和设置**

按照设计文档顺序完成其余页面；导出和导入操作必须显示进度、成功结果和失败原因。

- [ ] **Step 5: 逐页运行检查**

每完成一个页面运行：`npx tsc --noEmit`，并访问对应的 `/guanli/<module>/` 路由，确认刷新不会 404。

- [ ] **Step 6: 提交业务模块**

运行：`git add app/guanli && git commit -m "feat: migrate guanli business modules"`

---

## Task 7: 移除旧管理 bundle 依赖并验证部署

**Files:**
- Modify: `vercel.json`
- Modify: `package.json`
- Modify: `scripts/verify-guanli.mjs`
- Replace through build: `dist/guanli/**`

- [ ] **Step 1: 更新构建与验证命令**

确保 `npm run build` 不再仅执行 `npm install`，而是执行可复现的 Next 静态构建；保留 `npm run vercel-build` 与 Vercel 配置一致。

- [ ] **Step 2: 构建新产物**

运行：`npm install`，然后运行：`npx next build`

预期：`dist/guanli` 只包含新入口和新资源，旧重复 bundle 不再被路由引用。

- [ ] **Step 3: 运行本地全量验证**

运行：`npm run verify:guanli`，并检查 `/guanli/`、`/guanli/login/`、所有模块路径和 `/api/data`。

- [ ] **Step 4: 运行线上验证**

设置 `BASE_URL=https://apartment-wifi-server2027.vercel.app` 后运行验证脚本；检查首页、登录、管理后台、API 和静态资源均为可接受状态码。

- [ ] **Step 5: 检查工作区并提交构建调整**

运行：`git diff --stat`、`git status --short`；只暂存本次管理后台相关文件，然后提交：`git commit -m "feat: ship stable guanli redesign"`。

---

## Task 8: 最终验收

- [ ] **Step 1: 运行类型检查**

运行：`npx tsc --noEmit`；预期退出码 0。

- [ ] **Step 2: 运行构建**

运行：`npx next build`；预期退出码 0，生成管理后台静态入口。

- [ ] **Step 3: 运行验证脚本**

分别用本地服务和 Vercel 地址运行 `npm run verify:guanli`；预期首页、登录页、总览 API 和核心静态资源全部通过。

- [ ] **Step 4: 检查响应式与可访问性**

在 1440px、1024px、768px 和 390px 宽度检查导航、表格、弹窗、表单和错误状态；确认键盘焦点可见、按钮有名称、页面无横向滚动。

- [ ] **Step 5: 最终交付**

记录实际完成的阶段、未迁移模块、验证命令和线上地址；只有所有实际验证通过后，才报告完成。

