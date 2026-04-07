import { BrowserRouter, Route, Routes } from 'react-router';

import ErrorBoundary from './components/ErrorBoundary';
import { HabitProvider } from './contexts/habitContext';
import AddHabitPage from './pages/AddHabitPage';
import DailyView from './pages/DailyView';
import HabitDetail from './pages/HabitDetail';
import LicencesPage from './pages/LicencesPage';
import PrivacyPage from './pages/PrivacyPage';
import SettingsPage from './pages/SettingsPage';
import TermsPage from './pages/TermsPage';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <HabitProvider>
          <Routes>
            <Route path='/' element={<DailyView />} />
            <Route path='/habit/:id' element={<HabitDetail />} />
            <Route path='/add' element={<AddHabitPage />} />
            <Route path='/settings' element={<SettingsPage />} />
            <Route path='/privacy' element={<PrivacyPage />} />
            <Route path='/terms' element={<TermsPage />} />
            <Route path='/licences' element={<LicencesPage />} />
          </Routes>
        </HabitProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
