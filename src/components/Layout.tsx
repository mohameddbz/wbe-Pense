import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  role: 'full' | 'limited';
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout, role }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    onLogout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-brand">
          <h1>Web-Pense</h1>
        </div>
        <div className="navbar-links">
          {role === 'full' && <Link to="/dashboard">Dashboard</Link>}
          <Link to="/bons">Bons</Link>
          <Link to="/frais">Frais</Link>
          {role === 'full' && <Link to="/statistics">Statistics</Link>}
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </nav>
      <main className="main-content">{children}</main>
    </div>
  );
};

export default Layout;
