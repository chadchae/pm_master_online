// API helper with auth token management

const API_BASE = "";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pm_token");
}

export function setToken(token: string): void {
  localStorage.setItem("pm_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("pm_token");
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || `API Error: ${res.status}`);
  }

  return res.json();
}

export async function apiFetchBlob(path: string): Promise<ArrayBuffer> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  return res.arrayBuffer();
}

export async function verifyAuth(): Promise<boolean> {
  try {
    const data = await apiFetch<{ valid: boolean }>("/api/auth/verify");
    return data.valid;
  } catch {
    return false;
  }
}

// Types
export interface ProjectMetadata {
  작성일?: string;
  상태?: string;
  유형?: string;
  포트?: number;
  description?: string;
  label?: string;    // Full display name (folder name = short title)
  중요도?: string;   // 1-5 (stars)
  위급도?: string;   // low / medium / high / critical
  긴급도?: string;   // low / medium / high / urgent
  협업?: string;     // personal / collaboration
  주도?: string;     // lead / member
  오너?: string;     // project owner name
  목표종료일?: string;  // target end date
  실제종료일?: string;  // actual end date
  subtasks_total?: string;
  subtasks_done?: string;
  related_people?: string;  // Comma-separated names
}

export interface Project {
  name: string;
  stage: string;
  path: string;
  metadata: ProjectMetadata;
  last_modified: string;
  has_docs: boolean;
  doc_count: number;
}

export interface FileItem {
  filename: string;
  size: number;
  modified: string;
  is_directory?: boolean;
  is_folder?: boolean;
}

export interface ServerStatus {
  project_name: string;
  label: string;
  description: string;
  path: string;
  stage: string;
  backend_port: number | null;
  frontend_port: number | null;
  backend_alive: boolean;
  frontend_alive: boolean;
  backend_pid: string | null;
  frontend_pid: string | null;
  has_run_sh: boolean;
  port: number;
  status: string;
  pid: number | null;
}
