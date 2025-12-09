import { useEffect, useState, useMemo, useCallback } from 'react';
import API from '../services/api';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

function Productos() {
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [ubicacionFiltro, setUbicacionFiltro] = useState('');
  const [categoriasFiltro, setCategoriasFiltro] = useState('');
  
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const [resProductos, resCategorias] = await Promise.all([
          API.get('/productos'),
          API.get('/categorias')
        ]);
        
        setProductos(resProductos.data || []);
        setCategorias(resCategorias.data || []);
      } catch (err) {
        console.error('Error inicializando productos:', err);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  const normalizarTexto = (texto = '') => 
    String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideUbicacion = ubicacionFiltro === '' || p.ubicacion === ubicacionFiltro;
      const coincideCategoria = categoriasFiltro === '' || p.nombre_categoria === categoriasFiltro;
      
      if (!coincideUbicacion || !coincideCategoria) return false;

      if (!busqueda) return true;

      const textoProducto = normalizarTexto(`${p.codigo} ${p.codigo_barras} ${p.descripcion}`);
      const palabras = normalizarTexto(busqueda).split(/\s+/).filter(Boolean);
      
      return palabras.every((palabra) => textoProducto.includes(palabra));
    });
  }, [productos, ubicacionFiltro, categoriasFiltro, busqueda]);

  const ubicacionesUnicas = useMemo(() => 
    [...new Set(productos.map(p => p?.ubicacion).filter(Boolean))].sort(), 
  [productos]);
  
  const categoriasUnicas = useMemo(() => 
    [...new Set(categorias.map(c => c.nombre).filter(Boolean))].sort(),
  [categorias]);

  const exportarPDF = useCallback(() => {
    if (productosFiltrados.length === 0) return toast.info('No hay datos para exportar');
    
    const doc = new jsPDF();
    doc.text('Inventario de productos', 14, 10);
    
    const tabla = productosFiltrados.map(p => [
      p.codigo,
      p.descripcion,
      p.ubicacion,
      p.nombre_categoria ?? '-',
      p.cantidad_stock < 0 ? 0 : p.cantidad_stock, 
      `$${Number(p.precio_venta ?? 0).toFixed(2)}`,
      p.nombre_proveedor ?? '-',
      p.clave_sat || ''
    ]);

    autoTable(doc, {
      head: [['Código', 'Descripción', 'Ubicación', 'Categoría', 'Stock', 'Precio', 'Proveedor', 'SAT']],
      body: tabla,
      startY: 20,
      styles: { fontSize: 8 },
      theme: 'grid'
    });
    doc.save(`inventario_${new Date().toISOString().split('T')[0]}.pdf`);
  }, [productosFiltrados]);

  const exportarExcel = useCallback(() => {
    if (productosFiltrados.length === 0) return toast.info('No hay datos para exportar');
    
    const worksheetData = productosFiltrados.map(p => ({
      Código: p.codigo,
      Descripción: p.descripcion,
      Ubicación: p.ubicacion,
      Categoría: p.nombre_categoria ?? '-',
      Stock: p.cantidad_stock < 0 ? 0 : p.cantidad_stock,
      'Precio Venta': Number(p.precio_venta ?? 0),
      Proveedor: p.nombre_proveedor ?? '-',
      'Clave SAT': p.clave_sat || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const file = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(file, `inventario_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [productosFiltrados]);

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;
    
    try {
      await API.delete(`/productos/${id}`);
      setProductos((prev) => prev.filter((p) => p.id !== id));
      toast.success('Producto eliminado');
      if (productoSeleccionado?.id === id) setProductoSeleccionado(null);
    } catch (err) { 
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto mt-8 bg-white border rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">📦 Inventario de Productos</h1>
        <div className="text-sm text-slate-500">
          Total: <span className="font-bold text-slate-800">{productosFiltrados.length}</span>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="bg-slate-50 border rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="🔍 Buscar por código, nombre o barras..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full rounded-lg border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
        />

        <select
          value={categoriasFiltro}
          onChange={(e) => setCategoriasFiltro(e.target.value)}
          className="w-full rounded-lg border-slate-300 px-3 py-2 bg-white"
        >
          <option value="">Todas las categorías</option>
          {categoriasUnicas.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        <select
          value={ubicacionFiltro}
          onChange={(e) => setUbicacionFiltro(e.target.value)}
          className="w-full rounded-lg border-slate-300 px-3 py-2 bg-white"
        >
          <option value="">Todas las ubicaciones</option>
          {ubicacionesUnicas.map((ubi) => (
            <option key={ubi} value={ubi}>{ubi}</option>
          ))}
        </select>
      </div>

      {/* Botones de acción */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={exportarPDF}
          disabled={productosFiltrados.length === 0}
          className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
        >
          <span>📄</span> PDF
        </button>
        <button
          onClick={exportarExcel}
          disabled={productosFiltrados.length === 0}
          className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
        >
          <span>📊</span> Excel
        </button>
        
        {usuario?.rol === 'admin' && (
          <Link 
            to="/productos/nuevo"
            className="ml-auto px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition flex items-center gap-2"
          >
             <span>+</span> Nuevo Producto
          </Link>
        )}
      </div>

      {/* Grid de productos */}
      {productosFiltrados.length === 0 ? (
        <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed">
          <p>No se encontraron productos con estos filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {productosFiltrados.map((p) => {
            const stockVisual = p.cantidad_stock < 0 ? 0 : p.cantidad_stock;
            const esBajo = p.cantidad_stock <= (p.stock_minimo || 5) && p.cantidad_stock > 0;
            const esCero = p.cantidad_stock <= 0;

            return (
              <div
                key={p.id}
                className="group bg-white border border-slate-200 rounded-xl p-3 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer flex flex-col h-full"
                onClick={() => setProductoSeleccionado(p)}
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-slate-100 mb-3">
                   {p.imagen ? (
                     <img
                       src={`${import.meta.env.VITE_API_URL}${p.imagen}`}
                       alt={p.descripcion}
                       loading="lazy"
                       className="absolute inset-0 h-full w-full object-contain mix-blend-multiply p-2"
                       onError={(e) => {
                         e.target.style.display = 'none';
                         e.target.nextSibling.style.display = 'grid';
                       }}
                     />
                   ) : null}
                   <div className={`absolute inset-0 bg-slate-100 place-items-center text-slate-300 ${p.imagen ? 'hidden' : 'grid'}`}>
                      <span className="text-2xl">📷</span>
                   </div>
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800 line-clamp-2 mb-1" title={p.descripcion}>
                    {p.descripcion}
                  </h3>
                  <div className="text-xs text-slate-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Código:</span> <span className="font-mono text-slate-700">{p.codigo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Stock:</span> 
                      <span className={`font-bold ${esCero || esBajo ? 'text-red-500' : 'text-green-600'}`}>
                        {stockVisual}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-lg font-bold text-blue-700">
                    ${Number(p.precio_venta).toFixed(2)}
                  </span>
                  <span className="text-[10px] uppercase px-2 py-1 bg-slate-100 rounded text-slate-500">
                    {p.ubicacion || 'S/U'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Detalle */}
      {productoSeleccionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setProductoSeleccionado(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col md:flex-row max-h-[90vh]" onClick={e => e.stopPropagation()}>
            
            <div className="w-full md:w-1/2 bg-slate-100 p-6 flex items-center justify-center relative">
               {productoSeleccionado.imagen ? (
                  <img 
                    src={`${import.meta.env.VITE_API_URL}${productoSeleccionado.imagen}`} 
                    className="max-h-64 object-contain mix-blend-multiply" 
                    alt={productoSeleccionado.descripcion}
                  />
               ) : (
                  <span className="text-6xl">📦</span>
               )}
            </div>

            <div className="w-full md:w-1/2 p-6 overflow-y-auto">
              <h2 className="text-xl font-bold text-slate-800 mb-4">{productoSeleccionado.descripcion}</h2>
              
              <div className="space-y-3 text-sm">
                <InfoRow label="Código Interno" value={productoSeleccionado.codigo} />
                <InfoRow label="Código Barras" value={productoSeleccionado.codigo_barras || '-'} />
                <InfoRow label="Categoría" value={productoSeleccionado.nombre_categoria || '-'} />
                <InfoRow label="Proveedor" value={productoSeleccionado.nombre_proveedor || '-'} />
                <InfoRow label="Ubicación" value={productoSeleccionado.ubicacion || '-'} />
                <div className="border-t my-2 pt-2">
                   <InfoRow 
                     label="Stock Actual" 
                     value={productoSeleccionado.cantidad_stock < 0 ? 0 : productoSeleccionado.cantidad_stock} 
                     bold 
                   />
                   <InfoRow label="Precio Venta" value={`$${Number(productoSeleccionado.precio_venta).toFixed(2)}`} bold color="text-blue-600" />
                    <InfoRow label="Precio Costo" value={`$${Number(productoSeleccionado.precio_compra).toFixed(2)}`} bold color="text-green-600" />
                </div>
              </div>

              {usuario?.rol === 'admin' && (
                <div className="mt-6 flex gap-3">
                  <Link
                    to={`/productos/editar/${productoSeleccionado.id}`}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-center transition"
                  >
                    Editar
                  </Link>
                  <button
                    onClick={() => handleEliminar(productoSeleccionado.id)}
                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-2 rounded-lg transition"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const InfoRow = ({ label, value, bold, color }) => (
  <div className="flex justify-between items-center">
    <span className="text-slate-500">{label}:</span>
    <span className={`${bold ? 'font-bold' : 'font-medium'} ${color || 'text-slate-800'}`}>{value}</span>
  </div>
);

export default Productos;