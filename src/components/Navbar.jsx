import { Menu, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUsuario } from '../hooks/useUsuario';

export default function NavBar({ onMenuClick }) {
  const navigate = useNavigate();
  const usuario = useUsuario();

  if (!usuario) return null;

  const handleLogout = () => {
    if (window.confirm('¿Cerrar sesión?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      navigate('/');
    }
  };

  return (
    <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        <button 
            onClick={onMenuClick}
            className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
        >
            <Menu size={24} />
        </button>
        <h1 className="text-lg font-bold text-slate-800 hidden sm:block">
            Bienvenido, {usuario.nombre.split(' ')[0]}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
             <span className="text-sm font-semibold text-slate-700">{usuario.nombre}</span>
             <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 rounded-full">
                {usuario.rol}
             </span>
        </div>
        
        <div className="h-8 w-px bg-slate-200 mx-1"></div>

        <button
          onClick={handleLogout}
          className="p-2 rounded-full text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          title="Cerrar Sesión"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}