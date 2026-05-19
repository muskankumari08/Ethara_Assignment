import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button type="button" className="text-slate-500 hover:text-slate-800" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const { isAdmin } = useAuth()
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', team_member_ids: [] })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api('/api/projects/')
      setProjects(Array.isArray(data) ? data : data.results || [])
      if (isAdmin) {
        const u = await api('/api/users/')
        setUsers(Array.isArray(u) ? u : u.results || [])
      }
    } catch (e) {
      setError(e.message || 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    load()
  }, [load])

  function openCreate() {
    setForm({ name: '', description: '', team_member_ids: [] })
    setModal('create')
  }

  async function openEdit(p) {
    if (!isAdmin) return
    try {
      const detail = await api(`/api/projects/${p.id}/`)
      setForm({
        name: detail.name,
        description: detail.description || '',
        team_member_ids: (detail.team_ids || []).map((x) => (typeof x === 'object' ? x.id : x)),
      })
      setModal({ type: 'edit', id: p.id })
    } catch (e) {
      setError(e.message || 'Failed to load project')
    }
  }

  async function saveCreate(e) {
    e.preventDefault()
    setError('')
    try {
      await api('/api/projects/', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description,
          team_member_ids: form.team_member_ids,
        }),
      })
      setModal(null)
      await load()
    } catch (e) {
      setError(formatErr(e))
    }
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (modal?.type !== 'edit') return
    setError('')
    try {
      await api(`/api/projects/${modal.id}/`, {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description,
          team_member_ids: form.team_member_ids,
        }),
      })
      setModal(null)
      await load()
    } catch (e) {
      setError(formatErr(e))
    }
  }

  async function removeProject(id) {
    if (!window.confirm('Delete this project and all its tasks?')) return
    setError('')
    try {
      await api(`/api/projects/${id}/`, { method: 'DELETE' })
      await load()
    } catch (e) {
      setError(formatErr(e))
    }
  }

  function toggleMember(id) {
    setForm((f) => {
      const set = new Set(f.team_member_ids)
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return { ...f, team_member_ids: [...set] }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="mt-1 text-slate-600">
            {isAdmin ? 'Create projects and invite team members.' : 'Projects you belong to.'}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700"
          >
            New project
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <article key={p.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900">{p.name}</h2>
                {typeof p.task_count === 'number' && (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {p.task_count} tasks
                  </span>
                )}
              </div>
              <p className="mt-2 flex-1 text-sm text-slate-600 line-clamp-3">{p.description || '—'}</p>
              <p className="mt-3 text-xs text-slate-500">
                Created {new Date(p.created_at).toLocaleDateString()}
                {p.created_by_detail && ` · ${p.created_by_detail.name}`}
              </p>
              <div className="mt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Team</p>
                <ul className="mt-1 flex flex-wrap gap-1">
                  {(p.team_members_detail || []).map((m) => (
                    <li key={m.id} className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs text-indigo-900">
                      {m.name}
                    </li>
                  ))}
                  {(!p.team_members_detail || p.team_members_detail.length === 0) && (
                    <li className="text-xs text-slate-400">No members</li>
                  )}
                </ul>
              </div>
              {isAdmin && (
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeProject(p.id)}
                    className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </article>
          ))}
          {projects.length === 0 && (
            <p className="text-slate-500 md:col-span-2">No projects yet{isAdmin ? ' — create one to get started.' : '.'}</p>
          )}
        </div>
      )}

      {modal === 'create' && (
        <Modal title="New project" onClose={() => setModal(null)}>
          <form className="space-y-4" onSubmit={saveCreate}>
            <div>
              <label className="text-sm font-medium text-slate-700">Name</label>
              <input
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
            <div>
              <p className="text-sm font-medium text-slate-700">Team members</p>
              <p className="text-xs text-slate-500">You are always included as project owner.</p>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {users.map((u) => (
                    <li key={u.id}>
                      <label className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.team_member_ids.includes(u.id)}
                          onChange={() => toggleMember(u.id)}
                        />
                        <span>
                          {u.name} <span className="text-slate-400">({u.email})</span>
                        </span>
                      </label>
                    </li>
                  ))}
              </ul>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="rounded-lg px-4 py-2 text-sm text-slate-600" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
                Create
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.type === 'edit' && (
        <Modal title="Edit project" onClose={() => setModal(null)}>
          <form className="space-y-4" onSubmit={saveEdit}>
            <div>
              <label className="text-sm font-medium text-slate-700">Name</label>
              <input
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
            <div>
              <p className="text-sm font-medium text-slate-700">Team members</p>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {users.map((u) => (
                  <li key={u.id}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.team_member_ids.includes(u.id)}
                        onChange={() => toggleMember(u.id)}
                      />
                      <span>
                        {u.name} <span className="text-slate-400">({u.email})</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="rounded-lg px-4 py-2 text-sm text-slate-600" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}
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
