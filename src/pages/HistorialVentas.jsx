import { useEffect, useState, useMemo } from 'react';
import API from '../services/api';
import { toast } from 'react-toastify';
import { 
  Calendar, CreditCard, Search, Eye, FileText, Filter, 
  ChevronLeft, ChevronRight 
} from 'lucide-react';
import TicketModal from '../components/TicketModal';

function HistorialVentas() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filtroPago, setFiltroPago] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [busquedaId, setBusquedaId] = useState('');

  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 15;

  const [showModal, setShowModal] = useState(false);
  const [ventaActual, setVentaActual] = useState(null);
  const [productosVenta, setProductosVenta] = useState([]);
  const [loadingTicket, setLoadingTicket] = useState(false);

  useEffect(() => {
    const fetchVentas = async () => {
      setLoading(true);
      try {
        const res = await API.get('/ventas');
        setVentas(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchVentas();
  }, []);

  useEffect(() => {
    setPaginaActual(1);
  }, [filtroPago, fechaDesde, fechaHasta, busquedaId]);

  const verTicket = async (venta) => {
    if (loadingTicket) return;
    setLoadingTicket(true);
    try {
      const res = await API.get(`/ventas/${venta.id}`);
      setVentaActual(venta);
      setProductosVenta(res.data);
      setShowModal(true);
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron cargar los detalles');
    } finally {
      setLoadingTicket(false);
    }
  };

  const ventasFiltradas = useMemo(() => {
    return ventas.filter((v) => {
      const fechaVenta = new Date(v.fecha);
      const desde = fechaDesde ? new Date(`${fechaDesde}T00:00:00`) : null;
      const hasta = fechaHasta ? new Date(`${fechaHasta}T23:59:59`) : null;

      const coincidePago = filtroPago ? v.forma_pago === filtroPago : true;
      const despuesDeDesde = desde ? fechaVenta >= desde : true;
      const antesDeHasta = hasta ? fechaVenta <= hasta : true;
      const coincideId = busquedaId ? String(v.id).includes(busquedaId) : true;

      return coincidePago && despuesDeDesde && antesDeHasta && coincideId;
    });
  }, [ventas, filtroPago, fechaDesde, fechaHasta, busquedaId]);

  const indiceUltimoItem = paginaActual * itemsPorPagina;
  const indicePrimerItem = indiceUltimoItem - itemsPorPagina;
  const ventasPaginadas = ventasFiltradas.slice(indicePrimerItem, indiceUltimoItem);
  const totalPaginas = Math.ceil(ventasFiltradas.length / itemsPorPagina);

  const resumen = useMemo(() => {
    return ventasFiltradas.reduce((acc, curr) => ({
      total: acc.total + Number(curr.total),
      count: acc.count + 1
    }), { total: 0, count: 0 });
  }, [ventasFiltradas]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 pb-10">
      
      {/* Header y Resumen */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <FileText className="text-blue-600" /> Historial de Ventas
           </h1>
           <p className="text-sm text-slate-500">Consulta y reimpresión de tickets</p>
        </div>
        <div className="flex gap-4">
            <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm min-w-[120px]">
                <p className="text-xs text-slate-500 uppercase font-bold">Transacciones</p>
                <p className="text-xl font-bold text-slate-700">{resumen.count}</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl shadow-sm min-w-[160px]">
                <p className="text-xs text-blue-600 uppercase font-bold">Total Ventas</p>
                <p className="text-2xl font-bold text-blue-700">
                    ${resumen.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
            </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white border rounded-xl shadow-sm p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
             <label className="text-xs font-bold text-slate-500 mb-1 block">Folio / ID</label>
             <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                    type="text"
                    value={busquedaId}
                    onChange={(e) => setBusquedaId(e.target.value)}
                    placeholder="Buscar folio..."
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
             </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Forma de Pago</label>
            <div className="relative">
                <CreditCard className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <select
                    value={filtroPago}
                    onChange={(e) => setFiltroPago(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                    <option value="">Todas</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Transferencia">Transferencia</option>
                </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Desde</label>
            <div className="relative">
                <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-600"
                />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">Hasta</label>
            <div className="relative">
                <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-600"
                />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="p-4 w-24">Folio</th>
                <th className="p-4">Fecha / Hora</th>
                <th className="p-4">Vendedor</th>
                <th className="p-4">Método Pago</th>
                <th className="p-4 text-right">Total</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ventasPaginadas.length === 0 ? ( 
                 <tr>
                    <td colSpan="6" className="p-10 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                            <Filter size={32} className="opacity-50"/>
                            <p>No se encontraron ventas con estos filtros.</p>
                        </div>
                    </td>
                 </tr>
              ) : (
                ventasPaginadas.map((v) => ( 
                    <tr key={v.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 font-mono font-medium text-slate-700">#{v.id}</td>
                      <td className="p-4">
                          {new Date(v.fecha).toLocaleDateString('es-MX', { 
                              year: 'numeric', month: 'short', day: 'numeric', 
                              hour: '2-digit', minute: '2-digit'
                          })}
                      </td>
                      <td className="p-4">
                          <span className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-200 text-xs flex items-center justify-center font-bold text-slate-600">
                                  {v.nombre_vendedor?.charAt(0) || '?'}
                              </div>
                              {v.nombre_vendedor}
                          </span>
                      </td>
                      <td className="p-4">
                          <span className={`px-2 py-1 rounded-md text-xs font-bold border 
                              ${v.forma_pago === 'Efectivo' ? 'bg-green-50 text-green-700 border-green-100' : 
                                v.forma_pago === 'Débito' ? 'bg-purple-50 text-purple-700 border-purple-100' : 
                                v.forma_pago === 'Crédito' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                'bg-blue-50 text-blue-700 border-blue-100'}`}>
                              {v.forma_pago}
                          </span>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-800">
                          ${Number(v.total).toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                          <button
                          onClick={() => verTicket(v)}
                          disabled={loadingTicket}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition text-xs font-medium shadow-sm"
                          >
                          <Eye size={14} /> Ver Ticket
                          </button>
                      </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Controles de Paginación */}
      {ventasFiltradas.length > 0 && (
        <div className="flex items-center justify-between bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-sm text-slate-500">
            Mostrando <span className="font-bold">{indicePrimerItem + 1}</span> a <span className="font-bold">{Math.min(indiceUltimoItem, ventasFiltradas.length)}</span> de <span className="font-bold">{ventasFiltradas.length}</span> resultados
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
              disabled={paginaActual === 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium text-slate-600 px-2">
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
              disabled={paginaActual === totalPaginas}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Modal Ticket */}
      {showModal && ventaActual && (
        <TicketModal
          venta={ventaActual}
          productos={productosVenta}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

export default HistorialVentas;