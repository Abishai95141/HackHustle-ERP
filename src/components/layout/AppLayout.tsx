import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, X, Shield, Users, Utensils, Trophy, HelpCircle, QrCode, LayoutDashboard } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const navItems = [
    ...(role === 'super_admin' ? [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/users', label: 'Users', icon: Users },
      { href: '/admin/teams', label: 'Teams', icon: Trophy },
      { href: '/admin/meals', label: 'Meals', icon: Utensils },
      { href: '/admin/queries', label: 'Queries', icon: HelpCircle },
    ] : []),
    ...(role === 'volunteer' ? [
      { href: '/scanner', label: 'Scanner', icon: QrCode },
    ] : []),
    ...(role === 'judge' ? [
      { href: '/judge', label: 'Judging', icon: Trophy },
    ] : []),
    ...(role === 'participant' ? [
      { href: '/participant', label: 'My Profile', icon: Users },
      { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="font-display text-xl font-bold text-primary">HACKATHON</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-foreground">{profile?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{role?.replace('_', ' ')}</p>
            </div>
            <Button variant="outline" size="icon" onClick={handleSignOut} className="hidden md:flex">
              <LogOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card p-4">
            <div className="mb-4 pb-4 border-b border-border">
              <p className="font-medium text-foreground">{profile?.name}</p>
              <p className="text-sm text-muted-foreground capitalize">{role?.replace('_', ' ')}</p>
            </div>
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                    location.pathname === item.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
              <Button variant="outline" onClick={handleSignOut} className="mt-4 justify-start gap-2">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </nav>
          </div>
        )}
      </header>

      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}