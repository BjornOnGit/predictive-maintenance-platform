import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import AssetDetails from './pages/AssetDetails';
import Alerts from './pages/Alerts';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <>
                <Navigation />
                <Navigate to="/dashboard" replace />
              </>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <>
                <Navigation />
                <Dashboard />
              </>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assets"
          element={
            <ProtectedRoute>
              <>
                <Navigation />
                <Assets />
              </>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assets/:assetId"
          element={
            <ProtectedRoute>
              <>
                <Navigation />
                <AssetDetails />
              </>
            </ProtectedRoute>
          }
        />
        <Route
          path="/alerts"
          element={
            <ProtectedRoute>
              <>
                <Navigation />
                <Alerts />
              </>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
