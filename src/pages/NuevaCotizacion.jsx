import { useEffect, useState } from 'react';
import API from '../services/api';
import { toast } from 'react-toastify';
import { useNavigate, useParams, Link } from 'react-router-dom'; 
import { Trash2, Save, Search, User, CreditCard } from 'lucide-react';
import QuoteModal from '../components/QuoteModal';

export default function NuevaCotizacion() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [lineas, setLineas] = useState([]);
  const [formaPago, setFormaPago] = useState('Efectivo');
  const [cliente, setCliente] = useState('');
  
  const [loading, setLoading] = useState(false); 
  const [submitting, setSubmitting] = useState(false);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [cotizacionFinalizada, setCotizacionFinalizada] = useState(null);

  const { id } = useParams();
  const navigate = useNavigate(); 

  function normalizarTexto(texto = '') {
    return String(texto)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get('/productos');
        setProductos(res.data || []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await API.get(`/cotizaciones/${id}`);
        const data = res.data;
        
        setCliente(data.cliente || '');
        setFormaPago(data.forma_pago || 'Efectivo');
        setLineas(
          data.productos.map((p) => ({
            id: p.id,
            descripcion: p.descripcion,
            precio_venta: Number(p.precio_unitario),
            cantidad: Number(p.cantidad),
            cantidad_stock: Number(p.cantidad_stock),
            imagen: p.imagen
          }))
        );
      } catch (err) {
        console.error(err);
        toast.error('No se pudo cargar la cotización');
        navigate('/cotizaciones');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const productosFiltrados = productos.filter((p) => {
    const textoProducto = normalizarTexto(`${p.codigo} ${p.descripcion}`);
    const palabras = normalizarTexto(busqueda).split(/\s+/).filter(Boolean);
    return (
      palabras.length === 0 ||
      palabras.every((palabra) => textoProducto.includes(palabra))
    );
  }).slice(0, 12);

  const agregar = (producto) => {
    const existe = lineas.find((p) => p.id === producto.id);
    if (existe) {
      actualizarCantidad(producto.id, existe.cantidad + 1);
      toast.info(`+1 ${producto.descripcion}`);
      return;
    }
    setLineas([...lineas, { ...producto, cantidad: 1 }]);
  };

  const actualizarCantidad = (pid, nueva) => {
    setLineas(
      lineas.map((p) =>
        p.id === pid
          ? { ...p, cantidad: Math.max(1, parseInt(nueva || 1)) }
          : p
      )
    );
  };

  const eliminar = (pid) => setLineas(lineas.filter((p) => p.id !== pid));

  const total = lineas.reduce(
    (acc, it) => acc + it.cantidad * it.precio_venta,
    0
  );

  async function guardar() {
    if (lineas.length === 0) return toast.warning('La cotización está vacía');

    setSubmitting(true);
    const payload = {
      cliente: cliente || null,
      forma_pago: formaPago,
      productos: lineas.map((l) => ({ id: l.id, cantidad: l.cantidad })),
    };

    try {
      if (id) {
        await API.put(`/cotizaciones/${id}`, payload);
        toast.success(`Cotización #${id} actualizada`);
        
        const detalle = await API.get(`/cotizaciones/${id}`);
        setCotizacionFinalizada(detalle.data);
        setMostrarModal(true);
      } else {
        const res = await API.post('/cotizaciones', payload);
        toast.success(`Cotización creada (#${res.data.cotizacion_id})`);

        const detalle = await API.get(`/cotizaciones/${res.data.cotizacion_id}`);
        setCotizacionFinalizada(detalle.data);
        setMostrarModal(true);
        
        if (!id) {
           setLineas([]);
           setCliente('');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    // CAMBIO: Contenedor estándar max-w-7xl
    <div className="max-w-7xl mx-auto mt-8 px-4 pb-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Columna izquierda: catálogo */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        
        {/* Header y Filtros Inline */}
        <div className="bg-white border rounded-xl p-4 shadow-sm">
           <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
             <Search className="text-blue-600" size={24}/> Catálogo de Productos
           </h2>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
                <User className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Cliente (Opcional)"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            <div className="relative">
                <CreditCard className="absolute left-3 top-3 text-slate-400" size={18} />
                <select
                    className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={formaPago}
                    onChange={(e) => setFormaPago(e.target.value)}
                >
                    {['Efectivo', 'Crédito', 'Débito', 'Transferencia'].map((fp) => (
                    <option key={fp} value={fp}>{fp}</option>
                    ))}
                </select>
            </div>

            <input
                type="text"
                placeholder="🔍 Buscar código..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                      e.preventDefault();
                      const encontrado = productos.find(p => normalizarTexto(p.codigo) === normalizarTexto(busqueda));
                      if (encontrado) {
                          agregar(encontrado);
                          setBusqueda('');
                      } else {
                          toast.warning('Producto no encontrado');
                      }
                  }
                }}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Grid de Productos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {productosFiltrados.map((producto) => (
            <div
              key={producto.id}
              className="bg-white border rounded-xl p-3 shadow-sm hover:shadow-md cursor-pointer transition group border-slate-200 hover:border-blue-300"
              onClick={() => agregar(producto)}
            >
              <div className="aspect-square bg-slate-100 rounded-lg mb-2 overflow-hidden flex items-center justify-center">
                  {producto.imagen ? (
                    <img
                        src={`${import.meta.env.VITE_API_URL}${producto.imagen}`}
                        alt={producto.descripcion}
                        className="w-full h-full object-cover"
                        onError={(e) => e.target.style.display='none'}
                    />
                  ) : (
                    <span className="text-2xl text-slate-300">📦</span>
                  )}
              </div>
              
              <h3 className="font-semibold text-sm text-slate-800 line-clamp-2 h-10 mb-1 leading-tight">
                  {producto.descripcion}
              </h3>
              
              <div className="flex justify-between items-end">
                <div>
                   <p className="text-[10px] text-slate-500 font-mono">{producto.codigo}</p>
                   <p className="text-xs text-slate-400">Stock: {producto.cantidad_stock}</p>
                </div>
                <p className="text-sm font-bold text-blue-600">
                    ${Number(producto.precio_venta).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Columna derecha: Editor (Sticky) */}
      <div className="lg:col-span-1">
        <aside className="bg-white border rounded-xl shadow-sm flex flex-col h-[calc(100vh-100px)] sticky top-4">
            <div className="p-4 border-b bg-slate-50 rounded-t-xl">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                📄 {id ? `Editando #${id}` : 'Nueva Cotización'}
                </h2>
            </div>

            <div className="flex-1 overflow-auto p-2">
                <table className="w-full text-sm">
                    <thead className="text-slate-500 text-xs uppercase font-semibold border-b bg-white sticky top-0">
                    <tr>
                        <th className="p-2 text-left bg-white">Prod</th>
                        <th className="p-2 text-center bg-white">Cant</th>
                        <th className="p-2 text-right bg-white">Total</th>
                        <th className="bg-white"></th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {lineas.map((item) => (
                        <tr key={item.id}>
                        <td className="p-2">
                            <div className="font-medium text-slate-700 line-clamp-2">{item.descripcion}</div>
                            <div className="text-[10px] text-slate-400">${item.precio_venta}</div>
                        </td>
                        <td className="p-2 text-center">
                            <input
                            type="number"
                            value={item.cantidad}
                            min="1"
                            onChange={(e) => actualizarCantidad(item.id, e.target.value)}
                            className="w-12 rounded border text-center py-1 focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </td>
                        <td className="p-2 text-right font-bold text-slate-700">
                            ${(item.precio_venta * item.cantidad).toFixed(2)}
                        </td>
                        <td className="p-2 text-right">
                            <button
                            onClick={() => eliminar(item.id)}
                            className="p-1.5 rounded hover:bg-rose-100 text-rose-500 transition"
                            >
                            <Trash2 size={16} />
                            </button>
                        </td>
                        </tr>
                    ))}
                    {lineas.length === 0 && (
                        <tr>
                        <td colSpan="4" className="p-8 text-center text-slate-400">
                            <p className="text-sm">Agrega productos del catálogo</p>
                        </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            {/* Footer del Ticket */}
            <div className="p-4 border-t bg-slate-50 rounded-b-xl space-y-4">
                <div className="flex justify-between items-end">
                    <span className="text-slate-500 font-medium">Total Estimado:</span>
                    <span className="text-3xl font-black text-slate-800 tracking-tight">
                        ${total.toFixed(2)}
                    </span>
                </div>

                <button
                    className={`w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg transition
                        ${lineas.length === 0 || submitting 
                            ? 'bg-slate-300 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/30 active:scale-[0.98]'}`}
                    onClick={guardar}
                    disabled={lineas.length === 0 || submitting}
                >
                    {submitting ? 'Guardando...' : (
                        <>
                           <Save size={20} />
                           {id ? 'Actualizar Cotización' : 'Generar Cotización'}
                        </>
                    )}
                </button>
                
                <Link to="/cotizaciones" className="block text-center text-xs text-slate-500 hover:text-blue-600 hover:underline">
                    Cancelar y volver
                </Link>
            </div>
        </aside>
      </div>

      {/* Modal de cotización */}
      {mostrarModal && cotizacionFinalizada && (
        <QuoteModal
          cotizacion={cotizacionFinalizada}
          productos={cotizacionFinalizada.productos}
          onClose={() => {
            setMostrarModal(false);
            setCotizacionFinalizada(null);
            if (id) navigate('/cotizaciones');
          }}
        />
      )}
    </div>
  );
}