import { HabitProvider } from './contexts/habitContext';
import DailyView from './pages/DailyView';

export default function App() {
  return (
    <HabitProvider>
      <DailyView />
    </HabitProvider>
  );
}
