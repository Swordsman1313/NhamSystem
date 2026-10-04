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

  const loadData = () => {
    setInvoices(getInvoices());
    setBatches(getBatches());
    setStores(getStores());
    setSettings(getSettings());
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  // Financial KPIs
  const totalReceivablesUSD = invoices
    .filter((inv) => inv.status === 'pending')
    .reduce((sum, inv) => sum + (inv.totalAmountUSD || 0), 0);

  const totalReceivablesKHR = Math.round(totalReceivablesUSD * (settings.exchangeRate || 4050));

  const totalPaidRevenueUSD = invoices
    .filter((inv) => inv.status !== 'pending')
    .reduce((sum, inv) => sum + (inv.totalAmountUSD || 0), 0);

  const totalAllRevenueUSD = invoices.reduce(
    (sum, inv) => sum + (inv.totalAmountUSD || 0),
    0
  );

  const totalUnitsDelivered = invoices.reduce(
    (sum, inv) => sum + (inv.totalQuantity || 0),
    0
  );

  const pendingInvoicesCount = invoices.filter((inv) => inv.status === 'pending').length;

  // Costing KPIs from batches
  const latestBatch = batches[0];
  const displayLandedCostUSD =
    batches.length > 0 && latestBatch?.landedUnitCostUSD
      ? latestBatch.landedUnitCostUSD.toFixed(2)
      : '0.40';
  const displayLandedCostKHR =
    batches.length > 0 && latestBatch?.landedUnitCostKHR
      ? latestBatch.landedUnitCostKHR
      : 1599;

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
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-2xl p-4 sm:px-6 sm:py-5 text-white shadow-md relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 right-24 w-48 h-48 bg-citrus-400/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 p-1 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Nham Nham Fruit Logo"
                className="w-full h-full object-contain drop-shadow-md"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full bg-citrus-400/20 text-citrus-300 border border-citrus-400/30 text-[10px] sm:text-xs font-semibold tracking-wide uppercase">
                  B2B Fresh Operations
                </span>
                <span className="text-xs text-emerald-200">Phnom Penh Distribution Hub</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
                Nham Nham Operations
              </h1>
              <p className="text-emerald-100 text-xs font-khmer hidden sm:block">
                ប្រព័ន្ធគ្រប់គ្រងការចែកចាយផ្លែឈើស្រស់កាត់ស្រេច គណនាថ្លៃដើមផលិត និងវិក្កយបត្រ
              </p>
            </div>
          </div>
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
            <span className="text-slate-500 font-medium">{pendingInvoicesCount} invoices pending</span>
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
              From settled store invoices
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
              Across 3 partner branches
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Avg ~30 boxes / delivery</span>
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
              ${displayLandedCostUSD}{' '}
              <span className="text-sm font-semibold text-slate-500 font-normal">/ box</span>
            </div>
            <div className="text-xs font-semibold text-lime-800 mt-0.5">
              Fruit + Weighted BOM + Route Fuel
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">≈ {displayLandedCostKHR.toLocaleString()} ៛ / box</span>
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
              <span>View All ({invoices.length})</span>
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
                {invoices.slice(0, 5).map((inv) => (
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
                          className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] border border-emerald-200 transition"
                          title="Mark Paid via ABA"
                        >
                          Mark Paid
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-600">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
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
                  const storeInvoices = invoices.filter(
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
