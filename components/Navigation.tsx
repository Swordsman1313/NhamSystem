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
  ChevronRight,
  ShieldCheck,
  Cloud,
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
    khmer: string;
    subtitle?: string;
    href: string;
    icon: any;
    highlight?: boolean;
    badge?: string;
  }

  interface NavSection {
    title: string;
    khmerTitle: string;
    items: NavItem[];
  }

  const navSections: NavSection[] = [
    {
      title: 'Sales & Invoicing',
      khmerTitle: 'ការលក់ & វិក្កយបត្រ',
      items: [
        {
          name: 'Overview',
          khmer: 'ទិដ្ឋភាពទូទៅ',
          href: '/',
          icon: LayoutDashboard,
        },
        {
          name: 'New Invoice / DO',
          khmer: 'បង្កើតវិក្កយបត្រថ្មី',
          href: '/deliveries/new',
          icon: PlusCircle,
          highlight: true,
        },
        {
          name: 'Deliveries & AR',
          khmer: 'បញ្ជីដឹកជញ្ជូន & បំណុល',
          href: '/deliveries',
          icon: Truck,
        },
        {
          name: 'Statements',
          khmer: 'របាយការណ៍បូកសរុប',
          href: '/statements',
          icon: FileSpreadsheet,
        },
      ],
    },
    {
      title: 'Production & Inventory (Linked)',
      khmerTitle: 'ផលិតកម្ម & ស្តុកសម្ភារៈ',
      items: [
        {
          name: 'Products & BOM',
          khmer: 'ទំនិញ & រូបមន្ត BOM',
          subtitle: 'Fruit recipes & packaging links',
          href: '/products',
          icon: Boxes,
          badge: 'Recipe',
        },
        {
          name: 'Packaging Warehouse',
          khmer: 'ស្តុកសម្ភារៈ & ថ្លៃដើម',
          subtitle: 'Stock levels & material costs',
          href: '/inventory',
          icon: Package,
          badge: 'Stock',
        },
        {
          name: 'Batch Yield Costing',
          khmer: 'គណនាថ្លៃដើម BOM',
          subtitle: 'Daily yield & packaging BOM',
          href: '/costing',
          icon: Calculator,
          badge: 'Costing',
        },
      ],
    },
    {
      title: 'System',
      khmerTitle: 'ប្រព័ន្ធ',
      items: [
        {
          name: 'Settings',
          khmer: 'ការកំណត់',
          href: '/settings',
          icon: SettingsIcon,
        },
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
    if (pathname === '/') return 'Overview';
    if (pathname.startsWith('/deliveries/new')) return 'New Invoice / DO';
    if (pathname.startsWith('/deliveries')) return 'Deliveries & AR';
    if (pathname.startsWith('/statements')) return 'Statements';
    if (pathname.startsWith('/products')) return 'Products & BOM';
    if (pathname.startsWith('/inventory')) return 'Warehouse';
    if (pathname.startsWith('/costing')) return 'Batch Costing';
    if (pathname.startsWith('/settings')) return 'Settings';
    return 'Nham Nham Ops';
  };

  const mobileTabs = [
    { name: 'Overview', href: '/', icon: LayoutDashboard },
    { name: 'New DO', href: '/deliveries/new', icon: PlusCircle, isAction: true },
    { name: 'Warehouse', href: '/inventory', icon: Package },
    { name: 'Costing', href: '/costing', icon: Calculator },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

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
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Toggle navigation drawer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. FIXED MOBILE BOTTOM TAB BAR (< md)                    */}
      {/* ======================================================== */}
      <nav className="no-print fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-50 flex justify-around py-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden shadow-lg">
        {mobileTabs.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 min-w-[44px] min-h-[44px] py-1 flex flex-col items-center justify-center space-y-0.5 transition active:scale-95 touch-manipulation ${
                active
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition ${
                  tab.isAction
                    ? active
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-100 text-emerald-800'
                    : active
                    ? 'bg-emerald-50 text-emerald-700'
                    : ''
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] tracking-tight truncate leading-none">
                {tab.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ======================================================== */}
      {/* 3. MOBILE SLIDE-OVER DRAWER (< md)                       */}
      {/* ======================================================== */}
      {mobileMenuOpen && (
        <div className="no-print md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Container */}
          <div className="relative w-72 max-w-full bg-white flex flex-col justify-between z-10 shadow-2xl p-5 overflow-y-auto">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 p-0.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <img
                    src="/logo.png"
                    alt="Nham Nham"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <span className="font-extrabold text-slate-900 text-base block">
                    Nham Nham Ops
                  </span>
                  <span className="text-[10px] text-slate-500 font-khmer">
                    ប្រព័ន្ធគ្រប់គ្រងផ្លែឈើស្រស់
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Navigation List */}
            <div className="flex-1 py-3 space-y-4 overflow-y-auto">
              {navSections.map((section) => (
                <div key={section.title} className="space-y-1">
                  <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </div>
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                          active
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-500'}`} />
                          <span>{item.name}</span>
                        </div>
                        <span
                          className={`text-[10px] font-khmer ${
                            active ? 'text-emerald-100' : 'text-slate-500'
                          }`}
                        >
                          {item.khmer}
                        </span>
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
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
              >
                <div className="flex items-center space-x-2">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span>Exchange Rate:</span>
                </div>
                <span className="font-mono font-bold text-slate-900">
                  1$ = {exchangeRate.toLocaleString()} ៛
                </span>
              </Link>
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                    Cloud Sync
                  </span>
                </span>
                <span className="font-mono text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                  Live
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
