import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api'; 
import { toast } from 'react-toastify';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function CorteCaja() {
  const usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}');
  const navigate = useNavigate();

  const [reporte, setReporte] = useState([]);
  const [usuariosLista, setUsuariosLista] = useState([]); 

  const [filtros, setFiltros] = useState({
    desde: new Date().toISOString().split('T')[0],
    hasta: new Date().toISOString().split('T')[0],
    forma_pago: '',
    usuario_id: ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (usuarioActual.rol !== 'admin') {
      navigate('/denegado');
      return;
    }

    const cargarUsuarios = async () => {
      try {
        const res = await API.get('/usuarios');
        setUsuariosLista(res.data || []);
      } catch (err) {
        console.error('Error cargando usuarios para filtros', err);
      }
    };

    cargarUsuarios();
    cargarReporte();
  }, []);

  const cargarReporte = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtros.desde) params.desde = filtros.desde;
      if (filtros.hasta) params.hasta = filtros.hasta;
      if (filtros.forma_pago) params.forma_pago = filtros.forma_pago;
      if (filtros.usuario_id) params.usuario_id = filtros.usuario_id;

      const res = await API.get('/reportes/corte-caja', { params });
      setReporte(res.data || []);
      
      if (res.data.length === 0) {
        toast.info('No se encontraron ventas en este periodo');
      }
    } catch (err) {
      console.error(err);
      setReporte([]);
    } finally {
      setLoading(false);
    }
  };

  const resumen = useMemo(() => {
    return reporte.reduce((acc, curr) => ({
      totalDinero: acc.totalDinero + Number(curr.total_ventas),
      totalTransacciones: acc.totalTransacciones + Number(curr.cantidad_ventas)
    }), { totalDinero: 0, totalTransacciones: 0 });
  }, [reporte]);

  const exportarExcel = () => {
    if (reporte.length === 0) return toast.warning('No hay datos para exportar');

    const dataExportar = reporte.map(r => ({
      Fecha: new Date(r.fecha).toLocaleDateString(),
      'Forma de Pago': r.forma_pago,
      Usuario: r.usuario,
      'Cantidad Ventas': r.cantidad_ventas,
      'Total ($)': Number(r.total_ventas)
    }));

    dataExportar.push({
      Fecha: 'TOTAL GLOBAL',
      'Forma de Pago': '',
      Usuario: '',
      'Cantidad Ventas': resumen.totalTransacciones,
      'Total ($)': resumen.totalDinero
    });

    const ws = XLSX.utils.json_to_sheet(dataExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Corte de Caja');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([excelBuffer]), `corte_caja_${filtros.desde}.xlsx`);
  };

  const exportarPDF = () => {
    if (reporte.length === 0) return toast.warning('No hay datos para exportar');
    
    const doc = new jsPDF();
    doc.text(`Corte de Caja (${filtros.desde} al ${filtros.hasta || filtros.desde})`, 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Total Generado: $${resumen.totalDinero.toFixed(2)}`, 14, 22);

    autoTable(doc, {
      head: [['Fecha', 'Forma Pago', 'Vendedor', 'Ventas #', 'Total']],
      body: [
        ...reporte.map(r => [
          new Date(r.fecha).toLocaleDateString(),
          r.forma_pago,
          r.usuario,
          r.cantidad_ventas,
          `$${Number(r.total_ventas).toFixed(2)}`
        ]),
        ['TOTAL', '-', '-', resumen.totalTransacciones, `$${resumen.totalDinero.toFixed(2)}`]
      ],
      startY: 25,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185] },
      footStyles: { fillColor: [241, 196, 15], textColor: 50 }
    });
    doc.save(`corte_caja_${filtros.desde}.pdf`);
  };

  return (
    <div className="max-w-6xl mx-auto mt-8">
      
      {/* Header y Resumen */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">💰 Corte de Caja</h2>
          <p className="text-sm text-slate-500">Resumen financiero y cierre de operaciones</p>
        </div>

        {/* Tarjetas de Resumen */}
        <div className="flex gap-4">
          <div className="bg-white border border-blue-100 p-3 rounded-xl shadow-sm min-w-[140px]">
            <p className="text-xs text-slate-500 uppercase font-bold">Ventas Totales</p>
            <p className="text-xl font-bold text-blue-600">{resumen.totalTransacciones}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl shadow-sm min-w-[180px]">
            <p className="text-xs text-emerald-600 uppercase font-bold">Ingreso Total</p>
            <p className="text-2xl font-bold text-emerald-700">
              ${resumen.totalDinero.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white border rounded-xl shadow-sm p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Desde</label>
            <input
              type="date"
              value={filtros.desde}
              onChange={e => setFiltros({ ...filtros, desde: e.target.value })}
              className="w-full rounded-lg border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Hasta</label>
            <input
              type="date"
              value={filtros.hasta}
              onChange={e => setFiltros({ ...filtros, hasta: e.target.value })}
              className="w-full rounded-lg border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Vendedor</label>
            <select
              value={filtros.usuario_id}
              onChange={e => setFiltros({ ...filtros, usuario_id: e.target.value })}
              className="w-full rounded-lg border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">-- Todos --</option>
              {usuariosLista.map(u => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Forma de Pago</label>
            <select
              value={filtros.forma_pago}
              onChange={e => setFiltros({ ...filtros, forma_pago: e.target.value })}
              className="w-full rounded-lg border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">-- Todas --</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Transferencia">Transferencia</option>
            </select>
          </div>

          <button
            onClick={cargarReporte}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition flex justify-center items-center gap-2"
          >
            {loading ? 'Cargando...' : '🔍 Filtrar'}
          </button>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="p-4">Fecha</th>
                <th className="p-4">Forma de Pago</th>
                <th className="p-4">Vendedor</th>
                <th className="p-4 text-center"># Ventas</th>
                <th className="p-4 text-right">Total ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center">
                     <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </td>
                </tr>
              ) : reporte.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400">
                    No hay movimientos registrados con estos filtros.
                  </td>
                </tr>
              ) : (
                reporte.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-mono">
                      {new Date(r.fecha).toLocaleDateString('es-MX', { 
                        year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' 
                      })}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium 
                        ${r.forma_pago === 'Efectivo' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                        {r.forma_pago}
                      </span>
                    </td>
                    <td className="p-4">{r.usuario}</td>
                    <td className="p-4 text-center">{r.cantidad_ventas}</td>
                    <td className="p-4 text-right font-bold text-slate-800">
                      ${Number(r.total_ventas).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Footer de Tabla con Totales */}
            {!loading && reporte.length > 0 && (
              <tfoot className="bg-slate-50 font-bold text-slate-800">
                <tr>
                  <td colSpan="3" className="p-4 text-right">TOTAL GENERAL:</td>
                  <td className="p-4 text-center">{resumen.totalTransacciones}</td>
                  <td className="p-4 text-right text-emerald-600">${resumen.totalDinero.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Botones de Exportación */}
      <div className="flex justify-end gap-3">
        <button
          onClick={exportarExcel}
          disabled={reporte.length === 0 || loading}
          className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition flex items-center gap-2"
        >
          <span>📊</span> Exportar Excel
        </button>
        <button
          onClick={exportarPDF}
          disabled={reporte.length === 0 || loading}
          className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-2"
        >
          <span>📄</span> Exportar PDF
        </button>
      </div>
    </div>
  );
}

export default CorteCaja;