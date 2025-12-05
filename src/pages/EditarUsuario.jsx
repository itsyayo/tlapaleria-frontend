import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import { toast } from 'react-toastify';

function EditarUsuario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    nombre: '',
    usuario: '',
    rol: 'ventas',
    activo: true,
    contraseña: ''
  });

  useEffect(() => {
    if (usuarioActual.rol !== 'admin') {
      toast.error('Acceso denegado');
      navigate('/denegado');
      return;
    }

    const fetchUsuario = async () => {
      try {
        const res = await API.get(`/usuarios/${id}`);
        const u = res.data;
        
        setForm({
          nombre: u.nombre,
          usuario: u.usuario,
          rol: u.rol,
          activo: u.activo,
          contraseña: ''
        });
      } catch (err) {
        console.error(err);
        toast.error('Error al cargar datos del usuario');
        navigate('/usuarios');
      } finally {
        setLoading(false);
      }
    };

    fetchUsuario();
  }, [id, navigate, usuarioActual.rol]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.nombre.trim() || !form.usuario.trim()) {
      return toast.warning('Nombre y Usuario son obligatorios');
    }

    if (form.contraseña && form.contraseña.length < 4) {
      return toast.warning('La nueva contraseña debe tener al menos 4 caracteres');
    }

    setSubmitting(true);

    try {
      const payload = { ...form };
      if (!payload.contraseña) {
        delete payload.contraseña;
      }

      await API.put(`/usuarios/${id}`, payload);

      toast.success('Usuario actualizado correctamente');
      navigate('/usuarios');
    } catch (err) {
      console.error(err);
      if (err.response?.status === 409) {
        toast.error('Ese nombre de usuario ya está ocupado');
      }
    } finally {
      setSubmitting(false);
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
    <div className="max-w-xl mx-auto mt-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">👤 Editar Usuario</h1>
           <p className="text-sm text-slate-500">Actualiza permisos y credenciales</p>
        </div>
        <Link 
          to="/usuarios"
          className="text-slate-500 hover:text-slate-700 font-medium text-sm transition"
        >
          Cancelar
        </Link>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              required
              className="w-full rounded-lg border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>

          {/* Usuario */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Usuario (Login)</label>
            <input
              type="text"
              name="usuario"
              value={form.usuario}
              onChange={handleChange}
              required
              className="w-full rounded-lg border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition bg-slate-50"
            />
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
            <select
              name="rol"
              value={form.rol}
              onChange={handleChange}
              className="w-full rounded-lg border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="admin">🟣 Administrador</option>
              <option value="ventas">🟢 Ventas</option>
              <option value="inventario">🔵 Inventario</option>
            </select>
          </div>

          {/* Estado Activo (Checkbox) */}
          <div className="flex items-center gap-3 py-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
             <input 
                type="checkbox" 
                name="activo"
                id="activo"
                checked={form.activo}
                onChange={handleChange}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300 cursor-pointer"
             />
             <label htmlFor="activo" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                Usuario Activo (Puede iniciar sesión)
             </label>
          </div>

          <hr className="border-slate-100 my-4" />

          {/* Cambio de Contraseña (Opcional) */}
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
            <h4 className="text-sm font-bold text-amber-800 mb-2">🔐 Restablecer Contraseña</h4>
            <p className="text-xs text-amber-700 mb-3">
              Deja este campo vacío si no quieres cambiar la contraseña actual del usuario.
            </p>
            <input
              type="password"
              name="contraseña"
              value={form.contraseña}
              onChange={handleChange}
              placeholder="Nueva contraseña (opcional)"
              className="w-full rounded-lg border-amber-200 px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none bg-white"
              autoComplete="new-password"
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <Link 
              to="/usuarios"
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-2 rounded-lg text-white font-bold transition shadow-sm
                ${submitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {submitting ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default EditarUsuario;