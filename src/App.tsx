import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { colorThemes } from "@/hooks/useColorTheme";
import Index from "./pages/Index";

// Apply saved color theme immediately
(() => {
  const savedId = localStorage.getItem('color-theme') || 'emerald';
  const theme = colorThemes.find(t => t.id === savedId);
  if (theme) {
    const root = document.documentElement;
    Object.entries({
      '--primary': theme.colors.primary,
      '--primary-foreground': theme.colors.primaryForeground,
      '--primary-light': theme.colors.primaryLight,
      '--primary-dark': theme.colors.primaryDark,
      '--income': theme.colors.income,
      '--income-foreground': theme.colors.incomeForeground,
      '--income-light': theme.colors.incomeLight,
      '--income-accent': theme.colors.incomeAccent,
      '--ring': theme.colors.ring,
      '--balance-positive': theme.colors.balancePositive,
    }).forEach(([k, v]) => root.style.setProperty(k, v));
    root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${theme.colors.primary}), hsl(${theme.colors.primaryLight}))`);
    root.style.setProperty('--gradient-income', `linear-gradient(135deg, hsl(${theme.colors.income}), hsl(${theme.colors.incomeLight}))`);
  }
})();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Index />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
