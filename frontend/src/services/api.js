import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Phishing scan
export const scanPhishing = async (url) => {
  const response = await api.post('/api/phishing/scan', { url });
  return response.data;
};

// Malware scan with file upload and progress tracking
export const scanMalware = async (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/api/malware/scan', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
  return response.data;
};

// Health check
export const getHealth = async () => {
  const response = await api.get('/api/health/ready');
  return response.data;
};

// Intel feed status
export const getIntelStatus = async () => {
  const response = await api.get('/api/intel/status');
  return response.data;
};

// Refresh intel feed
export const refreshIntel = async () => {
  const response = await api.post('/api/intel/refresh');
  return response.data;
};

// Get scan history
export const getHistory = async () => {
  const response = await api.get('/api/history');
  return response.data;
};

// Get MACL status
export const getMaclStatus = async () => {
  const response = await api.get('/api/macl/status');
  return response.data;
};

// Get AATR statistics
export const getAatrStats = async () => {
  const response = await api.get('/api/aatr/stats');
  return response.data;
};

export default api;
