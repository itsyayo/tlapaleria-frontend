import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { toast } from 'react-toastify';

function Proveedores() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const navigate = useNavigate();

  const [proveedores, setProveedores] = useState([]);
  const [nuevoProveedor, setNuevoProveedor] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (usuario.rol !== 'admin') {
      toast.error('Acceso denegado');
      navigate('/denegado');
      return;
    }

    const fetchProveedores = async () => {
      setLoading(true);
      try {
        const res = await API.get('/proveedores');
        setProveedores(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProveedores();
  }, [usuario.rol, navigate]);

  const handleAgregarProveedor = async (e) => {
    e.preventDefault();
    
    if (!nuevoProveedor.trim()) return;

    setSubmitting(true);
    try {
      const res = await API.post('/proveedores/nuevo', { 
        nombre: nuevoProveedor.trim() 
      });
      
      setProveedores((prev) => [...prev, res.data]);
      setNuevoProveedor('');
      toast.success('Proveedor agregado exitosamente');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminarProveedor = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este proveedor? Esto podría afectar el historial si no es un borrado lógico.')) return;

    try {
      await API.delete(`/proveedores/${id}`);
      setProveedores((prev) => prev.filter((p) => p.id !== id));
      toast.success('Proveedor eliminado correctamente');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 bg-white border rounded-xl shadow-sm p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">🏭 Gestión de Proveedores</h2>
          <p className="text-sm text-slate-500">Administra quién suministra tus productos</p>
        </div>
        
        {/* Formulario Inline Optimizado */}
        <form onSubmit={handleAgregarProveedor} className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Nuevo proveedor..."
            className="flex-1 md:w-64 rounded-lg border-slate-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm"
            value={nuevoProveedor}
            onChange={(e) => setNuevoProveedor(e.target.value)}
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting || !nuevoProveedor.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition shadow-sm flex items-center gap-2"
          >
            {submitting ? 'Guardando...' : 'Agregar'}
          </button>
        </form>
      </div>

      {/* Tabla Estilizada */}
      <div className="overflow-hidden border rounded-xl">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b text-xs uppercase font-semibold text-slate-500">
            <tr>
              <th className="p-4 w-20">ID</th>
              <th className="p-4">Nombre del Proveedor</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {proveedores.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 transition">
                <td className="p-4 font-mono text-slate-500">#{p.id}</td>
                <td className="p-4 font-medium text-slate-800 text-base">
                  {p.nombre}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => handleEliminarProveedor(p.id)}
                    className="px-3 py-1.5 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 transition text-xs font-medium"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            
            {proveedores.length === 0 && (
              <tr>
                <td colSpan="3" className="p-8 text-center text-slate-400">
                   <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl">📦</span>
                    <p>No hay proveedores registrados aún.</p>
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

export default Proveedores;