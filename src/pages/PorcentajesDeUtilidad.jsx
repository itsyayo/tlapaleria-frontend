import { useEffect, useState, useMemo } from "react";
import API from "../services/api";
import { toast } from "react-toastify";
import { Trash2, Save, Calculator, ArrowRight } from "lucide-react";

export default function PorcentajesDeUtilidad() {
  const [rangos, setRangos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [nuevoRango, setNuevoRango] = useState({ min: "", max: "", porcentaje: "" });
  const [editandoId, setEditandoId] = useState(null);

  const [simulacion, setSimulacion] = useState({ compra: "", venta: null, ganancia: null });

  useEffect(() => {
    const cargarRangos = async () => {
      try {
        const res = await API.get("/rangos");
        const data = (res.data || []).map(r => ({
          ...r,
          max: (r.max === null || r.max === "Infinity") ? Infinity : Number(r.max),
          min: Number(r.min),
          porcentaje: Number(r.porcentaje)
        }));
        setRangos(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    cargarRangos();
  }, []);

  const resultadoSimulacion = useMemo(() => {
    const compra = parseFloat(simulacion.compra);
    if (isNaN(compra) || compra <= 0) return null;

    const rango = rangos.find(r => compra >= r.min && compra <= r.max);
    
    if (!rango) return { error: "No hay rango definido para este precio" };

    const venta = compra * (1 + (rango.porcentaje / 100));
    return {
      venta: venta,
      ganancia: venta - compra,
      porcentaje: rango.porcentaje
    };
  }, [simulacion.compra, rangos]);

  const guardarRango = async (e) => {
    e.preventDefault();
    
    const min = parseFloat(nuevoRango.min);
    const pct = parseFloat(nuevoRango.porcentaje);
    const max = (!nuevoRango.max || nuevoRango.max === "∞") ? null : parseFloat(nuevoRango.max);

    if (isNaN(min) || isNaN(pct)) return toast.warning("Datos inválidos");
    if (max !== null && min >= max) return toast.warning("El mínimo debe ser menor al máximo");

    const payload = { min, max, porcentaje: pct };

    try {
      if (editandoId) {
        const res = await API.put(`/rangos/${editandoId}`, payload);
        const actualizado = {
          ...res.data,
          max: res.data.max === null ? Infinity : Number(res.data.max)
        };
        setRangos(prev => prev.map(r => r.id === editandoId ? actualizado : r));
        toast.success("Rango actualizado");
      } else {
        const res = await API.post("/rangos", payload);
        const creado = {
          ...res.data,
          max: res.data.max === null ? Infinity : Number(res.data.max)
        };
        setRangos(prev => [...prev, creado].sort((a, b) => a.min - b.min));
        toast.success("Rango creado");
      }
      resetForm();
    } catch (err) {
      if (err.response?.status === 409) toast.error("El rango se empalma con otro existente");
      else toast.error("Error al guardar");
    }
  };

  const eliminarRango = async (id) => {
    if (!window.confirm("¿Eliminar regla?")) return;
    try {
      await API.delete(`/rangos/${id}`);
      setRangos(prev => prev.filter(r => r.id !== id));
      toast.success("Eliminado");
    } catch (err) {
      console.error(err);
    }
  };

  const cargarEdicion = (r) => {
    setNuevoRango({
      min: r.min,
      max: r.max === Infinity ? "" : r.max,
      porcentaje: r.porcentaje
    });
    setEditandoId(r.id);
  };

  const resetForm = () => {
    setNuevoRango({ min: "", max: "", porcentaje: "" });
    setEditandoId(null);
  };

  if (loading) return <div className="p-10 text-center">Cargando configuración...</div>;

  return (
    <div className="max-w-5xl mx-auto mt-8 px-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* COLUMNA IZQ: Calculadora */}
      <div className="lg:col-span-1">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg p-6 text-white sticky top-6">
          <div className="flex items-center gap-2 mb-4 opacity-90">
            <Calculator size={20} />
            <h2 className="font-bold text-lg">Simulador de Precios</h2>
          </div>
          
          <div className="mb-6">
            <label className="text-xs uppercase font-bold text-blue-200 tracking-wider">Costo Producto ($)</label>
            <input
              type="number"
              value={simulacion.compra}
              onChange={e => setSimulacion({ ...simulacion, compra: e.target.value })}
              className="w-full bg-blue-700/50 border border-blue-500 rounded-xl px-4 py-3 mt-2 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-white/30 placeholder-blue-400"
              placeholder="0.00"
              autoFocus
            />
          </div>

          {resultadoSimulacion ? (
            resultadoSimulacion.error ? (
              <div className="bg-red-500/20 border border-red-500/30 p-3 rounded-lg text-sm text-red-100">
                {resultadoSimulacion.error}
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-between items-center border-b border-blue-500/30 pb-2">
                  <span className="text-blue-200">Margen Aplicado</span>
                  <span className="font-bold bg-white/20 px-2 py-0.5 rounded text-sm">{resultadoSimulacion.porcentaje}%</span>
                </div>
                
                <div className="flex justify-between items-center border-b border-blue-500/30 pb-2">
                  <span className="text-blue-200">Utilidad Neta</span>
                  <span className="font-bold text-green-300">+${resultadoSimulacion.ganancia.toFixed(2)}</span>
                </div>

                <div>
                  <span className="text-xs uppercase font-bold text-blue-200">Precio Sugerido</span>
                  <div className="text-4xl font-bold mt-1">${resultadoSimulacion.venta.toFixed(2)}</div>
                </div>
              </div>
            )
          ) : (
            <div className="text-center text-blue-300 py-4 text-sm">
              Ingresa un costo para calcular el precio de venta sugerido.
            </div>
          )}
        </div>
      </div>

      {/* COLUMNA DER: Gestión de Rangos */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Reglas de Utilidad</h2>
          
          {/* Formulario */}
          <form onSubmit={guardarRango} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">
              {editandoId ? "Editar Regla" : "Nueva Regla"}
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="flex-1 w-full">
                <label className="text-xs text-slate-500 mb-1 block">Desde ($)</label>
                <input 
                  type="number" step="0.01" min="0" required
                  value={nuevoRango.min} onChange={e => setNuevoRango({...nuevoRango, min: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <ArrowRight className="hidden sm:block text-slate-300 mb-3" />
              <div className="flex-1 w-full">
                <label className="text-xs text-slate-500 mb-1 block">Hasta ($)</label>
                <input 
                  type="number" step="0.01" min="0"
                  placeholder="Infinito"
                  value={nuevoRango.max} onChange={e => setNuevoRango({...nuevoRango, max: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="w-full sm:w-24">
                <label className="text-xs text-blue-600 font-bold mb-1 block">Ganancia %</label>
                <input 
                  type="number" step="0.1" min="0" required
                  value={nuevoRango.porcentaje} onChange={e => setNuevoRango({...nuevoRango, porcentaje: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-blue-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-700"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                {editandoId && (
                  <button type="button" onClick={resetForm} className="px-3 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition">
                    Cancelar
                  </button>
                )}
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2">
                  <Save size={18} /> {editandoId ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </div>
          </form>

          {/* Tabla */}
          <div className="overflow-hidden border rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600 uppercase text-xs font-bold">
                <tr>
                  <th className="p-3">Rango de Costo</th>
                  <th className="p-3 text-center">Margen</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rangos.map(r => (
                  <tr key={r.id} className={`group hover:bg-slate-50 transition ${editandoId === r.id ? "bg-blue-50" : ""}`}>
                    <td className="p-3 font-mono text-slate-700">
                      ${r.min.toFixed(2)} <span className="text-slate-400 mx-2">➜</span> 
                      {r.max === Infinity ? "∞" : `$${r.max.toFixed(2)}`}
                    </td>
                    <td className="p-3 text-center">
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded font-bold border border-green-200">
                        {r.porcentaje}%
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button 
                        onClick={() => cargarEdicion(r)}
                        className="text-blue-600 hover:underline text-xs font-medium"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => eliminarRango(r.id)}
                        className="text-rose-600 hover:underline text-xs font-medium"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {rangos.length === 0 && (
                  <tr>
                    <td colSpan="3" className="p-8 text-center text-slate-400">
                      No hay reglas. Agrega una para automatizar precios.
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