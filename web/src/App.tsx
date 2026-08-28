import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ComingSoon } from './components/ComingSoon';
import { RequireAuth } from './components/RequireAuth';
import { FeedPage } from './pages/FeedPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/feed" replace />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route
          path="/perfil"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/crear"
          element={
            <RequireAuth>
              <ComingSoon title="Crear ruta" message="Dibujar rutas e importar GPX llega en la próxima fase." />
            </RequireAuth>
          }
        />
        <Route
          path="/rutas/:id"
          element={<ComingSoon title="Ruta" message="El detalle de la ruta llega en una próxima fase." />}
        />
        <Route
          path="/explorar"
          element={<ComingSoon title="Explorar" message="Mapa general de rutas — próximamente." />}
        />
        <Route path="*" element={<Navigate to="/feed" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
