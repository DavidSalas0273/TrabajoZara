import { FormEvent, useState } from 'react';
import { api } from '../services/api';

function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('admin@aerozara.com');
  const [password, setPassword] = useState('Admin123');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const payload = await api.login(email, password);
      onLogin(payload.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesion.');
    }
  };

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <span className="eyebrow">AeroZara</span>
        <h1>Gestion de vuelos</h1>
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <p className="error">{error}</p>}
        <button className="primary-button" type="submit">Iniciar sesion</button>
      </form>
    </main>
  );
}

export default LoginPage;
