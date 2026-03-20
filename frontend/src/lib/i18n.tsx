"use client";

import { useState, useEffect, useCallback } from "react";

// Supported locales
export type Locale = "ko" | "en";

const STORAGE_KEY = "pm_locale";
const DEFAULT_LOCALE: Locale = "ko";

// Translation dictionary
const translations: Record<Locale, Record<string, string>> = {
  ko: {
    // Sidebar menu items
    "sidebar.dashboard": "대시보드",
    "sidebar.ideas": "아이디어",
    "sidebar.projects": "프로젝트",
    "sidebar.documents": "문서",
    "sidebar.notes": "노트",
    "sidebar.learning": "학습",
    "sidebar.issues": "이슈",
    "sidebar.issueDocs": "이슈문서",
    "sidebar.guidelines": "가이드라인",
    "sidebar.timeline": "타임라인",
    "sidebar.servers": "서버",
    "sidebar.people": "사람",
    "sidebar.trash": "휴지통",
    "sidebar.execute": "실행",
    "sidebar.status": "현황",
    "sidebar.quickNote": "빠른 메모",
    "sidebar.settings": "설정",
    "sidebar.collapse": "접기",

    // Common actions
    "action.save": "저장",
    "action.cancel": "취소",
    "action.delete": "삭제",
    "action.edit": "수정",
    "action.create": "생성",
    "action.download": "다운로드",
    "action.new": "새로 만들기",
    "action.search": "검색",
    "action.close": "닫기",
    "action.confirm": "확인",
    "action.refresh": "새로고침",
    "action.restore": "복원",
    "action.move": "이동",
    "action.launch": "실행",
    "action.select": "선택",
    "action.all": "전체",
    "action.none": "선택해제",

    // Dashboard
    "dashboard.ideas": "아이디어",
    "dashboard.activeProjects": "활성 프로젝트",
    "dashboard.activeServers": "활성 서버",
    "dashboard.byStage": "단계별",
    "dashboard.projectBoard": "프로젝트 보드",
    "dashboard.kanban": "칸반",
    "dashboard.list": "리스트",
    "dashboard.noProjects": "프로젝트 없음",
    "dashboard.project": "프로젝트",
    "dashboard.stage": "단계",
    "dashboard.type": "유형",
    "dashboard.tags": "태그",
    "dashboard.progress": "진행률",
    "dashboard.created": "생성일",

    // Project detail
    "project.documents": "문서",
    "project.instructions": "작업지시",
    "project.todo": "할일",
    "project.settings": "설정",
    "project.projectInfo": "프로젝트 정보",
    "project.tagsPriority": "태그 & 우선순위",
    "project.timelineProgress": "타임라인 & 진행률",
    "project.importance": "중요도",
    "project.severity": "위급도",
    "project.urgency": "긴급도",
    "project.collaboration": "협업",
    "project.personal": "개인",
    "project.myRole": "내 역할",
    "project.lead": "주도",
    "project.member": "참여",
    "project.projectOwner": "프로젝트 오너",
    "project.targetEndDate": "목표 종료일",
    "project.actualEndDate": "실제 종료일",
    "project.today": "오늘",
    "project.subtasksTotal": "전체 하위 작업",
    "project.subtasksDone": "완료된 작업",
    "project.displayName": "표시 이름",
    "project.clickToRename": "클릭하여 이름 변경",
    "project.clickToAddDesc": "클릭하여 설명 추가",
    "project.relatedPeople": "관계자",
    "project.saveTags": "태그 저장",
    "project.newWorkInstruction": "새 작업지시",
    "project.instruction": "지시사항",
    "project.checklist": "체크리스트",
    "project.checklistHint": "체크리스트 (한 줄에 하나, 빈칸은 기본값)",
    "project.createInstruction": "작업지시 생성",
    "project.noDocuments": "문서 없음",
    "project.selectFileOrCreate": "파일을 선택하거나 새로 만드세요",
    "project.newDocument": "새 문서",
    "project.notFound": "프로젝트를 찾을 수 없습니다",

    // Todo
    "todo.title": "할일",
    "todo.todo": "할 일",
    "todo.inProgress": "진행 중",
    "todo.done": "완료",
    "todo.addTask": "작업 추가",
    "todo.taskTitle": "작업 제목",
    "todo.description": "설명",
    "todo.priority": "우선순위",
    "todo.low": "낮음",
    "todo.medium": "보통",
    "todo.high": "높음",
    "todo.noTasks": "작업 없음",
    "todo.assignee": "담당자",
    "todo.dueDate": "마감일",

    // Issues
    "project.issues": "이슈",
    "issues.title": "이슈",
    "issues.newIssue": "새 이슈",
    "issues.all": "전체",
    "issues.open": "열림",
    "issues.inProgress": "진행 중",
    "issues.resolved": "해결됨",
    "issues.closed": "닫힘",
    "issues.addComment": "댓글 추가",
    "issues.resolve": "해결",
    "issues.noIssues": "이슈 없음",
    "issues.labels": "라벨",
    "issues.comments": "댓글",
    "issues.description": "설명",
    "issues.priority": "우선순위",
    "issues.assignee": "담당자",
    "issues.status": "상태",

    // Schedule
    "project.schedule": "스케줄",
    "schedule.title": "스케줄",
    "schedule.table": "테이블",
    "schedule.gantt": "간트",
    "schedule.addTask": "작업 추가",
    "schedule.addMilestone": "마일스톤 추가",
    "schedule.taskTitle": "작업명",
    "schedule.startDate": "시작일",
    "schedule.endDate": "종료일",
    "schedule.duration": "기간",
    "schedule.assignee": "담당자",
    "schedule.status": "상태",
    "schedule.progress": "진행률",
    "schedule.dependencies": "선행작업",
    "schedule.planned": "계획",
    "schedule.inProgress": "진행 중",
    "schedule.done": "완료",
    "schedule.overdue": "지연",
    "schedule.milestone": "마일스톤",
    "schedule.noTasks": "스케줄 없음",
    "schedule.today": "오늘",
    "schedule.parentTask": "상위 작업",
    "schedule.description": "설명",
    "schedule.days": "일",
    "schedule.category": "카테고리",
    "schedule.newCategory": "새 카테고리",
    "schedule.general": "일반",
    "schedule.predecessorRequired": "선행작업 완료 필요",
    "schedule.1w": "1주",
    "schedule.2w": "2주",
    "schedule.3w": "3주",
    "schedule.1m": "1개월",
    "schedule.all": "전체",

    // Subtasks
    "subtask.subtasks": "하위 작업",
    "subtask.addSubtask": "하위 작업 추가",
    "subtask.pending": "대기",
    "subtask.done": "완료",
    "subtask.cancelled": "취소",
    "subtask.title": "작업명",
    "subtask.description": "설명",
    "subtask.deleteConfirm": "이 하위 작업을 삭제하시겠습니까?",
    "subtask.noSubtasks": "하위 작업 없음",

    // Ideas page
    "ideas.inPipeline": "아이디어 파이프라인",
    "ideas.search": "아이디어 검색",
    "ideas.promoteToInitiation": "초기화 단계로 승격",
    "ideas.discard": "폐기",
    "ideas.noIdeas": "아이디어 없음",
    "ideas.noMatching": "일치하는 아이디어 없음",
    "ideas.newIdea": "새 아이디어",
    "ideas.folderName": "폴더명 (영문, 하이픈)",
    "ideas.displayName": "표시 이름",
    "ideas.description": "설명",
    "ideas.type": "유형",
    "projects.newProject": "새 프로젝트",
    "files.newFolder": "새 폴더",
    "files.newFile": "새 파일",
    "files.folderOrFile": "폴더 / 파일",

    // Work panels
    "work.execution": "작업 실행",
    "work.status": "작업 현황",
    "work.quickNotes": "빠른 메모",
    "work.pending": "대기중",
    "work.launchClaudeCode": "Claude Code 실행",
    "work.noPendingInstructions": "대기 중인 작업지시 없음",
    "work.overallProgress": "전체 진행률",
    "work.projects": "프로젝트",
    "work.total": "전체",
    "work.done": "완료",
    "work.pendingLabel": "대기",
    "work.noActiveInstructions": "활성 작업지시 없음",
    "work.withPendingInstructions": "개 프로젝트 대기 중",
    "work.withActiveInstructions": "개 프로젝트 활성 지시",

    // Quick notes
    "quicknote.title": "빠른 메모",
    "quicknote.newNote": "새 메모",
    "quicknote.titlePlaceholder": "제목...",
    "quicknote.contentPlaceholder": "메모 내용...",
    "quicknote.noNotes": "빠른 메모 없음",
    "quicknote.createOne": "새로 만들기",
    "quicknote.moveToNotes": "노트로 이동",
    "quicknote.noteCount": "개 메모",

    // People page
    "people.addPerson": "관계자 추가",
    "people.searchPeople": "관계자 검색",
    "people.name": "이름",
    "people.koreanName": "한국어 이름",
    "people.role": "역할",
    "people.affiliation": "소속",
    "people.email": "이메일",
    "people.relationship": "관계",
    "people.expertise": "전문분야",
    "people.notes": "메모",
    "people.connectedPeople": "연관 인물",
    "people.deleteConfirm": "삭제하시겠습니까?",
    "people.person": "명",
    "people.people": "명",
    "people.noPeople": "등록된 관계자가 없습니다. 추가해보세요.",
    "people.noMatch": "검색결과가 없습니다.",
    "people.expertiseHint": "전문분야 (쉼표로 구분)",
    "people.fullName": "전체 이름",
    "people.koreanNameOptional": "한국어 이름 (선택)",

    // Trash page
    "trash.empty": "휴지통이 비어있습니다",
    "trash.permanent": "영구 삭제!",
    "trash.discardedItems": "폐기된 항목",
    "trash.restoredTo": "아이디어로 복원됨",

    // File operations
    "file.newFile": "새 파일",
    "file.selectToView": "파일을 선택하세요",
    "file.searchFiles": "파일 검색",
    "file.noFiles": "파일 없음",
    "file.noMatches": "일치 없음",
    "file.files": "파일",

    // Toasts/alerts
    "toast.failedToLoad": "로드 실패",
    "toast.saved": "저장됨",
    "toast.deleted": "삭제됨",
    "toast.failedToSave": "저장 실패",
    "toast.failedToDelete": "삭제 실패",
    "toast.descriptionUpdated": "설명 업데이트됨",
    "toast.nameUpdated": "이름 업데이트됨",
    "toast.metadataSaved": "메타데이터 저장됨",
    "toast.personAdded": "관계자 추가됨",
    "toast.personUpdated": "관계자 수정됨",
    "toast.personDeleted": "관계자 삭제됨",
    "toast.movedTo": "이동됨",
    "toast.sessionEnded": "세션 종료",
    "toast.wrongPassword": "잘못된 비밀번호",
    "toast.passwordChanged": "비밀번호 변경됨",
    "toast.noteCreated": "메모 생성됨",
    "toast.failedToCreate": "생성 실패",
    "toast.failedToMove": "이동 실패",
    "toast.failedToRestore": "복원 실패",
    "toast.failedToPromote": "승격 실패",
    "toast.failedToDiscard": "폐기 실패",
    "toast.failedToLoadData": "데이터 로드 실패",
    "toast.failedToLoadIdeas": "아이디어 로드 실패",
    "toast.failedToLoadTrash": "휴지통 로드 실패",
    "toast.failedToLoadPeople": "관계자 로드 실패",
    "toast.failedToLoadProject": "프로젝트 로드 실패",
    "toast.failedToLoadDocument": "문서 로드 실패",
    "toast.failedToSaveDocument": "문서 저장 실패",
    "toast.failedToMarkDone": "완료 처리 실패",
    "toast.failedToChangePassword": "비밀번호 변경 실패",
    "toast.searchFailed": "검색 실패",
    "toast.nameRequired": "이름은 필수입니다",
    "toast.failedToCreatePerson": "관계자 생성 실패",
    "toast.failedToUpdatePerson": "관계자 수정 실패",
    "toast.failedToDeletePerson": "관계자 삭제 실패",
    "toast.promotedTo": "승격됨",
    "toast.discarded": "폐기됨",
    "toast.restoredToIdeas": "아이디어로 복원됨",
    "toast.permanentlyDeleted": "영구 삭제됨",
    "toast.documentSaved": "문서 저장됨",
    "toast.passwordsDoNotMatch": "새 비밀번호가 일치하지 않습니다",
    "toast.passwordTooShort": "비밀번호는 4자 이상이어야 합니다",
    "toast.created": "생성됨",
    "toast.failedToCreateFile": "파일 생성 실패",
    "toast.failedToLoadFile": "파일 로드 실패",

    // Auth
    "auth.password": "비밀번호",
    "auth.enterPassword": "비밀번호 입력",
    "auth.enter": "입력",
    "auth.logout": "로그아웃",
    "auth.localDashboard": "로컬 개발 대시보드",
    "auth.currentPassword": "현재 비밀번호",
    "auth.newPassword": "새 비밀번호",
    "auth.confirmPassword": "비밀번호 확인",
    "auth.changePassword": "비밀번호 변경",
    "auth.change": "변경",

    // Timeline
    "timeline.title": "토의록 타임라인",
    "timeline.noDiscussions": "토의록 없음",

    // Servers
    "servers.autoRefresh": "10초마다 자동 새로고침",
    "servers.project": "프로젝트",
    "servers.port": "포트",
    "servers.status": "상태",
    "servers.actions": "작업",
    "servers.running": "실행 중",
    "servers.stopped": "정지",
    "servers.start": "시작",
    "servers.stop": "정지",
    "servers.restart": "재시작",
    "servers.noServers": "설정된 서버 없음",
    "server.logs": "로그",
    "server.viewLogs": "로그 보기",
    "server.noLogs": "로그 없음",

    // Move project modal
    "move.moveProject": "프로젝트 이동",
    "move.workInstruction": "작업지시 (선택)",
    "move.whatNeedsToBeDone": "이 단계에서 무엇을 해야 하나요?",

    // Page header breadcrumbs
    "breadcrumb.dashboard": "대시보드",
    "breadcrumb.ideas": "아이디어",
    "breadcrumb.projects": "프로젝트",
    "breadcrumb.documents": "문서",
    "breadcrumb.notes": "노트",
    "breadcrumb.learning": "학습",
    "breadcrumb.issues": "이슈",
    "breadcrumb.issueDocs": "이슈문서",
    "breadcrumb.issue-docs": "이슈문서",
    "breadcrumb.guidelines": "가이드라인",
    "breadcrumb.timeline": "타임라인",
    "breadcrumb.servers": "서버",
    "breadcrumb.people": "관계자",
    "breadcrumb.trash": "휴지통",
  },
  en: {
    // Sidebar menu items
    "sidebar.dashboard": "Dashboard",
    "sidebar.ideas": "Ideas",
    "sidebar.projects": "Projects",
    "sidebar.documents": "Documents",
    "sidebar.notes": "Notes",
    "sidebar.learning": "Learning",
    "sidebar.issues": "Issues",
    "sidebar.issueDocs": "Issue Docs",
    "sidebar.guidelines": "Guidelines",
    "sidebar.timeline": "Timeline",
    "sidebar.servers": "Servers",
    "sidebar.people": "People",
    "sidebar.trash": "Trash",
    "sidebar.execute": "Execute",
    "sidebar.status": "Status",
    "sidebar.quickNote": "Quick Note",
    "sidebar.settings": "Settings",
    "sidebar.collapse": "Collapse",

    // Common actions
    "action.save": "Save",
    "action.cancel": "Cancel",
    "action.delete": "Delete",
    "action.edit": "Edit",
    "action.create": "Create",
    "action.download": "Download",
    "action.new": "New",
    "action.search": "Search",
    "action.close": "Close",
    "action.confirm": "Confirm",
    "action.refresh": "Refresh",
    "action.restore": "Restore",
    "action.move": "Move",
    "action.launch": "Launch",
    "action.select": "Select",
    "action.all": "All",
    "action.none": "None",

    // Dashboard
    "dashboard.ideas": "Ideas",
    "dashboard.activeProjects": "Active Projects",
    "dashboard.activeServers": "Active Servers",
    "dashboard.byStage": "By Stage",
    "dashboard.projectBoard": "Project Board",
    "dashboard.kanban": "Kanban",
    "dashboard.list": "List",
    "dashboard.noProjects": "No projects",
    "dashboard.project": "Project",
    "dashboard.stage": "Stage",
    "dashboard.type": "Type",
    "dashboard.tags": "Tags",
    "dashboard.progress": "Progress",
    "dashboard.created": "Created",

    // Project detail
    "project.documents": "Documents",
    "project.instructions": "Instructions",
    "project.todo": "Todo",
    "project.settings": "Settings",
    "project.projectInfo": "Project Information",
    "project.tagsPriority": "Tags & Priority",
    "project.timelineProgress": "Timeline & Progress",
    "project.importance": "Importance",
    "project.severity": "Severity",
    "project.urgency": "Urgency",
    "project.collaboration": "Collaboration",
    "project.personal": "Personal",
    "project.myRole": "My Role",
    "project.lead": "Lead",
    "project.member": "Member",
    "project.projectOwner": "Project Owner",
    "project.targetEndDate": "Target End Date",
    "project.actualEndDate": "Actual End Date",
    "project.today": "Today",
    "project.subtasksTotal": "Subtasks Total",
    "project.subtasksDone": "Subtasks Done",
    "project.displayName": "Display Name",
    "project.clickToRename": "Click to rename",
    "project.clickToAddDesc": "Click to add description",
    "project.relatedPeople": "Related People",
    "project.saveTags": "Save Tags",
    "project.newWorkInstruction": "New Work Instruction",
    "project.instruction": "Instruction",
    "project.checklist": "Checklist",
    "project.checklistHint": "Checklist (one per line, leave empty for default)",
    "project.createInstruction": "Create Instruction",
    "project.noDocuments": "No documents",
    "project.selectFileOrCreate": "Select a file or create a new one",
    "project.newDocument": "New Document",
    "project.notFound": "Project not found",

    // Todo
    "todo.title": "Todo",
    "todo.todo": "To Do",
    "todo.inProgress": "In Progress",
    "todo.done": "Done",
    "todo.addTask": "Add Task",
    "todo.taskTitle": "Task title",
    "todo.description": "Description",
    "todo.priority": "Priority",
    "todo.low": "Low",
    "todo.medium": "Medium",
    "todo.high": "High",
    "todo.noTasks": "No tasks",
    "todo.assignee": "Assignee",
    "todo.dueDate": "Due date",

    // Issues
    "project.issues": "Issues",
    "issues.title": "Issues",
    "issues.newIssue": "New Issue",
    "issues.all": "All",
    "issues.open": "Open",
    "issues.inProgress": "In Progress",
    "issues.resolved": "Resolved",
    "issues.closed": "Closed",
    "issues.addComment": "Add Comment",
    "issues.resolve": "Resolve",
    "issues.noIssues": "No issues",
    "issues.labels": "Labels",
    "issues.comments": "Comments",
    "issues.description": "Description",
    "issues.priority": "Priority",
    "issues.assignee": "Assignee",
    "issues.status": "Status",

    // Schedule
    "project.schedule": "Schedule",
    "schedule.title": "Schedule",
    "schedule.table": "Table",
    "schedule.gantt": "Gantt",
    "schedule.addTask": "Add Task",
    "schedule.addMilestone": "Add Milestone",
    "schedule.taskTitle": "Task Name",
    "schedule.startDate": "Start Date",
    "schedule.endDate": "End Date",
    "schedule.duration": "Duration",
    "schedule.assignee": "Assignee",
    "schedule.status": "Status",
    "schedule.progress": "Progress",
    "schedule.dependencies": "Dependencies",
    "schedule.planned": "Planned",
    "schedule.inProgress": "In Progress",
    "schedule.done": "Done",
    "schedule.overdue": "Overdue",
    "schedule.milestone": "Milestone",
    "schedule.noTasks": "No schedule",
    "schedule.today": "Today",
    "schedule.parentTask": "Parent Task",
    "schedule.description": "Description",
    "schedule.days": "days",
    "schedule.category": "Category",
    "schedule.newCategory": "New Category",
    "schedule.general": "General",
    "schedule.predecessorRequired": "Predecessor tasks must be completed",
    "schedule.1w": "1W",
    "schedule.2w": "2W",
    "schedule.3w": "3W",
    "schedule.1m": "1M",
    "schedule.all": "All",

    // Subtasks
    "subtask.subtasks": "Subtasks",
    "subtask.addSubtask": "Add Subtask",
    "subtask.pending": "Pending",
    "subtask.done": "Done",
    "subtask.cancelled": "Cancelled",
    "subtask.title": "Title",
    "subtask.description": "Description",
    "subtask.deleteConfirm": "Delete this subtask?",
    "subtask.noSubtasks": "No subtasks",

    // Ideas page
    "ideas.inPipeline": "ideas in pipeline",
    "ideas.search": "Search ideas...",
    "ideas.promoteToInitiation": "Promote to Initiation",
    "ideas.discard": "Discard",
    "ideas.noIdeas": "No ideas yet",
    "ideas.noMatching": "No matching ideas",
    "ideas.newIdea": "New Idea",
    "ideas.folderName": "Folder name (lowercase, hyphens)",
    "ideas.displayName": "Display name",
    "ideas.description": "Description",
    "ideas.type": "Type",
    "projects.newProject": "New Project",
    "files.newFolder": "New Folder",
    "files.newFile": "New File",
    "files.folderOrFile": "Folder / File",

    // Work panels
    "work.execution": "Work Execution",
    "work.status": "Work Status",
    "work.quickNotes": "Quick Notes",
    "work.pending": "pending",
    "work.launchClaudeCode": "Launch Claude Code",
    "work.noPendingInstructions": "No pending work instructions",
    "work.overallProgress": "Overall Progress",
    "work.projects": "Projects",
    "work.total": "Total",
    "work.done": "Done",
    "work.pendingLabel": "Pending",
    "work.noActiveInstructions": "No active work instructions",
    "work.withPendingInstructions": "project(s) with pending instructions",
    "work.withActiveInstructions": "project(s) with active instructions",

    // Quick notes
    "quicknote.title": "Quick Notes",
    "quicknote.newNote": "New note",
    "quicknote.titlePlaceholder": "Title...",
    "quicknote.contentPlaceholder": "Write your note...",
    "quicknote.noNotes": "No quick notes",
    "quicknote.createOne": "Create one",
    "quicknote.moveToNotes": "Move to notes",
    "quicknote.noteCount": "note(s)",

    // People page
    "people.addPerson": "Add Person",
    "people.searchPeople": "Search people...",
    "people.name": "Name",
    "people.koreanName": "Korean Name",
    "people.role": "Role",
    "people.affiliation": "Affiliation",
    "people.email": "Email",
    "people.relationship": "Relationship",
    "people.expertise": "Expertise",
    "people.notes": "Notes",
    "people.connectedPeople": "Connected People",
    "people.deleteConfirm": "Delete?",
    "people.person": "person",
    "people.people": "people",
    "people.noPeople": "No people yet. Add someone to get started.",
    "people.noMatch": "No people found matching your search.",
    "people.expertiseHint": "Expertise (comma-separated)",
    "people.fullName": "Full name",
    "people.koreanNameOptional": "Korean name (optional)",

    // Trash page
    "trash.empty": "Trash is empty",
    "trash.permanent": "Permanent!",
    "trash.discardedItems": "discarded items",
    "trash.restoredTo": "restored to Ideas",

    // File operations
    "file.newFile": "New File",
    "file.selectToView": "Select a file to view",
    "file.searchFiles": "Search files...",
    "file.noFiles": "No files",
    "file.noMatches": "No matches",
    "file.files": "files",

    // Toasts/alerts
    "toast.failedToLoad": "Failed to load",
    "toast.saved": "Saved",
    "toast.deleted": "Deleted",
    "toast.failedToSave": "Failed to save",
    "toast.failedToDelete": "Failed to delete",
    "toast.descriptionUpdated": "Description updated",
    "toast.nameUpdated": "Name updated",
    "toast.metadataSaved": "Metadata saved",
    "toast.personAdded": "Person added",
    "toast.personUpdated": "Person updated",
    "toast.personDeleted": "Person deleted",
    "toast.movedTo": "Moved to",
    "toast.sessionEnded": "session ended",
    "toast.wrongPassword": "Wrong password",
    "toast.passwordChanged": "Password changed",
    "toast.noteCreated": "Note created",
    "toast.failedToCreate": "Failed to create",
    "toast.failedToMove": "Failed to move",
    "toast.failedToRestore": "Failed to restore",
    "toast.failedToPromote": "Failed to promote",
    "toast.failedToDiscard": "Failed to discard",
    "toast.failedToLoadData": "Failed to load data",
    "toast.failedToLoadIdeas": "Failed to load ideas",
    "toast.failedToLoadTrash": "Failed to load trash",
    "toast.failedToLoadPeople": "Failed to load people",
    "toast.failedToLoadProject": "Failed to load project",
    "toast.failedToLoadDocument": "Failed to load document",
    "toast.failedToSaveDocument": "Failed to save document",
    "toast.failedToMarkDone": "Failed to mark done",
    "toast.failedToChangePassword": "Failed to change password",
    "toast.searchFailed": "Search failed",
    "toast.nameRequired": "Name is required",
    "toast.failedToCreatePerson": "Failed to create person",
    "toast.failedToUpdatePerson": "Failed to update person",
    "toast.failedToDeletePerson": "Failed to delete person",
    "toast.promotedTo": "promoted to",
    "toast.discarded": "discarded",
    "toast.restoredToIdeas": "restored to Ideas",
    "toast.permanentlyDeleted": "permanently deleted",
    "toast.documentSaved": "Document saved",
    "toast.passwordsDoNotMatch": "New passwords do not match",
    "toast.passwordTooShort": "Password must be at least 4 characters",
    "toast.created": "Created",
    "toast.failedToCreateFile": "Failed to create file",
    "toast.failedToLoadFile": "Failed to load file",

    // Auth
    "auth.password": "Password",
    "auth.enterPassword": "Enter password",
    "auth.enter": "Enter",
    "auth.logout": "Logout",
    "auth.localDashboard": "Local development dashboard",
    "auth.currentPassword": "Current Password",
    "auth.newPassword": "New Password",
    "auth.confirmPassword": "Confirm Password",
    "auth.changePassword": "Change Password",
    "auth.change": "Change",

    // Timeline
    "timeline.title": "Discussion Timeline",
    "timeline.noDiscussions": "No discussions",

    // Servers
    "servers.autoRefresh": "Auto-refreshes every 10 seconds",
    "servers.project": "Project",
    "servers.port": "Port",
    "servers.status": "Status",
    "servers.actions": "Actions",
    "servers.running": "Running",
    "servers.stopped": "Stopped",
    "servers.start": "Start",
    "servers.stop": "Stop",
    "servers.restart": "Restart",
    "servers.noServers": "No servers configured",
    "server.logs": "Logs",
    "server.viewLogs": "View Logs",
    "server.noLogs": "No logs",

    // Move project modal
    "move.moveProject": "Move Project",
    "move.workInstruction": "Work Instruction (optional)",
    "move.whatNeedsToBeDone": "What needs to be done in this new stage?",

    // Page header breadcrumbs
    "breadcrumb.dashboard": "Dashboard",
    "breadcrumb.ideas": "Ideas",
    "breadcrumb.projects": "Projects",
    "breadcrumb.documents": "Documents",
    "breadcrumb.notes": "Notes",
    "breadcrumb.learning": "Learning",
    "breadcrumb.issues": "Issues",
    "breadcrumb.issueDocs": "Issue Docs",
    "breadcrumb.issue-docs": "Issue Docs",
    "breadcrumb.guidelines": "Guidelines",
    "breadcrumb.timeline": "Timeline",
    "breadcrumb.servers": "Servers",
    "breadcrumb.people": "People",
    "breadcrumb.trash": "Trash",
  },
};

// Event emitter for locale changes
let listeners: Array<() => void> = [];
let currentLocale: Locale | null = null;

function getLocale(): Locale {
  if (currentLocale) return currentLocale;
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "ko" || stored === "en") {
      currentLocale = stored;
      return stored;
    }
  }
  currentLocale = DEFAULT_LOCALE;
  return DEFAULT_LOCALE;
}

function setLocale(locale: Locale): void {
  currentLocale = locale;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, locale);
  }
  listeners.forEach((fn) => fn());
}

function translate(key: string): string {
  const locale = getLocale();
  return translations[locale][key] || translations["en"][key] || key;
}

// Hook: useLocale
export function useLocale(): {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
} {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handler = () => forceUpdate((n) => n + 1);
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((fn) => fn !== handler);
    };
  }, []);

  const t = useCallback((key: string): string => {
    return translate(key);
  }, []);

  return {
    locale: getLocale(),
    setLocale,
    t,
  };
}

// LocaleToggle component
export function LocaleToggle() {
  const { locale, setLocale: setLoc } = useLocale();

  return (
    <button
      onClick={() => setLoc(locale === "ko" ? "en" : "ko")}
      className="flex items-center justify-center px-2 py-1 text-xs font-medium rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      title={locale === "ko" ? "Switch to English" : "한국어로 전환"}
    >
      {locale === "ko" ? "한/EN" : "EN/한"}
    </button>
  );
}
