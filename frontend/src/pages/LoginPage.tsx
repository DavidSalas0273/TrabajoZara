import { FormEvent, useState } from 'react';
import { api } from '../services/api';
import type { User } from '../types';

function LoginPage({ onLogin }: { onLogin: (token: string, user: User) => void }) {
  const [email, setEmail] = useState('admin@aerozara.com');
  const [password, setPassword] = useState('Admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
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
      <section className="login-left">
        <svg className="login-geo" viewBox="0 0 520 820" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="flight-grid" width="52" height="52" patternUnits="userSpaceOnUse">
              <path d="M 52 0 L 0 0 0 52" fill="none" stroke="#8cc7ff" strokeWidth="0.7" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#flight-grid)" />
          <g transform="translate(260,380)" stroke="#8cc7ff" fill="none">
            <circle r="82" strokeWidth="0.7" />
            <circle r="138" strokeWidth="0.55" />
            <circle r="195" strokeWidth="0.45" />
            <circle r="260" strokeWidth="0.35" />
            <circle r="340" strokeWidth="0.25" />
          </g>
          <path d="M 70 570 Q 260 240 460 170" stroke="#ffffff" strokeWidth="1.4" fill="none" strokeDasharray="7 8" />
          <circle cx="70" cy="570" r="6" fill="#8cc7ff" />
          <circle cx="460" cy="170" r="6" fill="#ffffff" />
        </svg>
        <div className="login-glow" />
        <div className="login-brand">AeroZara<span>.</span></div>
        <div className="login-copy">
          <h1>El control de vuelos que tu equipo necesita.</h1>
          <p>Gestiona reservas, pagos, pasajeros y ocupacion de asientos desde un panel unificado con datos reales.</p>
          <div className="login-stats">
            <article><strong>24</strong><span>asientos por vuelo</span></article>
            <article><strong>2</strong><span>roles activos</span></article>
            <article><strong>100%</strong><span>SQLite local</span></article>
          </div>
        </div>
        <div className="trust-row">
          <div className="trust-avatars">
            <span>AD</span><span>US</span><span>AZ</span>
          </div>
          <p><strong>Acceso seguro</strong> para administracion y compra de tiquetes.</p>
        </div>
        <div className="login-diagonal" />
      </section>

      <section className="login-right">
        <div className="corner-dec" />
        <div className="corner-dec-bl" />
        <form className="login-card" onSubmit={submit}>
          <span className="form-eyebrow">Bienvenido de nuevo</span>
          <h2>Iniciar<br />sesion</h2>
          <p>Accede al sistema de gestion de vuelos AeroZara.</p>

          <div className="profile-switch">
            <button type="button" onClick={() => useProfile('administrativo')}>Administrativo</button>
            <button type="button" onClick={() => useProfile('usuario')}>Usuario comun</button>
          </div>

          <div className="login-divider"><i /><span>continua con tus credenciales</span><i /></div>

          <label className="field">
            <span>Correo electronico</span>
            <div className="field-wrap">
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@aerozara.com" />
              <i />
            </div>
          </label>
          <label className="field">
            <span>Contrasena</span>
            <div className="field-wrap">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
              <button type="button" className="eye-button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Ocultar' : 'Ver'}</button>
              <i />
            </div>
          </label>

          <div className="row-forgot">
            <button className={`check-wrap ${remember ? 'checked' : ''}`} type="button" onClick={() => setRemember((value) => !value)}>
              <span>{remember ? '✓' : ''}</span> Recordarme
            </button>
            <a href="#login">¿Olvidaste tu contrasena?</a>
          </div>

          {error && <p className="error">{error}</p>}
          <button className="login-submit" type="submit"><span>Ingresar al panel</span><b>→</b></button>
          <p className="register-row">¿No tienes cuenta? <a href="#access">Solicitar acceso</a></p>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
