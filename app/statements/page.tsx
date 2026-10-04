'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Building2,
  DollarSign,
  Package,
  Clock,
  CheckCircle2,
  Filter,
  Eye,
  Store as StoreIcon,
} from 'lucide-react';
import {
  getStores,
  getInvoices,
  getSettings,
  formatUSD,
  formatKHR,
  formatDateDisplay,
} from '@/lib/storage';
import { Store, Invoice, AppSettings } from '@/lib/types';
import SummaryStatement from '@/components/documents/SummaryStatement';
import { triggerCleanPrint } from '@/lib/print';

export default function StatementsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getSettings());

  // Filter States
  const [selectedStoreCode, setSelectedStoreCode] = useState<string>('ON-TK592');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10'); // YYYY-MM
  const [activeView, setActiveView] = useState<'statement' | 'table'>('statement');

  useEffect(() => {
    setStores(getStores());
    setInvoices(getInvoices());
    setSettings(getSettings());
  }, []);

  // Selected Store Object
  const currentStore =
    stores.find((s) => s.code === selectedStoreCode) ||
    stores[0] || {
      code: 'ON-TK592',
      customerName: 'Angkor Prototype LTD.',
      shipTo: 'ON Mart St.592 TK',
      address: '#ដីឡូត៍លេខ១ ផ្លូវ ៥៩២ កែងបណ្តោយ ៦ សង្កាត់បឹងកក់ទី២ ខណ្ឌទួលគោក ភ្នំពេញ',
      phone: '099 423 599',
      creditTermsDays: 15,
    };

  // Filter invoices for store and month
  const matchingInvoices = invoices.filter((inv) => {
    const matchStore = inv.storeCode === selectedStoreCode;
    const matchMonth = !selectedMonth || inv.invoiceDate.startsWith(selectedMonth);
    return matchStore && matchMonth;
  });

  // Period Label
  const periodDate = selectedMonth ? new Date(`${selectedMonth}-01`) : new Date();
  const periodLabel = periodDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Metrics
  const totalUSD = matchingInvoices.reduce((sum, inv) => sum + (inv.totalAmountUSD || 0), 0);
  const totalBoxes = matchingInvoices.reduce((sum, inv) => sum + (inv.totalQuantity || 0), 0);
  const pendingUSD = matchingInvoices
    .filter((inv) => inv.status === 'pending')
    .reduce((sum, inv) => sum + (inv.totalAmountUSD || 0), 0);
  const settledUSD = matchingInvoices
    .filter((inv) => inv.status !== 'pending')
    .reduce((sum, inv) => sum + (inv.totalAmountUSD || 0), 0);

  const handlePrint = () => {
    triggerCleanPrint();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {/* Top Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Store Monthly Summary Statements
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold uppercase">
              Reconciliation
            </span>
          </div>
          <p className="text-xs text-slate-700 font-khmer mt-0.5">
            របាយការណ៍បូកសរុបការដឹកជញ្ជូនប្រចាំខែតាមសាខានីមួយៗ សម្រាប់ទូទាត់ប្រាក់ (Billing Reconciliation)
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-black text-white font-bold px-4 py-2.5 rounded-xl shadow-xs transition transform active:scale-95 text-xs sm:text-sm self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>Print Summary Statement (A4)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="no-print bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Store Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Client Store / សាខា
            </label>
            <select
              value={selectedStoreCode}
              onChange={(e) => setSelectedStoreCode(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              {stores.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} - {s.shipTo} ({s.customerName})
                </option>
              ))}
            </select>
          </div>

          {/* Month Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Billing Month / សម្រាប់ខែ
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Quick Month Metrics Pill */}
        <div className="flex items-center space-x-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Orders</span>
            <span className="font-bold text-slate-900">{matchingInvoices.length} invoices</span>
          </div>
          <div className="pl-4 border-l border-slate-200">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Qty</span>
            <span className="font-bold text-slate-900">{totalBoxes} boxes</span>
          </div>
          <div className="pl-4 border-l border-slate-200">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Bill</span>
            <span className="font-mono font-black text-emerald-800">{formatUSD(totalUSD)}</span>
          </div>
        </div>
      </div>

      {/* Main Single-Page A4 Statement Document */}
      <div className="printable-document">
        <SummaryStatement
          store={currentStore}
          invoices={matchingInvoices}
          supplier={settings.supplierProfile}
          periodLabel={periodLabel}
          exchangeRate={settings.exchangeRate}
        />
      </div>
    </div>
  );
}
