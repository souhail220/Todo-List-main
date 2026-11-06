import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, type Todo } from "@/lib/todo-api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "My Tasks" },
      { name: "description", content: "A minimal todo list connected to your Spring Boot API." },
      { property: "og:title", content: "My Tasks" },
      { property: "og:description", content: "A minimal todo list connected to your Spring Boot API." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Filter = "all" | "active" | "completed";

function Index() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      setTodos(await api.list());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
      setNotice(success);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    if (await run(() => api.create(t), "Task added")) setTitle("");
  }

  async function saveEdit(id: number) {
    const t = editTitle.trim();
    if (!t) return;
    if (await run(() => api.update(id, t), "Task updated")) setEditingId(null);
  }

  const completed = todos.filter((t) => t.completed).length;
  const visible = todos.filter((t) =>
    filter === "all" ? true : filter === "active" ? !t.completed : t.completed,
  );

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-semibold text-foreground">My Tasks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {todos.length} total · {completed} completed · {todos.length - completed} remaining
        </p>

        <form onSubmit={onAdd} className="mt-6 flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a new task…"
            className="flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Add Task
          </button>
        </form>

        {error && (
          <div role="alert" className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}{" "}
            <button onClick={refresh} className="underline">Retry</button>
          </div>
        )}
        {notice && (
          <div className="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground">{notice}</div>
        )}

        <div className="mt-6 flex gap-1 border-b border-border">
          {(["all", "active", "completed"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm capitalize ${
                filter === f ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading tasks…</p>
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {todos.length === 0 ? "No tasks yet. Add your first one above." : "Nothing here."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <input
                  type="checkbox"
                  checked={t.completed}
                  disabled={busy}
                  onChange={() => run(() => api.complete(t.id), "Status updated")}
                  className="h-4 w-4 accent-primary"
                  aria-label="Toggle completion"
                />
                <div className="min-w-0 flex-1">
                  {editingId === t.id ? (
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(t.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="w-full rounded-md border border-input bg-card px-2 py-1 text-sm"
                    />
                  ) : (
                    <p className={`truncate text-sm ${t.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {t.title}
                    </p>
                  )}
                  {t.createdAt && (
                    <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</p>
                  )}
                </div>
                {editingId === t.id ? (
                  <>
                    <button onClick={() => saveEdit(t.id)} disabled={busy || !editTitle.trim()} className="text-sm text-foreground disabled:opacity-50">Save</button>
                    <button onClick={() => setEditingId(null)} className="text-sm text-muted-foreground">Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditingId(t.id); setEditTitle(t.title); }} className="text-sm text-muted-foreground hover:text-foreground">Edit</button>
                    <button onClick={() => setConfirmId(t.id)} className="text-sm text-destructive">Delete</button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirmId !== null && (
        <div className="fixed inset-0 flex items-center justify-center bg-foreground/30 px-4">
          <div role="dialog" className="w-full max-w-sm rounded-lg border border-border bg-card p-5">
            <h2 className="font-medium text-card-foreground">Delete this task?</h2>
            <p className="mt-1 text-sm text-muted-foreground">This cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmId(null)} className="rounded-md border border-input px-3 py-1.5 text-sm">Cancel</button>
              <button
                disabled={busy}
                onClick={async () => {
                  const id = confirmId;
                  setConfirmId(null);
                  await run(() => api.remove(id), "Task deleted");
                }}
                className="rounded-md bg-destructive px-3 py-1.5 text-sm text-destructive-foreground"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
