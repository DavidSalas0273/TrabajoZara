import { useState } from 'react';
import LoginPage from './pages/LoginPage';
import BookingPage from './pages/BookingPage';
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage from './pages/ProfilePage';
import { TOKEN_KEY, USER_KEY, clearAuth } from './services/api';
import type { User } from './types';

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? (JSON.parse(stored) as User) : null;
  });
  const [view, setView] = useState<'booking' | 'admin' | 'admin-catalog' | 'admin-orders' | 'profile'>(
    user?.role === 'administrativo' ? 'admin' : 'booking'
  );
  const isAdmin = user?.role === 'administrativo';

  const logout = () => {
    clearAuth();
    setToken(null);
    setUser(null);
  };

  if (!token || !user) {
    return <LoginPage onLogin={(nextToken, nextUser) => { setToken(nextToken); setUser(nextUser); }} />;
  }

  return (
    <div className={`app-shell ${view === 'admin' && isAdmin ? 'admin-shell' : ''}`}>
      <aside className="sidebar">
        <div className="logo">AERO</div>
        <div className="logo-sub">Flight Suite</div>
        <div className="nav-section">Principal</div>
        {!isAdmin && <button className={`nav-item ${view === 'booking' ? 'active' : ''}`} onClick={() => setView('booking')}>Gestion de viaje</button>}
        {isAdmin && <button className={`nav-item ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>Dashboard admin</button>}
        {isAdmin && <button className={`nav-item ${view === 'admin-catalog' ? 'active' : ''}`} onClick={() => setView('admin-catalog')}>Catalogo usuario</button>}
        {isAdmin && <button className={`nav-item ${view === 'admin-orders' ? 'active' : ''}`} onClick={() => setView('admin-orders')}>Ordenes recientes</button>}
        <button className={`nav-item ${view === 'profile' ? 'active' : ''}`} onClick={() => setView('profile')}>Mi perfil</button>
        <div className="nav-section">Cuenta</div>
        <button className="nav-item" onClick={logout}>Cerrar sesion</button>
      </aside>
      <main className="main">
        {isAdmin ? (
          view === 'profile' ? (
            <ProfilePage />
          ) : view === 'admin-catalog' ? (
            <AdminDashboard section="catalogo" />
          ) : view === 'admin-orders' ? (
            <AdminDashboard section="ordenes" />
          ) : (
            <AdminDashboard section="ventas" />
          )
        ) : (view === 'profile' ? <ProfilePage /> : <BookingPage />)}
      </main>
    </div>
  );
}

export default App;
