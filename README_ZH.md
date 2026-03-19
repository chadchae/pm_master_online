# Project Manager V2

[English](README.md) | [한국어](README_KO.md)

> **本地优先的个人项目管理中心**

Project Manager V2 是一款本地优先(local-first)的项目管理工具,它直接与文件系统同步,无需任何数据库。通过 Web 浏览器即可可视化和管理整个 `~/Projects/` 文件夹,文件夹结构本身就是项目的状态。无需安装额外的数据库服务器,也无需注册任何云服务。所有数据以本地 JSON 文件形式存储,确保个人信息和研究数据的隐私安全得到完美保障。

这款工具的核心理念是"文件系统即数据"。项目按照7个阶段的生命周期进行管理(构想 > 启动 > 开发 > 测试 > 完成 > 归档 > 废弃),在看板面板上通过拖拽即可完成阶段切换。当项目在阶段间移动时,文件系统中的实际文件夹会随之移动,同时自动生成工作指导文档。这种方式使得项目历史可以在文件系统层面进行追踪,并与 Git 等版本控制工具自然集成。

Project Manager V2 专为在同一界面中同时支持软件开发和学术研究工作流而设计。在开发项目中,您可以使用问题跟踪器、待办看板、甘特图和 Markdown 文档编辑器;在研究项目中,可以系统化管理文献综述、数据分析和论文写作的全过程。通过将项目分类为 Research、Development、Research+Development 和 Other,可以为每种类型应用相应的工作流。

尤其值得关注的是与 Claude Code 的深度集成。通过内嵌终端(xterm.js + WebSocket PTY),实现了基于工作指导的 AI 辅助开发。系统会扫描未完成的工作指导并直接传递给 Claude Code,提示中自动包含"完成时更新检查清单"的指令。这使得 AI 驱动的开发工作流与项目管理紧密联动。

支持深色/浅色主题切换,仪表盘提供4种主题变体(A/B/C/D)。支持韩语/英语国际化(280+翻译键值),文档可导出为打印/PDF/Markdown/CSV格式。安装只需一条命令 `./setup.sh && ./run.sh start`,Python 虚拟环境创建和 npm 包安装全部自动完成,无需任何复杂的配置过程。

现有的项目管理工具大多基于云端运行,数据存储在外部服务器上。对于处理研究数据或机密项目的个人开发者和研究人员来说,这带来了严重的隐私顾虑。Project Manager V2 从根本上解决了这个问题。它不收集遥测数据,不依赖第三方服务,没有订阅费用。您的数据始终保留在本地机器上,通过简单的文件复制即可完成备份和迁移。复制一个项目文件夹,所有历史记录和文档都会一起转移。这正是本地优先理念的核心价值:完全掌控自己的数据,无需为隐私安全担忧。

在日常使用中,您可以在看板视图中一目了然地看到所有项目的当前状态,按类型筛选关注特定领域的工作,并通过拖拽快速推进项目阶段。每个项目都配备了完整的工具集:用甘特图规划时间线和里程碑,用问题跟踪器记录和解决技术难题,用待办看板管理日常任务,用 Markdown 编辑器撰写和维护项目文档。侧边栏的快速笔记功能让灵感不再遗失,讨论时间线则提供了跨项目的沟通记录全景视图。人员管理模块帮助您维护项目相关联系人的完整档案,从合作者到导师再到审稿人,所有关系一目了然。无论您是独立开发者管理多个开源项目,还是研究生同时推进论文和实验代码,Project Manager V2 都能为您提供一个统一、高效且完全私密的项目管理环境。它将散落在各处的项目文件夹转变为一个结构化的、可视化的工作空间,让您专注于真正重要的事情——创造和研究本身。从今天开始,用一条命令开启您的本地项目管理之旅。

## 主要功能

### 仪表盘
- 7阶段项目生命周期看板 (构想、启动、开发、测试、完成、归档、废弃)
- 阶段间拖拽移动时弹出工作指导提示
- 卡片/列表视图切换与多列排序
- 类型筛选复选框 (Research, Development, Research+Development, Other)
- 卡片信息: 标签、文件夹名、描述、元标签图标、进度条、目标截止日期、相关人员
- 卡片悬停操作: 编辑、下载(zip)、删除(移至回收站)
- 活跃项目摘要与类型统计 (Research: N | Development: N | Other: N)

### 项目详情 (6个标签页)
- **文档**: Markdown 编辑器 (@uiw/react-md-editor) 分栏视图, 文件夹层级导航与面包屑, 新建文件/文件夹, 多选删除, 打印/PDF导出
- **工作指导**: 手动创建工作指导 (文本 + 自定义检查清单), 阶段转换时自动生成 `docs/work_instruction_YYYY-MM-DD.md`
- **待办**: 3列看板 (待办 / 进行中 / 已完成), 复选框切换, 负责人, 截止日期, 优先级标记, 列间/列内拖拽
- **问题**: 基于线程的问题跟踪器, 状态 (Open/In Progress/Resolved/Closed), 优先级 (Low~Critical), 标签, 筛选计数, 评论增删改查, 行内编辑
- **日程**: 表格视图 + 甘特图 (CSS/SVG, 无第三方库), 里程碑菱形标记, 依赖箭头, 30色调色板类别轨道, 响应式日宽 (1W/2W/3W/1M/All), 今日标记, 逾期检测
- **设置**: 项目元数据 (类型、重要性、严重性、紧急性、协作、负责人), 时间线与进度, 子任务增删改查及拖拽排序和进度条

### 日程 / 甘特图
- 包含负责人、日期、状态、类别、依赖关系的任务增删改查
- 带有类别轨道、依赖箭头、今日标线的甘特图
- 甘特图上以菱形标记显示的里程碑
- 基于依赖关系的父任务日期自动计算
- 自动分配的30色类别调色板
- 工期计算 (包含起止日期)
- 依赖约束: 前置任务未完成时锁定状态

### 顶部摘要小组件
- 待办: 已完成/总数 + 进度条 + 待办/进行中计数
- 问题: 打开/总数 + 打开/已完成计数
- 日程: 计划中/进行中/已完成/逾期 (实时数据)

### 侧边栏面板
- **快速笔记**: 即时保存备忘至 `_notes/_temp/`, 整理到5个分类 (研究灵感/好奇心/随想/技术/个人)
- **工作执行**: 扫描未完成的工作指导, 在内嵌终端 (xterm.js + WebSocket PTY) 中启动 Claude Code, 提示中自动包含"完成时更新检查清单"
- **工作状态**: 全项目工作状态仪表盘, 各项目进度与检查清单详情

### 构想页面
- 以卡片网格展示 `1_idea_stage` 项目
- 提升至启动阶段 (弹出工作指导模态框)
- 废弃至回收站
- 创建新构想 (文件夹名 / 显示名 / 描述 / 类型)

### 全局功能
| 功能 | 描述 |
|------|------|
| 人员管理 | 联系人卡片 (姓名/机构/角色/专长/关系), 关联关系, 从相关人员自动生成 |
| 回收站 | 恢复 (至 1_idea_stage) / 永久删除 |
| 服务器控制 | start/stop/restart + 日志查看器 (5秒自动刷新) |
| 讨论时间线 | 扫描所有项目的 `_discussion.md` 文件, 按月分组, 时间顺序排列 |
| 下载 | 项目 ZIP 压缩包下载 |
| 多语言 | 韩语/英语切换 (280+ 翻译键值) |
| YAML Frontmatter | 标准化项目元数据 |
| 新建项目 | 自动创建文件夹 + docs + `_idea_note.md` |
| 安全移动 | 停止服务器 -> 移动文件夹 -> 清理残留文件 |

### UI/UX
- 基于 `next-themes` 的深色/浅色主题与4种仪表盘主题变体 (A/B/C/D)
- 应用内模态对话框 (不使用浏览器 prompt/confirm)
- 基于 `@uiw/react-markdown-preview` 的 Markdown 渲染
- 文档打印/PDF/Markdown/CSV导出
- 通过 localStorage 持久化筛选状态

## 前置要求

- **macOS** (使用 `lsof` 进行端口管理)
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

将 `project-manager-v2` 放置在磁盘任意位置 (例如 `~/Projects/3_in_development/` 内部或单独的目录)。

### 3. 运行安装

```bash
cd project-manager-v2
./setup.sh
./run.sh start
```

### 4. 自定义项目根目录 (可选)

如果您的项目位于 `~/Projects` 以外的路径:

```bash
export PROJECTS_ROOT="/path/to/my/projects"
./run.sh start
```

### 5. 自定义端口 (可选)

默认: 后端 `8002`, 前端 `3002`。如需修改:

```bash
echo "BACKEND_PORT=8010" > .run_ports
echo "FRONTEND_PORT=3010" >> .run_ports
```

如果默认端口被占用,应用会自动寻找可用端口。

## 必需的文件夹结构

应用扫描 `~/Projects/` (或 `$PROJECTS_ROOT`) 中的以下阶段文件夹:

```
~/Projects/
  1_idea_stage/           # 构想与头脑风暴
  2_initiation_stage/     # 已启动的项目 (讨论)
  3_in_development/       # 活跃开发中
  4_in_testing/           # 测试 / 分析阶段
  5_completed/            # 已完成 / 撰写阶段
  6_archived/             # 已归档 / 已提交
  7_discarded/            # 回收站
  _notes/                 # 个人笔记
  _learning/              # 学习记录
  _issues_common/         # 跨项目问题记录
```

每个项目是阶段文件夹中的一个子文件夹。项目通过拖拽或移动对话框在阶段间移动。

## 数据存储

所有应用数据存储在本地 `backend/data/` 目录中:

| 数据 | 路径 | 描述 |
|------|------|------|
| 日程 | `backend/data/schedules/*.json` | 各项目的甘特任务、里程碑、类别 |
| 待办 | `backend/data/todos/*.json` | 各项目的看板待办事项 |
| 问题 | `backend/data/issues/*.json` | 各项目的问题跟踪 |
| 子任务 | `backend/data/subtasks/*.json` | 项目子任务 |
| 用户 | `backend/data/users.json` | 登录账户 (bcrypt 加密) |
| 卡片顺序 | `backend/data/card_order.json` | 仪表盘看板卡片位置 |
| 人员 | `backend/data/people.json` | 人员目录 |

要将数据迁移到其他机器,只需复制 `backend/data/` 目录。

## 默认账户

| 用户名 | 密码 | 角色 |
|--------|------|------|
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
- **Auth**: bcrypt + 基于文件的令牌 (PyJWT)
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
│   ├── main.py                     # FastAPI 应用 + 全部端点
│   ├── services/
│   │   ├── scanner_service.py      # 项目扫描与元数据
│   │   ├── schedule_service.py     # 日程/甘特/里程碑/类别
│   │   ├── todo_service.py         # 待办看板
│   │   ├── issue_service.py        # 问题跟踪器
│   │   ├── subtask_service.py      # 项目子任务
│   │   ├── document_service.py     # 文档文件管理
│   │   ├── server_service.py       # 服务器控制 (run.sh)
│   │   ├── common_folder_service.py # 笔记/学习/问题文件夹
│   │   ├── people_service.py       # 人员目录
│   │   └── auth_service.py         # JWT 认证
│   ├── data/                       # 全部 JSON 数据 (gitignored)
│   ├── requirements.txt
│   └── venv/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/          # 主仪表盘
│   │   │   │   ├── page.tsx        # 看板 + 列表视图
│   │   │   │   ├── ideas/          # 构想管理
│   │   │   │   ├── projects/       # 项目列表 + 详情
│   │   │   │   ├── [type]/         # 笔记/学习/问题
│   │   │   │   ├── servers/        # 服务器状态
│   │   │   │   ├── people/         # 人员目录
│   │   │   │   ├── timeline/       # 时间线视图
│   │   │   │   └── trash/          # 已废弃项目
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── AppDialogs.tsx      # ConfirmDialog, PromptDialog, NewProjectDialog
│   │   │   ├── Sidebar.tsx         # 导航栏
│   │   │   ├── PageHeader.tsx      # 顶部头栏
│   │   │   ├── MoveProjectModal.tsx
│   │   │   ├── MetaTags.tsx        # 项目元标签
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
