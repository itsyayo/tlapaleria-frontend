import { Navigate, useLocation } from 'react-router-dom';
import { useUsuario } from '../hooks/useUsuario';

function PrivateRoute({ children, allowedRoles }) {
  const usuario = useUsuario();
  const location = useLocation();

  if (!usuario) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(usuario.rol)) {
      return <Navigate to="/denegado" replace />;
    }
  }

  return children;
}

export default PrivateRoute;