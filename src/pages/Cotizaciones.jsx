import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { toast } from 'react-toastify';
import { Trash2, Pencil, Plus, FileText, Search } from 'lucide-react';

function normalizarTexto(texto = '') {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function Cotizaciones() {
  const [items, setItems] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  useEffect(() => {
    if (!usuario.token && !localStorage.getItem('token')) {
       navigate('/');
       return;
    }

    async function cargar() {
      setLoading(true);
      try {
        const res = await API.get('/cotizaciones');
        setItems(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    cargar();
  }, [navigate]);

  const filtrados = useMemo(() => {
    return items.filter((c) => {
      const textoCompleto = normalizarTexto(`${c.id} ${c.cliente || ''} ${c.vendedor || ''}`);
      const palabras = normalizarTexto(busqueda).split(/\s+/).filter(Boolean);
      return palabras.length === 0 || palabras.every((p) => textoCompleto.includes(p));
    });
  }, [items, busqueda]);

  async function eliminar(id) {
    if (!window.confirm(`¿Estás seguro de eliminar la cotización #${id}?`)) return;
    
    try {
      await API.delete(`/cotizaciones/${id}`);
      toast.success('Cotización eliminada correctamente');
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error(err);
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
    <div className="max-w-6xl mx-auto mt-8 bg-white border rounded-xl shadow-sm p-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
           <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <FileText className="text-blue-600" /> Cotizaciones
           </h1>
           <p className="text-sm text-slate-500">Historial de presupuestos generados</p>
        </div>
        
        <Link 
          to="/cotizaciones/nueva" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2"
        >
          <Plus size={18} /> Nueva cotización
        </Link>
      </div>

      {/* Buscador */}
      <div className="mb-6 relative">
        <input
          className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition"
          placeholder="🔍 Buscar por folio, cliente o vendedor..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <Search className="absolute left-3 top-3 text-slate-400" size={18} />
      </div>

      {/* Tabla */}
      <div className="overflow-hidden border rounded-xl">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b text-xs uppercase font-semibold text-slate-500">
            <tr>
              <th className="p-4 w-20">Folio</th>
              <th className="p-4">Fecha</th>
              <th className="p-4">Cliente</th>
              <th className="p-4">Vendedor</th>
              <th className="p-4 text-right">Total</th>
              <th className="p-4 text-center">Estado</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition">
                <td className="p-4 font-mono font-medium text-slate-700">#{c.id}</td>
                <td className="p-4">
                  {new Date(c.fecha).toLocaleDateString('es-MX', { 
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
                  })}
                </td>
                <td className="p-4 font-medium text-slate-800">{c.cliente || 'Público General'}</td>
                <td className="p-4 text-slate-500">{c.vendedor}</td>
                <td className="p-4 text-right font-bold text-slate-700">
                  ${Number(c.total).toFixed(2)}
                </td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold border 
                    ${c.estado === 'PENDIENTE' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                      c.estado === 'VENDIDA' ? 'bg-green-50 text-green-700 border-green-100' : 
                      'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {c.estado || 'PENDIENTE'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      to={`/cotizaciones/editar/${c.id}`}
                      className="p-2 rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition"
                      title="Editar / Ver Detalle"
                    >
                      <Pencil size={16} />
                    </Link>
                    
                    {/* Solo admin o ventas puede borrar */}
                    {(usuario.rol === 'admin' || usuario.rol === 'ventas') && (
                      <button
                        className="p-2 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition"
                        onClick={() => eliminar(c.id)}
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            
            {filtrados.length === 0 && (
              <tr>
                <td className="p-8 text-center text-slate-400" colSpan="7">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl">📄</span>
                    <p>No se encontraron cotizaciones.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}