import { useState, useEffect } from 'react';
import client from '../api/client';
import './Alerts.css';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    // Initial fetch
    fetchAlerts();

    // Set up polling every 30 seconds
    const pollInterval = setInterval(fetchAlerts, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(pollInterval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await client.get('/alerts');
      setAlerts(res.data);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError('Failed to fetch alerts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await client.patch(`/alerts/${alertId}/acknowledge`);
      fetchAlerts();
    } catch (err) {
      setError('Failed to acknowledge alert');
      console.error(err);
    }
  };

  return (
    <div className="alerts-container">
      <div className="alerts-header">
        <h1>Alerts</h1>
        <div className="refresh-info">
          <button onClick={fetchAlerts} className="btn-secondary">
            Refresh Now
          </button>
          {lastRefresh && (
            <span className="last-refresh">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <p>Loading alerts...</p>
      ) : alerts.length === 0 ? (
        <p className="no-alerts">No active alerts. Everything is running smoothly.</p>
      ) : (
        <>
          <p className="alert-count">{alerts.length} active alert{alerts.length !== 1 ? 's' : ''}</p>
          <div className="alerts-list">
            {alerts.map((alert) => (
              <div key={alert.id} className={`alert-card alert-${alert.severity}`}>
                <div className="alert-header">
                  <div>
                    <h3>{alert.type.toUpperCase()}</h3>
                    <p className="alert-message">{alert.message}</p>
                    <p className="alert-time">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`badge-${alert.severity}`}>{alert.severity}</span>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => handleAcknowledge(alert.id)}
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
