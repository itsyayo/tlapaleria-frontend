import { useEffect, useState } from 'react';
import { obtenerDashboardStats } from '../services/reportesService';
import { DollarSign, TrendingUp, ShoppingBag, AlertTriangle, Package } from 'lucide-react';
import { toast } from 'react-toastify';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const data = await obtenerDashboardStats();
      setStats(data);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div>
        <h2 className="text-2xl font-bold text-slate-800">Resumen del Mes</h2>
        <p className="text-slate-500 text-sm">Estadísticas en tiempo real de tu negocio.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-full">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Ventas Totales</p>
            <h3 className="text-2xl font-bold text-slate-800">
              {formatMoney(stats.ventasMensuales.dinero)}
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Ganancia Bruta</p>
            <h3 className="text-2xl font-bold text-slate-800">
              {formatMoney(stats.gananciaMensual)}
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-full">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Transacciones</p>
            <h3 className="text-2xl font-bold text-slate-800">
              {stats.ventasMensuales.transacciones}
            </h3>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Package size={20} className="text-blue-500"/>
              Más Vendidos
            </h3>
            <span className="text-xs font-medium text-slate-400 uppercase">Top 5</span>
          </div>

          <div className="space-y-4">
            {stats.topProductos.map((prod, index) => {
              const maxVentas = parseInt(stats.topProductos[0].cantidad);
              const porcentaje = (parseInt(prod.cantidad) / maxVentas) * 100;

              return (
                <div key={index} className="group">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700 font-medium truncate w-3/4">
                      {prod.descripcion}
                    </span>
                    <span className="text-slate-900 font-bold">
                      {prod.cantidad} pzas.
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div 
                      className="bg-blue-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
                      style={{ width: `${porcentaje}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
            {stats.topProductos.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-4">No hay ventas este mes aún.</p>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-500"/>
              Stock Crítico
            </h3>
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              Resurtir Urgente
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                <tr>
                  <th className="px-3 py-2">Producto</th>
                  <th className="px-3 py-2 text-center">Actual</th>
                  <th className="px-3 py-2 text-center">Mínimo</th>
                </tr>
              </thead>
              <tbody>
                {stats.stockBajo.map((prod, index) => (
                  <tr key={index} className="border-b hover:bg-slate-50">
                    <td className="px-3 py-3 font-medium text-slate-800 truncate max-w-[200px]">
                      {prod.descripcion}
                    </td>
                    <td className="px-3 py-3 text-center text-red-600 font-bold">
                      {prod.cantidad_stock}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-400">
                      {prod.stock_minimo}
                    </td>
                  </tr>
                ))}
                {stats.stockBajo.length === 0 && (
                  <tr>
                    <td colSpan="3" className="text-center py-8 text-emerald-600">
                      ¡Todo en orden! No hay stock bajo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}