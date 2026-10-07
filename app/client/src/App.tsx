import { createBrowserRouter, Navigate, RouterProvider, Outlet } from 'react-router';
import { useEffect, useState } from 'react';
import { Badge } from '@databricks/appkit-ui/react';
import { Gauge } from 'lucide-react';
import { ReviewPage } from './pages/review/ReviewPage';

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
      <header className="border-b px-4 md:px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Pressure Gauge Reader</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" title="Signed-in user">
            {email ?? 'Signed in'}
          </Badge>
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
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
