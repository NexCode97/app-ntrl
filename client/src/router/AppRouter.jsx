import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore.js";
import LoginPage        from "../pages/LoginPage.jsx";
import AuthCallbackPage from "../pages/AuthCallbackPage.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";

// Admin pages
import DashboardPage   from "../pages/admin/DashboardPage.jsx";
import OrdersPage      from "../pages/admin/OrdersPage.jsx";
import OrderCreatePage from "../pages/admin/OrderCreatePage.jsx";
import OrderDetailPage from "../pages/admin/OrderDetailPage.jsx";
import CustomersPage   from "../pages/admin/CustomersPage.jsx";
import UsersPage       from "../pages/admin/UsersPage.jsx";
import CatalogPage     from "../pages/admin/CatalogPage.jsx";
import ReportsPage     from "../pages/admin/ReportsPage.jsx";
import SuppliesPage   from "../pages/admin/SuppliesPage.jsx";
import ProfilePage    from "../pages/admin/ProfilePage.jsx";
import CalendarPage   from "../pages/admin/CalendarPage.jsx";
import ChatPage       from "../pages/ChatPage.jsx";

// Worker pages
import TasksPage           from "../pages/worker/TasksPage.jsx";
import TaskDetailPage      from "../pages/worker/TaskDetailPage.jsx";
import SuppliesWorkerPage  from "../pages/worker/SuppliesWorkerPage.jsx";

function RequireAuth({ children, role }) {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <div className="flex items-center justify-center h-screen"><div className="text-brand-green animate-pulse">Cargando...</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function AppRouter() {
  const { user } = useAuthStore();

  return (
    <Routes>
      <Route path="/login"         element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      <Route path="/" element={
        <RequireAuth>
          <AppLayout />
        </RequireAuth>
      }>
        {/* Admin routes */}
        <Route index element={
          user?.role === "admin"
            ? <Navigate to="/dashboard" replace />
            : <Navigate to="/tasks" replace />
        } />

        <Route path="dashboard"        element={<RequireAuth role="admin"><DashboardPage /></RequireAuth>} />
        <Route path="orders"           element={<RequireAuth role="admin"><OrdersPage /></RequireAuth>} />
        <Route path="orders/new"       element={<RequireAuth role="admin"><OrderCreatePage /></RequireAuth>} />
        <Route path="orders/:id"       element={<RequireAuth role="admin"><OrderDetailPage /></RequireAuth>} />
        <Route path="customers"        element={<RequireAuth role="admin"><CustomersPage /></RequireAuth>} />
        <Route path="users"            element={<RequireAuth role="admin"><UsersPage /></RequireAuth>} />
        <Route path="catalog"          element={<RequireAuth role="admin"><CatalogPage /></RequireAuth>} />
        <Route path="reports"          element={<RequireAuth role="admin"><ReportsPage /></RequireAuth>} />
        <Route path="calendar"         element={<RequireAuth><CalendarPage /></RequireAuth>} />

        {/* All authenticated users */}
        <Route path="profile"          element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="chat"             element={<RequireAuth><ChatPage /></RequireAuth>} />

        {/* Supplies — admin ve gestión, worker ve sus solicitudes */}
        <Route path="supplies" element={
          <RequireAuth>
            {user?.role === "admin" ? <SuppliesPage /> : <SuppliesWorkerPage />}
          </RequireAuth>
        } />

        {/* Worker routes */}
        <Route path="tasks"            element={<RequireAuth role="worker"><TasksPage /></RequireAuth>} />
        <Route path="tasks/:id"        element={<RequireAuth role="worker"><TaskDetailPage /></RequireAuth>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
