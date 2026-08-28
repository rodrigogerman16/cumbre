import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { UserIcon } from '../lib/icons';
import { initials } from '../lib/format';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  function handleLogout() {
    logout();
    navigate('/feed');
  }

  return (
    <>
      <div className="topbar">
        <div className="brand">
          <UserIcon size={22} color="var(--ink)" />
          Perfil
        </div>
      </div>
      <div style={{ padding: 20 }}>
        <div className="card profile-card">
          <div className="profile-avatar">{initials(user.name)}</div>
          <div>
            <div className="profile-name">{user.name}</div>
            <div className="profile-email">{user.email}</div>
          </div>
        </div>
        <button className="btn btn-outline" style={{ marginTop: 20 }} onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </>
  );
}
