import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../services/api';
import { toast } from 'react-toastify';
import { useUsuario } from '../hooks/useUsuario'; 
import { 
  Package, DollarSign, Image as ImageIcon, Save, ArrowLeft, 
  Barcode, MapPin, Tag, Truck, AlertCircle 
} from 'lucide-react'; 

function EditarProducto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const usuario = useUsuario(); 

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
    imagen: '',
  });

  const [nuevaImagen, setNuevaImagen] = useState(null);
  const [preview, setPreview] = useState(null); 
  
  // Validación de permisos
  useEffect(() => {
    if (usuario && usuario.rol !== 'admin') {
      toast.error('Acceso denegado');
      navigate('/denegado');
    }
  }, [usuario, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, provRes, catRes] = await Promise.all([
          API.get(`/productos/${id}`),
          API.get('/proveedores'),
          API.get('/categorias')
        ]);

        const p = prodRes.data;
        setForm({
          codigo: p.codigo,
          codigo_barras: p.codigo_barras || '',
          descripcion: p.descripcion,
          ubicacion: p.ubicacion || '',
          categoria_id: p.categoria_id || '',
          proveedor_id: p.proveedor_id || '',
          stock_maximo: p.stock_maximo,
          stock_minimo: p.stock_minimo,
          cantidad_stock: p.cantidad_stock,
          precio_compra: p.precio_compra,
          precio_venta: p.precio_venta,
          clave_sat: p.clave_sat || '',
          imagen: p.imagen
        });

        setProveedores(provRes.data || []);
        setCategorias(catRes.data || []);
      } catch (err) {
        console.error(err);
        toast.error('Error al cargar la información del producto');
        navigate('/productos');
      } finally {
        setLoadingInit(false);
      }
    };

    if (usuario?.rol === 'admin') {
       fetchData();
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(name, value);
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setNuevaImagen(file);
      setPreview(URL.createObjectURL(file));
    } else {
      setNuevaImagen(null);
      setPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!form.codigo.trim()) return toast.warning('El código es obligatorio');
    if (!form.descripcion.trim()) return toast.warning('La descripción es obligatoria');
    
    setSubmitting(true);

    try {
      const formData = new FormData();
      
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'imagen') return;
        if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });

      if (nuevaImagen) {
        formData.append('imagen', nuevaImagen);
      }

      await API.put(`/productos/${id}`, formData);

      toast.success('Producto actualizado correctamente');
      navigate('/productos');
    } catch (err) {
      console.error(err);
      if (err.response?.status === 409) {
        toast.error('El código o código de barras ya está en uso');
      } else {
        toast.error('Error al guardar los cambios');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInit || !usuario) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-8 px-4 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="text-blue-600" /> Editar Producto
          </h1>
          <p className="text-sm text-slate-500">Actualiza los detalles del inventario</p>
        </div>
        <Link 
          to="/productos"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-medium text-sm transition"
        >
          <ArrowLeft size={16} /> Cancelar
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Sección 1: Información General */}
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2 flex items-center gap-2">
            <Package size={20} /> Información General
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Código */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Código Interno <span className="text-red-500">*</span></label>
              <div className="relative">
                <Tag className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                    type="text"
                    name="codigo"
                    value={form.codigo}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                    required
                />
              </div>
            </div>

            {/* Código de Barras */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Código de Barras</label>
              <div className="relative">
                <Barcode className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  name="codigo_barras"
                  value={form.codigo_barras}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción / Nombre <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                required
              >
                <option value="">-- Seleccionar --</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            {/* Proveedor */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                 Proveedor <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                 <Truck className="absolute left-3 top-2.5 text-slate-400" size={16} />
                 <select
                    name="proveedor_id"
                    value={form.proveedor_id}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    required
                 >
                    <option value="">-- Seleccionar --</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                 </select>
              </div>
            </div>

            {/* Clave SAT */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Clave SAT</label>
              <input
                type="text"
                name="clave_sat"
                value={form.clave_sat}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Ubicación */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                    type="text"
                    name="ubicacion"
                    value={form.ubicacion}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sección 2: Inventario y Costos */}
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2 flex items-center gap-2">
            <DollarSign size={20} /> Inventario y Costos
          </h3>
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
                  className="w-full rounded-md border-blue-200 pl-7 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg text-slate-700 bg-white"
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
                  className="w-full rounded-md border-slate-300 pl-7 py-1.5 focus:ring-2 focus:ring-slate-400 outline-none text-slate-600 bg-white"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
              <label className="block text-xs font-bold text-amber-800 mb-1 uppercase">Stock Actual</label>
              <input
                type="number" step="1" min="0"
                name="cantidad_stock"
                value={form.cantidad_stock}
                onChange={handleChange}
                className="w-full rounded-md border-amber-200 px-3 py-1.5 focus:ring-2 focus:ring-amber-500 outline-none font-bold text-lg text-slate-700 bg-white"
              />
            </div>

            {/* Límites */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stock Mínimo</label>
              <input type="number" name="stock_minimo" value={form.stock_minimo} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stock Máximo</label>
              <input type="number" name="stock_maximo" value={form.stock_maximo} onChange={handleChange} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none" />
            </div>
          </div>
        </div>

        {/* Sección 3: Imagen */}
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2 flex items-center gap-2">
            <ImageIcon size={20} /> Imagen del Producto
          </h3>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            
            {/* Previsualización Inteligente */}
            <div className="w-32 h-32 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative">
              {preview ? (
                <img src={preview} alt="Nueva" className="w-full h-full object-cover" />
              ) : form.imagen ? (
                <img 
                  src={`${import.meta.env.VITE_API_URL}${form.imagen}`} 
                  alt="Actual" 
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display='none'; }} 
                />
              ) : (
                <span className="text-slate-300"><ImageIcon size={40} /></span>
              )}
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">Cambiar fotografía</label>
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
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <AlertCircle size={12} />
                Deja esto vacío si no quieres cambiar la imagen actual.
              </p>
            </div>
          </div>
        </div>

        {/* Acciones */}
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
              ${submitting ? 'bg-amber-400 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-600 hover:shadow-xl hover:-translate-y-0.5'}`}
          >
            {submitting ? 'Guardando...' : (
                <>
                    <Save size={20} /> Actualizar Producto
                </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditarProducto;