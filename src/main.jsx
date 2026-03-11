import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'

import DashboardLayout from './components/layout/DashboardLayout'

import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import CreateAvatar from './pages/CreateAvatar'
import MyAvatars from './pages/MyAvatars'
import Agents from './pages/Agents'
import CreateAgent from './pages/CreateAgent'
import EquosCall from './pages/EquosCall'
import SessionsHistory from './pages/SessionsHistory'
import ApiKeys from './pages/ApiKeys'
import ApiDocs from './pages/ApiDocs'
import Settings from './pages/Settings'
import FiruzehDemo from './pages/FiruzehDemo'

import AdminDashboard from './pages/admin/AdminDashboard'
import UsersPage from './pages/admin/UsersPage'
import AvatarsAdmin from './pages/admin/AvatarsAdmin'
import AgentsAdmin from './pages/admin/AgentsAdmin'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/api-docs" element={<ApiDocs />} />
        <Route path="/demo/firuzeh" element={<FiruzehDemo />} />

        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<CreateAvatar />} />
          <Route path="/avatars" element={<MyAvatars />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/create" element={<CreateAgent />} />
          <Route path="/call" element={<EquosCall />} />
          <Route path="/call/:avatarId" element={<EquosCall />} />
          <Route path="/sessions" element={<SessionsHistory />} />
          <Route path="/keys" element={<ApiKeys />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/avatars" element={<AvatarsAdmin />} />
          <Route path="/admin/agents" element={<AgentsAdmin />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
