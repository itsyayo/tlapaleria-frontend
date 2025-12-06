import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api'; 
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { FileText, Download, Edit, Trash2, Search, Filter } from 'lucide-react';

function Inventario() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [busqueda, setBusqueda] = useState('');
  const [proveedorFiltro, setProveedorFiltro] = useState('');
  const [ubicacionFiltro, setUbicacionFiltro] = useState('');
  const [stockFiltro, setStockFiltro] = useState('');
  const [categoriasFiltro, setCategoriasFiltro] = useState('');

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  useEffect(() => {
    const fetchProductos = async () => {
      setLoading(true);
      try {
        const res = await API.get('/productos');
        setProductos(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProductos();
  }, []);

  const normalizarTexto = (texto = '') => 
    String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const esProveedorOculto = (nombre = '') =>
    normalizarTexto(nombre).trim() === 'a granel';

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      if (esProveedorOculto(p?.nombre_proveedor)) return false;

      if (proveedorFiltro && p.nombre_proveedor !== proveedorFiltro) return false;
      if (ubicacionFiltro && p.ubicacion !== ubicacionFiltro) return false;
      if (categoriasFiltro && p.nombre_categoria !== categoriasFiltro) return false;

      if (stockFiltro === 'BAJO' && Number(p.cantidad_stock) >= Number(p.stock_minimo)) return false;
      if (stockFiltro === 'CERO' && Number(p.cantidad_stock) > 0) return false;

      if (busqueda) {
        const textoProducto = normalizarTexto(`${p.codigo} ${p.codigo_barras} ${p.descripcion}`);
        const palabras = normalizarTexto(busqueda).split(/\s+/).filter(Boolean);
        if (!palabras.every((palabra) => textoProducto.includes(palabra))) return false;
      }

      return true;
    });
  }, [productos, busqueda, proveedorFiltro, ubicacionFiltro, stockFiltro, categoriasFiltro]);

  const { proveedoresUnicos, ubicacionesUnicas, categoriasUnicas } = useMemo(() => {
    const provs = new Set();
    const ubics = new Set();
    const cats = new Set();

    productos.forEach(p => {
      if (p.nombre_proveedor && !esProveedorOculto(p.nombre_proveedor)) provs.add(p.nombre_proveedor);
      if (p.ubicacion) ubics.add(p.ubicacion);
      if (p.nombre_categoria) cats.add(p.nombre_categoria);
    });

    return {
      proveedoresUnicos: [...provs].sort(),
      ubicacionesUnicas: [...ubics].sort(),
      categoriasUnicas: [...cats].sort()
    };
  }, [productos]);

  const { totalCompra, totalVenta } = useMemo(() => {
    return productosFiltrados.reduce((acc, p) => ({
      totalCompra: acc.totalCompra + (Number(p.precio_compra || 0) * Number(p.stock_faltante || 0)),
      totalVenta: acc.totalVenta + (Number(p.precio_venta || 0) * Number(p.cantidad_stock || 0))
    }), { totalCompra: 0, totalVenta: 0 });
  }, [productosFiltrados]);


  const exportarPDF = () => {
    if (productosFiltrados.length === 0) return toast.info('No hay datos para exportar');
    
    const doc = new jsPDF();
    doc.text('Inventario Valorado', 14, 15);
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 22);
    doc.text(`Valor Venta Total: $${totalVenta.toFixed(2)}`, 14, 27);

    const tabla = productosFiltrados.map(p => [
      p.codigo,
      p.descripcion.substring(0, 25),
      p.nombre_proveedor ?? '-',
      p.cantidad_stock,
      `$${Number(p.precio_compra).toFixed(2)}`,
      `$${Number(p.precio_venta).toFixed(2)}`
    ]);

    autoTable(doc, {
      head: [['Código', 'Descripción', 'Proveedor', 'Stock', 'P. Compra', 'P. Venta']],
      body: tabla,
      startY: 32,
      styles: { fontSize: 8 },
      theme: 'grid'
    });

    doc.save(`inventario_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportarExcel = () => {
    if (productosFiltrados.length === 0) return toast.info('No hay datos para exportar');
    
    const worksheetData = productosFiltrados.map(p => ({
      Código: p.codigo,
      Descripción: p.descripcion,
      Proveedor: p.nombre_proveedor ?? '-',
      Ubicación: p.ubicacion ?? '-',
      Categoría: p.nombre_categoria ?? '-',
      Stock: Number(p.cantidad_stock),
      'Stock Faltante': Number(p.stock_faltante),
      'Precio Compra': Number(p.precio_compra),
      'Precio Venta': Number(p.precio_venta),
      'Valor Inventario (Costo)': Number(p.cantidad_stock) * Number(p.precio_compra)
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([excelBuffer]), `inventario_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
      await API.delete(`/productos/${id}`);
      setProductos((prev) => prev.filter((p) => p.id !== id));
      toast.success('Producto eliminado');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto mt-8 px-4 pb-10">
      
      {/* Header y Totales */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-6 gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">📦 Inventario General</h1>
          <p className="text-sm text-slate-500">
            Mostrando {productosFiltrados.length} productos
          </p>
        </div>

        {/* Tarjetas de Valoración */}
        <div className="flex gap-4 w-full lg:w-auto">
          <div className="flex-1 lg:flex-none bg-blue-50 border border-blue-100 p-4 rounded-xl">
            <p className="text-xs text-blue-600 font-bold uppercase mb-1">Valor en Costo (Compra)</p>
            <p className="text-xl font-bold text-slate-800">${totalCompra.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="flex-1 lg:flex-none bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
            <p className="text-xs text-emerald-600 font-bold uppercase mb-1">Valor en Venta (Estimado)</p>
            <p className="text-xl font-bold text-slate-800">${totalVenta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="bg-white border rounded-xl p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Buscador */}
          <div className="lg:col-span-2 relative">
            <input
              type="text"
              placeholder="🔍 Buscar código, nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          </div>

          <select 
            value={categoriasFiltro} 
            onChange={(e) => setCategoriasFiltro(e.target.value)} 
            className="rounded-lg border px-3 py-2 bg-white"
          >
            <option value="">Todas las categorías</option>
            {categoriasUnicas.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select 
            value={proveedorFiltro} 
            onChange={(e) => setProveedorFiltro(e.target.value)} 
            className="rounded-lg border px-3 py-2 bg-white"
          >
            <option value="">Todos los proveedores</option>
            {proveedoresUnicos.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select 
            value={stockFiltro} 
            onChange={(e) => setStockFiltro(e.target.value)} 
            className="rounded-lg border px-3 py-2 bg-white"
          >
            <option value="">Todo el stock</option>
            <option value="BAJO">⚠️ Stock Bajo</option>
            <option value="CERO">❌ Agotados (0)</option>
          </select>
        </div>

        {/* Filtros secundarios row 2 (Ubicación y botones) */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-3 pt-3 border-t gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="text-slate-400" />
            <select 
              value={ubicacionFiltro} 
              onChange={(e) => setUbicacionFiltro(e.target.value)} 
              className="rounded-lg border px-3 py-1.5 text-sm bg-white flex-1 sm:flex-none"
            >
              <option value="">Todas las ubicaciones</option>
              {ubicacionesUnicas.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={exportarPDF}
              disabled={productosFiltrados.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 rounded border text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <FileText size={16} className="text-red-600" /> PDF
            </button>
            <button
              onClick={exportarExcel}
              disabled={productosFiltrados.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 rounded border text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <Download size={16} className="text-green-600" /> Excel
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto bg-white border rounded-xl shadow-sm">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead className="bg-slate-50 text-slate-600 font-semibold">
            <tr>
              <th className="p-3 text-left">Código</th>
              <th className="p-3 text-left w-1/3">Descripción</th>
              <th className="p-3 text-left">Ubicación</th>
              <th className="p-3 text-center">Stock</th>
              <th className="p-3 text-center">Faltante</th>
              <th className="p-3 text-right">Costo</th>
              <th className="p-3 text-right">Venta</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {productosFiltrados.map((p) => {
              const stock = Number(p.cantidad_stock);
              const minimo = Number(p.stock_minimo);
              const esBajo = stock < minimo && stock > 0;
              const esCero = stock === 0;

              return (
                <tr key={p.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-mono text-slate-600">{p.codigo}</td>
                  <td className="p-3">
                    <div className="font-medium text-slate-800">{p.descripcion}</div>
                    <div className="text-xs text-slate-400">{p.nombre_categoria} • {p.nombre_proveedor}</div>
                  </td>
                  <td className="p-3 text-slate-500">{p.ubicacion || '-'}</td>
                  
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold
                      ${esCero ? 'bg-red-100 text-red-700' : 
                        esBajo ? 'bg-amber-100 text-amber-700' : 
                        'bg-slate-100 text-slate-700'}`}
                    >
                      {stock}
                    </span>
                  </td>
                  
                  <td className="p-3 text-center">
                    {Number(p.stock_faltante) > 0 ? (
                      <span className="text-rose-600 font-medium">- {p.stock_faltante}</span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>

                  <td className="p-3 text-right text-slate-500">
                    ${Number(p.precio_compra).toFixed(2)}
                  </td>
                  <td className="p-3 text-right font-bold text-blue-700">
                    ${Number(p.precio_venta).toFixed(2)}
                  </td>

                  <td className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        to={`/productos/editar/${p.id}`}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </Link>
                      {usuario?.rol === 'admin' && (
                        <button
                          onClick={() => handleEliminar(p.id)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {productosFiltrados.length === 0 && (
              <tr>
                <td colSpan="8" className="p-8 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl">🔍</span>
                    <p>No se encontraron productos con estos filtros.</p>
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

export default Inventario;