import { BrowserRouter, Route, Routes } from 'react-router';

import ErrorBoundary from './components/ErrorBoundary';
import { HabitProvider } from './contexts/habitContext';
import DailyView from './pages/DailyView';
import HabitDetail from './pages/HabitDetail';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <HabitProvider>
          <Routes>
            <Route path='/' element={<DailyView />} />
            <Route path='/habit/:id' element={<HabitDetail />} />
          </Routes>
        </HabitProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
