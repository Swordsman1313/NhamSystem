'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  Truck,
  Calculator,
  FileSpreadsheet,
  Settings as SettingsIcon,
  Menu,
  X,
  Coins,
  Package,
  Boxes,
} from 'lucide-react';
import { getSettings } from '@/lib/storage';
import { initCloudSync } from '@/lib/cloudSync';
import Sidebar from './Sidebar';

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(4050);

  useEffect(() => {
    // Initialize Cloud Sync across devices
    initCloudSync();

    const updateRate = () => {
      const s = getSettings();
      setExchangeRate(s.exchangeRate || 4050);
    };
    updateRate();

    const handleSettingsUpdated = (e: any) => {
      if (e.detail?.exchangeRate) {
        setExchangeRate(Number(e.detail.exchangeRate));
      } else {
        updateRate();
      }
    };

    window.addEventListener('settings_updated', handleSettingsUpdated);
    window.addEventListener('storage', updateRate);
    return () => {
      window.removeEventListener('settings_updated', handleSettingsUpdated);
      window.removeEventListener('storage', updateRate);
    };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open to prevent background scrolling
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  interface NavItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }

  interface NavSection {
    category: string;
    items: NavItem[];
  }

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

  const isActive = (href: string) => {
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

  return (
    <>
      {/* ======================================================== */}
      {/* 1. DESKTOP FIXED LEFT SIDEBAR (>= md)                    */}
      {/* ======================================================== */}
      <Sidebar />

      {/* ======================================================== */}
      {/* 2. MINIMAL MOBILE STICKY TOP BAR (< md)                  */}
      {/* ======================================================== */}
      <div className="no-print md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5 min-w-0">
          <Link href="/" className="shrink-0 flex items-center space-x-2.5 group">
            <div className="w-8 h-8 p-0.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <img
                src="/logo.png"
                alt="Nham Nham Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-slate-900 text-sm leading-tight truncate block">
                Nham Nham OPS
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <Link
            href="/settings"
            className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-mono font-semibold"
          >
            <Coins className="w-3 h-3 text-amber-500" />
            <span>1$ = {exchangeRate.toLocaleString()} ៛</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer transition"
            aria-label="Toggle navigation drawer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. MOBILE SLIDE-OVER DRAWER (< md)                       */}
      {/* ======================================================== */}
      {mobileMenuOpen && (
        <div className="no-print md:hidden">
          {/* Backdrop with Full Viewport Overlay (Isolates Background Header) */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Sliding Drawer Panel */}
          <aside
            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left fade-in duration-250 ease-out will-change-transform"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 group"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/70 p-1 flex items-center justify-center shadow-2xs shrink-0">
                  <img
                    src="/logo.png"
                    alt="Nham Nham Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 leading-tight">
                    Nham Nham OPS
                  </h2>
                  <p className="text-[11px] text-slate-400">Fresh Fruit System</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Navigation Links */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
              {navSections.map((section) => (
                <div key={section.category}>
                  <p className="px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">
                    {section.category}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const active = isActive(item.href);
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                            active
                              ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-4 border-emerald-600'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-700' : 'text-slate-400'}`} />
                          <span className="truncate">{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Pinned Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3 shrink-0">
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition"
              >
                <div className="flex items-center space-x-1.5 text-slate-500">
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span>Rate:</span>
                </div>
                <span className="font-semibold text-slate-800">
                  1$ = {exchangeRate.toLocaleString()} ៛
                </span>
              </Link>
              <div className="flex items-center gap-2.5 px-2">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  N
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                    Nham Nham Admin
                  </p>
                  <p className="text-[10px] text-slate-400 truncate leading-tight">
                    admin@nhamnham.biz
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
