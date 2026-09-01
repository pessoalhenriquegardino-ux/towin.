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
    <nav
      className="panel"
      style={{
        position: 'sticky',
        bottom: 0,
        display: 'flex',
        justifyContent: 'space-around',
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: 'none',
        paddingBottom: 'var(--safe-bottom)',
        zIndex: 20,
      }}
    >
      {itens.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '10px 10px 9px',
            color: isActive ? 'var(--text)' : 'var(--text-faint)',
            fontSize: 10.5,
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            flex: 1,
          })}
        >
          {({ isActive }) => (
            <>
              <span
                className={isActive ? 'glass-circle' : ''}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                }}
              >
                {item.icon}
              </span>
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
