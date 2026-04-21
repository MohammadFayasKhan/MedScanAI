/**
 * MedScan+ — Router Setup
 * All 5 routes with lazy loading and context providers.
 */
import { lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DatabaseProvider } from './context/DatabaseContext';

const HomePage           = lazy(() => import('./pages/HomePage'));
const MedicineDetailPage = lazy(() => import('./pages/MedicineDetailPage'));
const ChatbotPage        = lazy(() => import('./pages/ChatbotPage'));
const HistoryPage        = lazy(() => import('./pages/HistoryPage'));



import MainLayout from './components/layout/MainLayout';

export default function App() {
  return (
    <DatabaseProvider>
      <BrowserRouter>
        <Routes>
            <Route element={<MainLayout />}>
              <Route path="/"              element={<HomePage />} />
              <Route path="/medicine/:id"  element={<MedicineDetailPage />} />
              <Route path="/chat"          element={<ChatbotPage />} />
              <Route path="/history"       element={<HistoryPage />} />
              <Route path="*"              element={<HomePage />} />
            </Route>
        </Routes>
      </BrowserRouter>
    </DatabaseProvider>
  );
}
