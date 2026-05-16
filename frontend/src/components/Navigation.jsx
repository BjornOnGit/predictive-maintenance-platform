import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import './Navigation.css';

export default function Navigation() {
  const navigate = useNavigate();
  const { logout, user } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          Predictive Maintenance
        </Link>
        <div className="nav-links">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/assets" className="nav-link">Equipment</Link>
          <Link to="/alerts" className="nav-link">Alerts</Link>
        </div>
        <div className="nav-user">
          <span className="user-email">{user?.email}</span>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </div>
    </nav>
  );
}
