'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/hooks/useToast';

interface KeyboardShortcutsProps {
  locale: string;
  onOpenNav: () => void;
  onCloseNav: () => void;
}

/**
 * Global keyboard shortcuts for power users and accessibility.
 *
 * Shortcuts:
 * - / : Focus global search
 * - g d : Go to dashboard
 * - g b : Go to budget
 * - g t : Go to transactions
 * - Esc : Close overlays/navigation
 * - ? : Show help toast
 * - Shift+D : Toggle dark mode
 * - Shift+H : Toggle high-contrast mode
 */
export default function KeyboardShortcuts({ locale, onOpenNav, onCloseNav }: KeyboardShortcutsProps) {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    let combo: string[] = [];
    const navTo = (path: string) => router.push(`/${locale}/${path}`);

    const handler = (e: KeyboardEvent) => {
      // Skip when typing in inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;

      if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        toast({
          title: 'Keyboard Shortcuts',
          description: '/ focus search • g d dashboard • g b budget • g t transactions • Esc close • Shift+D dark • Shift+H high contrast',
          variant: 'info',
          duration: 6000,
        });
        return;
      }

      if (!isTyping && e.key === '/') {
        e.preventDefault();
        const input = document.getElementById('global-search') as HTMLInputElement | null;
        input?.focus();
        return;
      }

      if (!isTyping && (e.key === 'g' || e.key === 'G')) {
        combo = ['g'];
        return;
      }

      if (combo[0] === 'g') {
        if (e.key === 'd') { navTo('dashboard'); combo = []; return; }
        if (e.key === 'b') { navTo('budget'); combo = []; return; }
        if (e.key === 't') { navTo('transactions'); combo = []; return; }
      }

      if (e.key === 'Escape') {
        onCloseNav();
      }

      // Theme toggles
      if (e.shiftKey && (e.key === 'D')) {
        e.preventDefault();
        const html = document.documentElement;
        const nextDark = !html.classList.contains('dark');
        html.classList.toggle('dark', nextDark);
        localStorage.setItem('theme', nextDark ? 'dark' : 'light');
        toast({ title: nextDark ? 'Dark mode on' : 'Dark mode off', variant: 'info', duration: 1500 });
      }
      if (e.shiftKey && (e.key === 'H')) {
        e.preventDefault();
        const html = document.documentElement;
        const next = html.dataset.contrast === 'high' ? 'normal' : 'high';
        html.dataset.contrast = next;
        localStorage.setItem('contrast', next);
        toast({ title: next === 'high' ? 'High contrast on' : 'High contrast off', variant: 'info', duration: 1500 });
      }
    };

    const onKeyUp = () => { combo = []; };
    window.addEventListener('keydown', handler);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [locale, onOpenNav, onCloseNav, toast, router]);

  // Listen to header theme toggle event
  useEffect(() => {
    const listener = () => {
      const html = document.documentElement;
      const currentTheme = localStorage.getItem('theme') || 'light';
      // Cycle light -> dark -> high-contrast -> light
      if (currentTheme === 'light') {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else if (currentTheme === 'dark') {
        html.classList.remove('dark');
        html.dataset.contrast = 'high';
        localStorage.setItem('theme', 'light'); // reset theme but enable contrast
        localStorage.setItem('contrast', 'high');
      } else {
        html.classList.remove('dark');
        html.dataset.contrast = 'normal';
        localStorage.setItem('contrast', 'normal');
      }
    };
    window.addEventListener('toggle-theme', listener as any);
    return () => window.removeEventListener('toggle-theme', listener as any);
  }, []);

  return null;
}

