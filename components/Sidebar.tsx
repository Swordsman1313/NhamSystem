'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  Truck,
  FileSpreadsheet,
  Package,
  Boxes,
  Calculator,
  Settings as SettingsIcon,
  Search,
  Coins,
  LogOut,
  Bell,
  Sparkles,
} from 'lucide-react';
import { getSettings } from '@/lib/storage';
import CommandPalette from './CommandPalette';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  category: string;
  items: NavItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const [exchangeRate, setExchangeRate] = useState<number>(4000);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const updateRate = () => {
      const s = getSettings();
      setExchangeRate(s.exchangeRate || 4000);
    };
    updateRate();

    const handleSettingsUpdated = (e: any) => {
      if (e.detail?.exchangeRate) {
        setExchangeRate(Number(e.detail.exchangeRate));
      } else {
        updateRate();
      }
    };

    const handleOpenPalette = () => setCommandPaletteOpen(true);

    window.addEventListener('settings_updated', handleSettingsUpdated);
    window.addEventListener('storage', updateRate);
    window.addEventListener('open_command_palette', handleOpenPalette);

    return () => {
      window.removeEventListener('settings_updated', handleSettingsUpdated);
      window.removeEventListener('storage', updateRate);
      window.removeEventListener('open_command_palette', handleOpenPalette);
    };
  }, []);

  const getIsActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    // Prevent "/deliveries" from matching when on "/deliveries/new"
    if (href === '/deliveries') {
      return pathname === '/deliveries';
    }
    if (href === '/deliveries/new') {
      return pathname === '/deliveries/new';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const navSections: NavSection[] = [
    {
      category: 'OPERATIONS',
      items: [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'New Invoice', href: '/deliveries/new', icon: PlusCircle },
        { name: 'Deliveries & AR', href: '/deliveries', icon: Truck },
        { name: 'Statements', href: '/statements', icon: FileSpreadsheet },
      ],
    },
    {
      category: 'PRODUCTION & STOCK',
      items: [
        { name: 'Warehouse', href: '/inventory', icon: Package },
        { name: 'Products & BOM', href: '/products', icon: Boxes },
        { name: 'Batch Costing', href: '/costing', icon: Calculator },
      ],
    },
    {
      category: 'SYSTEM',
      items: [
        { name: 'Settings', href: '/settings', icon: SettingsIcon },
      ],
    },
  ];

  return (
    <>
      <aside className="no-print hidden md:flex bg-white border-r border-slate-200/80 w-64 flex-col justify-between h-screen fixed inset-y-0 left-0 z-30 select-none">
        {/* Top Section: Header & Command Bar */}
        <div className="shrink-0">
          {/* Top Bar */}
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/70 p-1 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform duration-200 shrink-0">
                <img
                  src="/logo.png"
                  alt="Nham Nham Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-slate-900 font-bold text-sm tracking-tight truncate leading-tight">
                  Nham Nham OPS
                </span>
                <span className="text-[10px] text-slate-400 font-medium truncate leading-tight">
                  Fresh Fruit System
                </span>
              </div>
            </Link>

            {/* Ops Live Status Pill */}
            <div className="px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ops Live</span>
            </div>
          </div>

          {/* Search & Command Palette Trigger */}
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="w-[calc(100%-2rem)] mx-4 my-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer transition text-slate-400 text-sm group shadow-2xs"
            title="Search pages, invoices, and fruit SKUs (Cmd+K)"
          >
            <div className="flex items-center space-x-2 text-xs text-slate-400 group-hover:text-slate-600 transition-colors truncate">
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Quick search...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded shadow-xs text-slate-500 shrink-0">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Center: Navigation Menu Links */}
        <div className="flex-1 overflow-y-auto py-2 space-y-4 min-h-0">
          {navSections.map((section) => (
            <div key={section.category} className="space-y-0.5">
              <div className="mt-5 mb-1.5 px-4 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                {section.category}
              </div>

              {section.items.map((item) => {
                const active = getIsActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 text-sm transition ${
                      active
                        ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-4 border-emerald-600 rounded-r-xl rounded-l-none pl-3 pr-4 py-2.5 mr-3'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 px-4 py-2.5 mx-3 rounded-xl'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        active ? 'text-emerald-700' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate leading-none">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom Pinned Profile & Rate Footer */}
        <div className="p-4 border-t border-slate-100 bg-white space-y-2 shrink-0">
          {/* Exchange Rate Pill */}
          <div className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center space-x-1.5 text-slate-500">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              <span>Rate:</span>
            </div>
            <span className="font-mono font-bold text-slate-900">
              1$ = {exchangeRate.toLocaleString()} ៛
            </span>
          </div>

          {/* User Profile Card */}
          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition group">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                N
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-900 leading-tight truncate">
                  Nham Nham Admin
                </span>
                <span className="text-[10px] text-slate-500 leading-tight truncate mt-0.5">
                  Operations Manager
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const s = getSettings();
                window.location.href = '/settings';
              }}
              title="Settings & Switch Account"
              className="text-slate-400 hover:text-slate-600 p-1 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Global Command Palette Spotlight Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
}
