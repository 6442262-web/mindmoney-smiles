import { Home, Plus, List, BarChart3, User, Bell, Settings, Store, LineChart } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAppMode } from "@/hooks/useAppMode";
import { useLanguage } from "@/hooks/useLanguage";
import { useInvestmentMode } from "@/hooks/useInvestmentMode";

export function BottomNavigation() {
  const location = useLocation();
  const { mode } = useAppMode();
  const { t, language } = useLanguage();
  const { investmentMode } = useInvestmentMode();

  const navItems = mode === "business" ? [
    { path: "/business", icon: Store, label: t('nav.store') },
    { path: "/notifications", icon: Bell, label: t('nav.notifications') },
    { path: "/business/add-transaction", icon: Plus, label: t('nav.add'), isCenter: true },
    { path: "/business/transactions", icon: List, label: t('nav.transactions') },
    { path: "/settings", icon: Settings, label: t('nav.settings') },
  ] : [
    { path: "/", icon: Home, label: t('nav.home') },
    // แท็บลงทุนโชว์เฉพาะเมื่อเปิดโหมดการลงทุน — ปิดอยู่ให้เป็นแท็บรายการแทน
    investmentMode
      ? { path: "/investment", icon: LineChart, label: language === 'th' ? 'ลงทุน' : 'Invest' }
      : { path: "/transactions", icon: List, label: t('nav.transactions') },
    { path: "/add", icon: Plus, label: t('nav.add'), isCenter: true },
    { path: "/summary", icon: BarChart3, label: t('nav.summary') },
    { path: "/settings", icon: Settings, label: t('nav.settings') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map(({ path, icon: Icon, label, isCenter }) => {
          const isActive = location.pathname === path || 
            (mode === "business" && path === "/business" && location.pathname === "/business") ||
            (mode === "business" && path.startsWith("/business") && location.pathname.startsWith(path));
          
          if (isCenter) {
            return (
              <Link key={path} to={path} className="relative -mt-5">
                <div className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center shadow-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-primary scale-110"
                    : "bg-primary hover:scale-105"
                )}>
                  <Icon size={24} className="text-primary-foreground" />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon size={20} />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className={cn("text-[10px] mt-1", isActive ? "font-semibold" : "font-medium")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
