import axios from 'axios';
import { toast } from 'react-toastify';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        toast.error('Sesión expirada. Por favor inicia sesión de nuevo.');
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = '/'; 
        return Promise.reject(error);
      }

      if (status === 403) {
        toast.warning('No tienes permisos para realizar esta acción.');
        return Promise.reject(error);
      }
      if (data.error) {
        console.warn('API Error:', data.error);
        return Promise.reject(new Error(data.error)); 
      }
    } else if (error.request) {
      toast.error('Error de conexión con el servidor.');
    } else {
      toast.error('Error inesperado en la solicitud.');
    }

    return Promise.reject(error);
  }
);

export default API;