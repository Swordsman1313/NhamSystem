'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Boxes, Package, Calculator, CheckCircle2, Zap } from 'lucide-react';
import { getProducts, getPackagingItems, getSettings } from '@/lib/storage';

export default function ProductionHubNav() {
  const pathname = usePathname();
  const [productCount, setProductCount] = useState<number>(10);
  const [packagingCount, setPackagingCount] = useState<number>(14);
  const [exchangeRate, setExchangeRate] = useState<number>(4050);

  const loadCounts = () => {
    try {
      const p = getProducts();
      const pkg = getPackagingItems();
      const s = getSettings();
      setProductCount(p.length);
      setPackagingCount(pkg.length);
      setExchangeRate(s.exchangeRate || 4050);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    loadCounts();
    window.addEventListener('products_updated', loadCounts);
    window.addEventListener('packaging_updated', loadCounts);
    window.addEventListener('inventory_updated', loadCounts);
    window.addEventListener('storage', loadCounts);
    return () => {
      window.removeEventListener('products_updated', loadCounts);
      window.removeEventListener('packaging_updated', loadCounts);
      window.removeEventListener('inventory_updated', loadCounts);
      window.removeEventListener('storage', loadCounts);
    };
  }, []);

  const tabs = [
    {
      name: 'Products & BOM Recipes',
      khmer: 'ទំនិញ & រូបមន្ត BOM',
      href: '/products',
      icon: Boxes,
      badge: `${productCount} SKUs`,
      accent: 'emerald',
    },
    {
      name: 'Packaging Warehouse',
      khmer: 'ស្តុកសម្ភារៈ & ថ្លៃដើម',
      href: '/inventory',
      icon: Package,
      badge: `${packagingCount} Items`,
      accent: 'indigo',
    },
    {
      name: 'Batch Yield Costing',
      khmer: 'គណនាថ្លៃដើមផលិត',
      href: '/costing',
      icon: Calculator,
      badge: 'Live Recipe BOM',
      accent: 'amber',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 flex-1">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center space-x-2.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-citrus-300' : 'text-slate-400'
                  }`}
                />
                <div className="text-left">
                  <div className="leading-tight">{tab.name}</div>
                  <div
                    className={`text-[10px] font-normal font-khmer ${
                      isActive ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {tab.khmer}
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Live Synchronization Status Badge */}
        <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-emerald-900">
            Unified Single Source of Truth
          </span>
          <span className="text-emerald-700 font-mono text-[10px]">
            • 1$={exchangeRate.toLocaleString()}៛
          </span>
        </div>
      </div>
    </div>
  );
}
