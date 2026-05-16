import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import client from '../api/client';
import './AssetDetails.css';

export default function AssetDetails() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [sensorHistory, setSensorHistory] = useState([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAssetData();
  }, [assetId]);

  const fetchAssetData = async () => {
    try {
      const [assetRes, predRes, sensorRes, maintRes] = await Promise.all([
        client.get(`/assets/${assetId}`),
        client.get(`/predictions/${assetId}`).catch(() => null),
        client.get(`/sensors/history/${assetId}`),
        client.get(`/maintenance/log/${assetId}`).catch(() => null),
      ]);

      setAsset(assetRes.data);
      if (predRes?.data) setPrediction(predRes.data);
      
      // Prepare chart data (last 10 readings in chronological order)
      const readings = sensorRes.data.slice().reverse();
      setSensorHistory(readings);
      
      if (maintRes?.data) setMaintenanceHistory(maintRes.data);
      
      setError(null);
    } catch (err) {
      setError('Failed to fetch asset details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="asset-details"><p>Loading asset details...</p></div>;
  }

  if (error || !asset) {
    return (
      <div className="asset-details">
        <button onClick={() => navigate('/assets')} className="btn-secondary">
          Back to Assets
        </button>
        <p>{error || 'Asset not found'}</p>
      </div>
    );
  }

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'Low':
        return '#28a745';
      case 'Medium':
        return '#ffc107';
      case 'High':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  return (
    <div className="asset-details">
      <div className="details-header">
        <button onClick={() => navigate('/assets')} className="btn-secondary">
          ← Back to Assets
        </button>
        <h1>{asset.name}</h1>
      </div>

      {/* Asset Info Card */}
      <div className="info-grid">
        <div className="card">
          <h3>Equipment Details</h3>
          <p><strong>Type:</strong> {asset.type}</p>
          <p><strong>Facility:</strong> {asset.facility}</p>
          <p><strong>Manufacturer:</strong> {asset.manufacturer || 'N/A'}</p>
          <p>
            <strong>Status:</strong>{' '}
            <span className={`status-badge ${asset.status}`}>{asset.status}</span>
          </p>
          <p><strong>Install Date:</strong> {new Date(asset.install_date || asset.created_at).toLocaleDateString()}</p>
        </div>

        {prediction && (
          <div className="card">
            <h3>Health Assessment</h3>
            <div className="health-score">
              <div className={`score-circle ${prediction.health_score >= 80 ? 'excellent' : prediction.health_score >= 60 ? 'good' : prediction.health_score >= 40 ? 'fair' : 'poor'}`}>
                <span className="score">{Math.round(prediction.health_score)}</span>
              </div>
              <p className="health-status">
                {prediction.health_score >= 80 ? 'Excellent' : 
                 prediction.health_score >= 60 ? 'Good' : 
                 prediction.health_score >= 40 ? 'Fair' : 
                 'Poor'}
              </p>
            </div>
            <p style={{ marginTop: '12px' }}>
              <strong>Failure Risk:</strong>{' '}
              <span 
                style={{ 
                  color: getRiskColor(prediction.risk_level),
                  fontWeight: 'bold'
                }}
              >
                {prediction.risk_level}
              </span>
            </p>
            <p>
              <strong>Failure Probability:</strong> {(prediction.failure_probability * 100).toFixed(1)}%
            </p>
            <p style={{ fontSize: '12px', color: '#999' }}>
              Last updated: {new Date(prediction.updated_at).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Charts */}
      {sensorHistory.length > 0 && (
        <div className="charts-grid">
          <div className="card chart-card">
            <h3>Vibration Trend (mm/s)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={sensorHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="id" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="vibration" 
                  stroke="#ff7300" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card chart-card">
            <h3>Temperature Trend (°C)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={sensorHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="id" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="temperature" 
                  stroke="#dc3545" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Maintenance History */}
      {maintenanceHistory.length > 0 && (
        <div className="card">
          <h3>Maintenance History</h3>
          <div className="maintenance-list">
            {maintenanceHistory.map((log) => (
              <div key={log.id} className="maintenance-item">
                <div className="maintenance-header">
                  <strong>{log.action}</strong>
                  <span className="maintenance-date">
                    {new Date(log.date).toLocaleDateString()}
                  </span>
                </div>
                {log.technician && (
                  <p><strong>Technician:</strong> {log.technician}</p>
                )}
                {log.cost && (
                  <p><strong>Cost:</strong> ${log.cost.toFixed(2)}</p>
                )}
                {log.downtime && (
                  <p><strong>Downtime:</strong> {log.downtime.toFixed(1)} hours</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {maintenanceHistory.length === 0 && (
        <div className="card">
          <p>No maintenance records found.</p>
        </div>
      )}
    </div>
  );
}
