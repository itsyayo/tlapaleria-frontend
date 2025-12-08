import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from './pages/Login';
import Productos from './pages/Productos';
import AgregarProducto from './pages/AgregarProducto';
import EditarProducto from './pages/EditarProducto';
import Inventario from './pages/Inventario';
import EntradasMercancia from './pages/EntradasMercancia';
import NuevaVenta from './pages/NuevaVenta';
import HistorialVentas from './pages/HistorialVentas'; 
import Proveedores from './pages/Proveedores';
import CorteCaja from './pages/CorteCaja';
import PorcentajesDeUtilidad from './pages/PorcentajesDeUtilidad';
import Usuarios from './pages/Usuarios';
import RegistrarUsuario from './pages/RegistrarUsuario';
import EditarUsuario from './pages/EditarUsuario';
import Cotizaciones from './pages/Cotizaciones';
import NuevaCotizacion from './pages/NuevaCotizacion';
import Categorias from './pages/Categorias';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import PrivateRoute from './components/PrivateRoute';
import AccesoDenegado from './components/AccesoDenegado';

function LayoutPrivado() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      <div className="flex-1 flex flex-col min-w-0">
        
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            <Routes>
              {/* Productos */}
              <Route path="productos" element={<Productos />} />
              <Route path="productos/nuevo" element={<AgregarProducto />} />
              <Route path="productos/editar/:id" element={<EditarProducto />} />

              {/* Inventario */}
              <Route path="inventario" element={<Inventario />} />
              <Route path="inventario/entradas" element={<EntradasMercancia />} />

              {/* Ventas */}
              <Route path="ventas/nueva" element={<NuevaVenta />} />
              <Route path="ventas/historial" element={<HistorialVentas />} />

              {/* Usuarios */}
              <Route path="usuarios" element={<Usuarios />} />
              <Route path="usuarios/nuevo" element={<RegistrarUsuario />} />
              <Route path="usuarios/editar/:id" element={<EditarUsuario />} />

              {/* Otros */}
              <Route path="proveedores" element={<Proveedores />} />
              <Route path="categorias" element={<Categorias />} />
              <Route path="corte-caja" element={<CorteCaja />} />
              <Route path="porcentajes-de-utilidad" element={<PorcentajesDeUtilidad />} />
              
              {/* Cotizaciones */}
              <Route path="cotizaciones" element={<Cotizaciones />} />
              <Route path="cotizaciones/nueva" element={<NuevaCotizacion />} />
              <Route path="cotizaciones/editar/:id" element={<NuevaCotizacion />} />

              {/* Fallback */}
              <Route path="*" element={<AccesoDenegado />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/" element={<Login />} />
          <Route path="/denegado" element={<AccesoDenegado />} />

          {/* Rutas Privadas */}
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <LayoutPrivado />
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
      
      <ToastContainer position="top-center" autoClose={2500} />
    </>
  );
}

export default App;