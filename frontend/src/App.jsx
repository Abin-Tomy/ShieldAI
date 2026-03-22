import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ScanPage from './pages/ScanPage';
import HistoryPage from './pages/HistoryPage';

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#111827',
            color: '#f9fafb',
            border: '1px solid #1f2937',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#111827',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#111827',
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="scan" element={<ScanPage />} />
          <Route path="history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
