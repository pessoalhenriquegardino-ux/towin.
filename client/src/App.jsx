import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import ScrollToTop from './components/ScrollToTop.jsx';
import Dashboard from './components/Dashboard.jsx';
import GoalForm from './components/GoalForm.jsx';
import AddictionForm from './components/AddictionForm.jsx';
import Timeline from './components/Timeline.jsx';
import Chat from './components/Chat.jsx';
import Settings from './components/Settings.jsx';
import Pomodoro from './components/Pomodoro.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <ScrollToTop />
      <NavBar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/metas/nova" element={<GoalForm />} />
          <Route path="/metas/:id/editar" element={<GoalForm />} />
          <Route path="/vicios/novo" element={<AddictionForm />} />
          <Route path="/vicios/:id/editar" element={<AddictionForm />} />
          <Route path="/linha-do-tempo" element={<Timeline />} />
          <Route path="/pomodoro" element={<Pomodoro />} />
          <Route path="/coach" element={<Chat />} />
          <Route path="/config" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
