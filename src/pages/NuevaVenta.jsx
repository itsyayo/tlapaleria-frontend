import { useEffect, useState, useMemo, useRef } from 'react';
import API from '../services/api'; 
import { toast } from 'react-toastify';
import TicketModal from '../components/TicketModal';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShoppingCart, Search, Plus, CreditCard, Banknote } from 'lucide-react';

export default function NuevaVenta() {
  const navigate = useNavigate();
  const inputBusquedaRef = useRef(null);

  const [productos, setProductos] = useState([]);
  const [ticket, setTicket] = useState([]);
  
  const [busqueda, setBusqueda] = useState('');
  const [formaPago, setFormaPago] = useState('Efectivo');
  const [efectivoRecibido, setEfectivoRecibido] = useState('');
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  const [mostrarTicket, setMostrarTicket] = useState(false);
  const [ventaFinalizada, setVentaFinalizada] = useState(null);
  const [productosVendidos, setProductosVendidos] = useState([]);

  useEffect(() => {
    const cargarProductos = async () => {
      try {
        const res = await API.get('/productos');
        setProductos(res.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
        setTimeout(() => inputBusquedaRef.current?.focus(), 100);
      }
    };
    cargarProductos();
  }, []);

  const fmt = (n) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const normalizar = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const buscarPorCodigoExacto = (codigo) => {
    const n = normalizar(codigo);
    return productos.find(p => normalizar(p.codigo) === n || normalizar(p.codigo_barras || '') === n);
  };

  const productosFiltrados = useMemo(() => {
    if (!busqueda) return [];
    
    return productos.filter((p) => {
      const texto = normalizar(`${p.codigo} ${p.codigo_barras} ${p.descripcion}`);
      const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
      return palabras.every(palabra => texto.includes(palabra));
    }).slice(0, 12);
  }, [productos, busqueda]);


  const agregarAlTicket = (producto) => {
    // Validar Stock
    const enCarrito = ticket.find(p => p.id === producto.id);
    const cantidadActual = enCarrito ? enCarrito.cantidad : 0;
    
    if (cantidadActual + 1 > producto.cantidad_stock) {
      toast.warning(`Stock insuficiente. Solo hay ${producto.cantidad_stock}`);
      return;
    }

    setTicket(prev => {
      if (enCarrito) {
        toast.info(`+1 ${producto.descripcion}`);
        return prev.map(p => p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });

    setBusqueda('');
    inputBusquedaRef.current?.focus();
  };

  const actualizarCantidad = (id, valor) => {
    const nuevaCantidad = parseInt(valor);
    if (isNaN(nuevaCantidad) || nuevaCantidad < 1) return;

    // Validar stock al cambiar manualmente
    const prod = ticket.find(p => p.id === id);
    if (prod && nuevaCantidad > prod.cantidad_stock) {
      toast.warning(`No puedes vender más de ${prod.cantidad_stock}`);
      return;
    }

    setTicket(prev => prev.map(p => p.id === id ? { ...p, cantidad: nuevaCantidad } : p));
  };

  const eliminarDelTicket = (id) => {
    setTicket(prev => prev.filter(p => p.id !== id));
  };


  const total = useMemo(() => 
    ticket.reduce((acc, item) => acc + (Number(item.cantidad) * Number(item.precio_venta)), 0),
  [ticket]);

  const recibidoNum = parseFloat(efectivoRecibido) || 0;
  const cambio = Math.max(recibidoNum - total, 0);
  const faltante = Math.max(total - recibidoNum, 0);
  const efectivoInsuficiente = formaPago === 'Efectivo' && recibidoNum < total;

  const confirmarVenta = async () => {
    if (ticket.length === 0) return toast.warning('El ticket está vacío');
    if (efectivoInsuficiente) return toast.error('Monto recibido insuficiente');
    if (procesando) return;

    setProcesando(true);
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

    try {
      const res = await API.post('/ventas', {
        forma_pago: formaPago,
        productos: ticket.map(p => ({ id: p.id, cantidad: p.cantidad }))
      });

      const ventaId = res.data.venta_id;

      const detalles = await API.get(`/ventas/${ventaId}`);

      setVentaFinalizada({
        id: ventaId,
        fecha: new Date(),
        forma_pago: formaPago,
        total: total.toFixed(2),
        cambio: cambio.toFixed(2),
        monto_recibido: formaPago === 'Efectivo' ? recibidoNum.toFixed(2) : total.toFixed(2),
        nombre_vendedor: usuario.nombre
      });
      
      setProductosVendidos(detalles.data);
      setMostrarTicket(true);
      
      toast.success(formaPago === 'Efectivo' ? `Cambio: $${fmt(cambio)}` : 'Venta Aprobada');

      setTicket([]);
      setBusqueda('');
      setEfectivoRecibido('');
      
      const resProd = await API.get('/productos');
      setProductos(resProd.data || []);

    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Error al procesar venta');
    } finally {
      setProcesando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col md:flex-row gap-4 p-4 max-w-[1600px] mx-auto">
      
      {/* SECCIÓN IZQUIERDA: Catálogo y Búsqueda */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        
        {/* Barra de Búsqueda */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="relative">
            <input
              ref={inputBusquedaRef}
              type="text"
              placeholder="🔍 Escanea código de barras o escribe nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault();
                  // 1. Intentar búsqueda exacta
                  const exacto = buscarPorCodigoExacto(busqueda);
                  if (exacto) {
                    agregarAlTicket(exacto);
                  } 
                  // 2. Si hay resultados filtrados visibles, tomar el primero
                  else if (productosFiltrados.length > 0) {
                    agregarAlTicket(productosFiltrados[0]);
                  } else {
                    toast.error('Producto no encontrado');
                    setBusqueda(''); // Limpiar para reintentar rápido
                  }
                }
              }}
              className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none text-lg transition-all"
              autoFocus
            />
            <Search className="absolute left-4 top-4.5 text-slate-400" size={24} />
          </div>
        </div>

        {/* Grid de Productos */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {busqueda && productosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Search size={48} className="mb-2 opacity-50" />
              <p>No se encontraron productos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {(busqueda ? productosFiltrados : productos.slice(0, 20)).map((p) => (
                <div
                  key={p.id}
                  onClick={() => agregarAlTicket(p)}
                  className={`bg-white border rounded-xl p-3 cursor-pointer transition-all hover:shadow-md hover:border-blue-300 group
                    ${p.cantidad_stock <= 0 ? 'opacity-60 grayscale' : ''}`}
                >
                  <div className="relative aspect-square mb-2 rounded-lg bg-slate-100 overflow-hidden">
                    {p.imagen ? (
                      <img src={`${import.meta.env.VITE_API_URL}${p.imagen}`} alt={p.descripcion} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ShoppingCart size={32} />
                      </div>
                    )}
                    {p.cantidad_stock <= 0 && (
                      <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                        <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">AGOTADO</span>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-sm text-slate-800 line-clamp-2 h-10">{p.descripcion}</h3>
                  
                  <div className="flex justify-between items-end mt-2">
                    <div>
                      <p className="text-[10px] text-slate-500 font-mono">{p.codigo}</p>
                      <p className={`text-xs font-bold ${p.cantidad_stock < 5 ? 'text-amber-600' : 'text-slate-500'}`}>
                        Stock: {p.cantidad_stock}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-blue-600">${Math.floor(p.precio_venta)}<sup className="text-xs">{(p.precio_venta % 1).toFixed(2).substring(1)}</sup></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN DERECHA: Ticket y Pago */}
      <div className="w-full md:w-[400px] bg-white border border-slate-200 shadow-xl rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h2 className="font-bold text-slate-700 flex items-center gap-2">
            <ShoppingCart size={20} className="text-blue-600" /> Ticket de Venta
          </h2>
        </div>

        {/* Lista de Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/30">
          {ticket.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
              <ShoppingCart size={48} className="mb-2" />
              <p>El carrito está vacío</p>
            </div>
          ) : (
            ticket.map((item) => (
              <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex gap-3 group relative">
                <button 
                  onClick={() => eliminarDelTicket(item.id)}
                  className="absolute -top-2 -right-2 bg-red-100 text-red-500 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                >
                  <Trash2 size={14} />
                </button>
                
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800 line-clamp-1">{item.descripcion}</p>
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center border rounded-lg bg-slate-50">
                      <button onClick={() => actualizarCantidad(item.id, item.cantidad - 1)} className="px-2 py-1 hover:bg-slate-200 text-slate-600 font-bold">−</button>
                      <input 
                        className="w-8 text-center bg-transparent text-sm font-bold outline-none"
                        value={item.cantidad}
                        onChange={(e) => actualizarCantidad(item.id, e.target.value)}
                      />
                      <button onClick={() => actualizarCantidad(item.id, item.cantidad + 1)} className="px-2 py-1 hover:bg-slate-200 text-slate-600 font-bold">+</button>
                    </div>
                    <p className="font-bold text-slate-700">
                      ${fmt(item.precio_venta * item.cantidad)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Zona de Pago (Sticky Bottom) */}
        <div className="p-5 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-10">
          
          {/* Selector Forma Pago */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {['Efectivo', 'Crédito', 'Débito', 'Transferencia'].map((fp) => (
              <button
                key={fp}
                onClick={() => setFormaPago(fp)}
                className={`py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all flex items-center justify-center gap-2
                  ${formaPago === fp 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
              >
                {fp === 'Efectivo' ? <Banknote size={14} /> : <CreditCard size={14} />} {fp}
              </button>
            ))}
          </div>

          {/* Totales */}
          <div className="space-y-1 mb-4">
            <div className="flex justify-between items-end">
              <span className="text-slate-500 font-medium">Total a Pagar</span>
              <span className="text-3xl font-black text-slate-800 tracking-tight">${fmt(total)}</span>
            </div>
            
            {formaPago === 'Efectivo' && (
              <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-600">Recibido:</span>
                  <input
                    type="number"
                    value={efectivoRecibido}
                    onChange={(e) => setEfectivoRecibido(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmarVenta()}
                    className="w-28 text-right font-bold text-lg bg-white border border-slate-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className={`text-sm font-bold ${efectivoInsuficiente ? 'text-red-600' : 'text-emerald-600'}`}>
                    {efectivoInsuficiente ? 'FALTAN:' : 'CAMBIO:'}
                  </span>
                  <span className={`text-xl font-bold ${efectivoInsuficiente ? 'text-red-600' : 'text-emerald-600'}`}>
                    ${fmt(efectivoInsuficiente ? faltante : cambio)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Botón Final */}
          <button
            onClick={confirmarVenta}
            disabled={ticket.length === 0 || efectivoInsuficiente || procesando}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2
              ${ticket.length === 0 || efectivoInsuficiente || procesando
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/30 active:scale-[0.98]'}`}
          >
            {procesando ? (
              <>
                <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                Procesando...
              </>
            ) : (
              'CONFIRMAR VENTA'
            )}
          </button>
        </div>
      </div>

      {/* Modal Ticket */}
      {mostrarTicket && ventaFinalizada && (
        <TicketModal
          venta={ventaFinalizada}
          productos={productosVendidos}
          onClose={() => {
            setMostrarTicket(false);
            setVentaFinalizada(null);
            setTimeout(() => inputBusquedaRef.current?.focus(), 100);
          }}
        />
      )}
    </div>
  );
}