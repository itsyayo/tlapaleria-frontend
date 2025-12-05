import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { toast } from 'react-toastify';

function Categorias() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const navigate = useNavigate();

  const [categorias, setCategorias] = useState([]);
  const [nuevaCategoria, setNuevaCategoria] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (usuario.rol !== 'admin') {
      toast.error('Acceso denegado');
      navigate('/denegado');
      return;
    }

    const fetchCategorias = async () => {
      setLoading(true);
      try {
        const res = await API.get('/categorias');
        setCategorias(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategorias();
  }, [usuario.rol, navigate]);

  const handleAgregarCategoria = async (e) => {
    e.preventDefault();
    
    if (!nuevaCategoria.trim()) return;

    setSubmitting(true);
    try {
      const res = await API.post('/categorias', { 
        nombre: nuevaCategoria.trim() 
      });
      
      setCategorias([...categorias, res.data]);
      setNuevaCategoria('');
      toast.success('Categoría agregada exitosamente');
    } catch (err) {
      console.error(err);
      if (err.response?.status === 409) {
        toast.warning('Esa categoría ya existe');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminarCategoria = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta categoría?')) return;

    try {
      await API.delete(`/categorias/${id}`);
      setCategorias(categorias.filter((c) => c.id !== id));
      toast.success('Categoría eliminada exitosamente');
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
    <div className="max-w-3xl mx-auto mt-8 bg-white border rounded-xl shadow-sm p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">🏷️ Gestión de Categorías</h2>
          <p className="text-sm text-slate-500">Organiza tus productos por grupos</p>
        </div>

        {/* Formulario Inline */}
        <form onSubmit={handleAgregarCategoria} className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Nueva categoría..."
            className="flex-1 sm:w-64 rounded-lg border-slate-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm"
            value={nuevaCategoria}
            onChange={(e) => setNuevaCategoria(e.target.value)}
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting || !nuevaCategoria.trim()}
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
              <th className="p-4">Nombre</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categorias.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition">
                <td className="p-4 font-mono text-slate-500">#{c.id}</td>
                <td className="p-4 font-medium text-slate-800 text-base">
                  {c.nombre}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => handleEliminarCategoria(c.id)}
                    className="px-3 py-1.5 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 transition text-xs font-medium"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            
            {categorias.length === 0 && (
              <tr>
                <td colSpan="3" className="p-8 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl">🔖</span>
                    <p>No hay categorías registradas.</p>
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

export default Categorias;