import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import API from '../services/api';
import { useNavigate, Link } from 'react-router-dom';

function RegistrarUsuario() {
  const [form, setForm] = useState({
    nombre: '',
    usuario: '',
    contraseña: '',
    rol: 'ventas',
  });
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}');

  useEffect(() => {
    if (usuarioActual.rol !== 'admin') {
      toast.error('Acceso denegado');
      navigate('/denegado');
    }
  }, [usuarioActual, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.contraseña.length < 4) {
      return toast.warning('La contraseña es muy corta (mínimo 4 caracteres)');
    }

    setLoading(true);
    try {
      await API.post('/usuarios', form);

      toast.success('Usuario registrado exitosamente');
      navigate('/usuarios');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10">
      {/* Breadcrumb / Navegación */}
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link to="/usuarios" className="hover:text-blue-600 transition">Usuarios</Link>
        <span>/</span>
        <span className="font-semibold text-slate-700">Nuevo Registro</span>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            👤
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Registrar Nuevo Usuario</h2>
          <p className="text-slate-500 text-sm mt-1">Ingresa los datos para conceder acceso al sistema</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Nombre Completo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              required
              placeholder="Ej. Juan Pérez"
              className="w-full rounded-lg border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition shadow-sm"
            />
          </div>

          {/* Usuario (Login) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de Usuario</label>
            <input
              type="text"
              name="usuario"
              value={form.usuario}
              onChange={handleChange}
              required
              placeholder="Ej. jperez"
              autoComplete="off"
              className="w-full rounded-lg border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm"
            />
          </div>

          {/* Contraseña con Toggle */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="contraseña"
                value={form.contraseña}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="w-full rounded-lg border-slate-300 pl-4 pr-12 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                tabIndex="-1"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1 ml-1">Mínimo 4 caracteres</p>
          </div>

          {/* Selección de Rol */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rol / Permisos</label>
            <div className="relative">
              <select
                name="rol"
                value={form.rol}
                onChange={handleChange}
                className="w-full appearance-none rounded-lg border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition shadow-sm bg-white"
              >
                <option value="ventas">🟢 Ventas (Cajero)</option>
                <option value="inventario">🔵 Inventario (Almacenista)</option>
                <option value="admin">🟣 Administrador (Control Total)</option>
              </select>
              {/* Flecha custom para estilo consistente */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">
                ▼
              </div>
            </div>
            {/* Descripción del rol seleccionado */}
            <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded border border-slate-100">
              {form.rol === 'admin' && '⚠️ Acceso total a usuarios, reportes y configuración.'}
              {form.rol === 'ventas' && '✅ Puede realizar ventas y ver stock básico.'}
              {form.rol === 'inventario' && '📦 Puede agregar mercancía y editar productos.'}
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="pt-4 flex gap-3">
            <Link 
              to="/usuarios"
              className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg text-center hover:bg-slate-50 transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 flex justify-center items-center gap-2 px-4 py-2.5 text-white font-medium rounded-lg transition shadow-md
                ${loading 
                  ? 'bg-blue-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'}`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                'Registrar Usuario'
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default RegistrarUsuario;