import { FormEvent, useState } from 'react';
import { api, persistAuth } from '../services/api';
import type { User } from '../types';

function LoginPage({ onLogin }: { onLogin: (token: string, user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('admin@aerozara.com');
  const [password, setPassword] = useState('Admin123');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (mode === 'register') {
        await api.register(name, email, password, phone);
        setSuccess('Registro exitoso. Ahora inicia sesion.');
        setMode('login');
        return;
      }
      const payload = await api.login(email, password);
      persistAuth(payload.token, payload.user);
      onLogin(payload.token, payload.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la accion.');
    }
  };

  return (
    <main className="login-page">
      <section className="login-left">
        <div className="login-brand">AeroVoy</div>
        <div className="login-copy">
          <h1>Tu viaje empieza aqui</h1>
          <p>Busca vuelos, arma tu viaje y gestiona reservas en una experiencia clara y rapida.</p>
        </div>
        <div className="login-left-card">
          <strong>Vuelos en tiempo real</strong>
          <span>Consulta disponibilidad, precios y servicios extra en un solo lugar.</span>
        </div>
      </section>
      <section className="login-right">
        <form className="login-card" onSubmit={submit}>
          <div className="profile-switch">
            <button type="button" onClick={() => setMode('login')}>Iniciar sesion</button>
            <button type="button" onClick={() => setMode('register')}>Registrarse</button>
          </div>
          {mode === 'register' && (
            <>
              <label className="field"><span>Nombre</span><input value={name} onChange={(e) => setName(e.target.value)} required /></label>
              <label className="field"><span>Telefono</span><input value={phone} onChange={(e) => setPhone(e.target.value)} required /></label>
            </>
          )}
          <label className="field"><span>Correo</span><input value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label className="field"><span>Contrasena</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
          <button className="login-submit" type="submit"><span>{mode === 'login' ? 'Ingresar' : 'Crear cuenta'}</span></button>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
