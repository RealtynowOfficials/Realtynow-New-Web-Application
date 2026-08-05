import { Suspense } from 'react';
import { Navigate, Outlet, useLocation, ScrollRestoration } from 'react-router-dom';
import { useAdminAuth } from '../contexts/admin-auth-context';
import { AdminRole, ROLE_PERMISSIONS } from '../lib/admin-auth';
import { PageLoader } from './ui';
import { ErrorBoundary } from './error-boundary';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface AdminProtectedRouteProps {
  requiredRoles?: AdminRole[];
  requiredPermission?: string;
}

export function AdminProtectedRoute({ requiredRoles, requiredPermission }: AdminProtectedRouteProps) {
  const { admin, loading, loginStep, hasRole, hasPermission } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  // Not authenticated as Admin -> bounce strictly to /admin/login
  if (!admin || loginStep !== 'authenticated') {
    return <Navigate to={`/admin/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // Role validation check
  if (requiredRoles && requiredRoles.length > 0 && !hasRole(...requiredRoles)) {
    return <AdminAccessDenied admin={admin} reason={`Requires role: ${requiredRoles.join(' or ')}`} />;
  }

  // Specific Permission check
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <AdminAccessDenied admin={admin} reason={`Requires permission: ${requiredPermission}`} />;
  }

  return (
    <ErrorBoundary>
      <ScrollRestoration />
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  );
}

function AdminAccessDenied({ admin, reason }: { admin: { name: string; role: string }; reason: string }) {
  const userPerms = ROLE_PERMISSIONS[admin.role as AdminRole] || [];

  return (
    <div className="grid min-h-[70vh] place-items-center bg-navy-950 p-6 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-red-500/20 bg-white/[0.04] p-8 text-center shadow-2xl backdrop-blur-2xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <h1 className="mt-5 font-display text-2xl font-bold text-white">Access Restricted</h1>
        <p className="mt-2 text-sm text-navy-300">
          Your admin role (<span className="font-semibold capitalize text-red-400">{admin.role.replace('_', ' ')}</span>) does not have sufficient permissions to view this section.
        </p>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-navy-400">
          <p className="font-semibold text-navy-300">{reason}</p>
          <p className="mt-1 text-[11px]">Your assigned capabilities: {userPerms.join(', ')}</p>
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <a
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-900/30 transition hover:shadow-red-900/50"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
