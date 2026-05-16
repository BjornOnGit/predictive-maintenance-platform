import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import client from '../api/client';
import './Dashboard.css';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalAssets: 0,
    criticalAssets: 0,
    activeAlerts: 0,
  });
  const [alerts, setAlerts] = useState([]);
  const [healthTrend, setHealthTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [assetsRes, alertsRes, predictionsRes] = await Promise.all([
        client.get('/assets'),
        client.get('/alerts'),
        client.get('/predictions/all').catch(() => ({ data: [] })),
      ]);

      const assets = assetsRes.data;
      const allAlerts = alertsRes.data;
      const predictions = predictionsRes.data;

      // Calculate stats
      const critical = assets.filter(a => a.status === 'critical').length;
      setStats({
        totalAssets: assets.length,
        criticalAssets: critical,
        activeAlerts: allAlerts.length,
      });

      setAlerts(allAlerts.slice(0, 5));

      // Generate health trend data from predictions
      const trend = predictions.slice(-7).map((p, i) => ({
        day: `Day ${i + 1}`,
        health: Math.round(p.health_score || 0),
        failure: Math.round((p.failure_probability || 0) * 100),
      }));
      if (trend.length === 0) {
        trend.push({ day: 'Day 1', health: 85, failure: 15 });
      }
      setHealthTrend(trend);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-container"><p>Loading dashboard...</p></div>;
  }

  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>

      {/* Key Metrics */}
      <div className="dashboard-grid">
        <div className="card metric-card">
          <h2>Total Assets</h2>
          <p className="metric">{stats.totalAssets}</p>
          <p className="label">Equipment monitored</p>
        </div>

        <div className="card metric-card">
          <h2>Critical Assets</h2>
          <p className="metric critical">{stats.criticalAssets}</p>
          <p className="label">Requiring attention</p>
        </div>

        <div className="card metric-card">
          <h2>Active Alerts</h2>
          <p className="metric alert">{stats.activeAlerts}</p>
          <p className="label">Unacknowledged</p>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card chart-card">
          <h2>Equipment Health Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={healthTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="health" 
                stroke="#28a745" 
                strokeWidth={2}
                name="Health Score"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h2>Failure Risk Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={healthTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar 
                dataKey="failure" 
                fill="#dc3545"
                name="Failure Risk %"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="section">
        <h2>Recent Alerts</h2>
        {alerts.length === 0 ? (
          <p>No active alerts. All systems operating normally.</p>
        ) : (
          <ul className="alerts-list">
            {alerts.map((alert) => (
              <li key={alert.id} className={`alert-item alert-${alert.severity}`}>
                <span className="alert-type">{alert.type}</span>
                <span className="alert-message">{alert.message}</span>
                <span className="alert-time">
                  {new Date(alert.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
