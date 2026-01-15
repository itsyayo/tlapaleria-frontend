import { useEffect, useState, useMemo, useRef } from 'react';
import API from '../services/api';
import { toast } from 'react-toastify';
import TicketModal from '../components/TicketModal';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShoppingCart, Search, CreditCard, Banknote, User, UserPlus, X, Percent } from 'lucide-react';

export default function NuevaVenta() {
  const navigate = useNavigate();
  const inputBusquedaRef = useRef(null);

  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [ticket, setTicket] = useState([]);

  const [busqueda, setBusqueda] = useState('');
  const [formaPago, setFormaPago] = useState('Efectivo');
  const [efectivoRecibido, setEfectivoRecibido] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mostrarTicket, setMostrarTicket] = useState(false);
  const [ventaFinalizada, setVentaFinalizada] = useState(null);
  const [productosVendidos, setProductosVendidos] = useState([]);

  // const [busquedaCliente, setBusquedaCliente] = useState('');
  // const [mostrarBuscadorClientes, setMostrarBuscadorClientes] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [resProd] = await Promise.all([
          API.get('/productos')
        ]);
        setProductos(resProd.data || []);
      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
        toast.error("Error de conexión al cargar productos");
      } finally {
        setLoading(false);
        setTimeout(() => inputBusquedaRef.current?.focus(), 100);
      }
    };
    cargarDatos();
  }, []);

  //useEffect(() => {
  //  const buscarClientes = async () => {
  //    try {
  //      const res = await API.get(`/clientes`);
  //      setClientes(res.data || []);
  //    } catch (error) {
  //      console.error("Error buscando clientes:", error);
  //    }
  //  };  
  //  const timeoutId = setTimeout(buscarClientes, 300);
  //  return () => clearTimeout(timeoutId);
  //}, [busquedaCliente]);

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
    setTicket(prev => {
      const enCarrito = prev.find(p => p.id === producto.id);

      if ((enCarrito?.cantidad || 0) + 1 > producto.cantidad_stock) {
        toast.info(`Vendiendo sin stock físico`, { autoClose: 1000 });
      } else if (enCarrito) {
        toast.info(`+1 ${producto.descripcion}`, { autoClose: 500 });
      }

      if (enCarrito) {
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
    setTicket(prev => prev.map(p => p.id === id ? { ...p, cantidad: nuevaCantidad } : p));
  };

  const eliminarDelTicket = (id) => {
    setTicket(prev => prev.filter(p => p.id !== id));
  };

  const subtotal = useMemo(() =>
    ticket.reduce((acc, item) => acc + (Number(item.cantidad) * Number(item.precio_venta)), 0),
    [ticket]);

  // --- Lógica para botones de descuento ---
  const toggleDescuento = (porcentaje) => {
    if (subtotal === 0) return;

    const montoCalculado = Number((subtotal * porcentaje).toFixed(2));

    // Si el descuento actual es igual al calculado (ya está aplicado), lo quitamos
    // Usamos una pequeña tolerancia para evitar errores de punto flotante
    if (Math.abs(descuento - montoCalculado) < 0.1) {
      setDescuento(0);
    } else {
      setDescuento(montoCalculado);
    }
  };

  const es5Porciento = subtotal > 0 && Math.abs(descuento - (subtotal * 0.05)) < 0.1 && descuento > 0;
  const es10Porciento = subtotal > 0 && Math.abs(descuento - (subtotal * 0.10)) < 0.1 && descuento > 0;
  // ----------------------------------------

  const totalPagar = Math.max(0, subtotal - descuento);

  const recibidoNum = parseFloat(efectivoRecibido) || 0;
  const cambio = formaPago === 'Efectivo' ? Math.max(recibidoNum - totalPagar, 0) : 0;
  const faltante = Math.max(totalPagar - recibidoNum, 0);
  const efectivoInsuficiente = formaPago === 'Efectivo' && recibidoNum < totalPagar;

  const confirmarVenta = async () => {
    if (ticket.length === 0) return toast.warning('El ticket está vacío');
    if (efectivoInsuficiente) return toast.error('Monto recibido insuficiente');

    //if (formaPago === 'Fiado' && !clienteSeleccionado) {
    //  return toast.error('Debe seleccionar un Cliente para ventas Fiadas');
    //}

    if (procesando) return;

    setProcesando(true);
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

    try {
      const montoRecibidoEnvio = formaPago === 'Efectivo'
        ? parseFloat(efectivoRecibido) || 0
        : totalPagar;

      const payload = {
        forma_pago: formaPago,
        productos: ticket.map(p => ({ id: p.id, cantidad: p.cantidad })),
        monto_recibido: montoRecibidoEnvio,
        descuento_total: descuento,
        cliente_id: clienteSeleccionado?.id || null,
      };

      const res = await API.post('/ventas', payload);
      const ventaId = res.data.id || res.data.venta_id;

      let detallesData = [];
      try {
        const detalles = await API.get(`/ventas/${ventaId}`);
        detallesData = detalles.data.productos || detalles.data;
      } catch (e) {
        console.warn("No se pudieron cargar detalles inmediatos", e);
        detallesData = ticket;
      }

      setVentaFinalizada({
        id: ventaId,
        fecha: new Date(),
        forma_pago: formaPago,
        subtotal: subtotal.toFixed(2),
        descuento_total: descuento.toFixed(2),
        total: totalPagar.toFixed(2),
        monto_recibido: montoRecibidoEnvio,
        cambio: (formaPago === 'Efectivo' ? Math.max(0, montoRecibidoEnvio - totalPagar) : 0).toFixed(2),
        nombre_vendedor: usuario.nombre,
        cliente: clienteSeleccionado ? clienteSeleccionado.nombre : 'Público General'
      });

      setProductosVendidos(detallesData.length > 0 ? detallesData : ticket);
      setMostrarTicket(true);

      if (formaPago === 'Fiado') {
        toast.success(`Venta Fiada a ${clienteSeleccionado.nombre}`);
      } else {
        toast.success(formaPago === 'Efectivo' ? `Cambio: $${fmt(cambio)}` : 'Venta Aprobada');
      }

      setTicket([]);
      setBusqueda('');
      setEfectivoRecibido('');
      setDescuento(0);
      //setClienteSeleccionado(null);
      setFormaPago('Efectivo');

      const resProd = await API.get('/productos');
      setProductos(resProd.data || []);

    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.error || error.message || 'Error al procesar venta';
      toast.error(msg);
    } finally {
      setProcesando(false);
    }
  };

  // --- RENDER ---
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col md:flex-row gap-4 p-4 max-w-[1600px] mx-auto">

      {/* --- SECCIÓN IZQUIERDA: Catálogo y Búsqueda --- */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">

        {/* Barra de Búsqueda */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="relative">
            <input
              ref={inputBusquedaRef}
              type="text"
              placeholder="🔍 Escanea código o escribe nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Tab') {
                  e.preventDefault();
                  const exacto = buscarPorCodigoExacto(busqueda);
                  if (exacto) {
                    agregarAlTicket(exacto);
                  } else if (productosFiltrados.length > 0) {
                    agregarAlTicket(productosFiltrados[0]);
                  } else {
                    toast.error('Producto no encontrado');
                    setBusqueda('');
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
              {(busqueda ? productosFiltrados : productos.slice(0, 20)).map((p) => {
                const stockVisual = p.cantidad_stock < 0 ? 0 : p.cantidad_stock;
                const sinStockReal = p.cantidad_stock <= 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => agregarAlTicket(p)}
                    className={`bg-white border rounded-xl p-3 cursor-pointer transition-all hover:shadow-md hover:border-blue-300 group
                      ${!p.activo ? 'opacity-60 grayscale' : ''}`}
                  >
                    <div className="relative aspect-square mb-2 rounded-lg bg-slate-100 overflow-hidden">
                      {p.imagen ? (
                        <img src={`${import.meta.env.VITE_API_URL}${p.imagen}`} alt={p.descripcion} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <ShoppingCart size={32} />
                        </div>
                      )}
                      {sinStockReal && (
                        <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg z-10 shadow-sm">
                          AGOTADO
                        </div>
                      )}
                    </div>

                    <h3 className="font-semibold text-sm text-slate-800 line-clamp-2 h-10">{p.descripcion}</h3>

                    <div className="flex justify-between items-end mt-2">
                      <div>
                        <p className="text-[10px] text-slate-500 font-mono">{p.codigo}</p>
                        <p className={`text-xs font-bold ${sinStockReal ? 'text-amber-600' : p.cantidad_stock < 5 ? 'text-blue-600' : 'text-slate-500'}`}>
                          Stock: {stockVisual}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-blue-600">${Math.floor(p.precio_venta)}<sup className="text-xs">{(p.precio_venta % 1).toFixed(2).substring(1)}</sup></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --- SECCIÓN DERECHA: Ticket y Pago --- */}
      <div className="w-full md:w-[420px] bg-white border border-slate-200 shadow-xl rounded-2xl flex flex-col overflow-hidden relative">

        {/* Header Ticket */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-700 flex items-center gap-2">
            <ShoppingCart size={20} className="text-blue-600" /> Ticket
          </h2>
          {/*{clienteSeleccionado && (
            <div className="flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-1 rounded-lg text-xs font-bold">
              <User size={12} /> {clienteSeleccionado.nombre}
              <button onClick={() => { setClienteSeleccionado(null); setFormaPago('Efectivo'); }} className="ml-1 hover:text-red-600"><X size={12} /></button>
            </div>
          )}*/}

        </div>

        {/* Lista Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/30">
          {ticket.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
              <ShoppingCart size={48} className="mb-2" />
              <p>Carrito vacío</p>
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

        {/* Zona de Pago */}
        <div className="p-5 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-10">

          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span>${fmt(subtotal)}</span>
            </div>

            {/* SECCIÓN MODIFICADA: Descuentos con botones y manual */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-red-500">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 font-medium">Descuento:</span>

                {/* Botones de Porcentaje */}
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => toggleDescuento(0.05)}
                    className={`px-2 py-1 text-xs rounded border transition-colors font-bold ${es5Porciento
                        ? 'bg-red-500 text-white border-red-600'
                        : 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100'
                      }`}
                  >
                    5%
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleDescuento(0.10)}
                    className={`px-2 py-1 text-xs rounded border transition-colors font-bold ${es10Porciento
                        ? 'bg-red-500 text-white border-red-600'
                        : 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100'
                      }`}
                  >
                    10%
                  </button>
                </div>
              </div>

              <div className="flex items-center border-b border-red-200 w-full sm:w-24 justify-end">
                <span className="mr-1 font-bold">- $</span>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={descuento > 0 ? descuento : ''}
                  onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full text-right font-bold text-red-600 outline-none bg-transparent placeholder-red-200"
                />
              </div>
            </div>

            <div className="flex justify-between items-end pt-2 border-t border-dashed">
              <span className="text-slate-800 font-bold text-lg">Total:</span>
              <span className="text-3xl font-black text-slate-800 tracking-tight">${fmt(totalPagar)}</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            {['Efectivo', 'Crédito', 'Débito', 'Transferencia'].map((fp) => (
              <button
                key={fp}
                onClick={() => {
                  setFormaPago(fp);
                  {/*if (fp === 'Fiado' && !clienteSeleccionado) {
                    setMostrarBuscadorClientes(true);
                    setTimeout(() => document.getElementById('inputCliente')?.focus(), 100);
                  }*/}
                }}
                className={`py-2 px-1 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wide border transition-all flex flex-col items-center justify-center gap-1 h-14
                  ${formaPago === fp
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
              >
                {fp === 'Efectivo' && <Banknote size={16} />}
                {fp === 'Crédito' && <CreditCard size={16} />}
                {fp === 'Débito' && <CreditCard size={16} />}
                {fp === 'Transferencia' && <Banknote size={16} />}
                {fp === 'Fiado' && <UserPlus size={16} />}
                {fp}
              </button>
            ))}
          </div>

          {formaPago === 'Efectivo' && (
            <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-600">Recibido:</span>
                <input
                  type="number"
                  value={efectivoRecibido}
                  onChange={(e) => setEfectivoRecibido(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmarVenta()}
                  className="w-32 text-right font-bold text-xl bg-white border border-slate-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                  placeholder="0.00"
                  autoFocus
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

          {/*{formaPago === 'Fiado' && (
            <div className="mb-4 bg-amber-50 p-3 rounded-xl border border-amber-200">
              {!clienteSeleccionado ? (
                <div className="text-center">
                  <p className="text-amber-700 text-sm font-bold mb-2">Se requiere un cliente</p>
                  <button
                    onClick={() => { setMostrarBuscadorClientes(true); setTimeout(() => document.getElementById('inputCliente')?.focus(), 100); }}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <User size={16} /> Seleccionar Cliente
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-amber-600 font-bold uppercase">Cuenta de:</p>
                    <p className="text-amber-900 font-bold text-lg leading-tight">{clienteSeleccionado.nombre}</p>
                    <p className="text-xs text-amber-700 mt-1">Límite: ${fmt(clienteSeleccionado.limite_credito)}</p>
                  </div>
                  <button onClick={() => setClienteSeleccionado(null)} className="p-2 bg-white rounded-full text-amber-500 hover:text-red-500 shadow-sm border border-amber-100">
                    <UserPlus size={18} />
                  </button>
                </div>
              )}
            </div>
          )} */}

          <button
            onClick={confirmarVenta}
            disabled={ticket.length === 0 || efectivoInsuficiente || procesando || (formaPago === 'Fiado' && !clienteSeleccionado)}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2
              ${ticket.length === 0 || efectivoInsuficiente || procesando || (formaPago === 'Fiado' && !clienteSeleccionado)
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/30 active:scale-[0.98]'}`}
          >
            {procesando ? (
              <>
                <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                Procesando...
              </>
            ) : (
              `COBRAR $${fmt(totalPagar)}`
            )}
          </button>
        </div>

        {/*{mostrarBuscadorClientes && (
          <div className="absolute inset-0 bg-white z-50 flex flex-col p-4 animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-700">Seleccionar Cliente</h3>
              <button onClick={() => setMostrarBuscadorClientes(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>

            <input
              id="inputCliente"
              type="text"
              placeholder="Buscar por nombre..."
              className="w-full p-3 border rounded-lg mb-4 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-400 outline-none"
              value={busquedaCliente}
              onChange={(e) => setBusquedaCliente(e.target.value)}
              autoComplete="off"
            />

            <div className="flex-1 overflow-y-auto space-y-2">
              {clientes.map(c => (
                <div
                  key={c.id}
                  onClick={() => {
                    setClienteSeleccionado(c);
                    setMostrarBuscadorClientes(false);
                    setBusquedaCliente('');
                  }}
                  className="p-3 border rounded-lg hover:bg-amber-50 cursor-pointer flex justify-between items-center group"
                >
                  <div>
                    <p className="font-bold text-slate-800">{c.nombre}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Saldo actual</p>
                    <p className="font-mono font-bold text-red-500">${fmt(c.saldo_actual)}</p>
                  </div>
                </div>
              ))}
              {busquedaCliente && clientes.length === 0 && (
                <div className="text-center text-slate-400 mt-10">
                  <p>No encontrado</p>
                  <button className="mt-2 text-blue-600 font-bold text-sm hover:underline">+ Crear Cliente</button>
                </div>
              )}
            </div>
          </div>
        )} */}

      </div>

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