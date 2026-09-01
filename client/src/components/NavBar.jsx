import { NavLink } from 'react-router-dom';

const itens = [
  { to: '/', label: 'Painel', icon: '⌂' },
  { to: '/pomodoro', label: 'Foco', icon: '◷' },
  { to: '/linha-do-tempo', label: 'Jornada', icon: '⏱' },
  { to: '/coach', label: 'Coach', icon: '✦' },
  { to: '/config', label: 'Ajustes', icon: '⚙' },
];

export default function NavBar() {
  return (
    <nav className="app-nav panel">
      <img src="/logo-wordmark.png" alt="To Win" className="app-nav-logo" />
      <div className="app-nav-items">
        {itens.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `app-nav-item${isActive ? ' active' : ''}`}
          >
            <span className="app-nav-icon-wrap">
              <span className="app-nav-icon">{item.icon}</span>
            </span>
            <span className="app-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
