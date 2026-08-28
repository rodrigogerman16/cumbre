import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ComingSoon } from './components/ComingSoon';
import { RequireAuth } from './components/RequireAuth';
import { CreateRoutePage } from './pages/CreateRoutePage';
import { FeedPage } from './pages/FeedPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { RouteDetailPage } from './pages/RouteDetailPage';

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
              <CreateRoutePage />
            </RequireAuth>
          }
        />
        <Route path="/rutas/:id" element={<RouteDetailPage />} />
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
