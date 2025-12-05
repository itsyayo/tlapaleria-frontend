import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api'; 
import { toast } from 'react-toastify';

function normalizar(texto = '') {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function EntradasMercancia() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  const [productos, setProductos] = useState([]);
  
  const [entradas, setEntradas] = useState({}); 
  const [precios, setPrecios] = useState({});   
  const [busqueda, setBusqueda] = useState('');
  const [loadingInit, setLoadingInit] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const inputRef = useRef(null);

  useEffect(() => {
    if (usuario.rol !== 'admin' && usuario.rol !== 'inventario') {
      toast.error('No tienes permisos de inventario');
      navigate('/denegado');
      return;
    }

    const cargarProductos = async () => {
      try {
        const res = await API.get('/productos');
        setProductos(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingInit(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };

    cargarProductos();
  }, [navigate, usuario.rol]);


  const setEntrada = (id, val) => {
    const n = parseFloat(val);
    setEntradas(prev => ({ 
      ...prev, 
      [id]: Number.isFinite(n) && n >= 0 ? n : 0 
    }));
  };

  const setPrecio = (id, tipo, val) => {
    const n = parseFloat(val);
    setPrecios(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [tipo]: Number.isFinite(n) && n >= 0 ? n : 0
      }
    }));
  };

  const modificarCantidad = (id, delta) => {
    setEntradas(prev => {
      const actual = prev[id] || 0;
      const nuevo = Math.max(1, actual + delta); 
      return { ...prev, [id]: nuevo };
    });
  };

  const quitar = (id) => {
    setEntradas(prev => { const c = { ...prev }; delete c[id]; return c; });
    setPrecios(prev => { const c = { ...prev }; delete c[id]; return c; });
  };

  const limpiar = () => {
    if (Object.keys(entradas).length > 0 && !window.confirm('¿Borrar toda la lista de entradas?')) return;
    setEntradas({});
    setPrecios({});
    inputRef.current?.focus();
  };

  const agregarPorBusqueda = () => {
    const q = normalizar(busqueda);
    if (!q) return;

    let prod = productos.find(p =>
      normalizar(String(p.codigo)) === q ||
      normalizar(String(p.codigo_barras || '')) === q
    );

    if (!prod) {
      const matches = productos.filter(p => {
        const texto = normalizar(`${p.codigo} ${p.codigo_barras || ''} ${p.descripcion}`);
        return texto.includes(q);
      });
      
      if (matches.length === 1) {
        prod = matches[0];
      } else if (matches.length > 1) {
        toast.info(`🔍 ${matches.length} coincidencias. Sé más específico.`);
        return;
      }
    }

    if (!prod) {
      toast.warning('❌ Producto no encontrado');
      setBusqueda(''); 
      return;
    }

    setEntradas(prev => ({ ...prev, [prod.id]: (prev[prod.id] || 0) + 1 }));
    
    setBusqueda('');
    toast.success(`👍 Agregado: ${prod.descripcion}`);
    
    inputRef.current?.focus();
  };


  const seleccion = useMemo(() => {
    const ids = Object.keys(entradas).map(Number).filter(Boolean);
    const mapa = new Map(productos.map(p => [p.id, p]));
    
    return ids.map(id => {
        const p = mapa.get(id);
        if (!p) return null;
        
        const cant = Number(entradas[id] || 0);
        const preciosEditados = precios[id] || {};
        
        const precioC = preciosEditados.precio_compra !== undefined 
          ? preciosEditados.precio_compra 
          : Number(p.precio_compra);
          
        const precioV = preciosEditados.precio_venta !== undefined 
          ? preciosEditados.precio_venta 
          : Number(p.precio_venta);

        return {
          ...p,
          cantidad_entrada: cant,
          nuevo_stock: Number(p.cantidad_stock) + cant,
          precio_compra_final: precioC,
          precio_venta_final: precioV
        };
      })
      .filter(Boolean);
  }, [productos, entradas, precios]);

  const payload = useMemo(() =>
    seleccion.map(p => ({
      id: p.id,
      cantidad: p.cantidad_entrada,
      precio_compra: p.precio_compra_final,
      precio_venta: p.precio_venta_final
    })).filter(x => x.cantidad > 0)
  , [seleccion]);

  const totalItems = payload.reduce((acc, item) => acc + item.cantidad, 0);

  const guardarEntradas = async () => {
    if (payload.length === 0) return toast.info('No hay entradas para procesar');
    
    setSubmitting(true);
    try {
      const res = await API.post('/inventario/entradas', { entradas: payload });

      setProductos(prev =>
        prev.map(p => {
          const entrada = payload.find(x => x.id === p.id);
          if (!entrada) return p;
          return {
            ...p,
            cantidad_stock: Number(p.cantidad_stock) + entrada.cantidad,
            precio_compra: entrada.precio_compra,
            precio_venta: entrada.precio_venta
          };
        })
      );
      
      setEntradas({});
      setPrecios({});
      toast.success(`✅ Inventario actualizado (+${res.data?.updated || payload.length} productos)`);
      inputRef.current?.focus();

    } catch (e) {
      console.error(e);
      if (e.response?.status === 400) {
        toast.error('Datos inválidos en la entrada');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInit) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-slate-500 text-sm">Cargando catálogo de productos...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto mt-8 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800">📥 Recepción de Mercancía</h1>
           <p className="text-sm text-slate-500">Registra entradas de stock y actualiza costos</p>
        </div>
        
        {/* Resumen flotante */}
        {totalItems > 0 && (
          <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 flex items-center gap-3">
             <span className="text-sm text-blue-800 font-bold">Total Artículos: {totalItems}</span>
             <span className="text-slate-300">|</span>
             <span className="text-sm text-blue-800 font-bold">Productos: {seleccion.length}</span>
          </div>
        )}
      </div>

      {/* Barra de Búsqueda */}
      <div className="bg-white border rounded-xl p-4 mb-6 shadow-sm flex gap-3 sticky top-2 z-10">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder="🔍 Escanea código de barras o busca por nombre..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && agregarPorBusqueda()}
            className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-lg"
            autoFocus
          />
          <span className="absolute left-3 top-3.5 text-slate-400">📦</span>
        </div>
        <button
          onClick={agregarPorBusqueda}
          className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-sm"
        >
          Agregar
        </button>
      </div>

      {/* Tabla de Entradas */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="p-4 min-w-[120px]">Código</th>
                <th className="p-4 min-w-[200px]">Descripción</th>
                <th className="p-4 text-center">Stock Actual</th>
                <th className="p-4 text-center min-w-[140px]">Cantidad Entrada</th>
                <th className="p-4 text-center">Nuevo Stock</th>
                <th className="p-4 text-center min-w-[120px]">Costo Compra</th>
                <th className="p-4 text-center min-w-[120px]">Precio Venta</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {seleccion.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl opacity-50">🚚</span>
                      <p>Escanea productos para comenzar la recepción.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                seleccion.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-mono text-xs">{p.codigo}</td>
                    <td className="p-4 font-medium text-slate-800">{p.descripcion}</td>
                    <td className="p-4 text-center text-slate-500">{p.cantidad_stock}</td>
                    
                    {/* Input Cantidad */}
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => modificarCantidad(p.id, -1)} className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold">−</button>
                        <input
                          type="number"
                          min="1"
                          value={p.cantidad_entrada === 0 ? '' : p.cantidad_entrada}
                          onChange={e => setEntrada(p.id, e.target.value)}
                          className="w-16 text-center border rounded-md py-1 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-700"
                        />
                        <button onClick={() => modificarCantidad(p.id, 1)} className="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold">+</button>
                      </div>
                    </td>

                    <td className="p-4 text-center font-bold text-slate-800 bg-slate-50/50">
                      {p.nuevo_stock}
                    </td>

                    {/* Precio Compra */}
                    <td className="p-4 text-center">
                       <div className="relative">
                         <span className="absolute left-2 top-1.5 text-xs text-slate-400">$</span>
                         <input
                            type="number" min="0" step="0.01"
                            value={p.precio_compra_final}
                            onChange={e => setPrecio(p.id, 'precio_compra', e.target.value)}
                            className="w-24 pl-5 pr-2 py-1 border rounded-md text-right text-xs focus:ring-2 focus:ring-slate-400 outline-none"
                         />
                       </div>
                    </td>

                    {/* Precio Venta */}
                    <td className="p-4 text-center">
                       <div className="relative">
                         <span className="absolute left-2 top-1.5 text-xs text-slate-400">$</span>
                         <input
                            type="number" min="0" step="0.01"
                            value={p.precio_venta_final}
                            onChange={e => setPrecio(p.id, 'precio_venta', e.target.value)}
                            className="w-24 pl-5 pr-2 py-1 border border-blue-200 rounded-md text-right text-xs font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none"
                         />
                       </div>
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => quitar(p.id)}
                        className="text-slate-400 hover:text-rose-500 p-2 transition"
                        title="Quitar de la lista"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer de Acciones */}
      <div className="flex justify-end gap-4 pb-10">
        <button
          onClick={limpiar}
          disabled={seleccion.length === 0 || submitting}
          className="px-6 py-3 rounded-xl border border-slate-300 text-slate-600 font-medium hover:bg-slate-50 disabled:opacity-50 transition"
        >
          Limpiar Todo
        </button>
        <button
          onClick={guardarEntradas}
          disabled={seleccion.length === 0 || submitting}
          className={`px-8 py-3 rounded-xl text-white font-bold shadow-lg transition flex items-center gap-2
            ${submitting || seleccion.length === 0
              ? 'bg-green-400 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700 hover:shadow-xl hover:-translate-y-0.5'}`}
        >
          {submitting ? (
            <>
               <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
               Procesando...
            </>
          ) : (
            `💾 Confirmar Entradas`
          )}
        </button>
      </div>
    </div>
  );
}