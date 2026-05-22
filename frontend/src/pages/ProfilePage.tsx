import { FormEvent, useEffect, useState } from 'react';
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setError('');
    setMessage('');
    try {
      const result = await api.updateProfile({
        name: profile.name,
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

  return (
    <form className="panel form-grid" onSubmit={submit}>
      <h2>Mi Perfil</h2>
      <label>Nombre<input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></label>
      <label>Correo<input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></label>
      <label>Telefono<input value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></label>
      <label>Ciudad<input value={profile.city || ''} onChange={(e) => setProfile({ ...profile, city: e.target.value })} /></label>
      <label>Documento<input value={profile.document_number || ''} onChange={(e) => setProfile({ ...profile, document_number: e.target.value })} /></label>
      <label>Nueva contrasena<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      {error && <p className="error full">{error}</p>}
      {message && <p className="success full">{message}</p>}
      <button className="primary-button full" type="submit">Guardar cambios</button>
    </form>
  );
}

export default ProfilePage;
