import { jwtDecode } from "jwt-decode";

export function useUsuario() {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    
    const currentTime = Date.now() / 1000;
    if (decoded.exp < currentTime) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      return null;
    }

    const storedUser = JSON.parse(localStorage.getItem('usuario') || '{}');
    
    return { ...decoded, nombre: storedUser.nombre || decoded.id };
  } catch (err) {
    console.error('Token inválido', err);
    return null;
  }
}