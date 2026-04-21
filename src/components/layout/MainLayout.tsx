import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar';
import Sidebar from './Sidebar';
import { Suspense } from 'react';

function PageLoader() {
  return (
    <div className="w-full h-full min-h-[50vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--color-surface-border)', borderTopColor: 'var(--color-primary)' }} />
    </div>
  );
}

export default function MainLayout() {
  return (
    <div className="flex flex-col min-h-dvh">
      <Navbar />
      <div className="flex flex-1 w-full relative">
        <Sidebar />
        <main className="flex-1 w-full min-w-0">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
