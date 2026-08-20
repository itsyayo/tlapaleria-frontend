import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../services/api'; 
import { toast } from 'react-toastify';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Search, Trash2, User, UserCog, AlertCircle, TrendingUp, Tags, Save } from 'lucide-react';

function normalizar(texto = '') {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const formatear = (num) => `$${Number(num || 0).toFixed(2)}`;

export default function CotizacionesEspeciales() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  
  const { id: cotizacionIdParam } = useParams();
  const isEditing = Boolean(cotizacionIdParam);

  const [productos, setProductos] = useState([]);
  const [cotizacion, setCotizacion] = useState([]); 
  const [busqueda, setBusqueda] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');
  const [loadingInit, setLoadingInit] = useState(true);
  const [guardando, setGuardando] = useState(false);
  
  const inputRef = useRef(null);

  useEffect(() => {
    if (usuario.rol !== 'admin' && usuario.rol !== 'ventas') {
      toast.error('No tienes permisos para cotizar');
      navigate('/denegado');
      return;
    }

    const cargarProductos = async () => {
      try {
        const res = await API.get('/productos');
        setProductos(res.data || []);
      } catch (err) {
        console.error(err);
        toast.error('Error al cargar catálogo');
      } finally {
        setLoadingInit(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };
    cargarProductos();
  }, [navigate, usuario.rol]);

  useEffect(() => {
    if (!isEditing) return;

    const cargarCotizacionExistente = async () => {
      try {
        const res = await API.get(`/cotizaciones/${cotizacionIdParam}`);
        const data = res.data;

        setNombreCliente(data.cliente || '');

        const productosProcesados = (data.productos || []).map(p => {
          const precioCompra = Number(p.precio_compra || 0);
          const precioVenta = Number(p.precio_original || p.precio_unitario || 0);
          const niveles = calcularPrecios(precioCompra, precioVenta);

          return {
            id: p.id,
            codigo: p.codigo || 'N/A',
            descripcion: p.descripcion,
            cantidad: p.cantidad,
            cantidad_stock: p.cantidad_stock ?? 0,
            precio_compra: precioCompra,
            precio_venta: precioVenta,
            nivelSeleccionado: p.nivel_aplicado || 1, 
            nivelesCalculados: niveles
          };
        });

        setCotizacion(productosProcesados);
      } catch (err) {
        console.error(err);
        toast.error('Error al cargar la cotización para edición');
      }
    };

    cargarCotizacionExistente();
  }, [cotizacionIdParam, isEditing]);


  const sugerencias = useMemo(() => {
    if (!busqueda.trim()) return [];
    const q = normalizar(busqueda);
    return productos.filter(p => {
      const texto = normalizar(`${p.codigo} ${p.codigo_barras || ''} ${p.descripcion}`);
      return texto.includes(q);
    }).slice(0, 10);
  }, [busqueda, productos]);

  const calcularPrecios = (precioCompra, precioVenta) => {
    const compra = Number(precioCompra) || 0;
    const venta = Number(precioVenta) || 0;
    const utilidadMaxima = Math.max(0, venta - compra);
    const tercioUtilidad = utilidadMaxima / 3;

    const generarDataNivel = (precioFinal) => {
      const descuentoDinero = venta - precioFinal;
      const porcentajeDesc = venta > 0 ? (descuentoDinero / venta) * 100 : 0;
      const ganancia = precioFinal - compra;
      return {
        precio: precioFinal,
        descPorcentaje: porcentajeDesc,
        descDinero: descuentoDinero,
        utilidad: ganancia
      };
    };

    return {
      nivel1: generarDataNivel(venta), 
      nivel2: generarDataNivel(venta - tercioUtilidad),
      nivel3: generarDataNivel(venta - (tercioUtilidad / 2)),
      nivel4: generarDataNivel(venta - (tercioUtilidad / 3))
    };
  };

  const agregarProducto = (prod) => {
    setCotizacion(prev => {
      const existe = prev.find(p => p.id === prod.id);
      if (existe) {
        return prev.map(p => p.id === prod.id ? { ...p, cantidad: p.cantidad + 1 } : p);
      }
      
      const niveles = calcularPrecios(prod.precio_compra, prod.precio_venta);
      
      return [...prev, { 
        ...prod, 
        cantidad: 1, 
        nivelSeleccionado: 1,
        nivelesCalculados: niveles 
      }];
    });
    setBusqueda('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = normalizar(busqueda);
      if (!q) return;

      const exacto = productos.find(p => normalizar(String(p.codigo)) === q || normalizar(String(p.codigo_barras || '')) === q);

      if (exacto) agregarProducto(exacto);
      else if (sugerencias.length === 1) agregarProducto(sugerencias[0]);
      else if (sugerencias.length > 1) toast.info(`Múltiples coincidencias. Selecciona de la lista.`);
      else { toast.warning('Producto no encontrado'); setBusqueda(''); }
    }
  };

  const modificarItem = (id, campo, valor) => {
    setCotizacion(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));
  };

  const eliminarItem = (id) => {
    setCotizacion(prev => prev.filter(p => p.id !== id));
  };

  const detalleFinanciero = useMemo(() => {
    return cotizacion.reduce((acc, item) => {
      const dataNivel = item.nivelesCalculados[`nivel${item.nivelSeleccionado}`];
      const importeBase = item.precio_venta * item.cantidad;
      const importeFinal = dataNivel.precio * item.cantidad;
      const costo = item.precio_compra * item.cantidad;
      
      return {
        subtotalBase: acc.subtotalBase + importeBase,
        totalDescuento: acc.totalDescuento + (dataNivel.descDinero * item.cantidad),
        costoTotal: acc.costoTotal + costo,
        utilidadBruta: acc.utilidadBruta + (dataNivel.utilidad * item.cantidad),
        totalFinal: acc.totalFinal + importeFinal
      };
    }, { subtotalBase: 0, totalDescuento: 0, costoTotal: 0, utilidadBruta: 0, totalFinal: 0 });
  }, [cotizacion]);

  const guardarCotizacion = async (imprimirDespues = false, tipoImpresion = 'cliente') => {
    if (cotizacion.length === 0) return toast.warning('La cotización está vacía');

    setGuardando(true);
    try {
      const payload = {
        cliente_nombre: nombreCliente || 'Público General',
        total: detalleFinanciero.totalFinal,
        descuento_total: detalleFinanciero.totalDescuento,
        subtotal: detalleFinanciero.subtotalBase,
        productos: cotizacion.map(p => {
          const nivelData = p.nivelesCalculados[`nivel${p.nivelSeleccionado}`];
          return {
            producto_id: p.id,
            descripcion: p.descripcion,
            cantidad: p.cantidad,
            precio_unitario: nivelData.precio,
            precio_original: p.precio_venta,
            precio_compra: p.precio_compra,
            nivel_aplicado: p.nivelSeleccionado,
            descuento_aplicado: nivelData.descDinero * p.cantidad,
            subtotal: nivelData.precio * p.cantidad
          };
        })
      };

      let folio = cotizacionIdParam;

      if (isEditing) {
        await API.put(`/cotizaciones/${cotizacionIdParam}`, payload);
        toast.success(`Cotización #${cotizacionIdParam} actualizada con éxito`);
      } else {
        const res = await API.post('/cotizaciones', payload);
        folio = res.data?.id || res.data?.cotizacion_id || 'N/A';
        toast.success(`Cotización #${folio} guardada con éxito`);
      }

      if (imprimirDespues) {
        generarPDF(tipoImpresion, folio);
      }

      if (!isEditing) {
        setCotizacion([]);
        setNombreCliente('');
        setBusqueda('');
        inputRef.current?.focus();
      } else {
        navigate('/cotizaciones'); 
      }

    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.error || 'Error al procesar la cotización';
      toast.error(msg);
    } finally {
      setGuardando(false);
    }
  };

  const generarPDF = (tipo, folioCustom = null) => {
    if (cotizacion.length === 0) return;
    const esInterno = tipo === 'vendedor';
    const doc = new jsPDF({ orientation: esInterno ? 'landscape' : 'portrait' });
    
    // --- ENCABEZADO ---
    doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text('TLAPALERÍA GAMA', 14, 20);
    
    doc.setFontSize(12); doc.setFont('helvetica', 'normal');
    doc.text(esInterno ? 'COTIZACIÓN INTERNA (DETALLADA)' : 'COTIZACIÓN COMERCIAL', 14, 28);
    doc.setFontSize(10);
    if (folioCustom) doc.text(`Folio: #${folioCustom}`, 14, 34);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, folioCustom ? 60 : 14, 34);
    doc.text(`Cliente: ${nombreCliente || 'Público General'}`, 14, 40);
    doc.text(`Atendido por: ${usuario.nombre || 'Vendedor'}`, 14, 46);

    // --- TABLA DE PRODUCTOS ---
    let columnas = []; let filas = [];

    if (esInterno) {
      columnas = ["Cant.", "Descripción", "Stock", "Costo U.", "P. Lista", "Descuento", "Utilidad U.", "P. Final", "Importe"];
      filas = cotizacion.map(p => {
        const d = p.nivelesCalculados[`nivel${p.nivelSeleccionado}`];
        return [
          p.cantidad, p.descripcion.substring(0, 30), p.cantidad_stock,
          formatear(p.precio_compra), formatear(p.precio_venta),
          `${d.descPorcentaje.toFixed(1)}% (-${formatear(d.descDinero)})`,
          formatear(d.utilidad), formatear(d.precio), formatear(d.precio * p.cantidad)
        ];
      });
    } else {
      columnas = ["Cant.", "Descripción", "Precio Unitario", "Importe"];
      filas = cotizacion.map(p => {
        const d = p.nivelesCalculados[`nivel${p.nivelSeleccionado}`];
        return [p.cantidad, p.descripcion, formatear(d.precio), formatear(d.precio * p.cantidad)];
      });
    }

    autoTable(doc, {
      startY: 52, head: [columnas], body: filas, theme: 'grid',
      headStyles: { fillColor: esInterno ? [15, 118, 110] : [30, 41, 59] },
      styles: { fontSize: esInterno ? 8 : 10 }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    
    // --- CÁLCULOS FISCALES (Asumiendo IVA 16% incluido en precio público) ---
    const subtotalNeto = detalleFinanciero.totalFinal / 1.16; 
    const iva16 = detalleFinanciero.totalFinal - subtotalNeto; 

    // --- DESGLOSE LADO DERECHO (Estilo Ticket/Factura) ---
    const rightX = doc.internal.pageSize.getWidth() - 14; 
    const labelX = rightX - 32; 
    let currentY = finalY;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    // Subtotal Base
    doc.text('Subtotal Base:', labelX, currentY, { align: 'right' });
    doc.text(formatear(detalleFinanciero.subtotalBase), rightX, currentY, { align: 'right' });
    currentY += 5;

    // Descuentos
    if (detalleFinanciero.totalDescuento > 0) {
      doc.text('Descuento:', labelX, currentY, { align: 'right' });
      doc.text(`-${formatear(detalleFinanciero.totalDescuento)}`, rightX, currentY, { align: 'right' });
      currentY += 5;
    }

    // Subtotal Neto
    doc.text('Subtotal Neto:', labelX, currentY, { align: 'right' });
    doc.text(formatear(subtotalNeto), rightX, currentY, { align: 'right' });
    currentY += 5;

    // IVA
    doc.text('IVA (16%):', labelX, currentY, { align: 'right' });
    doc.text(formatear(iva16), rightX, currentY, { align: 'right' });
    currentY += 5;

    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(labelX - 10, currentY - 3, rightX, currentY - 3);

    // Total final
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', labelX, currentY + 4, { align: 'right' });
    doc.text(formatear(detalleFinanciero.totalFinal), rightX, currentY + 4, { align: 'right' });


    // --- MENSAJES LADO IZQUIERDO ---
    if (esInterno) {
      let leftY = finalY;
      doc.setFontSize(10); doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'normal');
      doc.text(`Costo Total Inventario: ${formatear(detalleFinanciero.costoTotal)}`, 14, leftY);
      
      doc.setTextColor(5, 150, 105);
      doc.setFont('helvetica', 'bold');
      doc.text(`UTILIDAD NETA PROYECTADA: ${formatear(detalleFinanciero.utilidadBruta)}`, 14, leftY + 8);
    } else {
      let leftY = finalY;
      
      doc.setTextColor(0, 0, 0); 
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Precios sujetos a cambios sin previo aviso. Vigencia: 15 días.', 14, leftY + 8);
    }

    window.open(URL.createObjectURL(doc.output('blob')), '_blank');
  };

  if (loadingInit) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto mt-8 p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <Tags className="text-blue-600"/> 
             {isEditing ? `Editando Cotización #${cotizacionIdParam}` : 'Cotizaciones Especiales'}
           </h1>
           <p className="text-sm text-slate-500">Panel avanzado de negociación, descuentos y cotizaciones</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => guardarCotizacion(false)} 
            disabled={cotizacion.length === 0 || guardando} 
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm"
          >
            <Save size={18} /> {guardando ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Guardar')}
          </button>

          <button 
            onClick={() => guardarCotizacion(true, 'cliente')} 
            disabled={cotizacion.length === 0 || guardando} 
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition disabled:opacity-50 shadow-sm"
          >
            <User size={18} /> {isEditing ? 'Actualizar' : 'Guardar'} & PDF Cliente
          </button>

          <button 
            onClick={() => guardarCotizacion(true, 'vendedor')} 
            disabled={cotizacion.length === 0 || guardando} 
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 transition disabled:opacity-50 shadow-sm"
          >
            <UserCog size={18} /> {isEditing ? 'Actualizar' : 'Guardar'} & PDF Interno
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2 relative">
          <input ref={inputRef} type="text" placeholder="🔍 Buscar producto para cotizar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} onKeyDown={handleKeyDown} className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-lg bg-white" />
          <Search className="absolute left-3 top-3.5 text-slate-400" size={20} />
          {busqueda.length > 0 && sugerencias.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-100">
              {sugerencias.map(p => (
                <div key={p.id} onClick={() => agregarProducto(p)} className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition">
                   <div>
                     <p className="font-bold text-slate-800 text-sm">{p.descripcion}</p>
                     <p className="text-xs text-slate-500 mt-1">Costo: {formatear(p.precio_compra)} | Venta: {formatear(p.precio_venta)}</p>
                   </div>
                   <div className="text-right">
                     <span className="text-xs font-medium text-slate-500 block mb-1">Stock Actual</span>
                     <span className={`text-sm font-bold ${p.cantidad_stock <= 0 ? 'text-rose-500' : 'text-blue-600'}`}>{p.cantidad_stock}</span>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <input type="text" placeholder="👤 Nombre del Cliente (Opcional)" value={nombreCliente} onChange={e => setNombreCliente(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-lg bg-white" />
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="p-4 w-16">Cant.</th>
                <th className="p-4 min-w-[200px]">Producto</th>
                <th className="p-4 text-center">Stock</th>
                <th className="p-4 text-center">Costo / Normal</th>
                <th className="p-4 text-center min-w-[320px]">Elegir Nivel de Descuento</th>
                <th className="p-4 text-right">Importe Neto</th>
                <th className="p-4 text-center">🗑️</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cotizacion.length === 0 ? (
                <tr><td colSpan="7" className="p-12 text-center text-slate-400">Escanea o busca productos para cotizar.</td></tr>
              ) : (
                cotizacion.map(p => {
                  const dataSeleccionada = p.nivelesCalculados[`nivel${p.nivelSeleccionado}`];
                  const sinStock = p.cantidad > p.cantidad_stock;
                  
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="p-4">
                        <input type="number" min="1" value={p.cantidad} onChange={e => modificarItem(p.id, 'cantidad', Math.max(1, parseInt(e.target.value) || 1))} className="w-16 text-center border rounded-md py-1 focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800 leading-tight">{p.descripcion}</p>
                        <p className="text-xs text-slate-400 font-mono mt-1">{p.codigo}</p>
                      </td>
                      <td className="p-4 text-center">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${sinStock ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                          {sinStock && <AlertCircle size={12}/>} {p.cantidad_stock}
                        </div>
                      </td>
                      <td className="p-4 text-center text-xs">
                        <p className="text-slate-400">C: {formatear(p.precio_compra)}</p>
                        <p className="text-slate-700 line-through">N: {formatear(p.precio_venta)}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-center">
                          {[1, 2, 3, 4].map(nivel => {
                            const d = p.nivelesCalculados[`nivel${nivel}`];
                            const activo = p.nivelSeleccionado === nivel;
                            return (
                              <button key={nivel} onClick={() => modificarItem(p.id, 'nivelSeleccionado', nivel)}
                                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all w-24 ${activo ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                              >
                                <span className={`text-[10px] font-bold ${activo ? 'text-blue-700' : 'text-slate-500'}`}>Nivel {nivel}</span>
                                <span className={`font-black text-sm ${activo ? 'text-slate-900' : 'text-slate-700'}`}>{formatear(d.precio)}</span>
                                {d.descPorcentaje > 0 ? (
                                  <span className="text-[9px] font-bold text-red-500">-{d.descPorcentaje.toFixed(1)}%</span>
                                ) : (
                                  <span className="text-[9px] text-slate-400">Normal</span>
                                )}
                                <span className="text-[9px] text-emerald-600 font-medium mt-1 border-t border-slate-100 w-full pt-1">
                                  Util: {formatear(d.utilidad)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <p className="font-black text-slate-800 text-lg">{formatear(dataSeleccionada.precio * p.cantidad)}</p>
                        {dataSeleccionada.descDinero > 0 && (
                          <p className="text-xs text-red-500 font-medium">Ahorro: {formatear(dataSeleccionada.descDinero * p.cantidad)}</p>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => eliminarItem(p.id)} className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {cotizacion.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 md:col-span-1 flex flex-col justify-center">
             <h3 className="text-emerald-800 font-bold text-sm mb-2 flex items-center gap-2"><TrendingUp size={16}/> Rentabilidad de Cotización</h3>
             <div className="flex justify-between text-sm text-emerald-700 mb-1"><span>Costo Total Mercancía:</span> <span>{formatear(detalleFinanciero.costoTotal)}</span></div>
             <div className="flex justify-between text-sm text-emerald-700 mb-2"><span>Descuentos Cedidos:</span> <span className="text-red-500">-{formatear(detalleFinanciero.totalDescuento)}</span></div>
             <div className="w-full h-px bg-emerald-200 my-2"></div>
             <div className="flex justify-between font-black text-emerald-900 text-lg"><span>Utilidad Neta:</span> <span>{formatear(detalleFinanciero.utilidadBruta)}</span></div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-xl p-5 md:col-span-2 flex flex-col items-end justify-center shadow-sm">
             <div className="flex justify-between w-full sm:w-72 text-slate-500 text-sm mb-1">
               <span>Subtotal (Precio Normal):</span>
               <span>{formatear(detalleFinanciero.subtotalBase)}</span>
             </div>
             {detalleFinanciero.totalDescuento > 0 && (
               <div className="flex justify-between w-full sm:w-72 text-red-500 font-medium text-sm mb-2">
                 <span>Descuento Aplicado:</span>
                 <span>-{formatear(detalleFinanciero.totalDescuento)}</span>
               </div>
             )}
             <div className="w-full sm:w-72 h-px bg-slate-200 my-2"></div>
             <div className="flex justify-between w-full sm:w-72 items-end">
               <span className="text-lg font-bold text-slate-700">TOTAL A COBRAR:</span>
               <span className="text-3xl font-black text-slate-900">{formatear(detalleFinanciero.totalFinal)}</span>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}