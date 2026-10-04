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
} from 'lucide-react';
import { getSettings } from '@/lib/storage';

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(4050);

  useEffect(() => {
    const updateRate = () => {
      const s = getSettings();
      setExchangeRate(s.exchangeRate || 4050);
    };
    updateRate();
    window.addEventListener('storage', updateRate);
    return () => window.removeEventListener('storage', updateRate);
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
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* ======================================================== */}
      {/* 1. DESKTOP FIXED LEFT SIDEBAR (>= md)                    */}
      {/* ======================================================== */}
      <aside className="no-print hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-40 md:w-64 lg:w-72 bg-white border-r border-slate-200/90 shadow-xs flex-col justify-between overflow-y-auto">
        {/* Top Brand Header */}
        <div className="p-5 border-b border-slate-100">
          <Link href="/" className="flex items-center space-x-3 group">
            {/* Transparent Brand Fruit Logo */}
            <div className="w-14 h-14 shrink-0 flex items-center justify-center p-1 rounded-2xl bg-amber-50/50 border border-amber-200/60 shadow-xs group-hover:scale-105 transition-transform duration-200">
              <img
                src="/logo.png"
                alt="Nham Nham Fruit Logo"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-slate-900 text-lg tracking-tight truncate">
                  Nham Nham
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                  OPS
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-khmer mt-0.5 truncate">
                ប្រព័ន្ធគ្រប់គ្រងផ្លែឈើស្រស់ B2B
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Categorized Navigation Menu Items */}
        <div className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
          {navSections.map((section, sIdx) => (
            <div key={section.title} className="space-y-1">
              <div className="px-3 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <span>{section.title}</span>
                <span className="font-khmer font-normal text-slate-400 text-[9px]">{section.khmerTitle}</span>
              </div>

              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      active
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                        : item.highlight
                        ? 'bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                          active
                            ? 'text-white'
                            : item.highlight
                            ? 'text-emerald-700'
                            : 'text-slate-500'
                        }`}
                      />
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="truncate leading-tight">{item.name}</span>
                          {item.badge && !active && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-khmer font-normal truncate mt-0.5 ${
                            active
                              ? 'text-emerald-100'
                              : 'text-slate-400 group-hover:text-slate-600'
                          }`}
                        >
                          {item.khmer}
                        </span>
                      </div>
                    </div>

                    {active && (
                      <ChevronRight className="w-3.5 h-3.5 text-white/80 shrink-0 ml-1" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom Footer: Exchange Rate & System Status */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 space-y-3">
          {/* Exchange Rate Badge */}
          <Link
            href="/settings"
            title="Click to change exchange rate in Settings"
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50/40 transition text-xs font-semibold"
          >
            <div className="flex items-center space-x-2">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>Exchange Rate:</span>
            </div>
            <span className="font-mono font-bold text-slate-900">
              1$ = {exchangeRate.toLocaleString()} ៛
            </span>
          </Link>

          {/* Status Indicator */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-slate-600">Ops Online</span>
            </span>
            <span className="font-mono text-[10px]">v1.2</span>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MOBILE TOP BAR (< md)                                 */}
      {/* ======================================================== */}
      <div className="no-print md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2.5">
          <div className="w-9 h-9 p-0.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Nham Nham"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center space-x-1">
            <span className="font-black text-slate-900 text-base">Nham Nham</span>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-emerald-100 text-emerald-800">
              OPS
            </span>
          </div>
        </Link>

        <div className="flex items-center space-x-2">
          <Link
            href="/settings"
            className="flex items-center space-x-1 text-xs px-2 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold"
          >
            <Coins className="w-3 h-3 text-amber-500" />
            <span>{exchangeRate.toLocaleString()}៛</span>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-hidden"
            aria-label="Toggle navigation drawer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

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


          </div>
        </div>
      )}
    </>
  );
}
