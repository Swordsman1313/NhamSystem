'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  PlusCircle,
  Truck,
  FileSpreadsheet,
  Package,
  Boxes,
  Calculator,
  Settings,
  Receipt,
  CornerDownLeft,
  X,
  Sparkles,
} from 'lucide-react';
import { getInvoices, getProducts } from '@/lib/storage';
import { Invoice, Product } from '@/lib/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Navigation' | 'Invoices' | 'Products';
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load data when opened
  useEffect(() => {
    if (isOpen) {
      setInvoices(getInvoices());
      setProducts(getProducts());
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Global shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open via custom event or parent prop
          const event = new CustomEvent('open_command_palette');
          window.dispatchEvent(event);
        }
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Base navigation pages
  const navItems: PaletteItem[] = useMemo(
    () => [
      {
        id: 'nav-overview',
        title: 'Dashboard / Overview',
        subtitle: 'Live operational metrics & delivery ledger',
        category: 'Navigation',
        href: '/',
        icon: LayoutDashboard,
      },
      {
        id: 'nav-new-invoice',
        title: 'New Invoice / Delivery Order (DO)',
        subtitle: 'Create delivery invoice with auto-calculations',
        category: 'Navigation',
        href: '/deliveries/new',
        icon: PlusCircle,
        badge: 'Action',
      },
      {
        id: 'nav-deliveries',
        title: 'Deliveries & Accounts Receivable (AR)',
        subtitle: 'Pending client balances & payment reconciliation',
        category: 'Navigation',
        href: '/deliveries',
        icon: Truck,
      },
      {
        id: 'nav-statements',
        title: 'Store Monthly Summary Statements',
        subtitle: 'Monthly billing summaries & payment receipts',
        category: 'Navigation',
        href: '/statements',
        icon: FileSpreadsheet,
      },
      {
        id: 'nav-inventory',
        title: 'Packaging Warehouse Stock',
        subtitle: 'Tub boxes, stickers, skewers, and material costs',
        category: 'Navigation',
        href: '/inventory',
        icon: Package,
      },
      {
        id: 'nav-products',
        title: 'Products & Recipe BOM Catalog',
        subtitle: 'Fresh fruit SKUs, wholesale pricing & recipes',
        category: 'Navigation',
        href: '/products',
        icon: Boxes,
      },
      {
        id: 'nav-costing',
        title: 'Batch Costing & Yield Engine',
        subtitle: 'Lump-sum market spend, landed cost & daily P&L',
        category: 'Navigation',
        href: '/costing',
        icon: Calculator,
      },
      {
        id: 'nav-settings',
        title: 'System Settings & Exchange Rate',
        subtitle: 'KHR / USD exchange rate, ABA banking & stores',
        category: 'Navigation',
        href: '/settings',
        icon: Settings,
      },
    ],
    []
  );

  // Filtered results
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return navItems;
    }

    const matchedNav = navItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
    );

    const matchedInvoices: PaletteItem[] = invoices
      .filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
          (inv.shipTo && inv.shipTo.toLowerCase().includes(q)) ||
          (inv.storeCode && inv.storeCode.toLowerCase().includes(q))
      )
      .slice(0, 5)
      .map((inv) => ({
        id: `inv-${inv.id}`,
        title: `${inv.invoiceNumber} — ${inv.shipTo || inv.customerName || inv.storeCode}`,
        subtitle: `${inv.totalQuantity} boxes • $${inv.totalAmountUSD.toFixed(2)} • ${inv.status === 'pending' ? 'Pending' : 'Paid'}`,
        category: 'Invoices',
        href: '/deliveries',
        icon: Receipt,
        badge: inv.status === 'pending' ? 'Pending' : 'Paid',
      }));

    const matchedProducts: PaletteItem[] = products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.khmerName && p.khmerName.toLowerCase().includes(q)) ||
          p.barcode.includes(q)
      )
      .slice(0, 5)
      .map((p) => ({
        id: `prod-${p.barcode}`,
        title: `${p.name} (${p.khmerName})`,
        subtitle: `Barcode: ${p.barcode} • Wholesale: $${p.wholesalePrice.toFixed(2)}`,
        category: 'Products',
        href: '/products',
        icon: Boxes,
        badge: `$${p.wholesalePrice.toFixed(2)}`,
      }));

    return [...matchedNav, ...matchedInvoices, ...matchedProducts];
  }, [query, navItems, invoices, products]);

  // Keep selected index in bound
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  const handleSelect = (item: PaletteItem) => {
    onClose();
    router.push(item.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filteredItems.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-start justify-center pt-[12vh] sm:pt-[15vh] px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[70vh] sm:max-h-[600px] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Input */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, invoices, fruit SKUs..."
            className="w-full text-sm bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100 font-medium"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 divide-y divide-slate-50 dark:divide-slate-800/40">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <span>No results found for &ldquo;{query}&rdquo;</span>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-xs transition-colors duration-100 ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 ml-3">
                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md font-semibold ${
                          isSelected
                            ? 'bg-emerald-200/70 dark:bg-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 hidden sm:block" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Keyboard Hints */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
          <div className="flex items-center space-x-3">
            <span>
              <kbd className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 shadow-2xs">
                ↑
              </kbd>{' '}
              <kbd className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 shadow-2xs">
                ↓
              </kbd>{' '}
              navigate
            </span>
            <span>
              <kbd className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 shadow-2xs">
                ↵
              </kbd>{' '}
              select
            </span>
          </div>
          <span>
            <kbd className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 shadow-2xs">
              esc
            </kbd>{' '}
            close
          </span>
        </div>
      </div>
    </div>
  );
}
