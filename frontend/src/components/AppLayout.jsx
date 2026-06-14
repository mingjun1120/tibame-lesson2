import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Car, Users, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/vehicles', label: 'Vehicles', icon: Car },
  { to: '/employees', label: 'Employees', icon: Users, adminOnly: true },
];

function NavItems({ isAdmin, className, linkClassName }) {
  return (
    <nav className={className}>
      {navItems
        .filter((item) => !item.adminOnly || isAdmin)
        .map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                linkClassName,
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
    </nav>
  );
}

export default function AppLayout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-background md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-6 font-semibold">
          <Car className="h-5 w-5" /> VMS
        </div>
        <NavItems isAdmin={isAdmin} className="flex-1 space-y-1 p-3" />
        <div className="border-t p-3">
          <div className="px-3 py-2">
            <div className="text-sm font-medium">{user?.name}</div>
            <div className="text-xs text-muted-foreground">
              {isAdmin ? 'Administrator' : 'User'}
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b bg-background px-4 py-3 md:hidden">
          <span className="flex items-center gap-2 font-semibold">
            <Car className="h-5 w-5" /> VMS
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </header>
        <NavItems
          isAdmin={isAdmin}
          className="flex gap-1 overflow-x-auto border-b bg-background p-2 md:hidden"
        />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
