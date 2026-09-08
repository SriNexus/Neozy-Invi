import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PublicInvitation from './pages/PublicInvitation'
import AdminLogin from './pages/admin/AdminLogin'
import RequireAdmin from './pages/admin/RequireAdmin'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminEdit from './pages/admin/AdminEdit'
import AdminEvents from './pages/admin/AdminEvents'
import AdminGallery from './pages/admin/AdminGallery'
import AdminRsvp from './pages/admin/AdminRsvp'
import AdminMusic from './pages/admin/AdminMusic'
import AdminTheme from './pages/admin/AdminTheme'
import AdminPreview from './pages/admin/AdminPreview'
import AdminSettings from './pages/admin/AdminSettings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public invitation — accessible via custom slug */}
        <Route path="/" element={<PublicInvitation />} />
        <Route path="/demo" element={<PublicInvitation />} />
        <Route path="/invitation" element={<PublicInvitation />} />
        <Route path="/:slug" element={<PublicInvitation />} />

        {/* Admin auth */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin panel — protected routes */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="edit" element={<AdminEdit />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="gallery" element={<AdminGallery />} />
          <Route path="rsvp" element={<AdminRsvp />} />
          <Route path="music" element={<AdminMusic />} />
          <Route path="theme" element={<AdminTheme />} />
          <Route path="preview" element={<AdminPreview />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Catch-all: redirect to public invitation */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
