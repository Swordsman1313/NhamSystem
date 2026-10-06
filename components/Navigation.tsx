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

  const getPageTitle = () => {
    if (pathname === '/') return 'Dashboard';
    if (pathname.startsWith('/deliveries/new')) return 'New Invoice';
    if (pathname.startsWith('/deliveries')) return 'Deliveries & AR';
    if (pathname.startsWith('/statements')) return 'Statements';
    if (pathname.startsWith('/products')) return 'Products & BOM';
    if (pathname.startsWith('/inventory')) return 'Warehouse';
    if (pathname.startsWith('/costing')) return 'Batch Costing';
    if (pathname.startsWith('/settings')) return 'Settings';
    return 'Dashboard';
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
      <div className="no-print md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5 min-w-0">
          <Link href="/" className="shrink-0">
            <div className="w-8 h-8 p-0.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Nham Nham"
                className="w-full h-full object-contain"
              />
            </div>
          </Link>
          <div className="min-w-0">
            <h1 className="font-extrabold text-slate-900 text-sm leading-tight truncate">
              {getPageTitle()}
            </h1>
          </div>
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
        <div className="no-print md:hidden fixed inset-0 z-50 flex justify-start">
          {/* Backdrop with Smooth Fade Animation */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Container with Smooth Slide-in-from-left Animation */}
          <div className="relative w-72 max-w-[85vw] bg-white flex flex-col justify-between z-10 shadow-2xl p-4 overflow-y-auto animate-in slide-in-from-left fade-in duration-250 ease-out">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2.5 group"
              >
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
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Navigation List */}
            <div className="flex-1 py-3 space-y-4 overflow-y-auto">
              {navSections.map((section) => (
                <div key={section.category} className="space-y-0.5">
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    {section.category}
                  </div>
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 text-sm font-medium transition ${
                          active
                            ? 'bg-emerald-50 text-emerald-800 font-semibold border-l-4 border-emerald-600 pl-3 pr-4 py-2.5 rounded-r-xl rounded-l-none'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 px-4 py-2.5 rounded-xl'
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

            {/* Drawer Footer */}
            <div className="pt-3 border-t border-slate-100 space-y-2 shrink-0">
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs text-slate-600 hover:bg-slate-100 transition"
              >
                <div className="flex items-center space-x-1.5 text-slate-500">
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span>Rate:</span>
                </div>
                <span className="font-mono font-bold text-slate-900">
                  1$ = {exchangeRate.toLocaleString()} ៛
                </span>
              </Link>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/60 border border-slate-100">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                    N
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                      Nham Nham Admin
                    </p>
                    <p className="text-[10px] text-slate-400 truncate leading-tight">
                      admin@nhamnham.biz
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
