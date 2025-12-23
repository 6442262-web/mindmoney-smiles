import { Home, Plus, List, BarChart3, User, Bell, Settings, Store } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAppMode } from "@/hooks/useAppMode";
import { useLanguage } from "@/hooks/useLanguage";

export function BottomNavigation() {
  const location = useLocation();
  const { mode } = useAppMode();
  const { t } = useLanguage();

  const navItems = mode === "business" ? [
    { path: "/business", icon: Store, label: t('nav.store') },
    { path: "/notifications", icon: Bell, label: t('nav.notifications') },
    { path: "/business/add-transaction", icon: Plus, label: t('nav.add') },
    { path: "/business/transactions", icon: List, label: t('nav.transactions') },
    { path: "/settings", icon: Settings, label: t('nav.settings') },
  ] : [
    { path: "/", icon: Home, label: t('nav.home') },
    { path: "/notifications", icon: Bell, label: t('nav.notifications') },
    { path: "/add", icon: Plus, label: t('nav.add') },
    { path: "/summary", icon: BarChart3, label: t('nav.summary') },
    { path: "/settings", icon: Settings, label: t('nav.settings') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-strong z-50">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path || 
            (mode === "business" && path === "/business" && location.pathname === "/business") ||
            (mode === "business" && path.startsWith("/business") && location.pathname.startsWith(path));
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon size={20} />
              <span className="text-xs mt-1 font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}