import { Link, useLocation } from 'react-router-dom';
import { useUsuario } from '../hooks/useUsuario'; 
import { 
  ShoppingCart, Package, Users, FileText, BarChart, 
  Tag, Truck, Archive, History, Percent, ChartPie, X, Home
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const usuario = useUsuario();

  if (!usuario) return null;

  const menuItems = [
    { label: 'Venta POS', path: '/ventas/nueva', icon: ShoppingCart, roles: ['admin', 'ventas'] },
    { label: 'Historial', path: '/ventas/historial', icon: History, roles: ['admin', 'ventas'] },
    { label: 'Cotizaciones', path: '/cotizaciones', icon: FileText, roles: ['admin', 'ventas'] },
    
    { type: 'divider' },
    
    { label: 'Productos', path: '/productos', icon: Package, roles: ['admin', 'ventas', 'inventario'] },
    { label: 'Inventario', path: '/inventario', icon: ChartPie, roles: ['admin', 'inventario'] },
    { label: 'Recepción', path: '/inventario/entradas', icon: Archive, roles: ['admin', 'inventario'] },
    
    { type: 'divider' },
    
    { label: 'Corte Caja', path: '/corte-caja', icon: BarChart, roles: ['admin'] },
    { label: 'Utilidades', path: '/porcentajes-de-utilidad', icon: Percent, roles: ['admin'] },
    { label: 'Usuarios', path: '/usuarios', icon: Users, roles: ['admin'] },
    { label: 'Proveedores', path: '/proveedores', icon: Truck, roles: ['admin', 'inventario'] },
    { label: 'Categorías', path: '/categorias', icon: Tag, roles: ['admin', 'inventario'] },
  ];

  const linksVisibles = menuItems.filter(item => 
    item.type === 'divider' || item.roles.includes(usuario.rol)
  );

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-slate-900 text-slate-300 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        <div className="h-16 flex items-center justify-between px-6 bg-slate-950 border-b border-slate-800">
            <div className="flex items-center gap-2 text-white font-bold text-xl">
                <span className="text-blue-500">GAMA</span> POS
            </div>
            <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
                <X size={24} />
            </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {linksVisibles.map((item, index) => {
            if (item.type === 'divider') {
                return <hr key={`div-${index}`} className="my-4 border-slate-700/50" />;
            }

            const isActive = location.pathname.startsWith(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => onClose()} 
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                    : 'hover:bg-slate-800 hover:text-white'}
                `}
              >
                <item.icon size={20} className={`transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>
                <div className="p-4 border-t border-slate-800 bg-slate-950">
            <p className="text-xs text-center text-slate-600">
                Tlapalería v1.0 &copy; 2025
            </p>
        </div>
      </aside>
    </>
  );
}