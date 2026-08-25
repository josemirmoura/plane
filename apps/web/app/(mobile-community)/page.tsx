/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

"use client";

import {
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  FileText,
  FolderKanban,
  Home,
  Layers3,
  ListChecks,
  Menu,
  MessageSquareText,
  Moon,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import {
  asList,
  compactDate,
  entityId,
  entityName,
  issueProjectId,
  issueSequence,
  mobileServices,
  plainText,
  projectIdentifier,
  relativeTime,
  type MobileRecord,
} from "./mobile-api";
import { MOBILE_MODE_STORAGE_KEY, mobilePathToDesktop } from "./mobile-paths";

type SheetProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
};

type ShellData = {
  user: MobileRecord | null;
  workspace: MobileRecord | null;
  workspaces: MobileRecord[];
  projects: MobileRecord[];
  myIssues: MobileRecord[];
  recents: MobileRecord[];
  favorites: Set<string>;
};

const emptyShellData: ShellData = {
  user: null,
  workspace: null,
  workspaces: [],
  projects: [],
  myIssues: [],
  recents: [],
  favorites: new Set<string>(),
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "P";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return map[char] ?? char;
  });
}

function toHtmlParagraphs(value: string) {
  const body = escapeHtml(value.trim()).replace(/\n/g, "<br />");
  return body ? `<p>${body}</p>` : "<p></p>";
}

function getProjectFromIssue(issue: MobileRecord, projects: MobileRecord[]) {
  const id = issueProjectId(issue);
  return projects.find((project) => entityId(project) === id) ?? issue.project_detail ?? issue.project ?? null;
}

function issueLabel(issue: MobileRecord, project?: MobileRecord | null) {
  const identifier = projectIdentifier(project) || String(issue.project_identifier ?? "").toUpperCase();
  const seq = issueSequence(issue);
  return [identifier, seq].filter(Boolean).join("-");
}

function resultKind(item: MobileRecord) {
  if (item.sequence_id || item.issue_id || item.issue_identifier || item.project_detail) return "work-item";
  if (item.page_id || item.page_type || item.access !== undefined) return "page";
  if (item.cycle_id || (item.start_date && item.end_date)) return "cycle";
  if (item.module_id || (item.status && item.lead)) return "module";
  if (item.identifier || (item.project_id && item.name)) return "project";
  return "result";
}

function safeError(error: unknown) {
  if (!error) return "Something went wrong.";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    const value = error as Record<string, any>;
    return String(value.detail ?? value.message ?? value.error ?? "Something went wrong.");
  }
  return "Something went wrong.";
}

function MobileSheet({ open, title, onClose, children }: SheetProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/40" role="presentation" onMouseDown={onClose}>
      <section
        className="max-h-[86dvh] w-full overflow-hidden rounded-t-[28px] border border-subtle bg-surface-1 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Menu"}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-layer-3" />
        <div className="flex min-h-14 items-center justify-between px-5">
          <h2 className="text-base font-semibold text-primary">{title}</h2>
          <button type="button" onClick={onClose} className="flex size-11 items-center justify-center rounded-full text-secondary active:bg-layer-1" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="max-h-[calc(86dvh-4rem)] overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{children}</div>
      </section>
    </div>
  );
}

function EmptyState({ icon, title, body }: { icon: ReactNode; title: string; body?: string }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-subtle bg-surface-1 px-6 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-layer-1 text-secondary">{icon}</div>
      <p className="text-sm font-semibold text-primary">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-sm text-tertiary">{body}</p> : null}
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[17px] font-semibold tracking-tight text-primary">{title}</h2>
      {action}
    </div>
  );
}

function ProjectAvatar({ project, size = "md" }: { project: MobileRecord; size?: "sm" | "md" | "lg" }) {
  const image = project.logo_url ?? project.logo ?? project.cover_image;
  const dimension = size === "lg" ? "size-12 text-base" : size === "sm" ? "size-8 text-[11px]" : "size-10 text-sm";
  if (typeof image === "string" && image.startsWith("http")) {
    return <img src={image} alt="" className={cx(dimension, "rounded-xl object-cover")} />;
  }
  return (
    <div className={cx(dimension, "flex shrink-0 items-center justify-center rounded-xl border border-subtle bg-layer-1 font-semibold text-secondary")}>{initials(entityName(project))}</div>
  );
}

function TopHeader({ workspace, user, onWorkspace, onSettings }: { workspace: MobileRecord | null; user: MobileRecord | null; onWorkspace: () => void; onSettings: () => void }) {
  const userName = String(user?.display_name ?? user?.first_name ?? user?.email ?? "Profile");
  const avatar = user?.avatar ?? user?.avatar_url;
  return (
    <header className="sticky top-0 z-30 border-b border-subtle bg-canvas/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onWorkspace} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl py-1 text-left active:bg-layer-1">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-primary text-sm font-semibold text-white">{initials(entityName(workspace, "Plane"))}</div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-tertiary">Workspace</p>
            <div className="flex items-center gap-1">
              <p className="truncate text-[17px] font-semibold text-primary">{entityName(workspace, "Plane")}</p>
              <ChevronDown className="size-4 shrink-0 text-tertiary" />
            </div>
          </div>
        </button>
        <button type="button" onClick={onSettings} className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-subtle bg-surface-1 text-sm font-semibold text-secondary active:bg-layer-1" aria-label="Profile and settings">
          {typeof avatar === "string" && avatar.startsWith("http") ? <img src={avatar} alt="" className="size-full object-cover" /> : initials(userName)}
        </button>
      </div>
    </header>
  );
}

function BottomNavigation({ active, onNavigate, onCreate }: { active: string; onNavigate: (path: string) => void; onCreate: () => void }) {
  const items = [
    { key: "home", label: "Home", icon: Home, path: "" },
    { key: "inbox", label: "Inbox", icon: Bell, path: "inbox" },
    { key: "search", label: "Search", icon: Search, path: "search" },
  ];
  return (
    <nav className="absolute inset-x-0 bottom-0 z-40 border-t border-subtle bg-surface-1/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Mobile workspace navigation">
      <div className="grid h-[68px] grid-cols-4 items-center px-2">
        {items.map(({ key, label, icon: Icon, path }) => (
          <button key={key} type="button" onClick={() => onNavigate(path)} className={cx("flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium active:bg-layer-1", active === key ? "text-accent-primary" : "text-tertiary")}>
            <Icon className="size-[21px]" strokeWidth={active === key ? 2.4 : 2} />
            <span>{label}</span>
          </button>
        ))}
        <button type="button" onClick={onCreate} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium text-tertiary active:bg-layer-1" aria-label="Create">
          <span className="flex size-8 items-center justify-center rounded-xl bg-accent-primary text-white shadow-sm"><Plus className="size-5" /></span>
          <span>Create</span>
        </button>
      </div>
    </nav>
  );
}

function ProjectCard({ project, favorite, onClick }: { project: MobileRecord; favorite?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl border border-subtle bg-surface-1 p-3 text-left shadow-sm active:bg-layer-1">
      <ProjectAvatar project={project} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[15px] font-semibold text-primary">{entityName(project)}</p>
          {favorite ? <span className="rounded-full bg-layer-1 px-2 py-0.5 text-[10px] font-medium text-secondary">Favorite</span> : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-tertiary">{projectIdentifier(project) || "Project"}{project.description ? ` · ${plainText(project.description)}` : ""}</p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-tertiary" />
    </button>
  );
}

function WorkItemRow({ issue, project, onClick }: { issue: MobileRecord; project?: MobileRecord | null; onClick: () => void }) {
  const priority = String(issue.priority ?? "none");
  const date = issue.target_date ?? issue.due_date;
  return (
    <button type="button" onClick={onClick} className="flex w-full gap-3 rounded-2xl border border-subtle bg-surface-1 p-3 text-left shadow-sm active:bg-layer-1">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-layer-1 text-secondary"><Circle className="size-4" /></div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[11px] font-medium text-tertiary">
          <span>{issueLabel(issue, project) || "Work item"}</span>
          {priority !== "none" ? <span className="capitalize">· {priority}</span> : null}
          {date ? <span>· {compactDate(date)}</span> : null}
        </div>
        <p className="mt-1 line-clamp-2 text-[14px] font-medium leading-5 text-primary">{entityName(issue)}</p>
      </div>
      <ChevronRight className="mt-1 size-4 shrink-0 text-tertiary" />
    </button>
  );
}

function HomeView({ data, go }: { data: ShellData; go: (path: string) => void }) {
  const favorites = data.projects.filter((project) => data.favorites.has(entityId(project)));
  const projects = favorites.length ? [...favorites, ...data.projects.filter((project) => !data.favorites.has(entityId(project)))] : data.projects;
  const myIssues = data.myIssues.slice(0, 6);
  const recents = data.recents.slice(0, 5);

  return (
    <div className="space-y-7 px-4 py-5">
      <section>
        <SectionHeader title="Projects" action={<button type="button" onClick={() => go("projects")} className="min-h-9 rounded-xl px-2 text-xs font-medium text-accent-primary active:bg-layer-1">View all</button>} />
        <div className="space-y-2.5">
          {projects.length ? projects.slice(0, 5).map((project) => <ProjectCard key={entityId(project)} project={project} favorite={data.favorites.has(entityId(project))} onClick={() => go(`projects/${entityId(project)}`)} />) : <EmptyState icon={<FolderKanban className="size-5" />} title="No projects yet" body="Create your first project from the + button." />}
        </div>
      </section>

      <section>
        <SectionHeader title="Your work" action={<button type="button" onClick={() => go("work")} className="min-h-9 rounded-xl px-2 text-xs font-medium text-accent-primary active:bg-layer-1">View all</button>} />
        <div className="space-y-2.5">
          {myIssues.length ? myIssues.map((issue) => {
            const project = getProjectFromIssue(issue, data.projects);
            const projectId = issueProjectId(issue) || entityId(project);
            return <WorkItemRow key={entityId(issue)} issue={issue} project={project} onClick={() => projectId && go(`projects/${projectId}/work-items/${entityId(issue)}`)} />;
          }) : <EmptyState icon={<ListChecks className="size-5" />} title="Nothing assigned to you" body="Assigned work items will appear here." />}
        </div>
      </section>

      <section>
        <SectionHeader title="Recent activity" />
        <div className="overflow-hidden rounded-2xl border border-subtle bg-surface-1">
          {recents.length ? recents.map((item, index) => {
            const label = entityName(item, item.entity_name ?? "Recent item");
            const kind = String(item.entity_name ?? item.type ?? "recent").replaceAll("_", " ");
            return (
              <div key={`${entityId(item)}-${index}`} className={cx("flex min-h-14 items-center gap-3 px-3 py-2.5", index ? "border-t border-subtle" : "")}>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-layer-1 text-secondary"><RefreshCcw className="size-4" /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-primary">{label}</p><p className="mt-0.5 truncate text-xs capitalize text-tertiary">{kind}{item.visited_at || item.updated_at ? ` · ${relativeTime(item.visited_at ?? item.updated_at)}` : ""}</p></div>
              </div>
            );
          }) : <div className="p-4 text-sm text-tertiary">Your recently visited Plane items will show up here.</div>}
        </div>
      </section>

      <section className="pb-4">
        <SectionHeader title="Workspace shortcuts" />
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => go("search")} className="min-h-24 rounded-2xl border border-subtle bg-surface-1 p-4 text-left active:bg-layer-1"><Search className="mb-4 size-5 text-secondary" /><p className="text-sm font-semibold text-primary">Global search</p><p className="mt-1 text-xs text-tertiary">Find anything</p></button>
          <button type="button" onClick={() => go("settings")} className="min-h-24 rounded-2xl border border-subtle bg-surface-1 p-4 text-left active:bg-layer-1"><Settings className="mb-4 size-5 text-secondary" /><p className="text-sm font-semibold text-primary">Settings</p><p className="mt-1 text-xs text-tertiary">Workspace & profile</p></button>
        </div>
      </section>
    </div>
  );
}

function ProjectsView({ data, go, back }: { data: ShellData; go: (path: string) => void; back: () => void }) {
  const [query, setQuery] = useState("");
  const filtered = data.projects.filter((project) => entityName(project).toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="min-h-full">
      <SubHeader title="Projects" onBack={back} />
      <div className="space-y-4 px-4 py-4">
        <SearchField value={query} onChange={setQuery} placeholder="Search projects" />
        <div className="space-y-2.5">{filtered.length ? filtered.map((project) => <ProjectCard key={entityId(project)} project={project} favorite={data.favorites.has(entityId(project))} onClick={() => go(`projects/${entityId(project)}`)} />) : <EmptyState icon={<FolderKanban className="size-5" />} title="No matching projects" />}</div>
      </div>
    </div>
  );
}

function WorkView({ data, go, back }: { data: ShellData; go: (path: string) => void; back: () => void }) {
  const [query, setQuery] = useState("");
  const filtered = data.myIssues.filter((issue) => entityName(issue).toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="min-h-full">
      <SubHeader title="Your work" onBack={back} />
      <div className="space-y-4 px-4 py-4">
        <SearchField value={query} onChange={setQuery} placeholder="Filter your work" />
        <div className="space-y-2.5">{filtered.length ? filtered.map((issue) => {
          const project = getProjectFromIssue(issue, data.projects);
          const projectId = issueProjectId(issue) || entityId(project);
          return <WorkItemRow key={entityId(issue)} issue={issue} project={project} onClick={() => projectId && go(`projects/${projectId}/work-items/${entityId(issue)}`)} />;
        }) : <EmptyState icon={<BriefcaseBusiness className="size-5" />} title="No work items found" />}</div>
      </div>
    </div>
  );
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-subtle bg-surface-1 px-3 shadow-sm focus-within:border-accent-primary">
      <Search className="size-5 shrink-0 text-tertiary" />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-primary outline-none placeholder:text-tertiary" />
      {value ? <button type="button" onClick={() => onChange("")} className="flex size-9 items-center justify-center rounded-full text-tertiary active:bg-layer-1" aria-label="Clear"><X className="size-4" /></button> : null}
    </label>
  );
}

function SubHeader({ title, onBack, trailing }: { title: string; onBack: () => void; trailing?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex min-h-[60px] items-center gap-2 border-b border-subtle bg-canvas/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur">
      <button type="button" onClick={onBack} className="flex size-11 items-center justify-center rounded-full text-primary active:bg-layer-1" aria-label="Back"><ArrowLeft className="size-5" /></button>
      <h1 className="min-w-0 flex-1 truncate text-[18px] font-semibold tracking-tight text-primary">{title}</h1>
      {trailing ?? <div className="w-11" />}
    </header>
  );
}

function InboxView({ workspaceSlug, back }: { workspaceSlug: string; back: () => void }) {
  const [items, setItems] = useState<MobileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "unread" | "mentions">("all");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    mobileServices.extra.notifications(workspaceSlug).then((payload) => {
      if (!cancelled) setItems(asList(payload));
    }).catch((err) => !cancelled && setError(safeError(err))).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [workspaceSlug]);

  const filtered = items.filter((item) => {
    if (tab === "unread") return !item.read_at && !item.is_read;
    if (tab === "mentions") return Boolean(item.is_mention || item.type === "mention" || item.triggered_by_mention);
    return true;
  });

  return (
    <div className="min-h-full">
      <SubHeader title="Inbox" onBack={back} />
      <div className="sticky top-[60px] z-20 border-b border-subtle bg-canvas px-4 py-3">
        <div className="grid grid-cols-3 rounded-xl bg-layer-1 p-1">
          {(["all", "unread", "mentions"] as const).map((value) => <button key={value} type="button" onClick={() => setTab(value)} className={cx("min-h-9 rounded-lg px-2 text-xs font-medium capitalize", tab === value ? "bg-surface-1 text-primary shadow-sm" : "text-tertiary")}>{value}</button>)}
        </div>
      </div>
      <div className="space-y-2.5 px-4 py-4">
        {loading ? <LoadingRows /> : error ? <ErrorCard message={error} /> : filtered.length ? filtered.map((item, index) => {
          const itemData = item.data ?? item;
          const title = itemData.issue?.name ?? itemData.project?.name ?? itemData.title ?? item.title ?? "Plane notification";
          const body = plainText(itemData.message ?? itemData.description ?? item.message ?? item.activity ?? "");
          const unread = !item.read_at && !item.is_read;
          return (
            <article key={entityId(item) || index} className={cx("rounded-2xl border border-subtle p-3", unread ? "bg-layer-1" : "bg-surface-1")}>
              <div className="flex gap-3"><div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-1 text-secondary"><Bell className="size-4" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="line-clamp-2 text-sm font-semibold text-primary">{title}</p>{unread ? <span className="mt-1 size-2 shrink-0 rounded-full bg-accent-primary" /> : null}</div>{body ? <p className="mt-1 line-clamp-3 text-sm leading-5 text-secondary">{body}</p> : null}<p className="mt-2 text-xs text-tertiary">{relativeTime(item.created_at ?? item.updated_at)}</p></div></div>
            </article>
          );
        }) : <EmptyState icon={<Bell className="size-5" />} title="Inbox zero" body="No notifications in this filter." />}
      </div>
    </div>
  );
}

function SearchView({ workspaceSlug, data, go, back }: { workspaceSlug: string; data: ShellData; go: (path: string) => void; back: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MobileRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setResults([]); setError(""); return; }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      mobileServices.workspace.searchWorkspace(workspaceSlug, { search: term, workspace_search: true }).then((payload) => {
        if (!cancelled) setResults(asList(payload));
      }).catch((err) => !cancelled && setError(safeError(err))).finally(() => !cancelled && setLoading(false));
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [query, workspaceSlug]);

  const openResult = (item: MobileRecord) => {
    const kind = resultKind(item);
    if (kind === "project") return go(`projects/${entityId(item) || item.project_id}`);
    if (kind === "work-item") {
      const projectId = issueProjectId(item) || entityId(item.project) || item.project_id;
      const issueId = entityId(item) || item.issue_id;
      if (projectId && issueId) return go(`projects/${projectId}/work-items/${issueId}`);
    }
    if (kind === "page") {
      const projectId = item.project_id ?? entityId(item.project);
      const pageId = entityId(item) || item.page_id;
      if (projectId && pageId) return go(`projects/${projectId}/pages/${pageId}`);
    }
  };

  return (
    <div className="min-h-full">
      <SubHeader title="Search" onBack={back} />
      <div className="space-y-4 px-4 py-4">
        <SearchField value={query} onChange={setQuery} placeholder="Projects, work items, pages…" />
        {query.trim().length < 2 ? <div className="space-y-3"><p className="text-xs font-medium uppercase tracking-wide text-tertiary">Quick access</p>{data.projects.slice(0, 4).map((project) => <ProjectCard key={entityId(project)} project={project} onClick={() => go(`projects/${entityId(project)}`)} />)}</div> : loading ? <LoadingRows /> : error ? <ErrorCard message={error} /> : results.length ? <div className="overflow-hidden rounded-2xl border border-subtle bg-surface-1">{results.map((item, index) => <button key={`${entityId(item)}-${index}`} type="button" onClick={() => openResult(item)} className={cx("flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left active:bg-layer-1", index ? "border-t border-subtle" : "")}><div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-layer-1 text-secondary">{resultKind(item) === "project" ? <FolderKanban className="size-4" /> : resultKind(item) === "page" ? <FileText className="size-4" /> : <ListChecks className="size-4" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-primary">{entityName(item)}</p><p className="mt-0.5 text-xs capitalize text-tertiary">{resultKind(item).replace("-", " ")}</p></div><ChevronRight className="size-4 text-tertiary" /></button>)}</div> : <EmptyState icon={<Search className="size-5" />} title="No results" body={`Nothing matched “${query.trim()}”.`} />}
      </div>
    </div>
  );
}

function LoadingRows() {
  return <div className="space-y-2.5">{[0, 1, 2].map((key) => <div key={key} className="h-20 animate-pulse rounded-2xl border border-subtle bg-layer-1" />)}</div>;
}

function ErrorCard({ message }: { message: string }) {
  return <div className="rounded-2xl border border-subtle bg-layer-1 p-4 text-sm text-primary">{message}</div>;
}

function ProjectView({ workspaceSlug, projectId, section, entity, go, back }: { workspaceSlug: string; projectId: string; section?: string; entity?: string; go: (path: string) => void; back: () => void }) {
  const [project, setProject] = useState<MobileRecord | null>(null);
  const [issues, setIssues] = useState<MobileRecord[]>([]);
  const [cycles, setCycles] = useState<MobileRecord[]>([]);
  const [modules, setModules] = useState<MobileRecord[]>([]);
  const [pages, setPages] = useState<MobileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const active = section && ["work-items", "cycles", "modules", "pages"].includes(section) ? section : "work-items";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      mobileServices.project.getProject(workspaceSlug, projectId),
      mobileServices.issue.getIssues(workspaceSlug, projectId, { order_by: "-updated_at" } as any),
      mobileServices.cycle.getCyclesWithParams(workspaceSlug, projectId),
      mobileServices.module.getModules(workspaceSlug, projectId),
      mobileServices.page.fetchAll(workspaceSlug, projectId),
    ]).then((results) => {
      if (cancelled) return;
      const [projectResult, issueResult, cycleResult, moduleResult, pageResult] = results;
      if (projectResult.status === "fulfilled") setProject(projectResult.value as any);
      else setError(safeError(projectResult.reason));
      if (issueResult.status === "fulfilled") setIssues(asList(issueResult.value));
      if (cycleResult.status === "fulfilled") setCycles(asList(cycleResult.value));
      if (moduleResult.status === "fulfilled") setModules(asList(moduleResult.value));
      if (pageResult.status === "fulfilled") setPages(asList(pageResult.value));
    }).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [workspaceSlug, projectId]);

  if (active === "work-items" && entity) return <IssueView workspaceSlug={workspaceSlug} projectId={projectId} issueId={entity} project={project} go={go} back={back} />;
  if (active === "pages" && entity) return <PageDetailView workspaceSlug={workspaceSlug} projectId={projectId} pageId={entity} project={project} back={back} />;
  if ((active === "cycles" || active === "modules") && entity) return <CollectionDetailView workspaceSlug={workspaceSlug} projectId={projectId} kind={active} entityIdValue={entity} back={back} go={go} />;

  const tabs = [
    { key: "work-items", label: "Work", icon: ListChecks, count: issues.length },
    { key: "cycles", label: "Cycles", icon: CalendarDays, count: cycles.length },
    { key: "modules", label: "Modules", icon: Layers3, count: modules.length },
    { key: "pages", label: "Pages", icon: FileText, count: pages.length },
  ];

  return (
    <div className="min-h-full">
      <SubHeader title={entityName(project, "Project")} onBack={back} trailing={<button type="button" onClick={() => go(`settings?project=${projectId}`)} className="flex size-11 items-center justify-center rounded-full text-secondary active:bg-layer-1" aria-label="Project settings"><MoreHorizontal className="size-5" /></button>} />
      <div className="border-b border-subtle bg-canvas px-4 py-4">
        <div className="flex items-center gap-3"><ProjectAvatar project={project ?? { name: "Project" }} size="lg" /><div className="min-w-0"><h1 className="truncate text-xl font-semibold tracking-tight text-primary">{entityName(project, "Project")}</h1><p className="mt-0.5 text-xs text-tertiary">{projectIdentifier(project) || "Project"}{project?.description ? ` · ${plainText(project.description).slice(0, 80)}` : ""}</p></div></div>
      </div>
      <div className="sticky top-[60px] z-20 overflow-x-auto border-b border-subtle bg-canvas px-3 py-2">
        <div className="flex min-w-max gap-1">{tabs.map(({ key, label, icon: Icon, count }) => <button key={key} type="button" onClick={() => go(`projects/${projectId}/${key}`)} className={cx("flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-medium", active === key ? "bg-layer-1 text-primary" : "text-tertiary active:bg-layer-1")}><Icon className="size-4" />{label}<span className="rounded-full bg-surface-1 px-1.5 py-0.5 text-[10px] text-tertiary">{count}</span></button>)}</div>
      </div>
      <div className="space-y-3 px-4 py-4">
        {loading ? <LoadingRows /> : error ? <ErrorCard message={error} /> : active === "work-items" ? issues.length ? issues.map((issue) => <WorkItemRow key={entityId(issue)} issue={issue} project={project} onClick={() => go(`projects/${projectId}/work-items/${entityId(issue)}`)} />) : <EmptyState icon={<ListChecks className="size-5" />} title="No work items" /> : active === "cycles" ? <EntityList items={cycles} icon={<CalendarDays className="size-4" />} empty="No cycles" onOpen={(item) => go(`projects/${projectId}/cycles/${entityId(item)}`)} /> : active === "modules" ? <EntityList items={modules} icon={<Layers3 className="size-4" />} empty="No modules" onOpen={(item) => go(`projects/${projectId}/modules/${entityId(item)}`)} /> : <EntityList items={pages} icon={<FileText className="size-4" />} empty="No pages" onOpen={(item) => go(`projects/${projectId}/pages/${entityId(item)}`)} />}
      </div>
    </div>
  );
}

function EntityList({ items, icon, empty, onOpen }: { items: MobileRecord[]; icon: ReactNode; empty: string; onOpen: (item: MobileRecord) => void }) {
  if (!items.length) return <EmptyState icon={icon} title={empty} />;
  return <div className="overflow-hidden rounded-2xl border border-subtle bg-surface-1">{items.map((item, index) => <button key={entityId(item) || index} type="button" onClick={() => onOpen(item)} className={cx("flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-left active:bg-layer-1", index ? "border-t border-subtle" : "")}><div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-layer-1 text-secondary">{icon}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-primary">{entityName(item)}</p><p className="mt-0.5 truncate text-xs text-tertiary">{compactDate(item.start_date ?? item.created_at)}{item.end_date ? ` → ${compactDate(item.end_date)}` : ""}</p></div><ChevronRight className="size-4 text-tertiary" /></button>)}</div>;
}

function CollectionDetailView({ workspaceSlug, projectId, kind, entityIdValue, back, go }: { workspaceSlug: string; projectId: string; kind: "cycles" | "modules"; entityIdValue: string; back: () => void; go: (path: string) => void }) {
  const [item, setItem] = useState<MobileRecord | null>(null);
  const [issues, setIssues] = useState<MobileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const detailPromise = kind === "cycles" ? mobileServices.cycle.getCycleDetails(workspaceSlug, projectId, entityIdValue) : mobileServices.module.getModuleDetails(workspaceSlug, projectId, entityIdValue);
    const issuePromise = kind === "cycles" ? mobileServices.cycle.getCycleIssues(workspaceSlug, projectId, entityIdValue, {}) : mobileServices.module.getModuleIssues(workspaceSlug, projectId, entityIdValue, {});
    Promise.allSettled([detailPromise, issuePromise]).then(([detail, issueResult]) => {
      if (cancelled) return;
      if (detail.status === "fulfilled") setItem(detail.value as any);
      if (issueResult.status === "fulfilled") setIssues(asList(issueResult.value));
    }).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [workspaceSlug, projectId, kind, entityIdValue]);
  return <div className="min-h-full"><SubHeader title={entityName(item, kind === "cycles" ? "Cycle" : "Module")} onBack={back} /><div className="space-y-5 px-4 py-5">{loading ? <LoadingRows /> : <><div className="rounded-2xl border border-subtle bg-surface-1 p-4"><p className="text-lg font-semibold text-primary">{entityName(item)}</p>{item?.description ? <p className="mt-2 text-sm leading-5 text-secondary">{plainText(item.description)}</p> : null}<div className="mt-3 flex flex-wrap gap-2 text-xs text-tertiary">{item?.start_date ? <span className="rounded-full bg-layer-1 px-2.5 py-1">Starts {compactDate(item.start_date)}</span> : null}{item?.end_date ? <span className="rounded-full bg-layer-1 px-2.5 py-1">Ends {compactDate(item.end_date)}</span> : null}</div></div><section><SectionHeader title="Work items" /><div className="space-y-2.5">{issues.length ? issues.map((issue) => <WorkItemRow key={entityId(issue)} issue={issue} onClick={() => go(`projects/${projectId}/work-items/${entityId(issue)}`)} />) : <EmptyState icon={<ListChecks className="size-5" />} title="No work items here" />}</div></section></>}</div></div>;
}

function PageDetailView({ workspaceSlug, projectId, pageId, project, back }: { workspaceSlug: string; projectId: string; pageId: string; project: MobileRecord | null; back: () => void }) {
  const [page, setPage] = useState<MobileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  useEffect(() => {
    let cancelled = false;
    mobileServices.page.fetchById(workspaceSlug, projectId, pageId, true).then((value) => { if (!cancelled) { setPage(value as any); setTitle(entityName(value as any)); } }).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [workspaceSlug, projectId, pageId]);
  const saveTitle = async () => {
    if (!page || !title.trim() || title.trim() === entityName(page)) return;
    setSaving(true);
    try { const updated = await mobileServices.page.update(workspaceSlug, projectId, pageId, { name: title.trim() } as any); setPage(updated as any); } finally { setSaving(false); }
  };
  return <div className="min-h-full"><SubHeader title="Page" onBack={back} trailing={saving ? <div className="flex size-11 items-center justify-center"><RefreshCcw className="size-4 animate-spin text-tertiary" /></div> : undefined} /><div className="space-y-5 px-4 py-5">{loading ? <LoadingRows /> : <><p className="text-xs font-medium text-tertiary">{entityName(project, "Project")}</p><textarea value={title} onChange={(event) => setTitle(event.target.value)} onBlur={saveTitle} rows={2} className="w-full resize-none bg-transparent text-[28px] font-semibold leading-8 tracking-tight text-primary outline-none" /><div className="rounded-2xl border border-subtle bg-surface-1 p-4"><FileText className="mb-3 size-5 text-secondary" /><p className="text-sm font-medium text-primary">Rich page content stays intact</p><p className="mt-1 text-sm leading-5 text-tertiary">This Community mobile view supports page navigation and title editing. The collaborative rich-text document remains in Plane’s existing editor until the mobile editor adapter is hardened.</p><button type="button" onClick={() => { window.localStorage.setItem(MOBILE_MODE_STORAGE_KEY, "desktop"); window.location.assign(`/${workspaceSlug}/projects/${projectId}/pages/${pageId}`); }} className="mt-4 min-h-11 rounded-xl bg-layer-1 px-4 text-sm font-medium text-primary active:bg-layer-2">Open rich editor</button></div></>}</div></div>;
}

function IssueView({ workspaceSlug, projectId, issueId, project, go, back }: { workspaceSlug: string; projectId: string; issueId: string; project: MobileRecord | null; go: (path: string) => void; back: () => void }) {
  const [issue, setIssue] = useState<MobileRecord | null>(null);
  const [states, setStates] = useState<MobileRecord[]>([]);
  const [members, setMembers] = useState<MobileRecord[]>([]);
  const [labels, setLabels] = useState<MobileRecord[]>([]);
  const [comments, setComments] = useState<MobileRecord[]>([]);
  const [subIssues, setSubIssues] = useState<MobileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [comment, setComment] = useState("");
  const [propertySheet, setPropertySheet] = useState<"state" | "priority" | "assignee" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      mobileServices.issue.retrieve(workspaceSlug, projectId, issueId, { expand: "state,assignees,labels,project" }),
      mobileServices.extra.projectStates(workspaceSlug, projectId),
      mobileServices.extra.projectMembers(workspaceSlug, projectId),
      mobileServices.extra.projectLabels(workspaceSlug, projectId),
      mobileServices.comments.getIssueComments(workspaceSlug, projectId, issueId),
      mobileServices.issue.subIssues(workspaceSlug, projectId, issueId, {}),
    ]);
    const [issueResult, stateResult, memberResult, labelResult, commentResult, subIssueResult] = results;
    if (issueResult.status === "fulfilled") {
      const value = issueResult.value as any;
      setIssue(value);
      setName(entityName(value));
      setDescription(plainText(value.description_html ?? value.description ?? value.description_stripped));
      setError("");
    } else setError(safeError(issueResult.reason));
    if (stateResult.status === "fulfilled") setStates(asList(stateResult.value));
    if (memberResult.status === "fulfilled") setMembers(asList(memberResult.value));
    if (labelResult.status === "fulfilled") setLabels(asList(labelResult.value));
    if (commentResult.status === "fulfilled") setComments(asList(commentResult.value));
    if (subIssueResult.status === "fulfilled") setSubIssues(asList(subIssueResult.value));
    setLoading(false);
  }, [workspaceSlug, projectId, issueId]);

  useEffect(() => { void load(); }, [load]);

  const patch = async (patchData: Record<string, any>) => {
    setSaving(true);
    try {
      const updated = await mobileServices.issue.patchIssue(workspaceSlug, projectId, issueId, patchData as any);
      setIssue((current) => ({ ...(current ?? {}), ...(updated ?? patchData) }));
      setError("");
    } catch (err) { setError(safeError(err)); throw err; } finally { setSaving(false); }
  };

  const memberIdentity = (member: MobileRecord) => member.member ?? member.user ?? member;
  const currentStateId = typeof issue?.state === "string" ? issue.state : entityId(issue?.state);
  const assigneeIds = Array.isArray(issue?.assignees) ? issue.assignees.map((item: any) => typeof item === "string" ? item : entityId(item)) : [];
  const currentState = states.find((state) => entityId(state) === currentStateId) ?? (typeof issue?.state === "object" ? issue.state : null);
  const currentAssignee = members.map(memberIdentity).find((member) => assigneeIds.includes(entityId(member))) ?? (Array.isArray(issue?.assignee_details) ? issue.assignee_details[0] : null);

  const saveName = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === entityName(issue)) return;
    await patch({ name: trimmed });
  };
  const saveDescription = async () => {
    const current = plainText(issue?.description_html ?? issue?.description ?? issue?.description_stripped);
    if (description.trim() === current.trim()) return;
    await patch({ description_html: toHtmlParagraphs(description), description_stripped: description.trim() });
  };
  const addComment = async () => {
    const value = comment.trim();
    if (!value) return;
    setSaving(true);
    try {
      const created = await mobileServices.comments.createIssueComment(workspaceSlug, projectId, issueId, { comment_html: toHtmlParagraphs(value) } as any);
      setComments((current) => [...current, created as any]);
      setComment("");
    } catch (err) { setError(safeError(err)); } finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-full"><SubHeader title="Work item" onBack={back} /><div className="px-4 py-5"><LoadingRows /></div></div>;
  if (!issue) return <div className="min-h-full"><SubHeader title="Work item" onBack={back} /><div className="px-4 py-5"><ErrorCard message={error || "Work item not found."} /></div></div>;

  const priority = String(issue.priority ?? "none");
  return (
    <div className="min-h-full">
      <SubHeader title={issueLabel(issue, project) || "Work item"} onBack={back} trailing={<div className="flex size-11 items-center justify-center">{saving ? <RefreshCcw className="size-4 animate-spin text-tertiary" /> : <Check className="size-4 text-tertiary" />}</div>} />
      <div className="space-y-6 px-4 py-5">
        {error ? <ErrorCard message={error} /> : null}
        <section>
          <textarea value={name} onChange={(event) => setName(event.target.value)} onBlur={() => void saveName()} rows={Math.max(2, Math.min(5, Math.ceil(name.length / 35)))} className="w-full resize-none bg-transparent text-[25px] font-semibold leading-8 tracking-tight text-primary outline-none" />
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} onBlur={() => void saveDescription()} rows={Math.max(4, Math.min(10, Math.ceil((description.length || 100) / 45)))} placeholder="Add a description…" className="mt-3 w-full resize-none rounded-2xl border border-subtle bg-surface-1 p-3 text-[15px] leading-6 text-secondary outline-none focus:border-accent-primary" />
        </section>

        <section>
          <SectionHeader title="Properties" />
          <div className="grid grid-cols-2 gap-2.5">
            <PropertyButton label="State" value={entityName(currentState, "Select state")} icon={<Circle className="size-4" />} onClick={() => setPropertySheet("state")} />
            <PropertyButton label="Priority" value={priority === "none" ? "No priority" : priority} icon={<Layers3 className="size-4" />} onClick={() => setPropertySheet("priority")} />
            <PropertyButton label="Assignee" value={entityName(currentAssignee, "Unassigned")} icon={<UserRound className="size-4" />} onClick={() => setPropertySheet("assignee")} />
            <label className="rounded-2xl border border-subtle bg-surface-1 p-3"><span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-tertiary"><CalendarDays className="size-4" />Due</span><input type="date" value={String(issue.target_date ?? "")} onChange={(event) => void patch({ target_date: event.target.value || null })} className="mt-2 h-7 w-full bg-transparent text-sm font-medium text-primary outline-none" /></label>
          </div>
          {labels.length && Array.isArray(issue.labels) && issue.labels.length ? <div className="mt-3 flex flex-wrap gap-2">{issue.labels.map((labelValue: any) => { const label = labels.find((candidate) => entityId(candidate) === (typeof labelValue === "string" ? labelValue : entityId(labelValue))) ?? labelValue; return <span key={entityId(label) || String(labelValue)} className="rounded-full bg-layer-1 px-2.5 py-1 text-xs font-medium text-secondary">{entityName(label, "Label")}</span>; })}</div> : null}
        </section>

        <section>
          <SectionHeader title={`Sub-items${subIssues.length ? ` · ${subIssues.length}` : ""}`} />
          <div className="space-y-2">{subIssues.length ? subIssues.map((subIssue) => <WorkItemRow key={entityId(subIssue)} issue={subIssue} project={project} onClick={() => go(`projects/${projectId}/work-items/${entityId(subIssue)}`)} />) : <div className="rounded-2xl border border-dashed border-subtle px-4 py-5 text-sm text-tertiary">No sub-items.</div>}</div>
        </section>

        <section className="pb-4">
          <SectionHeader title={`Comments${comments.length ? ` · ${comments.length}` : ""}`} />
          <div className="space-y-3">{comments.map((entry, index) => { const actor = entry.actor_detail ?? entry.actor ?? entry.created_by_detail ?? {}; const body = plainText(entry.comment_html ?? entry.comment ?? entry.message); return <article key={entityId(entry) || index} className="rounded-2xl border border-subtle bg-surface-1 p-3"><div className="flex items-center gap-2"><div className="flex size-8 items-center justify-center rounded-full bg-layer-1 text-xs font-semibold text-secondary">{initials(entityName(actor, "U"))}</div><div className="min-w-0"><p className="truncate text-xs font-semibold text-primary">{entityName(actor, "Member")}</p><p className="text-[11px] text-tertiary">{relativeTime(entry.created_at)}</p></div></div><p className="mt-3 whitespace-pre-wrap text-sm leading-5 text-secondary">{body}</p></article>; })}</div>
          <div className="mt-3 flex items-end gap-2"><textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={2} placeholder="Write a comment…" className="min-h-12 flex-1 resize-none rounded-2xl border border-subtle bg-surface-1 px-3 py-2.5 text-sm text-primary outline-none focus:border-accent-primary" /><button type="button" onClick={() => void addComment()} disabled={!comment.trim() || saving} className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent-primary text-white disabled:opacity-40" aria-label="Post comment"><MessageSquareText className="size-5" /></button></div>
        </section>
      </div>

      <MobileSheet open={propertySheet === "state"} title="State" onClose={() => setPropertySheet(null)}><OptionList items={states} selected={currentStateId} onSelect={(value) => { setPropertySheet(null); void patch({ state: entityId(value) }); }} /></MobileSheet>
      <MobileSheet open={propertySheet === "priority"} title="Priority" onClose={() => setPropertySheet(null)}><OptionList items={["urgent", "high", "medium", "low", "none"].map((value) => ({ id: value, name: value === "none" ? "No priority" : value }))} selected={priority} onSelect={(value) => { setPropertySheet(null); void patch({ priority: entityId(value) }); }} /></MobileSheet>
      <MobileSheet open={propertySheet === "assignee"} title="Assignee" onClose={() => setPropertySheet(null)}><OptionList items={[{ id: "", name: "Unassigned" }, ...members.map(memberIdentity)]} selected={entityId(currentAssignee)} onSelect={(value) => { setPropertySheet(null); const id = entityId(value); void patch({ assignees: id ? [id] : [] }); }} /></MobileSheet>
    </div>
  );
}

function PropertyButton({ label, value, icon, onClick }: { label: string; value: string; icon: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="min-h-[76px] rounded-2xl border border-subtle bg-surface-1 p-3 text-left active:bg-layer-1"><span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-tertiary">{icon}{label}</span><span className="mt-2 block truncate text-sm font-medium capitalize text-primary">{value}</span></button>;
}

function OptionList({ items, selected, onSelect }: { items: MobileRecord[]; selected?: string; onSelect: (item: MobileRecord) => void }) {
  return <div className="overflow-hidden rounded-2xl border border-subtle">{items.map((item, index) => { const id = entityId(item); return <button key={`${id}-${index}`} type="button" onClick={() => onSelect(item)} className={cx("flex min-h-[52px] w-full items-center gap-3 px-3 py-2.5 text-left active:bg-layer-1", index ? "border-t border-subtle" : "")}><div className="flex size-9 items-center justify-center rounded-xl bg-layer-1 text-secondary"><Circle className="size-4" /></div><span className="min-w-0 flex-1 truncate text-sm font-medium capitalize text-primary">{entityName(item)}</span>{selected === id ? <Check className="size-5 text-accent-primary" /> : null}</button>; })}</div>;
}

function SettingsView({ workspaceSlug, data, onWorkspaceUpdate, back }: { workspaceSlug: string; data: ShellData; onWorkspaceUpdate: (workspace: MobileRecord) => void; back: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [name, setName] = useState(entityName(data.workspace, ""));
  const [size, setSize] = useState(String(data.workspace?.organization_size ?? data.workspace?.company_size ?? ""));
  const [timezone, setTimezone] = useState(String(data.workspace?.timezone ?? ""));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setName(entityName(data.workspace, ""));
    setSize(String(data.workspace?.organization_size ?? data.workspace?.company_size ?? ""));
    setTimezone(String(data.workspace?.timezone ?? ""));
  }, [data.workspace]);

  const inputClass = "h-12 w-full rounded-xl border border-subtle bg-canvas px-3 text-sm text-primary outline-none focus:border-accent-primary";
  const save = async () => {
    setSaving(true); setMessage("");
    try {
      const updated = await mobileServices.workspace.updateWorkspace(workspaceSlug, { name: name.trim(), organization_size: size || undefined, timezone: timezone || undefined } as any);
      onWorkspaceUpdate(updated as any);
      setMessage("Workspace updated.");
    } catch (err) { setMessage(safeError(err)); } finally { setSaving(false); }
  };

  const openDesktop = () => {
    window.localStorage.setItem(MOBILE_MODE_STORAGE_KEY, "desktop");
    window.location.assign(mobilePathToDesktop(window.location.pathname));
  };

  const derivedUserName = `${data.user?.first_name ?? ""} ${data.user?.last_name ?? ""}`.trim();
  const userName = String(data.user?.display_name ?? (derivedUserName || data.user?.email || "Profile"));
  return (
    <div className="min-h-full"><SubHeader title="Settings" onBack={back} /><div className="space-y-6 px-4 py-5">
      <section className="flex items-center gap-3 rounded-2xl border border-subtle bg-surface-1 p-4"><div className="flex size-12 items-center justify-center rounded-full bg-layer-1 text-sm font-semibold text-secondary">{initials(userName)}</div><div className="min-w-0"><p className="truncate text-base font-semibold text-primary">{userName}</p><p className="truncate text-sm text-tertiary">{data.user?.email}</p></div></section>
      <section><SectionHeader title="Workspace" /><div className="space-y-3 rounded-2xl border border-subtle bg-surface-1 p-4"><FormLabel label="Workspace name"><input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></FormLabel><FormLabel label="Company size"><select value={size} onChange={(event) => setSize(event.target.value)} className={inputClass}><option value="">Not set</option><option value="1-10">1-10</option><option value="11-50">11-50</option><option value="51-100">51-100</option><option value="101-500">101-500</option><option value="500+">500+</option></select></FormLabel><FormLabel label="Timezone"><input value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="America/Fortaleza" className={inputClass} /></FormLabel><button type="button" onClick={() => void save()} disabled={!name.trim() || saving} className="min-h-12 w-full rounded-xl bg-accent-primary px-4 text-sm font-semibold text-white disabled:opacity-40">{saving ? "Saving…" : "Save workspace"}</button>{message ? <p className="text-xs text-tertiary">{message}</p> : null}</div></section>
      <section><SectionHeader title="Appearance & access" /><div className="overflow-hidden rounded-2xl border border-subtle bg-surface-1"><button type="button" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="flex min-h-14 w-full items-center gap-3 px-3 text-left active:bg-layer-1"><div className="flex size-9 items-center justify-center rounded-xl bg-layer-1 text-secondary">{resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}</div><span className="flex-1 text-sm font-medium text-primary">{resolvedTheme === "dark" ? "Light mode" : "Dark mode"}</span><ChevronRight className="size-4 text-tertiary" /></button><button type="button" onClick={openDesktop} className="flex min-h-14 w-full items-center gap-3 border-t border-subtle px-3 text-left active:bg-layer-1"><div className="flex size-9 items-center justify-center rounded-xl bg-layer-1 text-secondary"><Menu className="size-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium text-primary">Open desktop version</p><p className="mt-0.5 text-xs text-tertiary">Keep desktop mode until you switch back</p></div><ChevronRight className="size-4 text-tertiary" /></button></div></section>
      <p className="pb-4 text-center text-xs text-tertiary">Plane CE Mobile Web · Community layer</p>
    </div></div>
  );
}

function FormLabel({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-medium text-secondary">{label}</span>{children}</label>;
}

function WorkspacePicker({ open, data, onClose }: { open: boolean; data: ShellData; onClose: () => void }) {
  const currentId = entityId(data.workspace);
  return <MobileSheet open={open} title="Switch workspace" onClose={onClose}><div className="space-y-2">{data.workspaces.map((workspace) => <button key={entityId(workspace)} type="button" onClick={() => { const slug = workspace.slug ?? workspace.workspace_slug; if (slug) window.location.assign(`/app/${slug}`); }} className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-subtle bg-surface-1 px-3 text-left active:bg-layer-1"><div className="flex size-10 items-center justify-center rounded-xl bg-layer-1 text-sm font-semibold text-secondary">{initials(entityName(workspace))}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-primary">{entityName(workspace)}</p><p className="mt-0.5 truncate text-xs text-tertiary">/{workspace.slug ?? workspace.workspace_slug}</p></div>{currentId === entityId(workspace) ? <Check className="size-5 text-accent-primary" /> : <ChevronRight className="size-4 text-tertiary" />}</button>)}</div></MobileSheet>;
}

function QuickCreateSheet({ open, workspaceSlug, projects, onClose, onCreated }: { open: boolean; workspaceSlug: string; projects: MobileRecord[]; onClose: () => void; onCreated: () => void }) {
  const [mode, setMode] = useState<"menu" | "work-item" | "project" | "page">("menu");
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputClass = "h-12 w-full rounded-xl border border-subtle bg-canvas px-3 text-sm text-primary outline-none focus:border-accent-primary";
  useEffect(() => { if (!open) { setMode("menu"); setName(""); setIdentifier(""); setError(""); setProjectId(projects[0] ? entityId(projects[0]) : ""); } }, [open, projects]);
  useEffect(() => { if (!projectId && projects[0]) setProjectId(entityId(projects[0])); }, [projectId, projects]);

  const autoIdentifier = (value: string) => value.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").replace(/[^A-Za-z0-9]/g, "").slice(0, 5).toUpperCase() || "PRJ";
  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true); setError("");
    try {
      if (mode === "work-item") {
        if (!projectId) throw new Error("Choose a project first.");
        await mobileServices.issue.createIssue(workspaceSlug, projectId, { name: name.trim() } as any);
      } else if (mode === "project") {
        await mobileServices.project.createProject(workspaceSlug, { name: name.trim(), identifier: (identifier || autoIdentifier(name)).toUpperCase() } as any);
      } else if (mode === "page") {
        if (!projectId) throw new Error("Choose a project first.");
        await mobileServices.page.create(workspaceSlug, projectId, { name: name.trim() } as any);
      }
      onClose(); onCreated();
    } catch (err) { setError(safeError(err)); } finally { setSaving(false); }
  };

  return <MobileSheet open={open} title={mode === "menu" ? "Create" : mode === "work-item" ? "New work item" : mode === "project" ? "New project" : "New page"} onClose={onClose}>{mode === "menu" ? <div className="space-y-2 pb-2"><CreateChoice icon={<ListChecks className="size-5" />} title="Work item" body="Add work to a project" onClick={() => setMode("work-item")} /><CreateChoice icon={<FolderKanban className="size-5" />} title="Project" body="Create a new project" onClick={() => setMode("project")} /><CreateChoice icon={<FileText className="size-5" />} title="Page" body="Start a project page" onClick={() => setMode("page")} /></div> : <div className="space-y-4 pb-2">{mode !== "project" ? <FormLabel label="Project"><select value={projectId} onChange={(event) => setProjectId(event.target.value)} className={inputClass}><option value="">Choose a project</option>{projects.map((project) => <option key={entityId(project)} value={entityId(project)}>{entityName(project)}</option>)}</select></FormLabel> : null}<FormLabel label={mode === "work-item" ? "Title" : "Name"}><input autoFocus value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></FormLabel>{mode === "project" ? <FormLabel label="Identifier"><input value={identifier} onChange={(event) => setIdentifier(event.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 5))} placeholder={autoIdentifier(name)} className={inputClass} /></FormLabel> : null}{error ? <ErrorCard message={error} /> : null}<div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setMode("menu")} className="min-h-12 rounded-xl bg-layer-1 px-4 text-sm font-medium text-primary">Back</button><button type="button" onClick={() => void submit()} disabled={!name.trim() || saving} className="min-h-12 rounded-xl bg-accent-primary px-4 text-sm font-semibold text-white disabled:opacity-40">{saving ? "Creating…" : "Create"}</button></div></div>}</MobileSheet>;
}

function CreateChoice({ icon, title, body, onClick }: { icon: ReactNode; title: string; body: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex min-h-[68px] w-full items-center gap-3 rounded-2xl border border-subtle bg-surface-1 px-3 text-left active:bg-layer-1"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-layer-1 text-secondary">{icon}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-primary">{title}</p><p className="mt-0.5 text-xs text-tertiary">{body}</p></div><ChevronRight className="size-5 text-tertiary" /></button>;
}

export default function MobileCommunityPage() {
  const params = useParams();
  const workspaceSlug = String(params.workspaceSlug ?? "");
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<ShellData>(emptyShellData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workspaceSheet, setWorkspaceSheet] = useState(false);
  const [createSheet, setCreateSheet] = useState(false);

  const loadShell = useCallback(async () => {
    if (!workspaceSlug) return;
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      mobileServices.user.currentUser(),
      mobileServices.workspace.getWorkspace(workspaceSlug),
      mobileServices.workspace.userWorkspaces(),
      mobileServices.project.getProjects(workspaceSlug),
      mobileServices.user.userIssues(workspaceSlug, { order_by: "-updated_at" }),
      mobileServices.workspace.fetchWorkspaceRecents(workspaceSlug),
      mobileServices.project.getUserProjectFavorites(workspaceSlug),
    ]);
    const [user, workspace, workspaces, projects, issues, recents, favorites] = results;
    if (workspace.status === "rejected") setError(safeError(workspace.reason));
    const favoriteRows = favorites.status === "fulfilled" ? asList(favorites.value) : [];
    setData({
      user: user.status === "fulfilled" ? user.value as any : null,
      workspace: workspace.status === "fulfilled" ? workspace.value as any : null,
      workspaces: workspaces.status === "fulfilled" ? asList(workspaces.value) : [],
      projects: projects.status === "fulfilled" ? asList(projects.value) : [],
      myIssues: issues.status === "fulfilled" ? asList(issues.value) : [],
      recents: recents.status === "fulfilled" ? asList(recents.value) : [],
      favorites: new Set(favoriteRows.map((row) => typeof row.project === "string" ? row.project : entityId(row.project ?? row))),
    });
    setLoading(false);
  }, [workspaceSlug]);

  useEffect(() => { void loadShell(); }, [loadShell]);

  const rest = useMemo(() => {
    const prefix = `/app/${workspaceSlug}`;
    return location.pathname.startsWith(prefix) ? location.pathname.slice(prefix.length).split("/").filter(Boolean) : [];
  }, [location.pathname, workspaceSlug]);

  const go = useCallback((path: string) => {
    const clean = path.replace(/^\/+/, "");
    navigate(clean ? `/app/${workspaceSlug}/${clean}` : `/app/${workspaceSlug}`);
  }, [navigate, workspaceSlug]);
  const back = useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else go("");
  }, [navigate, go]);

  const topLevel = rest[0] ?? "home";
  const activeNav = topLevel === "inbox" ? "inbox" : topLevel === "search" ? "search" : "home";
  const showMainHeader = !rest.length;

  let screen: ReactNode;
  if (!rest.length) screen = <HomeView data={data} go={go} />;
  else if (rest[0] === "projects" && !rest[1]) screen = <ProjectsView data={data} go={go} back={back} />;
  else if (rest[0] === "projects" && rest[1]) screen = <ProjectView workspaceSlug={workspaceSlug} projectId={rest[1]} section={rest[2]} entity={rest[3]} go={go} back={back} />;
  else if (rest[0] === "work") screen = <WorkView data={data} go={go} back={back} />;
  else if (rest[0] === "inbox") screen = <InboxView workspaceSlug={workspaceSlug} back={back} />;
  else if (rest[0] === "search") screen = <SearchView workspaceSlug={workspaceSlug} data={data} go={go} back={back} />;
  else if (rest[0] === "settings") screen = <SettingsView workspaceSlug={workspaceSlug} data={data} onWorkspaceUpdate={(workspace) => setData((current) => ({ ...current, workspace }))} back={back} />;
  else screen = <HomeView data={data} go={go} />;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-canvas text-primary md:mx-auto md:max-w-[768px] md:border-x md:border-subtle">
      {showMainHeader ? <TopHeader workspace={data.workspace} user={data.user} onWorkspace={() => setWorkspaceSheet(true)} onSettings={() => go("settings")} /> : null}
      <main className="h-full overflow-y-auto overscroll-contain pb-[calc(76px+env(safe-area-inset-bottom))]">{loading && !data.workspace ? <div className="px-4 py-5"><LoadingRows /></div> : error && !data.workspace ? <div className="px-4 py-5"><ErrorCard message={error} /></div> : screen}</main>
      <BottomNavigation active={activeNav} onNavigate={go} onCreate={() => setCreateSheet(true)} />
      <WorkspacePicker open={workspaceSheet} data={data} onClose={() => setWorkspaceSheet(false)} />
      <QuickCreateSheet open={createSheet} workspaceSlug={workspaceSlug} projects={data.projects} onClose={() => setCreateSheet(false)} onCreated={() => void loadShell()} />
    </div>
  );
}
