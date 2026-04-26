/**
 * MedScanAI : App Router (Medicine-first architecture)
 * Routes: Home, Chat, MedicineDetail, History, KnowledgeBase (Medicine Library)
 */
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DatabaseProvider } from './context/DatabaseContext';
import { useDatabaseContext } from './context/useDatabaseContext';
import { ToastProvider } from './context/ToastContext';
import DataLoadingScreen from './components/ui/DataLoadingScreen';
import Navbar from './components/Navbar';

const HomePage = lazy(() => import('./pages/HomePage'));
const MedicineDetailPage = lazy(() => import('./pages/MedicineDetailPage'));
const ChatbotPage = lazy(() => import('./pages/ChatbotPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBasePage'));

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

function AppRoutes() {
  const { isReady, progressMsg, progressPercent, error } = useDatabaseContext();

  if (!isReady && !error) {
    return <DataLoadingScreen message={progressMsg || 'Loading offline index…'} progress={progressPercent} />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0E1A] px-6">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <h2 className="text-xl font-bold text-red-300">Database Failed to Load</h2>
          <p className="mt-2 text-sm text-red-200/80">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--color-background)' }}>
      <Navbar />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<ChatbotPage />} />
          <Route path="/medicine/:id" element={<MedicineDetailPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/knowledge" element={<KnowledgeBasePage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <DatabaseProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </DatabaseProvider>
  );
}
