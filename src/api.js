import axios from 'axios'
import { supabase } from './supabaseClient'

const API_URL = import.meta.env.VITE_API_URL

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return { Authorization: `Bearer ${session.access_token}` }
}

// Notes
export async function fetchNotes(page = 1, pageSize = 20, includeArchived = false) {
  const headers = await authHeaders()
  const res = await axios.get(`${API_URL}/api/notes`, {
    headers,
    params: { page, pageSize, includeArchived }
  })
  return res.data
}

export async function fetchSharedNotes() {
  const headers = await authHeaders()
  const res = await axios.get(`${API_URL}/api/notes/shared`, { headers })
  return res.data
}

export async function searchNotes(q, includeArchived = false) {
  const headers = await authHeaders()
  const res = await axios.get(`${API_URL}/api/notes/search`, {
    headers,
    params: { q, includeArchived }
  })
  return res.data
}

export async function createNote(title, content, isEncrypted = false, color = null) {
  const headers = await authHeaders()
  const res = await axios.post(`${API_URL}/api/notes`, { title, content, isEncrypted, color }, { headers })
  return res.data
}

export async function updateNote(id, title, content, color = null) {
  const headers = await authHeaders()
  const res = await axios.put(`${API_URL}/api/notes/${id}`, { title, content, color }, { headers })
  return res.data
}

export async function updateNoteColor(id, color) {
  const headers = await authHeaders()
  const res = await axios.patch(`${API_URL}/api/notes/${id}/color`, { color }, { headers })
  return res.data
}

export async function deleteNote(id) {
  const headers = await authHeaders()
  await axios.delete(`${API_URL}/api/notes/${id}`, { headers })
}

export async function toggleArchive(id) {
  const headers = await authHeaders()
  const res = await axios.patch(`${API_URL}/api/notes/${id}/archive`, {}, { headers })
  return res.data
}

// Shares
export async function shareNote(noteId, email, permission) {
  const headers = await authHeaders()
  const res = await axios.post(`${API_URL}/api/notes/${noteId}/shares`, { email, permission }, { headers })
  return res.data
}

export async function getShares(noteId) {
  const headers = await authHeaders()
  const res = await axios.get(`${API_URL}/api/notes/${noteId}/shares`, { headers })
  return res.data
}

export async function revokeShare(noteId, shareId) {
  const headers = await authHeaders()
  await axios.delete(`${API_URL}/api/notes/${noteId}/shares/${shareId}`, { headers })
}

// Notifications
export async function fetchNotifications() {
  const headers = await authHeaders()
  const res = await axios.get(`${API_URL}/api/notifications`, { headers })
  return res.data
}

export async function getUnreadCount() {
  const headers = await authHeaders()
  const res = await axios.get(`${API_URL}/api/notifications/unread-count`, { headers })
  return res.data.count
}

export async function markAsRead(id) {
  const headers = await authHeaders()
  await axios.patch(`${API_URL}/api/notifications/${id}/read`, {}, { headers })
}

export async function markAllAsRead() {
  const headers = await authHeaders()
  await axios.patch(`${API_URL}/api/notifications/read-all`, {}, { headers })
}

// Admin
export async function fetchAdminStats() {
  const headers = await authHeaders()
  const res = await axios.get(`${API_URL}/api/admin/stats`, { headers })
  return res.data
}

export async function fetchAdminUsers() {
  const headers = await authHeaders()
  const res = await axios.get(`${API_URL}/api/admin/users`, { headers })
  return res.data
}

export async function adminDeleteNote(id) {
  const headers = await authHeaders()
  await axios.delete(`${API_URL}/api/admin/notes/${id}`, { headers })
}

export async function toggleAdminRole(userId) {
  const headers = await authHeaders()
  const res = await axios.patch(`${API_URL}/api/admin/users/${userId}/toggle-admin`, {}, { headers })
  return res.data
}
