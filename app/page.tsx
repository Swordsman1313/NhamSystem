'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Receipt,
  DollarSign,
  Package,
  PlusCircle,
  Truck,
  Calculator,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  ExternalLink,
  Store as StoreIcon,
  ArrowUpRight,
  RefreshCw,
  Coins,
} from 'lucide-react';
import {
  getInvoices,
  getBatches,
  getStores,
  getSettings,
  updateInvoice,
  formatUSD,
  formatKHR,
  formatDateDisplay,
} from '@/lib/storage';
import { Invoice, BatchCostRecord, Store, AppSettings } from '@/lib/types';

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [batches, setBatches] = useState<BatchCostRecord[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [loading, setLoading] = useState(true);

  type DatePreset = 'today' | 'yesterday' | '7days' | '30days' | 'custom';
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customRange, setCustomRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const loadData = () => {
    setInvoices(getInvoices());
    setBatches(getBatches());
    setStores(getStores());
    setSettings(getSettings());
    setLoading(false);
  };

  useEffect(() => {
    document.title = 'Dashboard | Nham Nham Ops';
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  // Helper to determine the active date boundaries
  const getActiveDateRange = () => {
    const now = new Date();
    const formatYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const todayStr = formatYMD(now);

    if (datePreset === 'today') {
      return { start: todayStr, end: todayStr };
    }
    if (datePreset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatYMD(yest);
      return { start: yestStr, end: yestStr };
    }
    if (datePreset === '7days') {
      const past7 = new Date(now);
      past7.setDate(past7.getDate() - 6);
      return { start: formatYMD(past7), end: todayStr };
    }
    if (datePreset === '30days') {
      const past30 = new Date(now);
      past30.setDate(past30.getDate() - 29);
      return { start: formatYMD(past30), end: todayStr };
    }
    return { start: customRange.startDate, end: customRange.endDate };
  };

  const { start: activeStart, end: activeEnd } = getActiveDateRange();

  // Dynamic Subtitle for active timeframe
  const getSubtitle = () => {
    if (datePreset === 'today') {
      return `Operational metrics for: ${formatDateDisplay(activeStart)}`;
    }
    if (datePreset === 'yesterday') {
      return `Operational metrics for: ${formatDateDisplay(activeStart)}`;
    }
    if (datePreset === '7days') {
      return `Last 7 Days (${formatDateDisplay(activeStart)} – ${formatDateDisplay(activeEnd)})`;
    }
    if (datePreset === '30days') {
      return `Last 30 Days (${formatDateDisplay(activeStart)} – ${formatDateDisplay(activeEnd)})`;
    }
    return `Custom Range (${formatDateDisplay(activeStart)} – ${formatDateDisplay(activeEnd)})`;
  };

  // Filtered Invoices based on Active Date Range
  const filteredInvoices = invoices.filter((inv) => {
    const invDate = (inv.invoiceDate || inv.createdAt || '').split('T')[0];
    return invDate >= activeStart && invDate <= activeEnd;
  });

  // Financial KPIs calculated dynamically from filtered range
  const totalReceivablesUSD = filteredInvoices
    .filter((inv) => inv.status === 'pending')
    .reduce((sum, inv) => sum + (Number(inv.totalAmountUSD) || 0), 0);

  const totalReceivablesKHR = Math.round(totalReceivablesUSD * (settings.exchangeRate || 4050));

  const totalPaidRevenueUSD = filteredInvoices
    .filter((inv) => inv.status !== 'pending')
    .reduce((sum, inv) => sum + (Number(inv.totalAmountUSD) || 0), 0);

  const totalAllRevenueUSD = filteredInvoices.reduce(
    (sum, inv) => sum + (Number(inv.totalAmountUSD) || 0),
    0
  );

  const totalUnitsDelivered = filteredInvoices.reduce(
    (sum, inv) => sum + (Number(inv.totalQuantity) || 0),
    0
  );

  const pendingInvoicesCount = filteredInvoices.filter((inv) => inv.status === 'pending').length;
  const paidInvoicesCount = filteredInvoices.filter((inv) => inv.status !== 'pending').length;

  const periodStores = new Set(
    filteredInvoices.map((i) => i.shipTo || i.customerName || i.storeCode).filter(Boolean)
  );
  const branchesDeliveredCount = periodStores.size || (filteredInvoices.length > 0 ? 1 : 0);
  const avgBoxesPerDelivery = filteredInvoices.length > 0 ? Math.round(totalUnitsDelivered / filteredInvoices.length) : 0;

  // Dynamic Landed Cost from Batches (most recent batch run)
  const sortedBatches = [...batches].sort(
    (a, b) => new Date(b.date || b.createdAt || '').getTime() - new Date(a.date || a.createdAt || '').getTime()
  );
  const batchesInRange = sortedBatches.filter((b) => {
    const d = (b.date || b.createdAt || '').split('T')[0];
    return d >= activeStart && d <= activeEnd;
  });
  const latestBatch = batchesInRange.length > 0 ? batchesInRange[0] : sortedBatches[0];
  const landedCostUSD = latestBatch
    ? (latestBatch.landedUnitCostUSD ?? latestBatch.landedCostUSD ?? 0)
    : 0;
  const landedCostKHR = latestBatch
    ? (latestBatch.landedUnitCostKHR ?? latestBatch.landedCostKHR ?? 0)
    : 0;

  // Toggle invoice status directly from dashboard
  const handleMarkAsPaid = (inv: Invoice) => {
    const updated: Invoice = {
      ...inv,
      status: 'paid_aba',
      paidAt: new Date().toISOString(),
    };
    updateInvoice(updated);
    loadData();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      <title>Dashboard | Nham Nham Ops</title>
      {/* Header & Date Range Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            {getSubtitle()}
          </p>
        </div>

        {/* Filter Bar with Quick Preset Pills & Custom Picker */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Preset Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-medium overflow-x-auto no-scrollbar -mx-4 sm:mx-0 px-4 sm:px-1 whitespace-nowrap py-1">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7days', label: '7 Days' },
                { id: '30days', label: '30 Days' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map((pill) => {
              const isActive = datePreset === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setDatePreset(pill.id)}
                  className={
                    isActive
                      ? 'bg-emerald-600 text-white font-semibold shadow-xs transition px-3 py-1.5 rounded-lg cursor-pointer'
                      : 'text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg transition cursor-pointer'
                  }
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Inputs (when Custom is selected) */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-700">
              <input
                type="date"
                value={customRange.startDate}
                onChange={(e) =>
                  setCustomRange((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="bg-transparent border-0 text-xs font-medium focus:ring-0 p-0 text-slate-800"
              />
              <span className="text-slate-400">→</span>
              <input
                type="date"
                value={customRange.endDate}
                onChange={(e) =>
                  setCustomRange((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="bg-transparent border-0 text-xs font-medium focus:ring-0 p-0 text-slate-800"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Unpaid Receivables */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pending AR (Net 15)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatUSD(totalReceivablesUSD)}
            </div>
            <div className="text-xs font-semibold text-amber-700 mt-0.5">
              ≈ {formatKHR(totalReceivablesKHR)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              {pendingInvoicesCount} {pendingInvoicesCount === 1 ? 'invoice' : 'invoices'} pending
            </span>
            <Link
              href="/deliveries?status=pending"
              className="text-emerald-700 font-semibold hover:underline inline-flex items-center"
            >
              Track AR <ChevronRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>
        </div>

        {/* Card 2: Settled Cash/ABA Revenue */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Collected Revenue
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatUSD(totalPaidRevenueUSD)}
            </div>
            <div className="text-xs font-semibold text-emerald-700 mt-0.5">
              {paidInvoicesCount} {paidInvoicesCount === 1 ? 'settled invoice' : 'settled invoices'}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Settled Invoices</span>
            <span className="text-emerald-700 font-semibold font-mono">ABA Active</span>
          </div>
        </div>

        {/* Card 3: Units Delivered */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-teal-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Boxes Delivered
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {totalUnitsDelivered.toLocaleString()}{' '}
              <span className="text-sm font-semibold text-slate-500 font-normal">boxes</span>
            </div>
            <div className="text-xs font-semibold text-teal-700 mt-0.5">
              {branchesDeliveredCount > 0
                ? `Across ${branchesDeliveredCount} ${branchesDeliveredCount === 1 ? 'partner branch' : 'partner branches'}`
                : 'No deliveries in period'}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              Avg ~{avgBoxesPerDelivery} boxes / delivery
            </span>
            <Link
              href="/statements"
              className="text-teal-700 font-semibold hover:underline inline-flex items-center"
            >
              Reconcile <ChevronRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>
        </div>

        {/* Card 4: Landed Unit Cost BOM */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-citrus-400 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Landed Unit Cost
            </span>
            <div className="w-8 h-8 rounded-lg bg-lime-50 text-lime-700 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              ${landedCostUSD.toFixed(2)}{' '}
              <span className="text-sm font-semibold text-slate-500 font-normal">/ box</span>
            </div>
            <div className="text-xs font-semibold text-lime-800 mt-0.5">
              {latestBatch ? `Batch ${latestBatch.batchNumber} (${formatDateDisplay(latestBatch.date)})` : 'Fruit + Weighted BOM + Route Fuel'}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              ≈ {landedCostKHR.toLocaleString()} ៛ / box
            </span>
            <Link
              href="/costing"
              className="text-lime-800 font-semibold hover:underline inline-flex items-center"
            >
              Batch Costing <ChevronRight className="w-3 h-3 ml-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Invoices + Store AR Distribution & Costing Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Invoices Ledger Quickview */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Recent Invoices &amp; Delivery Notes
              </h2>
              <p className="text-xs text-slate-700 font-khmer mt-0.5">
                វិក្កយបត្រថ្មីៗ និងស្ថានភាពបង់ប្រាក់
              </p>
            </div>
            <Link
              href="/deliveries"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline flex items-center space-x-1"
            >
              <span>View All ({filteredInvoices.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Store / Destination</th>
                  <th className="py-2.5 px-3 text-center">Date</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      <div className="space-y-2">
                        <p className="italic">No delivery invoices recorded for this time window.</p>
                        <button
                          type="button"
                          onClick={() => setDatePreset('7days')}
                          className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <span>Switch to Past 7 Days</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.slice(0, 5).map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{inv.shipTo}</div>
                        <div className="text-[11px] text-slate-600">{inv.customerName}</div>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600 font-medium">
                        {formatDateDisplay(inv.invoiceDate)}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900">
                        {inv.totalQuantity}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatUSD(inv.totalAmountUSD)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {inv.status === 'pending' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 mr-1" />
                            Net 15
                          </span>
                        ) : inv.status === 'paid_aba' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Paid ABA
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Paid Cash
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {inv.status === 'pending' ? (
                          <button
                            onClick={() => handleMarkAsPaid(inv)}
                            className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] border border-emerald-200 transition cursor-pointer"
                            title="Mark Paid via ABA"
                          >
                            Mark Paid
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-600">Settled</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Store Breakdown & Quick Tools */}
        <div className="space-y-6">
          {/* Store Breakdown Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <StoreIcon className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-sm">Store Accounts</h3>
              </div>
              <Link
                href="/statements"
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                Reconcile
              </Link>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {stores
                .filter((s) => s.isActive !== false)
                .map((store) => {
                  const storeInvoices = filteredInvoices.filter(
                    (inv) => inv.storeCode === store.code || inv.shipTo === store.shipTo
                  );
                  const storePending = storeInvoices
                    .filter((inv) => inv.status === 'pending')
                    .reduce((sum, inv) => sum + (Number(inv.totalAmountUSD) || 0), 0);
                  const storeTotal = storeInvoices.reduce(
                    (sum, inv) => sum + (Number(inv.totalAmountUSD) || 0),
                    0
                  );
                  const storeDeliveredBoxes = storeInvoices.reduce(
                    (sum, inv) => sum + (Number(inv.totalQuantity) || 0),
                    0
                  );

                  return (
                    <div key={store.code} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {store.code}
                          </span>
                          <span className="text-xs font-medium text-slate-700">
                            {store.shipTo}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {storeDeliveredBoxes.toLocaleString()} boxes delivered ({storeInvoices.length} {storeInvoices.length === 1 ? 'run' : 'runs'})
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono text-xs font-bold text-slate-900">
                          {formatUSD(storeTotal)}
                        </div>
                        {storePending > 0 ? (
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block mt-0.5">
                            {formatUSD(storePending)} pending
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block mt-0.5">
                            $0.00 (All paid)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Quick BOM Shortcut Card */}
          <div className="bg-gradient-to-br from-citrus-50 via-emerald-50 to-white rounded-xl border border-citrus-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-citrus-900 uppercase tracking-wider">
                Production BOM Formula
              </span>
              <span className="px-2 py-0.5 rounded bg-citrus-200 text-citrus-900 text-[10px] font-bold">
                Batch Yield
              </span>
            </div>
            <p className="text-xs text-slate-700 mt-2 leading-relaxed">
              Wholesale Market Spend + Route Fuel + <strong>Weighted BOM Packaging</strong> = true Landed Unit Cost per fresh packed box.
            </p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Rate: 1$ = {settings.exchangeRate}៛</span>
              <Link
                href="/costing"
                className="inline-flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition"
              >
                <span>New Batch</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
