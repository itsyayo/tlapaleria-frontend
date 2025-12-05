import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../services/api'; // Instancia optimizada

function AgregarProducto() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  const [loadingInit, setLoadingInit] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [proveedores, setProveedores] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const [form, setForm] = useState({
    codigo: '',
    codigo_barras: '',
    descripcion: '',
    ubicacion: '',
    categoria_id: '',
    proveedor_id: '',
    stock_maximo: '',
    stock_minimo: '',
    cantidad_stock: '',
    precio_compra: '',
    precio_venta: '',
    clave_sat: '',
  });
  const [imagen, setImagen] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (usuario.rol !== 'admin') {
      toast.error('Acceso denegado');
      navigate('/denegado');
      return;
    }

    const cargarDependencias = async () => {
      try {
        const [resProv, resCat] = await Promise.all([
          API.get('/proveedores'),
          API.get('/categorias')
        ]);
        setProveedores(resProv.data || []);
        setCategorias(resCat.data || []);
      } catch (err) {
        console.error('Error cargando dependencias:', err);
      } finally {
        setLoadingInit(false);
      }
    };

    cargarDependencias();
  }, [usuario.rol, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagen(file);
      setPreview(URL.createObjectURL(file));
    } else {
      setImagen(null);
      setPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.codigo.trim()) return toast.warning('El código es obligatorio');
    if (!form.descripcion.trim()) return toast.warning('La descripción es obligatoria');
    if (!form.categoria_id) return toast.warning('Selecciona una categoría');
    if (!form.proveedor_id) return toast.warning('Selecciona un proveedor');
    
    if (Number(form.cantidad_stock) < 0) return toast.warning('El stock no puede ser negativo');
    if (Number(form.precio_venta) < 0) return toast.warning('El precio de venta no puede ser negativo');

    setSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });

      if (imagen) {
        formData.append('imagen', imagen);
      }
      await API.post('/productos', formData);

      toast.success('Producto agregado correctamente');
      navigate('/productos');
    } catch (err) {
      console.error(err);
      // El interceptor maneja errores, pero si hay algo específico del form:
      if (err.response?.status === 409) {
        toast.error('Ya existe un producto con ese código');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInit) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">➕ Nuevo Producto</h1>
          <p className="text-sm text-slate-500">Registra un nuevo artículo en el inventario</p>
        </div>
        <Link 
          to="/productos"
          className="text-slate-500 hover:text-slate-700 font-medium text-sm transition"
        >
          Cancelar y volver
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Sección 1: Información Principal */}
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">📦 Información General</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Código */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Código Interno <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="codigo"
                value={form.codigo}
                onChange={handleChange}
                placeholder="Ej. PROD-001"
                className="w-full rounded-lg border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            {/* Código de Barras */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Código de Barras</label>
              <div className="relative">
                <input
                  type="text"
                  name="codigo_barras"
                  value={form.codigo_barras}
                  onChange={handleChange}
                  placeholder="Escanea aquí..."
                  className="w-full rounded-lg border-slate-300 px-3 py-2 pl-9 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
              </div>
            </div>

            {/* Descripción (Full width) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción / Nombre <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                placeholder="Ej. Martillo de uña 16oz"
                className="w-full rounded-lg border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoría <span className="text-red-500">*</span></label>
              <select
                name="categoria_id"
                value={form.categoria_id}
                onChange={handleChange}
                className="w-full rounded-lg border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                required
              >
                <option value="">-- Seleccionar --</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            {/* Proveedor */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor <span className="text-red-500">*</span></label>
              <select
                name="proveedor_id"
                value={form.proveedor_id}
                onChange={handleChange}
                className="w-full rounded-lg border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                required
              >
                <option value="">-- Seleccionar --</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>

            {/* Clave SAT */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Clave SAT</label>
              <input
                type="text"
                name="clave_sat"
                value={form.clave_sat}
                onChange={handleChange}
                placeholder="Ej. 84111506"
                className="w-full rounded-lg border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Ubicación */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación / Pasillo</label>
              <input
                type="text"
                name="ubicacion"
                value={form.ubicacion}
                onChange={handleChange}
                placeholder="Ej. Pasillo 3, Estante B"
                className="w-full rounded-lg border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Sección 2: Inventario y Precios */}
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">💰 Inventario y Costos</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <label className="block text-xs font-bold text-blue-800 mb-1 uppercase">Precio Venta</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-blue-600 font-bold">$</span>
                <input
                  type="number" step="0.01" min="0"
                  name="precio_venta"
                  value={form.precio_venta}
                  onChange={handleChange}
                  className="w-full rounded-md border-blue-200 pl-7 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg text-slate-700"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Precio Compra</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-500">$</span>
                <input
                  type="number" step="0.01" min="0"
                  name="precio_compra"
                  value={form.precio_compra}
                  onChange={handleChange}
                  className="w-full rounded-md border-slate-300 pl-7 py-1.5 focus:ring-2 focus:ring-slate-400 outline-none text-slate-600"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
              <label className="block text-xs font-bold text-amber-800 mb-1 uppercase">Stock Inicial</label>
              <input
                type="number" step="1" min="0"
                name="cantidad_stock"
                value={form.cantidad_stock}
                onChange={handleChange}
                className="w-full rounded-md border-amber-200 px-3 py-1.5 focus:ring-2 focus:ring-amber-500 outline-none font-bold text-lg text-slate-700"
                placeholder="0"
              />
            </div>

            {/* Límites de Stock */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stock Mínimo</label>
              <input type="number" name="stock_minimo" value={form.stock_minimo} onChange={handleChange} className="w-full rounded-lg border-slate-300 px-3 py-2 outline-none" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stock Máximo</label>
              <input type="number" name="stock_maximo" value={form.stock_maximo} onChange={handleChange} className="w-full rounded-lg border-slate-300 px-3 py-2 outline-none" placeholder="0" />
            </div>

          </div>
        </div>

        {/* Sección 3: Imagen */}
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">🖼️ Imagen del Producto</h3>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Previsualización */}
            <div className="w-32 h-32 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
              {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl text-slate-300">📷</span>
              )}
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">Subir fotografía</label>
              <input
                type="file"
                name="imagen"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100 transition"
              />
              <p className="text-xs text-slate-400 mt-2">Formatos permitidos: JPG, PNG, WEBP (Máx 5MB)</p>
            </div>
          </div>
        </div>

        {/* Botón Guardar */}
        <div className="flex justify-end gap-4 pt-4">
          <Link
            to="/productos"
            className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className={`px-8 py-3 rounded-xl text-white font-bold shadow-lg transition flex items-center gap-2
              ${submitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5'}`}
          >
            {submitting ? 'Guardando...' : '💾 Guardar Producto'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AgregarProducto;