import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { CompassIcon, HomeIcon, PlusIcon, UserIcon } from '../lib/icons';

export function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isFeed = location.pathname === '/' || location.pathname.startsWith('/feed');
  const isExplore = location.pathname.startsWith('/explorar');
  const isProfile = location.pathname.startsWith('/perfil');

  return (
    <nav className="bottom-nav">
      <button className={`nav-item${isFeed ? ' active' : ''}`} onClick={() => navigate('/feed')}>
        <HomeIcon size={21} color={isFeed ? 'var(--accent)' : '#95A192'} />
        <span>Feed</span>
      </button>
      <button className={`nav-item${isExplore ? ' active' : ''}`} onClick={() => navigate('/explorar')}>
        <CompassIcon size={21} color={isExplore ? 'var(--accent)' : '#95A192'} />
        <span>Explorar</span>
      </button>
      <button className="nav-create" onClick={() => navigate(user ? '/crear' : '/login')}>
        <PlusIcon size={22} color="#FFFFFF" />
      </button>
      <button className={`nav-item${isProfile ? ' active' : ''}`} onClick={() => navigate(user ? '/perfil' : '/login')}>
        <UserIcon size={21} color={isProfile ? 'var(--accent)' : '#95A192'} />
        <span>{user ? 'Perfil' : 'Ingresar'}</span>
      </button>
    </nav>
  );
}
