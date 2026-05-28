import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, Building2, Languages, ChevronDown, Settings2 } from 'lucide-react';
import { useHstLangStore } from '../store/hstLangStore';
import NotificationBell from './NotificationBell';

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-9 w-9 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
        <Building2 className="h-5 w-5 text-white" />
      </div>
      <div className="leading-tight">
        <p className="text-white font-bold text-sm tracking-tight">HostelMS</p>
        <p className="text-slate-400 text-[11px]">Management System</p>
      </div>
    </div>
  );
}

function LangPicker() {
  const { lang, langs, setLang, t } = useHstLangStore();
  const [open, setOpen] = useState(false);
  const current = langs.find(l => l.code === lang);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-150"
      >
        <Languages size={18} className="flex-shrink-0" />
        <span className="flex-1 text-left">{current?.native ?? t('language')}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl z-50">
          {langs.map(l => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={`flex items-center justify-between w-full px-4 py-2.5 text-sm transition-colors ${
                lang === l.code
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span>{l.native}</span>
              <span className="text-xs opacity-60">{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NavItem({ to, label, icon: Icon, end, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
          isActive
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`
      }
    >
      <Icon className="h-4.5 w-4.5 flex-shrink-0" size={18} />
      <span>{label}</span>
    </NavLink>
  );
}

function SidebarContent({ navItems, user, onLogout, onNavClick }) {
  const { t } = useHstLangStore();
  const location = useLocation();

  // Collect section header names
  const sectionNames = navItems.filter(i => i.sectionHeader).map(i => i.sectionHeader);

  // Build a map: sectionHeader → [child routes]
  const sectionChildren = {};
  let currentSection = null;
  for (const item of navItems) {
    if (item.sectionHeader) { currentSection = item.sectionHeader; sectionChildren[currentSection] = []; }
    else if (currentSection) sectionChildren[currentSection].push(item.to);
  }

  // Auto-open section if current route is inside it
  const getInitialOpen = () => {
    const open = {};
    for (const name of sectionNames) {
      open[name] = sectionChildren[name]?.some(to => location.pathname.startsWith(to)) ?? false;
    }
    return open;
  };

  const [openSections, setOpenSections] = useState(getInitialOpen);

  // Re-open section when navigating into it
  useEffect(() => {
    for (const name of sectionNames) {
      if (sectionChildren[name]?.some(to => location.pathname.startsWith(to))) {
        setOpenSections(prev => prev[name] ? prev : { ...prev, [name]: true });
      }
    }
  }, [location.pathname]);

  const toggle = (name) => setOpenSections(prev => ({ ...prev, [name]: !prev[name] }));

  // Render nav items, grouping children under collapsible headers
  const rendered = [];
  let i = 0;
  while (i < navItems.length) {
    const item = navItems[i];
    if (item.sectionHeader) {
      const name = item.sectionHeader;
      const isOpen = openSections[name];
      const hasActive = sectionChildren[name]?.some(to => location.pathname.startsWith(to));
      // Collect all children until next header
      const children = [];
      let j = i + 1;
      while (j < navItems.length && !navItems[j].sectionHeader) {
        children.push(navItems[j]);
        j++;
      }
      rendered.push(
        <div key={name} className="mt-2">
          <button
            onClick={() => toggle(name)}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
              hasActive && !isOpen
                ? 'text-indigo-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Settings2 size={18} className="flex-shrink-0" />
            <span className="flex-1 text-left">{name}</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          {isOpen && (
            <div className="mt-0.5 ml-3 pl-3 border-l border-slate-700/60 space-y-0.5">
              {children.map(child => (
                <NavItem key={child.to} {...child} onClick={onNavClick} />
              ))}
            </div>
          )}
        </div>
      );
      i = j;
    } else {
      rendered.push(<NavItem key={item.to} {...item} onClick={onNavClick} />);
      i++;
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-700/60">
        <Logo />
      </div>

      {/* User avatar */}
      <div className="px-4 py-4 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-slate-400 text-xs truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {rendered}
      </nav>

      {/* Language + Logout */}
      <div className="px-3 pb-5 pt-3 border-t border-slate-700/60 space-y-0.5">
        <LangPicker />
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all duration-150"
        >
          <LogOut size={18} className="flex-shrink-0" />
          <span>{t('logout')}</span>
        </button>
      </div>
    </div>
  );
}

// Bottom tab bar — shows first 5 nav items on mobile
function BottomTabBar({ navItems, onLogout }) {
  const tabs = navItems.filter(i => !i.sectionHeader).slice(0, 5);
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex items-center safe-area-bottom shadow-lg">
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-700'
            }`
          }
        >
          <Icon size={20} />
          <span className="truncate max-w-[52px] text-center leading-tight">{label}</span>
        </NavLink>
      ))}
      {/* Logout as last tab when ≤4 nav items */}
      {navItems.filter(i => !i.sectionHeader).length <= 4 && (
        <button onClick={onLogout}
          className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-slate-400 hover:text-red-500 transition-colors">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      )}
    </nav>
  );
}

export default function SidebarLayout({ navItems, user, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const hasManyTabs = navItems.filter(i => !i.sectionHeader).length > 5;

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-slate-900 fixed inset-y-0 left-0 z-30 shadow-xl">
        <SidebarContent navItems={navItems} user={user} onLogout={onLogout} onNavClick={() => {}} />
      </aside>

      {/* Desktop top-right notification bell */}
      <div className="hidden md:flex fixed top-3 right-4 z-30">
        <NotificationBell />
      </div>

      {/* Mobile overlay sidebar (full nav — needed when >5 items) */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="relative w-72 h-full shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-3 z-10 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
            <SidebarContent
              navItems={navItems}
              user={user}
              onLogout={onLogout}
              onNavClick={() => setOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Mobile top header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 h-14 flex items-center px-4 gap-3 shadow-sm">
        {hasManyTabs && (
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} className="text-slate-700" />
          </button>
        )}
        <Logo />
        <div className="ml-auto flex items-center gap-1">
          <NotificationBell />
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 md:ml-60 pt-14 md:pt-4 pb-20 md:pb-0 min-h-screen overflow-x-hidden">
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <BottomTabBar navItems={navItems} onLogout={onLogout} />
    </div>
  );
}
