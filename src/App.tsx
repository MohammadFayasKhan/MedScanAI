/**
 * MedScan+ — Router Setup
 * All 5 routes with lazy loading and context providers.
 */
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DatabaseProvider } from './context/DatabaseContext';
import { MedicineProvider } from './context/MedicineContext';

const HomePage           = lazy(() => import('./pages/HomePage'));
const ManualSearchPage   = lazy(() => import('./pages/ManualSearchPage'));
const MedicineDetailPage = lazy(() => import('./pages/MedicineDetailPage'));
const ChatbotPage        = lazy(() => import('./pages/ChatbotPage'));
const HistoryPage        = lazy(() => import('./pages/HistoryPage'));

import Navbar from './components/Navbar';

function PageLoader() {
  return (
    <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
      <div className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--color-surface-border)', borderTopColor: 'var(--color-primary)' }} />
    </div>
  );
}

export default function App() {
  return (
    <DatabaseProvider>
      <MedicineProvider>
        <BrowserRouter>
          <div className="flex flex-col min-h-dvh">
            <Navbar />
            <div className="flex-1">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/"              element={<HomePage />} />
                  <Route path="/search"        element={<ManualSearchPage />} />
                  <Route path="/medicine/:id"  element={<MedicineDetailPage />} />
                  <Route path="/chat"          element={<ChatbotPage />} />
                  <Route path="/history"       element={<HistoryPage />} />
                  <Route path="*"             element={<HomePage />} />
                </Routes>
              </Suspense>
            </div>
          </div>
        </BrowserRouter>
      </MedicineProvider>
    </DatabaseProvider>
  );
}
