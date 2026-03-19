# Project Manager V2

[English](README.md) | [Chinese](README_ZH.md)

> **Local-first Personal Project Hub**

Project Manager V2는 `~/Projects/` 폴더를 웹에서 통합 관리하는 로컬 퍼스트 프로젝트 매니저입니다. 데이터베이스 없이 파일시스템과 직접 동기화되어 폴더 구조가 곧 프로젝트 상태가 됩니다. 칸반 보드로 아이디어 발상부터 완료/아카이브까지 7단계 라이프사이클을 시각적으로 관리하고, 간트 차트/이슈 트래커/Todo 칸반/마크다운 문서 편집기를 프로젝트별로 제공합니다. 작업지시 시스템과 임베디드 터미널(xterm.js)을 통해 Claude Code와 직접 연동하여 AI 기반 개발 워크플로우를 지원하며, 연구(문헌검토/분석/논문작성)와 소프트웨어 개발을 하나의 인터페이스에서 처리할 수 있습니다. 한/영 다국어, 다크/라이트 테마, 원커맨드 설치를 지원하고, 모든 데이터는 로컬 JSON 파일로 저장되어 완전한 프라이버시를 보장합니다.

## 기능 상세

### 대시보드
- 7단계 프로젝트 라이프사이클 칸반 보드 (아이디어, 착수, 개발, 테스트, 완료, 아카이브, 폐기)
- 단계 간 드래그앤드롭 + 작업지시 프롬프트
- 카드/리스트 뷰 전환 + 멀티 컬럼 소팅
- 유형 필터 체크박스 (연구, 개발, 연구+개발, 기타)
- 카드 정보: 라벨, 폴더명, 설명, 메타태그 아이콘, 진행률 바, 목표종료일, 관계자
- 카드 액션 (hover): 수정, 다운로드(zip), 삭제(휴지통)
- 활성 프로젝트 요약: 유형별 카운트 (연구: N | 개발: N | 기타: N)

### 프로젝트 상세 (6탭)
- **Documents**: 마크다운 에디터(@uiw/react-md-editor) 분할 뷰, 폴더 드릴다운 + 경로 바, 새 파일/폴더 생성, 다중 선택 삭제, 인쇄/PDF 내보내기
- **Instructions**: 수동 작업지시 생성 (텍스트 + 커스텀 체크리스트), 단계 전환 시 `docs/작업지시_YYYY-MM-DD.md` 자동 생성
- **Todo**: 3컬럼 칸반 (할 일 / 진행 중 / 완료), 체크박스 토글, 담당자, 마감일, 우선순위 뱃지, 컬럼 간/내 드래그앤드롭
- **Issues**: 스레드 기반 이슈 트래커, 상태 (Open/In Progress/Resolved/Closed), 우선순위 (Low~Critical), 라벨, 필터 카운트, 댓글 CRUD, 인라인 편집
- **Schedule**: 테이블 뷰 + 간트 차트 (CSS/SVG, 라이브러리 없음), 마일스톤 다이아몬드, 의존성 화살표, 카테고리 트랙 30색 팔레트, 반응형 날짜 폭 (1W/2W/3W/1M/All), 오늘 마커, 지연 감지
- **Settings**: 프로젝트 메타데이터 (유형, 중요도, 위급도, 긴급도, 협업, 오너), 타임라인 & 진행률, 서브태스크 CRUD + 드래그 순서 + 진행률 바

### 스케줄 / 간트
- 태스크 CRUD: 담당자, 날짜, 상태, 카테고리, 의존성
- 간트 차트: 카테고리 트랙, 의존성 화살표, 오늘 라인
- 마일스톤 다이아몬드 마커
- 부모 태스크 자동 날짜 계산 (의존성 기반)
- 30색 카테고리 팔레트 + 자동 할당
- 기간 계산 (시작일/종료일 포함, inclusive)
- 의존성 강제: 선행작업 미완료 시 상태 잠금

### 헤더 요약 위젯
- Todo: done/total + 진행률 바 + todo/wip 카운트
- Issues: open/total + open/done 카운트
- Schedule: planned/in_progress/done/overdue (실시간 데이터)

### 사이드바 패널
- **Quick Note**: `_notes/_temp/`에 즉시 메모 저장, 5개 카테고리로 정리 (연구아이디어/호기심/사색/기술/개인)
- **Work Execution**: 미완료 작업지시 스캔, Claude Code 임베디드 터미널 실행 (xterm.js + WebSocket PTY), 프롬프트에 "완료 후 체크리스트 업데이트" 자동 포함
- **Work Status**: 전체 프로젝트 작업현황 대시보드, 프로젝트별 진행률 + 체크리스트 상세

### 아이디어 페이지
- `1_idea_stage` 프로젝트 카드 그리드 표시
- Initiation으로 승격 (작업지시 모달 연동)
- 휴지통으로 폐기
- 새 아이디어 생성 (폴더명 / 표시이름 / 설명 / 유형)

### 글로벌 기능
| 기능 | 설명 |
|------|------|
| People | 관계자 카드 (이름/소속/역할/전문분야/관계), 연결 관계, Related People에서 자동 생성 |
| Trash | 복원 (→ 1_idea_stage) / 영구 삭제 |
| 서버 제어 | start/stop/restart + 로그 뷰어 (5초 자동 갱신) |
| 토의록 타임라인 | 전체 프로젝트 `_토의록.md` 스캔, 월별 그룹, 날짜순 정렬 |
| 다운로드 | 프로젝트 ZIP 압축 다운로드 |
| i18n | 한/영 전환 (280+ 번역 키) |
| YAML Frontmatter | 프로젝트 메타데이터 표준 |
| 새 프로젝트 | 폴더 + docs + `_아이디어노트.md` 자동 생성 |
| 안전한 이동 | 서버 중지 → 폴더 이동 → 잔여물 정리 |

### UI/UX
- 다크/라이트 테마 (`next-themes`)
- 인앱 모달 다이얼로그 (브라우저 prompt/confirm 미사용)
- 마크다운 렌더링 (`@uiw/react-markdown-preview`)
- 문서 인쇄/PDF 내보내기
- 필터 상태 localStorage 영속화

## 사전 요구 사항

- **macOS** (`lsof` 사용)
- **Python 3.12+**
- **Node.js 18+**

## 빠른 시작

```bash
./setup.sh          # 원커맨드 설치 (venv + npm install)
./run.sh start      # 서버 시작
```

http://localhost:3002 를 열고 `admin` / `admin`으로 로그인합니다.

## 다른 머신에 설치

### 1. 프로젝트 폴더 구조 생성

```bash
mkdir -p ~/Projects/{1_idea_stage,2_initiation_stage,3_in_development,4_in_testing,5_completed,6_archived,7_discarded,_notes,_learning,_issues_common}
```

### 2. 앱 복사

`project-manager-v2`를 디스크 어디에든 배치합니다 (예: `~/Projects/3_in_development/` 내부).

### 3. 설치 실행

```bash
cd project-manager-v2
./setup.sh
./run.sh start
```

### 4. 프로젝트 루트 변경 (선택)

프로젝트가 `~/Projects` 외 다른 경로에 있을 경우:

```bash
export PROJECTS_ROOT="/path/to/my/projects"
./run.sh start
```

### 5. 포트 변경 (선택)

기본값: 백엔드 `8002`, 프론트엔드 `3002`. 변경하려면:

```bash
echo "BACKEND_PORT=8010" > .run_ports
echo "FRONTEND_PORT=3010" >> .run_ports
```

기본 포트가 사용 중이면 자동으로 빈 포트를 찾습니다.

## 필수 폴더 구조

앱은 `~/Projects/` (또는 `$PROJECTS_ROOT`)에서 다음 단계 폴더를 스캔합니다:

```
~/Projects/
  1_idea_stage/           # 아이디어 및 브레인스토밍
  2_initiation_stage/     # 착수된 프로젝트 (토의)
  3_in_development/       # 활성 개발
  4_in_testing/           # 테스트 / 분석 단계
  5_completed/            # 완료 / 작성 단계
  6_archived/             # 아카이브 / 제출 완료
  7_discarded/            # 휴지통
  _notes/                 # 개인 노트
  _learning/              # 학습 로그
  _issues_common/         # 프로젝트 간 공통 이슈
```

각 프로젝트는 단계 폴더 내 하위 폴더입니다. 드래그앤드롭 또는 이동 다이얼로그로 단계 간 이동합니다.

## 데이터 저장

모든 앱 데이터는 `backend/data/`에 로컬 저장됩니다:

| 데이터 | 경로 | 설명 |
|--------|------|------|
| 스케줄 | `backend/data/schedules/*.json` | 프로젝트별 간트 태스크, 마일스톤, 카테고리 |
| Todo | `backend/data/todos/*.json` | 프로젝트별 칸반 할일 |
| 이슈 | `backend/data/issues/*.json` | 프로젝트별 이슈 트래커 |
| 서브태스크 | `backend/data/subtasks/*.json` | 프로젝트 서브태스크 |
| 사용자 | `backend/data/users.json` | 로그인 계정 (bcrypt 해시) |
| 카드 순서 | `backend/data/card_order.json` | 대시보드 칸반 카드 위치 |
| People | `backend/data/people.json` | 관계자 디렉토리 |

다른 머신으로 마이그레이션하려면 `backend/data/` 디렉토리를 복사합니다.

## 기본 계정

| 사용자명 | 비밀번호 | 역할 |
|----------|----------|------|
| admin | admin | ADMIN |
| guest | guest | GUEST |

## 명령어

```bash
./run.sh start      # 백엔드 + 프론트엔드 시작
./run.sh stop       # 모든 서버 중지
./run.sh restart    # 양쪽 서버 재시작
./run.sh status     # 서버 상태 확인
./run.sh live       # 시작 + 실시간 로그 스트리밍
```

## 기술 스택

- **Backend**: Python 3.12 / FastAPI / JSON 파일 저장
- **Frontend**: Next.js 15 (App Router) / React 19 / TailwindCSS / TypeScript
- **Auth**: bcrypt + 파일 기반 토큰 (PyJWT)
- **Editor**: @uiw/react-md-editor
- **Markdown**: @uiw/react-markdown-preview
- **Terminal**: @xterm/xterm + WebSocket PTY
- **Icons**: Lucide React
- **Notifications**: react-hot-toast
- **Metadata**: YAML frontmatter (pyyaml)

## 아키텍처

```
project-manager-v2/
├── backend/
│   ├── main.py                     # FastAPI 앱 + 전체 엔드포인트
│   ├── services/
│   │   ├── scanner_service.py      # 프로젝트 스캔 및 메타데이터
│   │   ├── schedule_service.py     # 스케줄/간트/마일스톤/카테고리
│   │   ├── todo_service.py         # Todo 칸반
│   │   ├── issue_service.py        # 이슈 트래커
│   │   ├── subtask_service.py      # 프로젝트 서브태스크
│   │   ├── document_service.py     # 문서 파일 관리
│   │   ├── server_service.py       # 서버 제어 (run.sh)
│   │   ├── common_folder_service.py # 노트/학습/이슈 폴더
│   │   ├── people_service.py       # 관계자 디렉토리
│   │   └── auth_service.py         # JWT 인증
│   ├── data/                       # 전체 JSON 데이터 (gitignored)
│   ├── requirements.txt
│   └── venv/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/          # 메인 대시보드
│   │   │   │   ├── page.tsx        # 칸반 + 리스트 뷰
│   │   │   │   ├── ideas/          # 아이디어 관리
│   │   │   │   ├── projects/       # 프로젝트 리스트 + 상세
│   │   │   │   ├── [type]/         # 노트/학습/이슈
│   │   │   │   ├── servers/        # 서버 상태
│   │   │   │   ├── people/         # 관계자 디렉토리
│   │   │   │   ├── timeline/       # 타임라인 뷰
│   │   │   │   └── trash/          # 폐기 프로젝트
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── AppDialogs.tsx      # ConfirmDialog, PromptDialog, NewProjectDialog
│   │   │   ├── Sidebar.tsx         # 네비게이션
│   │   │   ├── PageHeader.tsx      # 상단 헤더
│   │   │   ├── MoveProjectModal.tsx
│   │   │   ├── MetaTags.tsx        # 프로젝트 메타 뱃지
│   │   │   ├── ProgressBar.tsx     # 서브태스크 진행률
│   │   │   └── ...
│   │   └── lib/
│   │       ├── api.ts              # 인증 포함 API 클라이언트
│   │       ├── stages.ts           # 단계 설정
│   │       ├── i18n.tsx            # 국제화
│   │       └── useAuth.ts          # 인증 훅
│   ├── package.json
│   └── next.config.ts
├── docs/
├── run.sh                          # 시작/중지/재시작/실시간 로그
├── setup.sh                        # 원커맨드 설치
├── CHANGELOG.md
└── .gitignore
```

## 라이선스

Copyright (c) chadchae
