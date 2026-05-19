import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function statusLabel(s) {
  const map = { todo: 'Todo', in_progress: 'In Progress', completed: 'Completed' }
  return map[s] || s
}

export default function DashboardPage() {
  const { isAdmin } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setErr('')
      try {
        const data = await api('/api/tasks/')
        if (!cancelled) setTasks(Array.isArray(data) ? data : data.results || [])
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Failed to load tasks')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const t = todayISO()
    const total = tasks.length
    const completed = tasks.filter((x) => x.status === 'completed').length
    const pending = tasks.filter((x) => x.status !== 'completed').length
    const overdue = tasks.filter(
      (x) => x.due_date && x.due_date < t && x.status !== 'completed',
    ).length
    const byStatus = {
      todo: tasks.filter((x) => x.status === 'todo').length,
      in_progress: tasks.filter((x) => x.status === 'in_progress').length,
      completed: tasks.filter((x) => x.status === 'completed').length,
    }
    const recent = [...tasks].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 6)
    const overdueList = tasks.filter((x) => x.due_date && x.due_date < t && x.status !== 'completed')
    return { total, completed, pending, overdue, byStatus, recent, overdueList }
  }, [tasks])

  const cards = [
    { label: 'Total tasks', value: stats.total, color: 'bg-slate-800' },
    { label: 'Completed', value: stats.completed, color: 'bg-emerald-600' },
    { label: 'Pending', value: stats.pending, color: 'bg-amber-500' },
    { label: 'Overdue', value: stats.overdue, color: 'bg-rose-600' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-slate-600">
          {isAdmin ? 'Overview of all tasks across projects.' : 'Your assigned tasks at a glance.'}
        </p>
      </div>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((c) => (
              <div
                key={c.label}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className={`h-1 ${c.color}`} />
                <div className="p-5">
                  <p className="text-sm font-medium text-slate-500">{c.label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{c.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Task status summary</h2>
              <ul className="mt-4 space-y-3">
                {Object.entries(stats.byStatus).map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{statusLabel(k)}</span>
                    <span className="font-semibold text-slate-900">{v}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Recent tasks</h2>
                <Link to="/tasks" className="text-sm font-medium text-indigo-600 hover:underline">
                  View all
                </Link>
              </div>
              <ul className="mt-4 divide-y divide-slate-100">
                {stats.recent.length === 0 && <li className="py-4 text-sm text-slate-500">No tasks yet.</li>}
                {stats.recent.map((task) => (
                  <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{task.title}</p>
                      <p className="text-xs text-slate-500">
                        {statusLabel(task.status)}
                        {task.due_date ? ` · Due ${task.due_date}` : ''}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      #{task.id}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-rose-900">Overdue tasks</h2>
            {stats.overdueList.length === 0 ? (
              <p className="mt-3 text-sm text-rose-800/80">You are all caught up — no overdue tasks.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {stats.overdueList.map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-100 bg-white px-4 py-3 text-sm"
                  >
                    <span className="font-medium text-slate-900">{task.title}</span>
                    <span className="text-rose-700">Due {task.due_date}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
