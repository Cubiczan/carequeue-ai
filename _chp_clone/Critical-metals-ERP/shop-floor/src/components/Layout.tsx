import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  BeakerIcon,
  TruckIcon,
  ClipboardDocumentCheckIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon, permission: '*view' },
    { name: 'Work Orders', href: '/work-orders', icon: ClipboardDocumentListIcon, permission: 'work_orders:view' },
    { name: 'Battery Receipt', href: '/battery-receipt', icon: TruckIcon, permission: 'battery_receipt:*' },
    { name: 'Quality Check', href: '/quality-check', icon: BeakerIcon, permission: 'quality_check:*' },
    { name: 'Material Recovery', href: '/material-recovery', icon: ClipboardDocumentCheckIcon, permission: 'material_recovery:*' },
    { name: 'Traceability', href: '/traceability', icon: MagnifyingGlassIcon, permission: 'traceability:view' },
    { name: 'HazMat', href: '/hazardous-waste', icon: ExclamationTriangleIcon, permission: 'hazmat:*' },
    { name: 'Inventory', href: '/inventory', icon: ArchiveBoxIcon, permission: 'inventory:*' },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon, permission: 'settings:*' }
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.permissions.includes('*')) return true;
    return user.permissions.some(p => {
      if (p === permission) return true;
      if (p.endsWith(':*')) return permission.startsWith(p.slice(0, -2));
      return p === permission;
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-green-800 transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 bg-green-900">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span className="text-white font-bold text-lg">Battery ERP</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-green-200 hover:text-white"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            !item.permission || hasPermission(item.permission) ? (
              <Link
                key={item.name}
                to={item.href}
                className="flex items-center gap-3 px-3 py-2 text-green-100 rounded-lg hover:bg-green-700 transition-colors"
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            ) : null
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="p-4 bg-green-900">
          <div className="flex items-center gap-3">
            <UserCircleIcon className="w-10 h-10 text-green-200" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.fullName}</p>
              <p className="text-xs text-green-300 capitalize">{user?.role.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-10 bg-white shadow">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>

            {/* Page title - could be dynamic */}
            <div className="hidden lg:block">
              <h1 className="text-xl font-semibold text-gray-900">
                {navigation.find(n => window.location.pathname === n.href)?.name || 'Shop Floor'}
              </h1>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-4">
              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <UserCircleIcon className="w-8 h-8 text-gray-600" />
                  <span className="hidden md:block text-sm font-medium text-gray-700">
                    {user?.fullName}
                  </span>
                </button>

                {/* Dropdown menu */}
                {userMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-20 py-1 border border-gray-200">
                      <div className="px-4 py-2 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          handleLogout();
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
