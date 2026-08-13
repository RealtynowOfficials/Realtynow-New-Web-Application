import { Suspense } from 'react';
import { Navigate, Outlet, useLocation, ScrollRestoration } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { isAdmin2faVerified } from '../lib/admin-security';
import { PageLoader } from './ui';
import { ErrorBoundary } from './error-boundary';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface AdminProtectedRouteProps {
  requiredRoles?: ('admin' | 'super_admin')[];
}

// Gate for every /admin/* route: requires a REAL Supabase Auth session
// (mirrors is_admin()'s own check: role IN ('admin','super_admin') AND
// status='active') plus the server-verified secret-code second factor
// (supabase/functions/admin-security). Fine-grained tier (admin vs
// super_admin vs moderator vs support) still lives on the `admins` table —
// see src/pages/admin/dashboard.tsx, which reads it via the `get-me` action
// rather than a direct client query.
export function AdminProtectedRoute({ requiredRoles }: AdminProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }

  const isAdminRole = profile?.role === 'admin' || profile?.role === 'super_admin';

  if (!user || !profile || !isAdminRole || profile.status !== 'active') {
    return <Navigate to={`/admin/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!isAdmin2faVerified()) {
    return <Navigate to={`/admin/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(profile.role as 'admin' | 'super_admin')) {
    return <AdminAccessDenied role={profile.role} reason={`Requires role: ${requiredRoles.join(' or ')}`} />;
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

function AdminAccessDenied({ role, reason }: { role: string; reason: string }) {
  return (
    <div className="grid min-h-[70vh] place-items-center bg-navy-950 p-6 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-red-500/20 bg-white/[0.04] p-8 text-center shadow-2xl backdrop-blur-2xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <h1 className="mt-5 font-display text-2xl font-bold text-white">Access Restricted</h1>
        <p className="mt-2 text-sm text-navy-300">
          Your admin role (<span className="font-semibold capitalize text-red-400">{role.replace('_', ' ')}</span>) does not have sufficient permissions to view this section.
        </p>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-navy-400">
          <p className="font-semibold text-navy-300">{reason}</p>
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
