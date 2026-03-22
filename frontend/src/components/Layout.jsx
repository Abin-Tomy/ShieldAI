import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Target, Clock, Activity, Shield, Menu, X } from 'lucide-react';
import { getHealth } from '../services/api';

const Layout = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    // Check backend health
    const checkHealth = async () => {
      try {
        await getHealth();
        setIsOnline(true);
      } catch (error) {
        setIsOnline(false);
      }
    };

    checkHealth();
    const healthInterval = setInterval(checkHealth, 30000); // Check every 30 seconds

    return () => clearInterval(healthInterval);
  }, []);

  useEffect(() => {
    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/scan', icon: Target, label: 'Scan' },
    { path: '/history', icon: Clock, label: 'History' },
  ];

  return (
    <div className="flex h-screen bg-transparent overflow-hidden">
      {/* Sidebar - Glassmorphic */}
      <div className={`transition-all duration-300 ease-in-out bg-surface/60 backdrop-blur-xl flex flex-col relative z-20 overflow-hidden ${isSidebarOpen ? 'w-60 border-r border-white/5' : 'w-0 border-r-0'}`}>
        <div className="w-60 flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 border-b border-white/5 relative">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 to-transparent pointer-events-none opacity-50"></div>
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className="w-10 h-10 bg-primary/20 bg-gradient-to-br from-primary/40 to-primary/10 rounded-xl flex items-center justify-center shadow-glow-primary border border-primary/30">
              <Shield className="text-white drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" size={24} />
            </div>
            <div>
              <div className="text-white font-bold text-lg tracking-tight">ShieldAI <span className="text-primary font-black">v2</span></div>
              <div className="text-text-muted text-[10px] uppercase tracking-widest font-semibold mt-0.5">Autonomous Core</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div className="text-[10px] font-bold text-text-muted/60 uppercase tracking-widest px-4 mb-3">Menu</div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all relative group overflow-hidden ${
                  isActive
                    ? 'text-white'
                    : 'text-text-muted hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active Background Glow */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border-l-2 border-primary"></div>
                  )}
                  {/* Hover Background */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  )}
                  <item.icon size={18} className={`relative z-10 transition-colors ${isActive ? 'text-primary drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]' : 'group-hover:text-gray-300'}`} />
                  <span className={`relative z-10 text-sm font-medium ${isActive ? 'tracking-wide' : ''}`}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* System Status Footer */}
        <div className="p-4 border-t border-white/5 bg-black/10">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-surface/50 border border-white/5 backdrop-blur-md">
            <div className="relative flex h-2.5 w-2.5">
              {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`}></span>
            </div>
            <span className={`text-xs font-bold tracking-widest ${isOnline ? 'text-success' : 'text-danger'}`}>
              {isOnline ? 'SYSTEM ONLINE' : 'SYSTEM OFFLINE'}
            </span>
          </div>
        </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Top Header Bar - Glass */}
        <div className="bg-surface/40 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-surface/50 border border-white/5 hover:bg-white/5 text-text-muted hover:text-white transition-colors duration-300 overflow-hidden"
            >
              <Menu 
                size={20} 
                className={`absolute transition-all duration-300 ease-in-out ${isSidebarOpen ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} 
              />
              <X 
                size={20} 
                className={`absolute transition-all duration-300 ease-in-out ${!isSidebarOpen ? '-rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} 
              />
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-xs text-text-muted font-mono tracking-wider shadow-inner">
              {currentTime.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Scrollable Page Wrapper */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          {!isOnline && (
            <div className="mb-6 bg-danger/10 border border-danger/30 text-danger px-5 py-4 rounded-xl shadow-glow-danger flex items-center gap-3 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-danger animate-pulse"></div>
              <div>
                <strong className="font-semibold text-white">Neural Engine Offline</strong>
                <span className="opacity-80 ml-2 text-sm">Please start the Python backend server at `localhost:8000` to enable threat analysis.</span>
              </div>
            </div>
          )}
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
