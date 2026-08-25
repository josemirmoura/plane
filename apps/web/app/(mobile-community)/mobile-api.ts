import { API_BASE_URL } from "@plane/constants";
import { APIService } from "@/services/api.service";
import { CycleService } from "@/services/cycle.service";
import { IssueCommentService, IssueService } from "@/services/issue";
import { ModuleService } from "@/services/module.service";
import { ProjectPageService } from "@/services/page";
import { ProjectService } from "@/services/project";
import { UserService } from "@/services/user.service";
import { WorkspaceService } from "@/services/workspace.service";

export type MobileRecord = Record<string, any>;

class MobileCommunityService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async notifications(workspaceSlug: string): Promise<any> {
    return this.get(`/api/workspaces/${workspaceSlug}/users/notifications/`, {
      params: { per_page: 50 },
    }).then((response) => response?.data);
  }

  async projectStates(workspaceSlug: string, projectId: string): Promise<any> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/states/`).then((response) => response?.data);
  }

  async projectMembers(workspaceSlug: string, projectId: string): Promise<any> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/members/`).then((response) => response?.data);
  }

  async projectLabels(workspaceSlug: string, projectId: string): Promise<any> {
    return this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/issue-labels/`).then(
      (response) => response?.data
    );
  }

  async workspaceActivity(workspaceSlug: string): Promise<any> {
    return this.get(`/api/users/workspaces/${workspaceSlug}/activities/`, {
      params: { per_page: 30 },
    }).then((response) => response?.data);
  }
}

export const mobileServices = {
  workspace: new WorkspaceService(),
  user: new UserService(),
  project: new ProjectService(),
  issue: new IssueService(),
  comments: new IssueCommentService(),
  cycle: new CycleService(),
  module: new ModuleService(),
  page: new ProjectPageService(),
  extra: new MobileCommunityService(),
};

export function asList(payload: any): MobileRecord[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload.filter(Boolean);
  for (const key of ["results", "issues", "data", "notifications", "records", "items"]) {
    if (Array.isArray(payload?.[key])) return payload[key].filter(Boolean);
  }
  if (typeof payload === "object") {
    const arrays = Object.values(payload).filter(Array.isArray) as MobileRecord[][];
    if (arrays.length) return arrays.flat().filter(Boolean);
  }
  return [];
}

export function entityId(value: MobileRecord | string | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value.id ?? value.uuid ?? value.project_id ?? value.issue_id ?? "");
}

export function entityName(value: MobileRecord | null | undefined, fallback = "Untitled"): string {
  if (!value) return fallback;
  return String(value.name ?? value.title ?? value.label ?? value.display_name ?? value.identifier ?? fallback);
}

export function projectIdentifier(project: MobileRecord | null | undefined): string {
  return String(project?.identifier ?? project?.project_identifier ?? "").toUpperCase();
}

export function issueSequence(issue: MobileRecord | null | undefined): string {
  return String(issue?.sequence_id ?? issue?.sequence ?? issue?.number ?? "");
}

export function issueProjectId(issue: MobileRecord | null | undefined): string {
  const project = issue?.project;
  if (typeof project === "string") return project;
  return String(project?.id ?? issue?.project_id ?? "");
}

export function compactDate(input: unknown): string {
  if (!input) return "";
  const date = new Date(String(input));
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

export function relativeTime(input: unknown): string {
  if (!input) return "";
  const date = new Date(String(input));
  if (Number.isNaN(date.getTime())) return "";
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (abs < 60_000) return rtf.format(Math.round(diff / 1000), "second");
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), "hour");
  return rtf.format(Math.round(diff / 86_400_000), "day");
}

export function plainText(html: unknown): string {
  if (!html) return "";
  return String(html)
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
