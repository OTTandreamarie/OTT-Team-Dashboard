import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, X, ChevronDown, ChevronRight, Users, Heart, Briefcase,
  AlertTriangle, Eye, CheckCircle2, Pencil, Save, Trash2, CalendarPlus,
  TrendingUp, Sparkles, Circle, Loader, PauseCircle, FolderPlus
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

/* ---------------------------------------------------------------
   TEAM PULSE — a monthly 1:1 tracking dashboard
   Phase 1 (capacity & wellbeing only): Apr, May, Jun 2026
   Phase 2 (+ project updates): Jul 2026 onward
----------------------------------------------------------------*/

const STORAGE_KEY = "team-pulse-months-v1";

const STATUS = {
  stable: { label: "Stable", color: "#3f7d5c", bg: "#eaf3ee", ring: "#bfe0cf", icon: CheckCircle2 },
  watch: { label: "Watch", color: "#a3701b", bg: "#fbf1e0", ring: "#eed4a4", icon: Eye },
  risk: { label: "Attention", color: "#a5372f", bg: "#fbeae8", ring: "#f0c0bb", icon: AlertTriangle },
};

const PROJECT_STATUS = {
  not_started: { label: "Not started", color: "#64748b", bg: "#f1f5f9", ring: "#e2e8f0", icon: Circle },
  ongoing: { label: "Ongoing", color: "#3730a3", bg: "#eef2ff", ring: "#c7d2fe", icon: Loader },
  on_hold: { label: "On hold", color: "#a3701b", bg: "#fbf1e0", ring: "#eed4a4", icon: PauseCircle },
  completed: { label: "Completed", color: "#0f766e", bg: "#effcfa", ring: "#99f6e4", icon: CheckCircle2 },
};

const uid = () => Math.random().toString(36).slice(2, 10);

const seedPerson = (name, status, notes, workload = "") => ({
  id: uid(), name, status, workload, notes, projects: [],
});

const seedProject = (name = "New project", status = "ongoing", percent = 0, notes = "") => ({
  id: uid(), name, status, percent, notes,
});

function useDebouncedSave(data, ready) {
  const timer = useRef(null);
  useEffect(() => {
    if (!ready || !data) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
      catch (e) { console.error("Save failed", e); }
    }, 400);
    return () => clearTimeout(timer.current);
  }, [data, ready]);
}

function Pill({ status }) {
  const s = STATUS[status] || STATUS.stable;
  const Icon = s.icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.ring}` }}
    >
      <Icon size={12} strokeWidth={2.5} />
      {s.label}
    </span>
  );
}

// Compact status breakdown for a list of projects — e.g. "● 2 Ongoing  ● 1 Completed"
// — used anywhere we want to show project state without a percentage.
function ProjectStatusCounts({ projects, size = 11 }) {
  const counts = {};
  for (const p of projects) counts[p.status] = (counts[p.status] || 0) + 1;
  const present = Object.keys(PROJECT_STATUS).filter((k) => counts[k]);
  if (present.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {present.map((key) => {
        const s = PROJECT_STATUS[key];
        const Icon = s.icon;
        return (
          <span
            key={key}
            className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold"
            style={{ color: s.color }}
          >
            <Icon size={size} strokeWidth={2.5} />
            {counts[key]} {s.label}
          </span>
        );
      })}
    </div>
  );
}

// A quick-scan table above the detailed person cards — status, capacity, and
// project progress at a glance. Purely informational (no edit controls), so
// it renders the same in both edit and read-only mode.
function SummaryTable({ people, phase }) {
  const sorted = people.slice().sort((a, b) => {
    const order = { risk: 0, watch: 1, stable: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3) || a.name.localeCompare(b.name);
  });

  if (sorted.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
        <Users size={15} /> At a glance
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              <th className="py-2 pr-4 font-bold">Name</th>
              <th className="py-2 pr-4 font-bold">Status</th>
              <th className="py-2 pr-4 font-bold">Capacity</th>
              {phase === "projects" && <th className="py-2 pr-4 font-bold">Projects</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const projects = p.projects || [];
              return (
                <tr key={p.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2 pr-4 font-semibold text-slate-700">{p.name}</td>
                  <td className="py-2 pr-4">
                    <Pill status={p.status} />
                  </td>
                  <td className="py-2 pr-4 text-slate-500">{p.workload || "—"}</td>
                  {phase === "projects" && (
                    <td className="py-2 pr-4">
                      {projects.length ? (
                        <ProjectStatusCounts projects={projects} />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPicker({ value, onChange }) {
  return (
    <div className="flex gap-1.5">
      {Object.entries(STATUS).map(([key, s]) => {
        const Icon = s.icon;
        const active = value === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition"
            style={{
              color: active ? "#fff" : s.color,
              background: active ? s.color : s.bg,
              border: `1px solid ${s.ring}`,
            }}
          >
            <Icon size={12} strokeWidth={2.5} />
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

function ProjectStatusPicker({ value, onChange, readOnly }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(PROJECT_STATUS).map(([key, s]) => {
        const Icon = s.icon;
        const active = value === key;
        return (
          <button
            key={key}
            onClick={() => !readOnly && onChange(key)}
            disabled={readOnly}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition disabled:cursor-default"
            style={{
              color: active ? "#fff" : s.color,
              background: active ? s.color : s.bg,
              border: `1px solid ${s.ring}`,
            }}
          >
            <Icon size={11} strokeWidth={2.5} />
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

function ProjectRow({ project, onChange, onDelete, readOnly }) {
  const s = PROJECT_STATUS[project.status] || PROJECT_STATUS.ongoing;
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: s.ring, background: `${s.bg}80` }}>
      <div className="mb-2 flex items-center gap-2">
        <input
          value={project.name}
          onChange={(e) => onChange({ ...project, name: e.target.value })}
          placeholder="Project name"
          readOnly={readOnly}
          className="flex-1 truncate border-b border-transparent bg-transparent text-sm font-semibold text-slate-800 outline-none focus:border-slate-300"
        />
        {!readOnly && (
          <button onClick={onDelete} className="shrink-0 text-slate-300 hover:text-red-500">
            <X size={14} />
          </button>
        )}
      </div>

      <div className="mb-2">
        <ProjectStatusPicker value={project.status} onChange={(status) => onChange({ ...project, status })} readOnly={readOnly} />
      </div>

      <textarea
        value={project.notes}
        onChange={(e) => onChange({ ...project, notes: e.target.value })}
        rows={2}
        placeholder="Notes on this project…"
        readOnly={readOnly}
        className="w-full rounded-md border bg-white/80 px-2 py-1.5 text-xs outline-none focus:border-slate-400"
        style={{ borderColor: s.ring }}
      />
    </div>
  );
}

function ProjectsSection({ projects, onChange, readOnly }) {
  const updateProject = (id, updated) => onChange(projects.map((p) => (p.id === id ? updated : p)));
  const removeProject = (id) => onChange(projects.filter((p) => p.id !== id));
  const addProject = () => onChange([...projects, seedProject()]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-indigo-700">
          <Briefcase size={12} /> Projects
        </div>
        {!readOnly && (
          <button
            onClick={addProject}
            className="inline-flex items-center gap-1 rounded-md border border-indigo-200 px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50"
          >
            <FolderPlus size={12} /> Add project
          </button>
        )}
      </div>
      {projects.length === 0 ? (
        <p className="text-xs italic text-slate-400">No projects logged yet.</p>
      ) : (
        <div className="space-y-2.5">
          {projects.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              onChange={(updated) => updateProject(p.id, updated)}
              onDelete={() => removeProject(p.id)}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PersonCard({ person, phase, onUpdate, onDelete, readOnly }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(person);

  useEffect(() => setDraft(person), [person]);

  const s = STATUS[person.status] || STATUS.stable;

  const save = () => {
    onUpdate(draft);
    setEditing(false);
    setOpen(true);
  };

  return (
    <div
      className="rounded-xl border bg-white transition-shadow hover:shadow-sm"
      style={{ borderColor: s.ring, borderLeftWidth: 4, borderLeftColor: s.color }}
    >
      <button
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {open ? <ChevronDown size={16} className="shrink-0 text-slate-400" /> : <ChevronRight size={16} className="shrink-0 text-slate-400" />}
          <span className="truncate font-semibold text-slate-800">{person.name}</span>
          {person.workload && (
            <span className="hidden shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 sm:inline">
              {person.workload}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {phase === "projects" && (person.projects || []).length > 0 && (() => {
            const projects = person.projects;
            if (projects.length === 1) {
              const s = PROJECT_STATUS[projects[0].status] || PROJECT_STATUS.ongoing;
              const Icon = s.icon;
              return (
                <span
                  className="hidden items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold sm:inline-flex"
                  style={{ color: s.color, background: s.bg }}
                >
                  <Icon size={11} strokeWidth={2.5} />
                  {s.label}
                </span>
              );
            }
            return (
              <span className="hidden items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 sm:inline-flex">
                <Briefcase size={11} />
                {projects.length} projects
              </span>
            );
          })()}
          <Pill status={person.status} />
        </div>
      </button>

      {open && (
        <div className="border-t px-4 py-3" style={{ borderColor: "#eef0ee" }}>
          {!editing ? (
            <>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                {person.notes || <span className="italic text-slate-400">No notes yet.</span>}
              </p>
              {!readOnly && (
                <div className="mt-3 flex justify-end gap-3">
                  <button
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => onDelete(person.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Status</label>
                <StatusPicker value={draft.status} onChange={(v) => setDraft((d) => ({ ...d, status: v }))} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Workload / capacity</label>
                <input
                  value={draft.workload}
                  onChange={(e) => setDraft((d) => ({ ...d, workload: e.target.value }))}
                  placeholder="e.g. Light, Manageable, Heavy"
                  className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Capacity, wellbeing &amp; management notes
                </label>
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                  rows={4}
                  className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setDraft(person); setEditing(false); }}
                  className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
                >
                  <Save size={12} /> Save
                </button>
              </div>
            </div>
          )}

          {phase === "projects" && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <ProjectsSection
                projects={person.projects || []}
                onChange={(projects) => onUpdate({ ...person, projects })}
                readOnly={readOnly}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddPersonForm({ onAdd, onClose }) {
  const [name, setName] = useState("");
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Add team member</div>
      <div className="flex gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="flex-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400"
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) { onAdd(name.trim()); setName(""); }
            if (e.key === "Escape") onClose();
          }}
        />
        <button
          onClick={() => { if (name.trim()) { onAdd(name.trim()); setName(""); } }}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
        >
          Add
        </button>
        <button onClick={onClose} className="rounded-md px-2 text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function ThemesEditor({ themes, onChange, readOnly }) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <ul className="mb-2 space-y-1.5">
        {themes.map((t, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
            <span className="flex-1">{t}</span>
            {!readOnly && (
              <button
                onClick={() => onChange(themes.filter((_, idx) => idx !== i))}
                className="text-slate-300 hover:text-red-400"
              >
                <X size={13} />
              </button>
            )}
          </li>
        ))}
        {themes.length === 0 && <li className="text-sm italic text-slate-400">No themes logged yet.</li>}
      </ul>
      {!readOnly && (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a theme or flag for management…"
            className="flex-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400"
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) { onChange([...themes, draft.trim()]); setDraft(""); }
            }}
          />
          <button
            onClick={() => { if (draft.trim()) { onChange([...themes, draft.trim()]); setDraft(""); } }}
            className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

function MonthPanel({ month, onUpdateMonth, readOnly }) {
  const [overviewEditing, setOverviewEditing] = useState(false);
  const [overviewDraft, setOverviewDraft] = useState(month.overview);
  const [showAddPerson, setShowAddPerson] = useState(false);

  useEffect(() => setOverviewDraft(month.overview), [month.id]);

  const counts = month.people.reduce(
    (acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; },
    { stable: 0, watch: 0, risk: 0 }
  );

  const updatePerson = (updated) => {
    onUpdateMonth({ ...month, people: month.people.map((p) => (p.id === updated.id ? updated : p)) });
  };
  const deletePerson = (id) => {
    onUpdateMonth({ ...month, people: month.people.filter((p) => p.id !== id) });
  };
  const addPerson = (name) => {
    onUpdateMonth({ ...month, people: [...month.people, seedPerson(name, "stable", "")] });
    setShowAddPerson(false);
  };

  return (
    <div className="space-y-6">
      {/* Overview card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-slate-400" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
              {month.label} {month.year} — overall pulse
            </h3>
          </div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
            style={{
              color: month.phase === "projects" ? "#4338ca" : "#0f766e",
              background: month.phase === "projects" ? "#eef2ff" : "#effcfa",
            }}
          >
            {month.phase === "projects" ? <Briefcase size={12} /> : <Heart size={12} />}
            {month.phase === "projects" ? "Capacity + Project updates" : "Capacity & wellbeing only"}
          </span>
        </div>

        {!overviewEditing ? (
          <>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {month.overview || <span className="italic text-slate-400">No overview written yet for this month.</span>}
            </p>
            {!readOnly && (
              <button
                onClick={() => setOverviewEditing(true)}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                <Pencil size={12} /> Edit overview
              </button>
            )}
          </>
        ) : (
          <div>
            <textarea
              value={overviewDraft}
              onChange={(e) => setOverviewDraft(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => { setOverviewDraft(month.overview); setOverviewEditing(false); }}
                className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => { onUpdateMonth({ ...month, overview: overviewDraft }); setOverviewEditing(false); }}
                className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
              >
                <Save size={12} /> Save
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {Object.entries(STATUS).map(([key, s]) => (
            <div
              key={key}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{ color: s.color, background: s.bg }}
            >
              <s.icon size={12} strokeWidth={2.5} />
              {counts[key]} {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* At-a-glance summary table */}
      <SummaryTable people={month.people} phase={month.phase} />

      {/* Themes */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Key themes for management</h3>
        <ThemesEditor themes={month.themes} onChange={(themes) => onUpdateMonth({ ...month, themes })} readOnly={readOnly} />
      </div>

      {/* People grid */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            <Users size={15} /> Team ({month.people.length})
          </h3>
          {!readOnly && !showAddPerson && (
            <button
              onClick={() => setShowAddPerson(true)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
            >
              <Plus size={13} /> Add person
            </button>
          )}
        </div>
        {!readOnly && showAddPerson && (
          <div className="mb-3">
            <AddPersonForm onAdd={addPerson} onClose={() => setShowAddPerson(false)} />
          </div>
        )}
        {month.people.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center text-sm text-slate-400">
            No 1:1s logged for {month.label} yet. Add your first team member above.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {month.people
              .slice()
              .sort((a, b) => {
                const order = { risk: 0, watch: 1, stable: 2 };
                return order[a.status] - order[b.status] || a.name.localeCompare(b.name);
              })
              .map((p) => (
                <PersonCard key={p.id} person={p} phase={month.phase} onUpdate={updatePerson} onDelete={deletePerson} readOnly={readOnly} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TrendChart({ months }) {
  const data = months.map((m) => {
    const counts = m.people.reduce(
      (acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; },
      { stable: 0, watch: 0, risk: 0 }
    );
    return { name: m.label, ...counts, total: m.people.length };
  });
  if (data.every((d) => d.total === 0)) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
        <TrendingUp size={15} /> Sentiment trend across months
      </div>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0ee" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #eef0ee", fontSize: 12 }} />
            <Line type="monotone" dataKey="stable" name="Stable" stroke={STATUS.stable.color} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="watch" name="Watch" stroke={STATUS.watch.color} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="risk" name="Attention" stroke={STATUS.risk.color} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AddMonthModal({ onAdd, onClose, existingCount }) {
  const [label, setLabel] = useState("");
  const [year, setYear] = useState(2026);
  const [phase, setPhase] = useState("projects");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">Add a new month</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Month name</label>
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. August"
              className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">This month covers</label>
            <div className="flex gap-2">
              <button
                onClick={() => setPhase("wellbeing")}
                className="flex-1 rounded-md border px-2.5 py-2 text-xs font-semibold"
                style={{
                  borderColor: phase === "wellbeing" ? "#0f766e" : "#e2e8f0",
                  color: phase === "wellbeing" ? "#0f766e" : "#64748b",
                  background: phase === "wellbeing" ? "#effcfa" : "white",
                }}
              >
                Capacity & wellbeing only
              </button>
              <button
                onClick={() => setPhase("projects")}
                className="flex-1 rounded-md border px-2.5 py-2 text-xs font-semibold"
                style={{
                  borderColor: phase === "projects" ? "#4338ca" : "#e2e8f0",
                  color: phase === "projects" ? "#4338ca" : "#64748b",
                  background: phase === "projects" ? "#eef2ff" : "white",
                }}
              >
                + Project updates
              </button>
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={() => label.trim() && onAdd(label.trim(), year, phase)}
            className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
          >
            <CalendarPlus size={13} /> Add month
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportModal({ onImport, onClose }) {
  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data?.byId || !Array.isArray(data.order)) throw new Error();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        onImport(data);
      } catch { alert("That file is not a valid Team Pulse backup."); }
    };
    reader.readAsText(file);
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><h3 className="text-lg font-bold text-slate-900">Import dashboard data</h3><p className="mt-2 text-sm text-slate-500">Choose your Team Pulse JSON backup.</p><input type="file" accept=".json,application/json" className="mt-4 block w-full text-sm" onChange={e => handleFile(e.target.files?.[0])}/><div className="mt-5 flex justify-end"><button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100">Cancel</button></div></div></div>;
}

function ShareLinkModal({ link, onClose }) {
  const copy = async () => { try { await navigator.clipboard.writeText(link); alert("Viewer link copied!"); } catch { alert(link); } };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"><div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"><h3 className="text-lg font-bold text-slate-900">Viewer link ready</h3><p className="mt-2 text-sm text-slate-500">Send this link to Ash. The current dashboard snapshot is stored in the link, not in the public GitHub repository.</p><textarea readOnly value={link} className="mt-4 h-28 w-full rounded-lg border border-slate-200 p-3 text-xs text-slate-600"/><div className="mt-4 flex justify-end gap-2"><button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100">Close</button><button onClick={copy} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Copy link</button></div></div></div>;
}

function ExportModal({ data, onClose }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">Export your data</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          This is your live dashboard data, including every edit you've made. Copy it and paste it to Claude
          to have it applied to the source file, or keep it as a backup.
        </p>
        <textarea
          readOnly
          value={json}
          onFocus={(e) => e.target.select()}
          className="mb-3 min-h-[300px] flex-1 rounded-md border border-slate-200 bg-slate-50 p-2.5 font-mono text-[11px] text-slate-700 outline-none"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100">
            Close
          </button>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900"
          >
            <Save size={12} /> {copied ? "Copied!" : "Copy to clipboard"}
          </button>
        </div>
      </div>
    </div>
  );
}

function getModeFromLocation() {
  if (typeof window === "undefined") return "admin";
  const params = new URLSearchParams(window.location.search);
  if (params.get("view") === "1" || window.location.hash.startsWith("#view=")) return "viewer";
  return "admin";
}

function decodeSharedData() {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash || "";
  if (!hash.startsWith("#view=")) return null;
  try {
    const encoded = decodeURIComponent(hash.slice(6));
    const raw = window.LZString?.decompressFromEncodedURIComponent(encoded) || encoded;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function publishLink(data) {
  const json = JSON.stringify(data);
  const encoded = window.LZString?.compressToEncodedURIComponent(json) || encodeURIComponent(json);
  return `${window.location.origin}${window.location.pathname}#view=${encoded}`;
}

export default function TeamPulseDashboard() {
  const urlView = getModeFromLocation() === "viewer";
  const [months, setMonths] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [showAddMonth, setShowAddMonth] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const readOnly = urlView;

  useEffect(() => {
    try {
      const shared = decodeSharedData();
      if (shared?.byId) {
        setMonths(shared);
        setActiveId(shared.order[shared.order.length - 1]);
      } else if (!urlView) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setMonths(parsed);
          setActiveId(parsed.order[parsed.order.length - 1]);
        }
      }
    } catch (e) { setLoadError(true); }
    finally { setReady(true); }
  }, [urlView]);

  useDebouncedSave(months, ready && months);

  if (!months) {
    return (
      <div className="min-h-screen bg-[#f7f8f6] px-4 py-12 font-sans text-slate-800">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-teal-700"><Heart size={13}/> Team Pulse</div>
          <h1 className="text-xl font-bold">{urlView ? "Shared dashboard unavailable" : "Set up your dashboard"}</h1>
          <p className="mt-2 text-sm text-slate-500">{urlView ? "This viewer link does not contain a valid dashboard snapshot." : "Import your existing Team Pulse JSON backup. Your editable data stays in this browser and is not stored in the public GitHub repository."}</p>
          {!urlView && <button onClick={() => setShowImport(true)} className="mt-5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Import dashboard data</button>}
        </div>
        {showImport && <ImportModal onImport={(data) => { setMonths(data); setActiveId(data.order[data.order.length - 1]); setShowImport(false); }} onClose={() => setShowImport(false)} />}
      </div>
    );
  }

  const orderedMonths = months.order.map((id) => months.byId[id]);
  const active = months.byId[activeId] || orderedMonths[orderedMonths.length - 1];

  const updateMonth = (updated) => {
    setMonths((m) => ({ ...m, byId: { ...m.byId, [updated.id]: updated } }));
  };

  const addMonth = (label, year, phase) => {
    const id = `${year}-${label.slice(0, 3).toLowerCase()}-${uid().slice(0, 4)}`;
    const newMonth = { id, label, year, phase, overview: "", themes: [], people: [] };
    setMonths((m) => ({ order: [...m.order, id], byId: { ...m.byId, [id]: newMonth } }));
    setActiveId(id);
    setShowAddMonth(false);
  };

  return (
    <div className="min-h-full w-full bg-[#f7f8f6] font-sans text-slate-800" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-teal-700">
              <Heart size={13} /> Team Pulse
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Monthly 1:1 Dashboard</h1>
              {readOnly && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <Eye size={12} /> View only
                </span>
              )}
            </div>
            <p className="mt-1 max-w-xl text-sm text-slate-500">
              Apr–Jun tracked capacity &amp; wellbeing. From Jul onward, project updates are added too.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!readOnly && <>
              <button onClick={() => setShowImport(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50">Import</button>
              <button onClick={() => setShowExport(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"><Save size={15}/> Backup</button>
              <button onClick={() => setShareLink(publishLink(months))} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800"><Eye size={15}/> Publish viewer link</button>
              <button onClick={() => setShowAddMonth(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-900"><CalendarPlus size={15}/> Add month</button>
            </>}
          </div>
        </div>

        {loadError && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Couldn't read your saved data, so this is starting fresh from the built-in seed months.
          </div>
        )}

        {/* Month tabs */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {orderedMonths.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveId(m.id)}
              className="rounded-lg px-3.5 py-2 text-sm font-semibold transition"
              style={
                active.id === m.id
                  ? { background: "#1e293b", color: "white" }
                  : { background: "white", color: "#64748b", border: "1px solid #e2e8f0" }
              }
            >
              {m.label} {m.year !== 2026 ? m.year : ""}
              {m.people.length === 0 && (
                <span className="ml-1.5 opacity-60">·&nbsp;empty</span>
              )}
            </button>
          ))}
        </div>

        <TrendChart months={orderedMonths} />
        <div className="h-6" />
        <MonthPanel key={active.id} month={active} onUpdateMonth={updateMonth} readOnly={readOnly} />
      </div>

      {showAddMonth && (
        <AddMonthModal onAdd={addMonth} onClose={() => setShowAddMonth(false)} existingCount={orderedMonths.length} />
      )}
      {showExport && <ExportModal data={months} onClose={() => setShowExport(false)} />}
      {showImport && <ImportModal onImport={(data) => { setMonths(data); setActiveId(data.order[data.order.length - 1]); setShowImport(false); }} onClose={() => setShowImport(false)} />}
      {shareLink && <ShareLinkModal link={shareLink} onClose={() => setShareLink("")} />}

      <div className="mx-auto max-w-5xl px-4 pb-10 pt-2 text-center text-[11px] text-slate-400 sm:px-6">
        View-only snapshot · editing is disabled
      </div>
    </div>
  );
}
