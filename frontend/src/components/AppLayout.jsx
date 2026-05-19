import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
  }`

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      <NavLink to="/" end className={linkClass} onClick={() => setSidebarOpen(false)}>
        <span>Dashboard</span>
      </NavLink>
      <NavLink to="/projects" className={linkClass} onClick={() => setSidebarOpen(false)}>
        <span>Projects</span>
      </NavLink>
      <NavLink to="/tasks" className={linkClass} onClick={() => setSidebarOpen(false)}>
        <span>Tasks</span>
      </NavLink>
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed z-50 flex h-full w-64 flex-col border-r border-slate-200 bg-white shadow-sm transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <Link to="/" className="text-lg font-semibold tracking-tight text-indigo-700">
            TeamTasks
          </Link>
          <button
            type="button"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>
        {nav}
        <div className="mt-auto border-t border-slate-100 p-4">
          <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
          <p className="truncate text-xs text-slate-500">{user?.email}</p>
          <span
            className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
              isAdmin ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {isAdmin ? 'Admin' : 'Member'}
          </span>
          <button
            type="button"
            onClick={logout}
            className="mt-4 w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            className="rounded-md border border-slate-200 p-2 text-slate-700"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <span className="font-semibold text-slate-800">TeamTasks</span>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
