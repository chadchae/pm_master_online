# Project Manager V2

[English](README.md) | [Korean](README_KO.md)

> **本地优先的个人项目中心**

Project Manager V2 是一款本地优先的项目管理器，通过 Web 界面统一管理 `~/Projects/` 文件夹中的所有内容。无需数据库，直接与文件系统同步——文件夹结构即项目状态。通过看板面板可视化管理从创意到归档的 7 阶段生命周期，并为每个项目提供甘特图、问题追踪器、Todo 看板和 Markdown 文档编辑器。工作指令系统和内嵌终端（xterm.js）可直接与 Claude Code 集成，支持 AI 驱动的开发工作流。同时支持研究工作流（文献综述、分析、论文写作）和软件开发，统一在同一界面中完成。支持中韩英多语言、深色/浅色主题和一键安装，所有数据以本地 JSON 文件存储，确保完全的隐私保护。

## 功能详情

### 仪表板
- 7 阶段项目生命周期看板（创意、启动、开发、测试、完成、归档、废弃）
- 阶段间拖放 + 工作指令提示
- 卡片/列表视图切换 + 多列排序
- 类型筛选复选框（研究、开发、研究+开发、其他）
- 卡片信息：标签、文件夹名、描述、元标签图标、进度条、目标完成日期、相关人员
- 卡片操作（悬停）：编辑、下载（zip）、删除（移至回收站）
- 活跃项目摘要：按类型计数（研究：N | 开发：N | 其他：N）

### 项目详情（6 个标签页）
- **Documents**：Markdown 编辑器（@uiw/react-md-editor）分割视图，文件夹深入浏览 + 面包屑导航，新建文件/文件夹，多选删除，打印/PDF 导出
- **Instructions**：手动创建工作指令（文本 + 自定义检查清单），阶段转换时自动生成 `docs/work_instruction_YYYY-MM-DD.md`
- **Todo**：3 列看板（待办 / 进行中 / 已完成），复选框切换，负责人，截止日期，优先级徽章，列间/列内拖放
- **Issues**：线程式问题追踪器，状态（Open/In Progress/Resolved/Closed），优先级（Low~Critical），标签，筛选计数，评论 CRUD，内联编辑
- **Schedule**：表格视图 + 甘特图（CSS/SVG，无第三方库），里程碑钻石标记，依赖箭头，30 色分类轨道，响应式日期宽度（1W/2W/3W/1M/All），今日标记，逾期检测
- **Settings**：项目元数据（类型、重要性、严重性、紧急性、协作、所有者），时间线与进度，子任务 CRUD + 拖拽排序 + 进度条

### 日程 / 甘特图
- 任务 CRUD：负责人、日期、状态、分类、依赖关系
- 甘特图：分类轨道、依赖箭头、今日线
- 里程碑钻石标记
- 父任务自动日期计算（基于依赖关系）
- 30 色分类调色板 + 自动分配
- 工期计算（包含起止日期，inclusive）
- 依赖强制：前置任务未完成时锁定状态

### 头部摘要小部件
- Todo：已完成/总计 + 进度条 + todo/wip 计数
- Issues：开放/总计 + open/done 计数
- Schedule：计划中/进行中/已完成/逾期（实时数据）

### 侧边栏面板
- **Quick Note**：即时保存笔记到 `_notes/_temp/`，分为 5 个类别整理（研究创意/好奇心/思考/技术/个人）
- **Work Execution**：扫描未完成的工作指令，在内嵌终端中启动 Claude Code（xterm.js + WebSocket PTY），提示中自动包含"完成后更新检查清单"
- **Work Status**：全项目工作状态仪表板，每个项目的进度和检查清单详情

### 创意页面
- `1_idea_stage` 项目以卡片网格展示
- 提升到启动阶段（关联工作指令弹窗）
- 废弃到回收站
- 创建新创意（文件夹名 / 显示名 / 描述 / 类型）

### 全局功能
| 功能 | 说明 |
|------|------|
| People | 联系人卡片（姓名/单位/角色/专业/关系），关联关系，从相关人员自动生成 |
| Trash | 恢复（→ 1_idea_stage）/ 永久删除 |
| 服务器控制 | start/stop/restart + 日志查看器（5 秒自动刷新） |
| 讨论时间线 | 扫描所有项目 `_discussion.md` 文件，按月分组，按日期排序 |
| 下载 | 项目 ZIP 压缩下载 |
| i18n | 韩/英切换（280+ 翻译键） |
| YAML Frontmatter | 标准化项目元数据 |
| 新建项目 | 自动创建文件夹 + docs + `_idea_note.md` |
| 安全移动 | 停止服务 → 移动文件夹 → 清理残留 |

### UI/UX
- 深色/浅色主题（`next-themes`）
- 应用内模态对话框（不使用浏览器 prompt/confirm）
- Markdown 渲染（`@uiw/react-markdown-preview`）
- 文档打印/PDF 导出
- 筛选状态 localStorage 持久化

## 前置要求

- **macOS**（使用 `lsof` 管理端口）
- **Python 3.12+**
- **Node.js 18+**

## 快速开始

```bash
./setup.sh          # 一键安装 (venv + npm install)
./run.sh start      # 启动服务器
```

打开 http://localhost:3002 并使用 `admin` / `admin` 登录。

## 在其他机器上安装

### 1. 创建项目文件夹结构

```bash
mkdir -p ~/Projects/{1_idea_stage,2_initiation_stage,3_in_development,4_in_testing,5_completed,6_archived,7_discarded,_notes,_learning,_issues_common}
```

### 2. 克隆或复制应用

将 `project-manager-v2` 放置在磁盘任意位置（例如 `~/Projects/3_in_development/` 内部）。

### 3. 运行安装

```bash
cd project-manager-v2
./setup.sh
./run.sh start
```

### 4. 自定义项目根目录（可选）

如果项目不在 `~/Projects` 中：

```bash
export PROJECTS_ROOT="/path/to/my/projects"
./run.sh start
```

### 5. 自定义端口（可选）

默认：后端 `8002`，前端 `3002`。覆盖方法：

```bash
echo "BACKEND_PORT=8010" > .run_ports
echo "FRONTEND_PORT=3010" >> .run_ports
```

如果默认端口被占用，应用会自动查找空闲端口。

## 必需的文件夹结构

应用扫描 `~/Projects/`（或 `$PROJECTS_ROOT`）中的以下阶段文件夹：

```
~/Projects/
  1_idea_stage/           # 创意和头脑风暴
  2_initiation_stage/     # 已启动的项目（讨论）
  3_in_development/       # 活跃开发
  4_in_testing/           # 测试 / 分析阶段
  5_completed/            # 完成 / 写作阶段
  6_archived/             # 归档 / 已提交
  7_discarded/            # 回收站
  _notes/                 # 个人笔记
  _learning/              # 学习日志
  _issues_common/         # 跨项目问题记录
```

每个项目是阶段文件夹中的一个子文件夹。通过拖放或移动对话框在阶段间转移项目。

## 数据存储

所有应用数据本地存储在 `backend/data/` 中：

| 数据 | 路径 | 说明 |
|------|------|------|
| 日程 | `backend/data/schedules/*.json` | 每个项目的甘特任务、里程碑、分类 |
| Todo | `backend/data/todos/*.json` | 每个项目的看板待办事项 |
| 问题 | `backend/data/issues/*.json` | 每个项目的问题追踪 |
| 子任务 | `backend/data/subtasks/*.json` | 项目子任务 |
| 用户 | `backend/data/users.json` | 登录账户（bcrypt 哈希） |
| 卡片顺序 | `backend/data/card_order.json` | 仪表板看板卡片位置 |
| People | `backend/data/people.json` | 人员目录 |

迁移到其他机器时，复制 `backend/data/` 目录即可。

## 默认账户

| 用户名 | 密码 | 角色 |
|----------|----------|------|
| admin | admin | ADMIN |
| guest | guest | GUEST |

## 命令

```bash
./run.sh start      # 启动后端 + 前端
./run.sh stop       # 停止所有服务器
./run.sh restart    # 重启两个服务器
./run.sh status     # 检查服务器状态
./run.sh live       # 启动 + 实时日志流
```

## 技术栈

- **Backend**: Python 3.12 / FastAPI / JSON 文件存储
- **Frontend**: Next.js 15 (App Router) / React 19 / TailwindCSS / TypeScript
- **Auth**: bcrypt + 文件令牌 (PyJWT)
- **Editor**: @uiw/react-md-editor
- **Markdown**: @uiw/react-markdown-preview
- **Terminal**: @xterm/xterm + WebSocket PTY
- **Icons**: Lucide React
- **Notifications**: react-hot-toast
- **Metadata**: YAML frontmatter (pyyaml)

## 架构

```
project-manager-v2/
├── backend/
│   ├── main.py                     # FastAPI 应用 + 所有端点
│   ├── services/
│   │   ├── scanner_service.py      # 项目扫描和元数据
│   │   ├── schedule_service.py     # 日程/甘特/里程碑/分类
│   │   ├── todo_service.py         # Todo 看板
│   │   ├── issue_service.py        # 问题追踪器
│   │   ├── subtask_service.py      # 项目子任务
│   │   ├── document_service.py     # 文档文件管理
│   │   ├── server_service.py       # 服务器控制 (run.sh)
│   │   ├── common_folder_service.py # 笔记/学习/问题文件夹
│   │   ├── people_service.py       # 人员目录
│   │   └── auth_service.py         # JWT 认证
│   ├── data/                       # 所有 JSON 数据 (gitignored)
│   ├── requirements.txt
│   └── venv/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/          # 主仪表板
│   │   │   │   ├── page.tsx        # 看板 + 列表视图
│   │   │   │   ├── ideas/          # 创意管理
│   │   │   │   ├── projects/       # 项目列表 + 详情
│   │   │   │   ├── [type]/         # 笔记/学习/问题
│   │   │   │   ├── servers/        # 服务器状态
│   │   │   │   ├── people/         # 人员目录
│   │   │   │   ├── timeline/       # 时间线视图
│   │   │   │   └── trash/          # 废弃项目
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── AppDialogs.tsx      # ConfirmDialog, PromptDialog, NewProjectDialog
│   │   │   ├── Sidebar.tsx         # 导航
│   │   │   ├── PageHeader.tsx      # 顶部标题
│   │   │   ├── MoveProjectModal.tsx
│   │   │   ├── MetaTags.tsx        # 项目元标签徽章
│   │   │   ├── ProgressBar.tsx     # 子任务进度
│   │   │   └── ...
│   │   └── lib/
│   │       ├── api.ts              # 带认证的 API 客户端
│   │       ├── stages.ts           # 阶段配置
│   │       ├── i18n.tsx            # 国际化
│   │       └── useAuth.ts          # 认证钩子
│   ├── package.json
│   └── next.config.ts
├── docs/
├── run.sh                          # 启动/停止/重启/实时日志
├── setup.sh                        # 一键安装
├── CHANGELOG.md
└── .gitignore
```

## 许可证

Copyright (c) chadchae
