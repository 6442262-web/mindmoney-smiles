import { useState, useEffect } from 'react';

export interface ColorTheme {
  id: string;
  name: string;
  emoji: string;
  colors: {
    primary: string;
    primaryForeground: string;
    primaryLight: string;
    primaryDark: string;
    income: string;
    incomeForeground: string;
    incomeLight: string;
    incomeAccent: string;
    ring: string;
    balancePositive: string;
  };
  preview: string; // CSS gradient for preview swatch
}

export const colorThemes: ColorTheme[] = [
  {
    id: 'emerald',
    name: 'เขียวมรกต',
    emoji: '🌿',
    preview: 'linear-gradient(135deg, hsl(142, 76%, 36%), hsl(142, 60%, 50%))',
    colors: {
      primary: '142 76% 36%',
      primaryForeground: '0 0% 100%',
      primaryLight: '142 60% 50%',
      primaryDark: '142 85% 25%',
      income: '142 76% 36%',
      incomeForeground: '0 0% 100%',
      incomeLight: '142 50% 85%',
      incomeAccent: '142 40% 92%',
      ring: '142 76% 36%',
      balancePositive: '142 76% 36%',
    },
  },
  {
    id: 'ocean',
    name: 'มหาสมุทร',
    emoji: '🌊',
    preview: 'linear-gradient(135deg, hsl(210, 76%, 42%), hsl(200, 70%, 55%))',
    colors: {
      primary: '210 76% 42%',
      primaryForeground: '0 0% 100%',
      primaryLight: '200 70% 55%',
      primaryDark: '210 85% 30%',
      income: '160 60% 40%',
      incomeForeground: '0 0% 100%',
      incomeLight: '160 50% 85%',
      incomeAccent: '160 40% 92%',
      ring: '210 76% 42%',
      balancePositive: '160 60% 40%',
    },
  },
  {
    id: 'violet',
    name: 'ม่วงราชา',
    emoji: '👑',
    preview: 'linear-gradient(135deg, hsl(270, 65%, 50%), hsl(280, 55%, 65%))',
    colors: {
      primary: '270 65% 50%',
      primaryForeground: '0 0% 100%',
      primaryLight: '280 55% 65%',
      primaryDark: '270 75% 35%',
      income: '150 60% 40%',
      incomeForeground: '0 0% 100%',
      incomeLight: '150 50% 85%',
      incomeAccent: '150 40% 92%',
      ring: '270 65% 50%',
      balancePositive: '150 60% 40%',
    },
  },
  {
    id: 'rose',
    name: 'กุหลาบ',
    emoji: '🌹',
    preview: 'linear-gradient(135deg, hsl(340, 75%, 50%), hsl(350, 65%, 60%))',
    colors: {
      primary: '340 75% 50%',
      primaryForeground: '0 0% 100%',
      primaryLight: '350 65% 60%',
      primaryDark: '340 80% 35%',
      income: '155 60% 42%',
      incomeForeground: '0 0% 100%',
      incomeLight: '155 50% 85%',
      incomeAccent: '155 40% 92%',
      ring: '340 75% 50%',
      balancePositive: '155 60% 42%',
    },
  },
  {
    id: 'amber',
    name: 'ทองอำพัน',
    emoji: '✨',
    preview: 'linear-gradient(135deg, hsl(38, 92%, 50%), hsl(45, 85%, 55%))',
    colors: {
      primary: '38 92% 50%',
      primaryForeground: '0 0% 100%',
      primaryLight: '45 85% 55%',
      primaryDark: '30 90% 38%',
      income: '142 65% 38%',
      incomeForeground: '0 0% 100%',
      incomeLight: '142 50% 85%',
      incomeAccent: '142 40% 92%',
      ring: '38 92% 50%',
      balancePositive: '142 65% 38%',
    },
  },
  {
    id: 'teal',
    name: 'เทอร์ควอยซ์',
    emoji: '💎',
    preview: 'linear-gradient(135deg, hsl(175, 70%, 38%), hsl(180, 60%, 48%))',
    colors: {
      primary: '175 70% 38%',
      primaryForeground: '0 0% 100%',
      primaryLight: '180 60% 48%',
      primaryDark: '175 80% 28%',
      income: '175 70% 38%',
      incomeForeground: '0 0% 100%',
      incomeLight: '175 50% 85%',
      incomeAccent: '175 40% 92%',
      ring: '175 70% 38%',
      balancePositive: '175 70% 38%',
    },
  },
  {
    id: 'slate',
    name: 'สีเทาหรู',
    emoji: '🖤',
    preview: 'linear-gradient(135deg, hsl(220, 15%, 35%), hsl(220, 10%, 50%))',
    colors: {
      primary: '220 15% 35%',
      primaryForeground: '0 0% 100%',
      primaryLight: '220 10% 50%',
      primaryDark: '220 20% 25%',
      income: '142 60% 40%',
      incomeForeground: '0 0% 100%',
      incomeLight: '142 50% 85%',
      incomeAccent: '142 40% 92%',
      ring: '220 15% 35%',
      balancePositive: '142 60% 40%',
    },
  },
  {
    id: 'coral',
    name: 'ปะการัง',
    emoji: '🪸',
    preview: 'linear-gradient(135deg, hsl(16, 80%, 55%), hsl(25, 75%, 60%))',
    colors: {
      primary: '16 80% 55%',
      primaryForeground: '0 0% 100%',
      primaryLight: '25 75% 60%',
      primaryDark: '16 85% 40%',
      income: '160 55% 42%',
      incomeForeground: '0 0% 100%',
      incomeLight: '160 50% 85%',
      incomeAccent: '160 40% 92%',
      ring: '16 80% 55%',
      balancePositive: '160 55% 42%',
    },
  },
];

function applyThemeColors(theme: ColorTheme) {
  const root = document.documentElement;
  root.style.setProperty('--primary', theme.colors.primary);
  root.style.setProperty('--primary-foreground', theme.colors.primaryForeground);
  root.style.setProperty('--primary-light', theme.colors.primaryLight);
  root.style.setProperty('--primary-dark', theme.colors.primaryDark);
  root.style.setProperty('--income', theme.colors.income);
  root.style.setProperty('--income-foreground', theme.colors.incomeForeground);
  root.style.setProperty('--income-light', theme.colors.incomeLight);
  root.style.setProperty('--income-accent', theme.colors.incomeAccent);
  root.style.setProperty('--ring', theme.colors.ring);
  root.style.setProperty('--balance-positive', theme.colors.balancePositive);
  // Update gradient
  root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${theme.colors.primary}), hsl(${theme.colors.primaryLight}))`);
  root.style.setProperty('--gradient-income', `linear-gradient(135deg, hsl(${theme.colors.income}), hsl(${theme.colors.incomeLight}))`);
}

export function useColorTheme() {
  const [activeThemeId, setActiveThemeId] = useState<string>(() => {
    return localStorage.getItem('color-theme') || 'emerald';
  });

  useEffect(() => {
    const theme = colorThemes.find(t => t.id === activeThemeId);
    if (theme) {
      applyThemeColors(theme);
    }
  }, [activeThemeId]);

  // Apply on mount
  useEffect(() => {
    const savedId = localStorage.getItem('color-theme') || 'emerald';
    const theme = colorThemes.find(t => t.id === savedId);
    if (theme) {
      applyThemeColors(theme);
    }
  }, []);

  const setTheme = (themeId: string) => {
    setActiveThemeId(themeId);
    localStorage.setItem('color-theme', themeId);
  };

  return {
    activeThemeId,
    setTheme,
    themes: colorThemes,
  };
}
