import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from '@/shared/layout/AppShell';
import AuthGuard from '@/features/auth/components/AuthGuard';

const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const ProcessListPage = lazy(() => import('@/features/processes/pages/ProcessListPage'));
const ProcessDetailPage = lazy(() => import('@/features/processes/pages/ProcessDetailPage'));
const InstanceDetailPage = lazy(() => import('@/features/processes/pages/InstanceDetailPage'));
const TaskListPage = lazy(() => import('@/features/tasks/pages/TaskListPage'));
const IncidentListPage = lazy(() => import('@/features/incidents/pages/IncidentListPage'));
const JobListPage = lazy(() => import('@/features/jobs/pages/JobListPage'));
const HistoryPage = lazy(() => import('@/features/history/pages/HistoryPage'));
const DeploymentListPage = lazy(() => import('@/features/deployments/pages/DeploymentListPage'));
const DeploymentDetailPage = lazy(() => import('@/features/deployments/pages/DeploymentDetailPage'));
const DecisionListPage = lazy(() => import('@/features/decisions/pages/DecisionListPage'));
const DecisionDetailPage = lazy(() => import('@/features/decisions/pages/DecisionDetailPage'));
const UsersPage = lazy(() => import('@/features/admin/pages/UsersPage'));
const GroupsPage = lazy(() => import('@/features/admin/pages/GroupsPage'));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'));
const ExternalTaskPage = lazy(() => import('@/features/external-tasks/pages/ExternalTaskPage'));
const TopicRegistryPage = lazy(() => import('@/features/external-tasks/pages/TopicRegistryPage'));
const RegisterTopicPage = lazy(() => import('@/features/external-tasks/pages/RegisterTopicPage'));
const WorkflowBuilderPage = lazy(() => import('@/features/external-tasks/pages/WorkflowBuilderPage'));
const CalendarDashboardPage = lazy(() => import('@/features/calendars/pages/CalendarDashboardPage'));
const CalendarDetailPage = lazy(() => import('@/features/calendars/pages/CalendarDetailPage'));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const SetupPage = lazy(() => import('@/features/setup/pages/SetupPage'));

function SuspenseWrapper({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<SuspenseWrapper><LoginPage /></SuspenseWrapper>} />
        <Route path="/setup" element={<SuspenseWrapper><SetupPage /></SuspenseWrapper>} />

        <Route element={<AuthGuard><AppShell /></AuthGuard>}>
          <Route path="/dashboard" element={<SuspenseWrapper><DashboardPage /></SuspenseWrapper>} />
          <Route path="/processes" element={<SuspenseWrapper><ProcessListPage /></SuspenseWrapper>} />
          <Route path="/processes/:id" element={<SuspenseWrapper><ProcessDetailPage /></SuspenseWrapper>} />
          <Route path="/processes/instance/:id" element={<SuspenseWrapper><InstanceDetailPage /></SuspenseWrapper>} />
          <Route path="/tasks" element={<SuspenseWrapper><TaskListPage /></SuspenseWrapper>} />
          <Route path="/incidents" element={<SuspenseWrapper><IncidentListPage /></SuspenseWrapper>} />
          <Route path="/jobs" element={<SuspenseWrapper><JobListPage /></SuspenseWrapper>} />
          <Route path="/history" element={<SuspenseWrapper><HistoryPage /></SuspenseWrapper>} />
          <Route path="/deployments" element={<SuspenseWrapper><DeploymentListPage /></SuspenseWrapper>} />
          <Route path="/deployments/:id" element={<SuspenseWrapper><DeploymentDetailPage /></SuspenseWrapper>} />
          <Route path="/decisions" element={<SuspenseWrapper><DecisionListPage /></SuspenseWrapper>} />
          <Route path="/decisions/:id" element={<SuspenseWrapper><DecisionDetailPage /></SuspenseWrapper>} />
          <Route path="/admin/users" element={<SuspenseWrapper><UsersPage /></SuspenseWrapper>} />
          <Route path="/admin/groups" element={<SuspenseWrapper><GroupsPage /></SuspenseWrapper>} />
          <Route path="/settings" element={<SuspenseWrapper><SettingsPage /></SuspenseWrapper>} />
          <Route path="/calendars" element={<SuspenseWrapper><CalendarDashboardPage /></SuspenseWrapper>} />
          <Route path="/calendars/:calendarCode" element={<SuspenseWrapper><CalendarDetailPage /></SuspenseWrapper>} />
          <Route path="/external-tasks" element={<SuspenseWrapper><ExternalTaskPage /></SuspenseWrapper>} />
          <Route path="/external-tasks/topics" element={<SuspenseWrapper><TopicRegistryPage /></SuspenseWrapper>} />
          <Route path="/external-tasks/topics/register" element={<SuspenseWrapper><RegisterTopicPage /></SuspenseWrapper>} />
          <Route path="/external-tasks/workflows/builder" element={<SuspenseWrapper><WorkflowBuilderPage /></SuspenseWrapper>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
