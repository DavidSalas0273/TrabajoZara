import { FormEvent, useState } from 'react';
import { api } from '../services/api';
import type { User } from '../types';

function LoginPage({ onLogin }: { onLogin: (token: string, user: User) => void }) {
  const [email, setEmail] = useState('admin@aerozara.com');
  const [password, setPassword] = useState('Admin123');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const payload = await api.login(email, password);
      onLogin(payload.token, payload.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesion.');
    }
  };

  const useProfile = (profile: 'administrativo' | 'usuario') => {
    if (profile === 'administrativo') {
      setEmail('admin@aerozara.com');
      setPassword('Admin123');
      return;
    }
    setEmail('usuario@aerozara.com');
    setPassword('Usuario123');
  };

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <span className="eyebrow">AeroZara</span>
        <h1>Gestion premium de vuelos</h1>
        <p>Ingresa como usuario comun para comprar tiquetes o como administrativo para revisar estadisticas reales.</p>
        <div className="profile-switch">
          <button type="button" onClick={() => useProfile('administrativo')}>Administrativo</button>
          <button type="button" onClick={() => useProfile('usuario')}>Usuario comun</button>
        </div>
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <p className="error">{error}</p>}
        <button className="btn-solid wide" type="submit">Iniciar sesion</button>
      </form>
    </main>
  );
}

export default LoginPage;
