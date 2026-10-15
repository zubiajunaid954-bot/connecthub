import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import Avatar from './Avatar';

const linkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`;

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/');
  };

  const links = (
    <>
      <NavLink to="/" end className={linkClass} onClick={() => setMenuOpen(false)}>
        Forum
      </NavLink>
      {user && (
        <NavLink to="/chat" className={linkClass} onClick={() => setMenuOpen(false)}>
          Chat
        </NavLink>
      )}
      {isAdmin && (
        <NavLink to="/admin" className={linkClass} onClick={() => setMenuOpen(false)}>
          Admin
        </NavLink>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">C</span>
          ConnectHub
        </Link>

        <nav className="ml-4 hidden items-center gap-1 sm:flex">{links}</nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link to="/posts/new" className="btn-primary btn-sm hidden sm:inline-flex">
                + New post
              </Link>
              <NotificationBell />
              <Link to={`/users/${user.username}`} className="hidden items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100 sm:flex">
                <Avatar name={user.username} />
                <span className="text-sm font-medium">{user.username}</span>
              </Link>
              <button onClick={handleLogout} className="btn-ghost btn-sm hidden sm:inline-flex">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost btn-sm">
                Log in
              </Link>
              <Link to="/register" className="btn-primary btn-sm">
                Sign up
              </Link>
            </>
          )}
          <button className="btn-ghost !px-2 sm:hidden" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={menuOpen}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d={menuOpen ? 'M6 6l12 12M6 18L18 6' : 'M4 7h16M4 12h16M4 17h16'} />
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="flex flex-col gap-1 border-t border-slate-100 px-4 py-3 sm:hidden">
          {links}
          {user && (
            <>
              <NavLink to="/posts/new" className={linkClass} onClick={() => setMenuOpen(false)}>
                New post
              </NavLink>
              <NavLink to={`/users/${user.username}`} className={linkClass} onClick={() => setMenuOpen(false)}>
                My profile
              </NavLink>
              <button onClick={handleLogout} className="rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100">
                Log out
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
