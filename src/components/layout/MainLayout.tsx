/**
 * MainLayout : legacy wrapper, kept for compatibility.
 * Now just renders children via Outlet (Navbar is in App.tsx).
 */
import { Outlet } from 'react-router-dom';
import { Suspense } from 'react';

function PageLoader() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[300px]">
      <div className="flex gap-1.5">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  );
}

export default function MainLayout() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  );
}
