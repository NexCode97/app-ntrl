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
import QuotesPage     from "../pages/admin/QuotesPage.jsx";
import ChatPage       from "../pages/ChatPage.jsx";

// Worker pages
import TasksPage           from "../pages/worker/TasksPage.jsx";
import TaskDetailPage      from "../pages/worker/TaskDetailPage.jsx";
import SuppliesWorkerPage  from "../pages/worker/SuppliesWorkerPage.jsx";

function RequireAuth({ children, roles }) {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <div className="flex items-center justify-center h-screen"><div className="text-brand-green animate-pulse">Cargando...</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
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
        {/* Redirect by role */}
        <Route index element={
          user?.role === "admin" || user?.role === "vendedor"
            ? <Navigate to="/dashboard" replace />
            : <Navigate to="/tasks" replace />
        } />

        {/* Admin only */}
        <Route path="users"    element={<RequireAuth roles={["admin"]}><UsersPage /></RequireAuth>} />
        <Route path="reports"  element={<RequireAuth roles={["admin"]}><ReportsPage /></RequireAuth>} />

        {/* Admin + Vendedor */}
        <Route path="dashboard"  element={<RequireAuth roles={["admin","vendedor"]}><DashboardPage /></RequireAuth>} />
        <Route path="orders"     element={<RequireAuth roles={["admin","vendedor"]}><OrdersPage /></RequireAuth>} />
        <Route path="orders/new" element={<RequireAuth roles={["admin","vendedor"]}><OrderCreatePage /></RequireAuth>} />
        <Route path="orders/:id" element={<RequireAuth roles={["admin","vendedor"]}><OrderDetailPage /></RequireAuth>} />
        <Route path="customers"  element={<RequireAuth roles={["admin","vendedor"]}><CustomersPage /></RequireAuth>} />
        <Route path="catalog"    element={<RequireAuth roles={["admin","vendedor"]}><CatalogPage /></RequireAuth>} />
        <Route path="quotes"     element={<RequireAuth roles={["admin","vendedor"]}><QuotesPage /></RequireAuth>} />
        <Route path="calendar"   element={<RequireAuth><CalendarPage /></RequireAuth>} />

        {/* All authenticated users */}
        <Route path="profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="chat"    element={<RequireAuth><ChatPage /></RequireAuth>} />

        {/* Supplies — admin ve gestión completa, vendedor y worker ven sus solicitudes */}
        <Route path="supplies" element={
          <RequireAuth>
            {user?.role === "admin" ? <SuppliesPage /> : <SuppliesWorkerPage />}
          </RequireAuth>
        } />

        {/* Worker routes */}
        <Route path="tasks"     element={<RequireAuth roles={["worker"]}><TasksPage /></RequireAuth>} />
        <Route path="tasks/:id" element={<RequireAuth roles={["worker"]}><TaskDetailPage /></RequireAuth>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
