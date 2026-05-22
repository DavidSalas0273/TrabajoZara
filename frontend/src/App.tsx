import { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage';
import BookingPage from './pages/BookingPage';
import AdminDashboard from './pages/AdminDashboard';
import { TOKEN_KEY, USER_KEY } from './services/api';
import type { User } from './types';

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) as User : null;
  });
  const [view, setView] = useState<'booking' | 'admin'>('booking');
  const isAdmin = user?.role === 'administrativo';

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_KEY));
  }, []);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  if (!token || !user) return <LoginPage onLogin={(nextToken, nextUser) => { setToken(nextToken); setUser(nextUser); }} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">AERO</div>
        <div className="logo-sub">Flight Suite</div>
        <div className="nav-section">Principal</div>
        <button className={`nav-item ${view === 'booking' ? 'active' : ''}`} onClick={() => setView('booking')}>✈ Compra de vuelos</button>
        {isAdmin && <button className={`nav-item ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>▦ Dashboard admin</button>}
        <div className="nav-section">Cuenta</div>
        <button className="nav-item" onClick={logout}>↳ Cerrar sesion</button>
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="avatar">{user.name.slice(0, 2).toUpperCase()}</div>
            <div>
              <div className="user-name">{user.name}</div>
              <div className="user-tier">{user.role === 'administrativo' ? 'Administrativo' : 'Usuario comun'}</div>
            </div>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <div className="greeting">Bienvenido, <em>{user.name.split(' ')[0]}.</em></div>
            <div className="greeting-sub">Gestion de vuelos · reservas · asientos · pagos</div>
          </div>
          <div className="top-actions">
            <span className="pill">Rol: {user.role === 'administrativo' ? 'Administrativo' : 'Usuario'}</span>
            <button className="btn-solid" onClick={() => setView('booking')}>Nuevo tiquete</button>
          </div>
        </header>
        {view === 'admin' && isAdmin ? <AdminDashboard /> : <BookingPage />}
      </main>
    </div>
  );
}

export default App;
