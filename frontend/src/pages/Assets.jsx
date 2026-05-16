import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import './Assets.css';

export default function Assets() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    facility: '',
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const res = await client.get('/assets');
      setAssets(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch assets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    try {
      await client.post('/assets', formData);
      setFormData({ name: '', type: '', facility: '' });
      setShowForm(false);
      fetchAssets();
    } catch (err) {
      setError('Failed to create asset');
      console.error(err);
    }
  };

  const handleRowClick = (assetId) => {
    navigate(`/assets/${assetId}`);
  };

  return (
    <div className="assets-container">
      <div className="assets-header">
        <h1>Equipment</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Add Equipment'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddAsset} className="add-asset-form">
          <input
            type="text"
            placeholder="Equipment Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Type (Pump, Motor, etc.)"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Facility"
            value={formData.facility}
            onChange={(e) => setFormData({ ...formData, facility: e.target.value })}
            required
          />
          <button type="submit" className="btn-success">Save</button>
        </form>
      )}

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <p>Loading assets...</p>
      ) : assets.length === 0 ? (
        <p>No assets found. Add one to get started.</p>
      ) : (
        <div className="assets-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Facility</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr 
                  key={asset.id} 
                  onClick={() => handleRowClick(asset.id)}
                  className="clickable-row"
                >
                  <td className="asset-name">{asset.name}</td>
                  <td>{asset.type}</td>
                  <td>{asset.facility}</td>
                  <td>
                    <span className={`status-badge ${asset.status}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td>{new Date(asset.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
