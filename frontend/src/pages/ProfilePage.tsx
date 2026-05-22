import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { UserProfile } from '../types';

function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.me().then(setProfile).catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar perfil.'));
  }, []);

  const splitName = useMemo(() => {
    const full = profile?.name?.trim() || '';
    const parts = full.split(/\s+/).filter(Boolean);
    return {
      firstName: parts.slice(0, 1).join(' '),
      lastName: parts.slice(1).join(' ')
    };
  }, [profile?.name]);

  const memberSince = useMemo(() => new Date().toLocaleDateString('es-CO'), []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setError('');
    setMessage('');
    try {
      const result = await api.updateProfile({
        name: `${splitName.firstName} ${splitName.lastName}`.trim(),
        email: profile.email,
        phone: profile.phone || '',
        city: profile.city || '',
        documentNumber: profile.document_number || '',
        ...(password ? { password } : {})
      });
      setMessage(result.message);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar perfil.');
    }
  };

  if (!profile) return <div className="panel"><p>Cargando perfil...</p>{error && <p className="error">{error}</p>}</div>;

  const isAdmin = profile.role === 'administrativo';

  return (
    <div className="profile-view">
      <section className={`profile-hero ${isAdmin ? 'admin' : ''}`}>
        <div className="profile-avatar">👤</div>
        <h1>{profile.name || 'Usuario'}</h1>
        <p className="profile-handle">@{profile.email.split('@')[0]}</p>
        <span className={`profile-role ${isAdmin ? 'admin' : 'user'}`}>{isAdmin ? 'Administrador' : 'Usuario'}</span>
        <p className="profile-member">Miembro desde {memberSince}</p>
      </section>

      <form className="profile-edit-card" onSubmit={submit}>
        <div className="profile-edit-head">Editar Informacion</div>
        <div className="profile-edit-grid">
          <label>Nombre
            <input value={splitName.firstName} onChange={(e) => setProfile({ ...profile, name: `${e.target.value} ${splitName.lastName}`.trim() })} />
          </label>
          <label>Apellido
            <input value={splitName.lastName} onChange={(e) => setProfile({ ...profile, name: `${splitName.firstName} ${e.target.value}`.trim() })} />
          </label>
          <label className="full">Correo electronico
            <input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          </label>
          <label>Telefono
            <input value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </label>
          <label>Ciudad
            <input value={profile.city || ''} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
          </label>
          <label className="full">Nueva contrasena
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
        </div>
        <div className="profile-actions">
          <button className="primary-button" type="submit">Guardar Cambios</button>
          <button className="nav-item" type="button" onClick={() => { setPassword(''); setMessage(''); setError(''); }}>Cancelar</button>
        </div>
        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}
      </form>
    </div>
  );
}

export default ProfilePage;
