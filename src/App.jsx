import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import RoleGuard from './components/Auth/RoleGuard';
import AdminLayout from './components/layout/AdminLayout';

import DashboardOverview from './features/dashboard/DashboardOverview';
import MembersList from './features/members/MembersList';
import MinistriesList from './features/ministries/MinistriesList';
import EventsList from './features/events/EventsList';
import EventDetails from './features/events/EventDetails';
import SermonsList from './features/sermons/SermonsList';
import BiblePlans from './features/bible/BiblePlans';
import PrayerModeration from './features/prayer/PrayerModeration';
import SettingsLayout from './features/settings/SettingsLayout';
import FinanceLayout from './features/finance/FinanceLayout';
import SettingsProfile from './features/settings/SettingsProfile';
import SettingsUsersAndRoles from './features/settings/SettingsUsersAndRoles';
import MinistryDetails from './features/ministries/MinistryDetails';
import AttendanceDashboard from './features/attendance/AttendanceDashboard';
import TakeAttendance from './features/attendance/TakeAttendance';
import AnnouncementsList from './features/announcements/AnnouncementsList';
import ChurchesDashboard from './features/superadmin/ChurchesDashboard';
import ReportsDashboard from './features/reports/ReportsDashboard';
import SchedulesDashboard from './features/schedules/SchedulesDashboard';
import DiscipleshipPlans from './features/discipleship/DiscipleshipPlans';
import DiscipleshipPlanDetail from './features/discipleship/DiscipleshipPlanDetail';
import SongsList from './features/worship/SongsList';
import SetlistsList from './features/worship/SetlistsList';
import SetlistDetails from './features/worship/SetlistDetails';
import ImportSettingsPage from './features/worship/ImportSettingsPage';
import ImportSongPage from './features/worship/ImportSongPage';

function AppRoutes() {
  const { currentUser } = useAuth();
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Admin Portal Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardOverview />} />
          
          <Route 
            path="members" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin', 'secretary', 'pastor']}>
                <MembersList />
              </RoleGuard>
            } 
          />
          <Route 
            path="ministries" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin', 'pastor', 'ministry_leader', 'secretary']}>
                <MinistriesList />
              </RoleGuard>
            } 
          />
          <Route 
            path="ministries/applications" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin', 'pastor', 'ministry_leader', 'secretary']}>
                <MinistriesList />
              </RoleGuard>
            } 
          />
          <Route 
            path="ministries/:id" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin', 'pastor', 'ministry_leader']}>
                <MinistryDetails />
              </RoleGuard>
            } 
          />
          <Route 
            path="schedules" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin', 'pastor', 'ministry_leader', 'viewer']}>
                <SchedulesDashboard />
              </RoleGuard>
            } 
          />
          <Route 
            path="attendance" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin', 'secretary', 'pastor']}>
                <AttendanceDashboard />
              </RoleGuard>
            } 
          />
          <Route 
            path="attendance/:id" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin', 'secretary', 'pastor']}>
                <TakeAttendance />
              </RoleGuard>
            } 
          />
          <Route 
            path="announcements" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin', 'secretary', 'pastor']}>
                <AnnouncementsList />
              </RoleGuard>
            } 
          />
          <Route 
            path="churches" 
            element={
              <RoleGuard allowedRoles={['super_admin']}>
                <ChurchesDashboard />
              </RoleGuard>
            } 
          />
          <Route 
            path="reports" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin', 'pastor', 'finance_admin']}>
                <ReportsDashboard />
              </RoleGuard>
            } 
          />
        
          <Route 
            path="events" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin', 'secretary', 'pastor']}>
                <EventsList />
              </RoleGuard>
            } 
          />
          <Route 
            path="events/:id" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin', 'secretary', 'pastor', 'viewer']}>
                <EventDetails />
              </RoleGuard>
            } 
          />
          
          <Route 
            path="giving/*" 
            element={<Navigate to="/admin/finance/giving" replace />} 
          />
          
          <Route 
            path="expenses/*" 
            element={<Navigate to="/admin/finance/expenses" replace />} 
          />
          
          <Route 
            path="finance/*" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin', 'finance_admin', 'pastor']}>
                <FinanceLayout />
              </RoleGuard>
            } 
          />
          
          <Route 
            path="prayer"  
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin', 'pastor', 'secretary', 'finance_admin', 'ministry_leader', 'viewer']}>
                <PrayerModeration />
              </RoleGuard>
            } 
          />

          <Route 
            path="sermons" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin', 'pastor']}>
                <SermonsList />
              </RoleGuard>
            } 
          />
          
          <Route 
            path="worship/songs" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin', 'pastor', 'ministry_leader', 'secretary']}>
                <SongsList />
              </RoleGuard>
            } 
          />
          
          <Route 
            path="worship/songs/import" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin', 'pastor', 'ministry_leader']}>
                <ImportSongPage />
              </RoleGuard>
            } 
          />
          
          <Route 
            path="worship/songs/import/settings" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin']}>
                <ImportSettingsPage />
              </RoleGuard>
            } 
          />
          
          <Route 
            path="worship/setlists" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin', 'pastor', 'ministry_leader', 'viewer']}>
                <SetlistsList />
              </RoleGuard>
            } 
          />

          <Route 
            path="worship/setlists/:id" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin', 'pastor', 'ministry_leader', 'viewer']}>
                <SetlistDetails />
              </RoleGuard>
            } 
          />

          <Route 
            path="bible" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin', 'pastor']}>
                <BiblePlans />
              </RoleGuard>
            } 
          />
          
          <Route 
            path="discipleship" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin', 'pastor']}>
                <DiscipleshipPlans />
              </RoleGuard>
            } 
          />

          <Route 
            path="discipleship/:id" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin', 'pastor']}>
                <DiscipleshipPlanDetail />
              </RoleGuard>
            } 
          />

          <Route 
            path="settings" 
            element={
              <RoleGuard allowedRoles={['super_admin', 'church_admin']}>
                <SettingsLayout />
              </RoleGuard>
            } 
          >
            <Route index element={<SettingsProfile />} />
            <Route 
              path="roles" 
              element={
                <RoleGuard allowedRoles={['super_admin', 'church_admin']}>
                  <SettingsUsersAndRoles />
                </RoleGuard>
              } 
            />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
