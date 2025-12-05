import { useEffect, useState } from 'react';
import API from '../services/api'; 
import { toast } from 'react-toastify';
import { Link, useNavigate } from 'react-router-dom';

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true); 
  const navigate = useNavigate();

  const usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}');

  useEffect(() => {
    if (usuarioActual.rol !== 'admin') {
      toast.error('Acceso no autorizado');
      navigate('/denegado');
      return;
    }

    const fetchUsuarios = async () => {
      setLoading(true);
      try {
        const res = await API.get('/usuarios');
        setUsuarios(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsuarios();
  }, [navigate]); 
  const handleEliminar = async (id) => {
    if (id === usuarioActual.id) {
      return toast.warning('No puedes eliminar tu propio usuario.');
    }

    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
      await API.delete(`/usuarios/${id}`); 
      setUsuarios((prev) => prev.filter((u) => u.id !== id));
      toast.success('Usuario eliminado');
    } catch (err) {
    }
  };

  const getRoleBadge = (rol) => {
    const styles = {
      admin: 'bg-purple-100 text-purple-700 border-purple-200',
      ventas: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      inventario: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    return styles[rol] || 'bg-slate-100 text-slate-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto mt-8 bg-white border rounded-xl shadow-sm p-6">
      
      {/* Header con Botón de Acción */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">👥 Gestión de Usuarios</h1>
           <p className="text-sm text-slate-500">Administra el acceso al sistema</p>
        </div>
        
        <Link 
          to="/usuarios/nuevo" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2"
        >
          <span>+</span> Registrar Usuario
        </Link>
      </div>

      <div className="overflow-hidden border rounded-xl">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b text-xs uppercase font-semibold text-slate-500">
            <tr>
              <th className="p-4">Nombre</th>
              <th className="p-4">Usuario (Login)</th>
              <th className="p-4">Rol</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition">
                <td className="p-4 font-medium text-slate-900">
                  <div className="flex items-center gap-3">
                    {/* Avatar generado con iniciales */}
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                      {u.nombre.charAt(0).toUpperCase()}
                    </div>
                    {u.nombre}
                  </div>
                </td>
                <td className="p-4 font-mono text-slate-600">{u.usuario}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getRoleBadge(u.rol)} capitalize`}>
                    {u.rol}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      to={`/usuarios/editar/${u.id}`}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition text-xs font-medium"
                    >
                      Editar
                    </Link>
                    
                    {u.id !== usuarioActual.id && (
                      <button
                        onClick={() => handleEliminar(u.id)}
                        className="px-3 py-1.5 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 transition text-xs font-medium"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            
            {usuarios.length === 0 && (
              <tr>
                <td colSpan="4" className="p-8 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl">📭</span>
                    <p>No hay otros usuarios registrados.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Usuarios;