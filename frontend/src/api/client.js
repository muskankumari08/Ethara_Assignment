const API_BASE = import.meta.env.VITE_API_URL ?? ''

function getAccessToken() {
  return localStorage.getItem('access_token')
}

export function setTokens(access, refresh) {
  if (access) localStorage.setItem('access_token', access)
  else localStorage.removeItem('access_token')
  if (refresh) localStorage.setItem('refresh_token', refresh)
  else localStorage.removeItem('refresh_token')
}

export function clearSession() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem('user', JSON.stringify(user))
  else localStorage.removeItem('user')
}

/**
 * @param {string} path e.g. /api/login/
 * @param {RequestInit} [options]
 */
export async function api(path, options = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }
  const token = getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(url, { ...options, headers })
  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }
  if (!res.ok) {
    const err = new Error(data?.detail || data?.message || res.statusText || 'Request failed')
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}
