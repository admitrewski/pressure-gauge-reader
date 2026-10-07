import { createBrowserRouter, Navigate, NavLink, RouterProvider, Outlet } from 'react-router';
import { useEffect, useState } from 'react';
import { Gauge } from 'lucide-react';
import { BRAND } from './brand';
import { ArchitecturePage } from './pages/architecture/ArchitecturePage';
import { ModelUsagePage } from './pages/model/ModelUsagePage';
import { ReviewPage } from './pages/review/ReviewPage';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
    isActive
      ? 'bg-brand-teal text-brand-teal-foreground'
      : 'text-brand-navy-foreground/75 hover:bg-white/10 hover:text-brand-navy-foreground'
  }`;

function useSignedInUser() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/whoami')
      .then((r) => (r.ok ? (r.json() as Promise<{ email: string | null }>) : null))
      .then((me) => setEmail(me?.email ?? null))
      .catch(() => setEmail(null));
  }, []);
  return email;
}

function Layout() {
  const email = useSignedInUser();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-brand-navy text-brand-navy-foreground border-b-4 border-brand-teal">
        <div className="px-4 md:px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-teal">
              <Gauge className="h-5 w-5 text-brand-teal-foreground" />
            </span>
            <div className="leading-tight">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-teal">
                {BRAND.company}
              </div>
              <h1 className="text-lg font-semibold">{BRAND.product}</h1>
            </div>
          </div>
          <nav className="flex gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Review readings
            </NavLink>
            <NavLink to="/how-it-works" className={navLinkClass}>
              How it works
            </NavLink>
            <NavLink to="/model" className={navLinkClass}>
              AI model & usage
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden lg:block text-xs text-brand-navy-foreground/70">{BRAND.tagline}</span>
            <span
              className="rounded-full border border-white/25 px-2.5 py-0.5 text-xs text-brand-navy-foreground/90"
              title="Signed-in user"
            >
              {email ?? 'Signed in'}
            </span>
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <ReviewPage /> },
      { path: '/how-it-works', element: <ArchitecturePage /> },
      { path: '/model', element: <ModelUsagePage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
