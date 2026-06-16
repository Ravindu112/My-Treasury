import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-md px-4 sm:px-6 py-3">
      <div className="flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-blue-600">My Treasury</Link>

        {user ? (
          <>
            <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden p-2 text-gray-600 hover:text-blue-600 cursor-pointer">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <div className="hidden sm:flex items-center gap-4">
              <Link to="/dashboard" className="text-gray-600 hover:text-blue-600">Dashboard</Link>
              <Link to="/profile" className="text-gray-600 hover:text-blue-600">{profile?.name || user.email}</Link>
              <button onClick={handleLogout} className="text-red-500 hover:text-red-700 cursor-pointer">Logout</button>
            </div>
          </>
        ) : null}
      </div>

      {menuOpen && (
        <div className="sm:hidden mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2">
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="text-gray-600 hover:text-blue-600 px-2 py-1.5 rounded hover:bg-gray-50">Dashboard</Link>
              <Link to="/profile" onClick={() => setMenuOpen(false)} className="text-gray-600 hover:text-blue-600 px-2 py-1.5 rounded hover:bg-gray-50">{profile?.name || user.email}</Link>
              <button onClick={handleLogout} className="text-red-500 hover:text-red-700 text-left px-2 py-1.5 rounded hover:bg-red-50 cursor-pointer">Logout</button>
            </>
          ) : null}
        </div>
      )}
    </nav>
  );
}
