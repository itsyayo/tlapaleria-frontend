import API from './api';

export const obtenerCorteCaja = async (filtros) => {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams(filtros).toString();
  const { data } = await API.get(`/reportes/corte-caja?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

export const obtenerDashboardStats = async () => {
  const response = await API.get(`/reportes/dashboard`, getAuthHeaders());
  return response.data;
};