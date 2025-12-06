import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useUsuario } from '../hooks/useUsuario';

import { 
  Menu, X, LogOut, ShoppingCart, Package, Users, 
  FileText, BarChart, Tag, Truck, Archive, History, Percent, ChartPie
} from 'lucide-react';

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const usuario = useUsuario();

  if (!usuario) return null;

  const handleLogout = () => {
    if (window.confirm('¿Cerrar sesión?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      navigate('/');
    }
  };

  const menuItems = [
    { label: 'Venta POS', path: '/ventas/nueva', icon: ShoppingCart, roles: ['admin', 'ventas'] },
    
    { label: 'Historial', path: '/ventas/historial', icon: History, roles: ['admin', 'ventas'] },
    
    { label: 'Productos', path: '/productos', icon: Package, roles: ['admin', 'ventas', 'inventario'] },
    { label: 'Recepción', path: '/inventario/entradas', icon: Archive, roles: ['admin', 'inventario'] },
    { label: 'Cotizaciones', path: '/cotizaciones', icon: FileText, roles: ['admin', 'ventas'] },
    { label: 'Corte Caja', path: '/corte-caja', icon: BarChart, roles: ['admin'] },
    { label: 'Inventario', path: '/inventario', icon: ChartPie, roles: ['admin', 'inventario'] },
    
    { label: 'Utilidades', path: '/porcentajes-de-utilidad', icon: Percent, roles: ['admin'] },
    { label: 'Usuarios', path: '/usuarios', icon: Users, roles: ['admin'] },
    { label: 'Proveedores', path: '/proveedores', icon: Truck, roles: ['admin', 'inventario'] },
    { label: 'Categorías', path: '/categorias', icon: Tag, roles: ['admin', 'inventario'] },
  ];

  const linksVisibles = menuItems.filter(item => item.roles.includes(usuario.rol));

  const NavLink = ({ item, mobile = false }) => {
    const isActive = location.pathname.startsWith(item.path);
    const baseClass = "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors font-medium text-sm";
    const activeClass = "bg-blue-50 text-blue-700";
    const inactiveClass = "text-slate-600 hover:bg-slate-50 hover:text-slate-900";

    return (
      <Link
        to={item.path}
        onClick={() => mobile && setIsOpen(false)}
        className={`${baseClass} ${isActive ? activeClass : inactiveClass} ${mobile ? 'w-full text-base py-3' : ''}`}
      >
        <item.icon size={18} />
        {item.label}
      </Link>
    );
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Logo y Menú Desktop */}
          <div className="flex items-center gap-8">
            <Link to="/productos" className="flex items-center gap-2 group">
              <div className="bg-blue-600 p-1.5 rounded-lg text-white group-hover:bg-blue-700 transition">
                <ShoppingCart size={20} />
              </div>
              <span className="text-xl font-bold text-slate-800 hidden sm:block">
                Tlapalería<span className="text-blue-600">POS</span>
              </span>
            </Link>

            {/* Navegación Desktop */}
            <nav className="hidden lg:flex items-center gap-1">
              {linksVisibles.map((item) => (
                <NavLink key={item.path} item={item} />
              ))}
            </nav>
          </div>

          {/* Usuario y Logout */}
          <div className="flex items-center gap-4">
            
            {/* Info Usuario */}
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-sm font-bold text-slate-700">{usuario.nombre}</span>
              <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold tracking-wide
                ${usuario.rol === 'admin' ? 'bg-purple-100 text-purple-700' : 
                  usuario.rol === 'ventas' ? 'bg-emerald-100 text-emerald-700' : 
                  'bg-amber-100 text-amber-700'}`}>
                {usuario.rol}
              </span>
            </div>

            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition tooltip"
              title="Cerrar Sesión"
            >
              <LogOut size={20} />
            </button>

            {/* Botón Menú Móvil */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Menú Móvil Desplegable */}
      {isOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white absolute w-full left-0 shadow-lg animate-in slide-in-from-top-5 duration-200">
          <div className="p-4 space-y-2">
            <div className="px-3 pb-3 mb-2 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase">Usuario</p>
                <p className="font-bold text-slate-800">{usuario.nombre}</p>
              </div>
              <span className="text-xs font-bold uppercase bg-slate-100 px-2 py-1 rounded text-slate-600">
                {usuario.rol}
              </span>
            </div>
            
            {linksVisibles.map((item) => (
              <NavLink key={item.path} item={item} mobile={true} />
            ))}
          </div>
        </div>
      )}
    </header>
  );
}