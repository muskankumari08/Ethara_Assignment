import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

const STATUSES = [
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

export default function TasksPage() {
  const { isAdmin } = useAuth()
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [projectFilter, setProjectFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [team, setTeam] = useState([])
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'todo',
    due_date: '',
    assigned_to: '',
    project: '',
  })

  const loadProjects = useCallback(async () => {
    const data = await api('/api/projects/')
    setProjects(Array.isArray(data) ? data : data.results || [])
  }, [])

  const loadTasks = useCallback(async () => {
    const qs = projectFilter ? `?project=${encodeURIComponent(projectFilter)}` : ''
    const data = await api(`/api/tasks/${qs}`)
    setTasks(Array.isArray(data) ? data : data.results || [])
  }, [projectFilter])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        await loadProjects()
        if (!cancelled) await loadTasks()
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadProjects, loadTasks])

  async function openCreate() {
    setError('')
    setForm({
      title: '',
      description: '',
      status: 'todo',
      due_date: '',
      assigned_to: '',
      project: projects[0]?.id?.toString() || '',
    })
    setModal('create')
    const pid = projects[0]?.id
    if (pid) await refreshTeam(pid)
  }

  async function refreshTeam(projectId) {
    if (!projectId) {
      setTeam([])
      return
    }
    try {
      const detail = await api(`/api/projects/${projectId}/`)
      setTeam(detail.team_members_detail || [])
    } catch {
      setTeam([])
    }
  }

  async function openEdit(task) {
    if (!isAdmin) return
    setForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      due_date: task.due_date || '',
      assigned_to: task.assigned_to ? String(task.assigned_to) : '',
      project: String(task.project),
    })
    setModal({ type: 'edit', id: task.id })
    await refreshTeam(task.project)
  }

  async function saveTask(e) {
    e.preventDefault()
    setError('')
    const payload = {
      title: form.title.trim(),
      description: form.description,
      status: form.status,
      due_date: form.due_date || null,
      project: Number(form.project),
      assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
    }
    try {
      if (modal === 'create') {
        await api('/api/tasks/', { method: 'POST', body: JSON.stringify(payload) })
      } else if (modal?.type === 'edit') {
        await api(`/api/tasks/${modal.id}/`, { method: 'PUT', body: JSON.stringify(payload) })
      }
      setModal(null)
      await loadTasks()
    } catch (e) {
      setError(formatErr(e))
    }
  }

  async function deleteTask(id) {
    if (!window.confirm('Delete this task?')) return
    setError('')
    try {
      await api(`/api/tasks/${id}/`, { method: 'DELETE' })
      await loadTasks()
    } catch (e) {
      setError(formatErr(e))
    }
  }

  async function updateStatus(task, status) {
    setError('')
    try {
      await api(`/api/tasks/${task.id}/`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
      await loadTasks()
    } catch (e) {
      setError(formatErr(e))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="mt-1 text-slate-600">
            {isAdmin ? 'Create, assign, and track work across projects.' : 'Update status on tasks assigned to you.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-600">
            Project
            <select
              className="ml-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="">All</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {isAdmin && (
            <button
              type="button"
              onClick={openCreate}
              disabled={projects.length === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              New task
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Assignee</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Status</th>
                  {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((t) => {
                  const proj = projects.find((p) => p.id === t.project)
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-900">{t.title}</td>
                      <td className="px-4 py-3 text-slate-600">{proj?.name || `#${t.project}`}</td>
                      <td className="px-4 py-3 text-slate-600">{t.assigned_to_detail?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{t.due_date || '—'}</td>
                      <td className="px-4 py-3">
                        <select
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                          value={t.status}
                          onChange={(e) => updateStatus(t, e.target.value)}
                        >
                          {STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            className="mr-2 text-indigo-600 hover:underline"
                            onClick={() => openEdit(t)}
                          >
                            Edit
                          </button>
                          <button type="button" className="text-rose-600 hover:underline" onClick={() => deleteTask(t.id)}>
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {tasks.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No tasks in this view.</p>
          )}
        </div>
      )}

      {modal === 'create' && (
        <TaskModal
          title="New task"
          onClose={() => setModal(null)}
          form={form}
          setForm={setForm}
          projects={projects}
          team={team}
          onProjectChange={async (id) => {
            setForm((f) => ({ ...f, project: id, assigned_to: '' }))
            await refreshTeam(Number(id))
          }}
          onSubmit={saveTask}
        />
      )}
      {modal?.type === 'edit' && (
        <TaskModal
          title="Edit task"
          onClose={() => setModal(null)}
          form={form}
          setForm={setForm}
          projects={projects}
          team={team}
          onProjectChange={async (id) => {
            setForm((f) => ({ ...f, project: id }))
            await refreshTeam(Number(id))
          }}
          onSubmit={saveTask}
        />
      )}
    </div>
  )
}

function TaskModal({ title, onClose, form, setForm, projects, team, onProjectChange, onSubmit }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button type="button" className="text-slate-500 hover:text-slate-800" onClick={onClose}>
            ✕
          </button>
        </div>
        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="text-sm font-medium text-slate-700">Project</label>
            <select
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.project}
              onChange={(e) => onProjectChange(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Title</label>
            <input
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Status</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Due date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Assign to</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={form.assigned_to}
              onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
            >
              <option value="">Unassigned</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="rounded-lg px-4 py-2 text-sm text-slate-600" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function formatErr(e) {
  const d = e.data
  if (d && typeof d === 'object') {
    const first = Object.entries(d).find(([, v]) => v)
    if (first) {
      const val = first[1]
      return Array.isArray(val) ? val[0] : String(val)
    }
  }
  return e.message || 'Request failed'
}
