import { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage';
import BookingPage from './pages/BookingPage';
import AdminDashboard from './pages/AdminDashboard';
import { TOKEN_KEY } from './services/api';

function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [view, setView] = useState<'booking' | 'admin'>('booking');

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_KEY));
  }, []);

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  if (!token) return <LoginPage onLogin={(nextToken) => setToken(nextToken)} />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <strong>AeroZara</strong>
          <span>Gestion de vuelos</span>
        </div>
        <nav>
          <button className={view === 'booking' ? 'active' : ''} onClick={() => setView('booking')}>Compra</button>
          <button className={view === 'admin' ? 'active' : ''} onClick={() => setView('admin')}>Dashboard admin</button>
          <button onClick={logout}>Salir</button>
        </nav>
      </header>
      {view === 'booking' ? <BookingPage /> : <AdminDashboard />}
    </div>
  );
}

export default App;
