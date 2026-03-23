import { BrowserRouter, Route, Routes } from 'react-router';

import { HabitProvider } from './contexts/habitContext';
import DailyView from './pages/DailyView';
import HabitDetail from './pages/HabitDetail';

export default function App() {
  return (
    <BrowserRouter>
      <HabitProvider>
        <Routes>
          <Route path='/' element={<DailyView />} />
          <Route path='/habit/:id' element={<HabitDetail />} />
        </Routes>
      </HabitProvider>
    </BrowserRouter>
  );
}
