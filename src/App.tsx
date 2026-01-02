import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Bons from './pages/Bons';
import Frais from './pages/Frais';
import Statistics from './pages/Statistics';
import './App.css';

type UserRole = 'full' | 'limited' | null;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);

  useEffect(() => {
    const authStatus = localStorage.getItem('isAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      const savedRole = localStorage.getItem('userRole') as UserRole;
      setUserRole(savedRole ?? null);
    }
  }, []);

  const handleLogin = (role: Exclude<UserRole, null>) => {
    setIsAuthenticated(true);
    setUserRole(role);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', role);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    localStorage.removeItem('userRole');
    localStorage.removeItem('isAuthenticated');
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to={userRole === 'limited' ? '/bons' : '/dashboard'} replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              userRole === 'limited' ? (
                <Navigate to="/bons" replace />
              ) : (
                <Layout onLogout={handleLogout} role={userRole ?? 'full'}>
                  <Dashboard />
                </Layout>
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/bons"
          element={
            isAuthenticated ? (
              <Layout onLogout={handleLogout} role={userRole ?? 'limited'}>
                <Bons />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/frais"
          element={
            isAuthenticated ? (
              <Layout onLogout={handleLogout} role={userRole ?? 'limited'}>
                <Frais />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/statistics"
          element={
            isAuthenticated ? (
              userRole === 'limited' ? (
                <Navigate to="/bons" replace />
              ) : (
                <Layout onLogout={handleLogout} role={userRole ?? 'full'}>
                  <Statistics />
                </Layout>
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/"
          element={
            <Navigate
              to={isAuthenticated ? (userRole === 'limited' ? '/bons' : '/dashboard') : '/login'}
              replace
            />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
