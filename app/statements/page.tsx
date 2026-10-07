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

// Normalizes various date representations ('06-Oct-2026', '2026-10-06', '06/10/2026', etc.) to 'YYYY-MM'
function extractYearMonth(dateStr?: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  // 1. Matches YYYY-MM-DD or YYYY-MM
  if (/^\d{4}-\d{2}/.test(clean)) {
    return clean.slice(0, 7);
  }
  // 2. Matches DD-MMM-YYYY or DD/MMM/YYYY (e.g. 06-Oct-2026, 6-Oct-2026, 06-OCT-2026)
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const parts = clean.split(/[-/\s]+/);
  if (parts.length >= 3) {
    const m1 = parts[1].toLowerCase().slice(0, 3);
    if (monthMap[m1]) {
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${year}-${monthMap[m1]}`;
    }
    const m0 = parts[0].toLowerCase().slice(0, 3);
    if (monthMap[m0]) {
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${year}-${monthMap[m0]}`;
    }
    // If DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{1,2}$/.test(parts[0]) && /^\d{1,2}$/.test(parts[1]) && /^\d{4}$/.test(parts[2])) {
      const month = parts[1].padStart(2, '0');
      return `${parts[2]}-${month}`;
    }
  }
  // 3. Fallback Native Date parser
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }
  return '';
}

// Extracts both yearMonth ('YYYY-MM') and day (1-31)
function parseInvoiceDayAndMonth(dateStr?: string): { yearMonth: string; day: number } | null {
  if (!dateStr) return null;
  const clean = dateStr.trim();

  // 1. Matches YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return {
      yearMonth: `${isoMatch[1]}-${isoMatch[2]}`,
      day: parseInt(isoMatch[3], 10),
    };
  }

  // 2. Matches DD-MMM-YYYY or DD/MMM/YYYY
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const parts = clean.split(/[-/\s]+/);
  if (parts.length >= 3) {
    const m1 = parts[1].toLowerCase().slice(0, 3);
    if (monthMap[m1]) {
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      const month = monthMap[m1];
      const day = parseInt(parts[0], 10);
      return { yearMonth: `${year}-${month}`, day };
    }
    const m0 = parts[0].toLowerCase().slice(0, 3);
    if (monthMap[m0]) {
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      const month = monthMap[m0];
      const day = parseInt(parts[1], 10);
      return { yearMonth: `${year}-${month}`, day };
    }
    // DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{1,2}$/.test(parts[0]) && /^\d{1,2}$/.test(parts[1]) && /^\d{4}$/.test(parts[2])) {
      const year = parts[2];
      const month = parts[1].padStart(2, '0');
      const day = parseInt(parts[0], 10);
      return { yearMonth: `${year}-${month}`, day };
    }
  }

  return null;
}

// Normalizes store codes (e.g. 'OU3', 'ON-OU3', 'ON_OU3' -> 'OU3')
function normalizeStoreKey(code?: string): string {
  if (!code) return '';
  return code
    .trim()
    .toUpperCase()
    .replace(/^ON[-_\s]?/, '')
    .replace(/[^A-Z0-9]/g, '');
}

function isStoreMatch(invStoreCode?: string, selectedCode?: string, storeObj?: Store): boolean {
  if (!invStoreCode) return false;
  const invTrim = invStoreCode.trim().toUpperCase();
  const selTrim = (selectedCode || '').trim().toUpperCase();
  if (invTrim === selTrim) return true;

  const normInv = normalizeStoreKey(invStoreCode);
  const normSel = normalizeStoreKey(selectedCode);
  if (normInv && normSel && normInv === normSel) return true;

  if (storeObj) {
    if (storeObj.code && normalizeStoreKey(storeObj.code) === normInv) return true;
    if (storeObj.id && normalizeStoreKey(storeObj.id) === normInv) return true;
    if (storeObj.shipTo && normalizeStoreKey(storeObj.shipTo).includes(normInv)) return true;
  }
  return false;
}

export type BillingCycle = '1-15' | '16-end' | 'full';

export default function StatementsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getSettings());

  // Filter States
  const [selectedStoreCode, setSelectedStoreCode] = useState<string>('ON-TK592');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10'); // YYYY-MM
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('1-15'); // '1-15', '16-end', or 'full'

  useEffect(() => {
    const loadedStores = getStores();
    setStores(loadedStores);
    setInvoices(getInvoices());
    setSettings(getSettings());
    if (loadedStores.length > 0 && !loadedStores.some((s) => s.code === 'ON-TK592')) {
      setSelectedStoreCode(loadedStores[0].code);
    }
  }, []);

  // Selected Store Object
  const currentStore =
    stores.find(
      (s) =>
        s.code === selectedStoreCode ||
        normalizeStoreKey(s.code) === normalizeStoreKey(selectedStoreCode)
    ) ||
    stores[0] || {
      code: selectedStoreCode || 'ON-TK592',
      customerName: 'Angkor Prototype LTD.',
      shipTo: 'ON Mart St.592 TK',
      address: '#ដីឡូត៍លេខ១ ផ្លូវ ៥៩២ កែងបណ្តោយ ៦ សង្កាត់បឹងកក់ទី២ ខណ្ឌទួលគោក ភ្នំពេញ',
      phone: '099 423 599',
      creditTermsDays: 15,
    };

  // Calculate days in the selected month (e.g. 31, 30, 28/29)
  const [yearStr, monthStr] = (selectedMonth || '2026-10').split('-');
  const yearNum = parseInt(yearStr, 10) || new Date().getFullYear();
  const monthNum = parseInt(monthStr, 10) || (new Date().getMonth() + 1);
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

  const monthDate = new Date(yearNum, monthNum - 1, 1);
  const monthName = monthDate.toLocaleDateString('en-US', {
    month: 'long',
  });

  // Filter invoices for store, month, and bi-monthly billing cycle (1-15, 16-30/31, or full month)
  const matchingInvoices = invoices.filter((inv) => {
    const matchStore = isStoreMatch(inv.storeCode, selectedStoreCode, currentStore);
    if (!matchStore) return false;

    const parsed = parseInvoiceDayAndMonth(inv.invoiceDate || inv.createdAt || '');
    if (!parsed) {
      const invoiceYM = extractYearMonth(inv.invoiceDate || inv.createdAt || '');
      return !selectedMonth || invoiceYM === selectedMonth;
    }

    const matchMonth = !selectedMonth || parsed.yearMonth === selectedMonth;
    if (!matchMonth) return false;

    if (billingCycle === '1-15') {
      return !isNaN(parsed.day) ? parsed.day >= 1 && parsed.day <= 15 : true;
    }
    if (billingCycle === '16-end') {
      return !isNaN(parsed.day) ? parsed.day >= 16 && parsed.day <= daysInMonth : true;
    }
    return true; // 'full'
  });

  // Period Label formatted cleanly for both screen display and A4 Statement print
  let periodLabel = `${monthName} ${yearNum}`;
  if (billingCycle === '1-15') {
    periodLabel = `01–15 ${monthName} ${yearNum}`;
  } else if (billingCycle === '16-end') {
    periodLabel = `16–${daysInMonth} ${monthName} ${yearNum}`;
  } else {
    periodLabel = `01–${daysInMonth} ${monthName} ${yearNum}`;
  }

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
          className="hidden sm:inline-flex items-center space-x-2 bg-slate-900 hover:bg-black text-white font-bold px-4 py-2.5 rounded-xl shadow-xs transition transform active:scale-95 text-xs sm:text-sm self-start sm:self-auto cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print Summary Statement (A4)</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="no-print bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full xl:w-auto min-w-0 max-w-full">
          {/* Store Selector */}
          <div className="w-full sm:w-72 min-w-0 max-w-full">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Client Store / សាខា
            </label>
            <select
              value={selectedStoreCode}
              onChange={(e) => setSelectedStoreCode(e.target.value)}
              className="w-full max-w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden truncate cursor-pointer"
            >
              {stores.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} - {s.shipTo} ({s.customerName})
                </option>
              ))}
            </select>
          </div>

          {/* Month Selector */}
          <div className="w-full sm:w-auto shrink-0">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Billing Month / សម្រាប់ខែ
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* Bi-Monthly Cycle Selector (1-15th, 16-30/31st, Full Month) */}
          <div className="w-full sm:w-auto min-w-0">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Billing Cycle / វដ្តទូទាត់</span>
              <span className="text-[10px] text-emerald-700 font-semibold lowercase">
                {billingCycle === '1-15'
                  ? 'days 1–15'
                  : billingCycle === '16-end'
                  ? `days 16–${daysInMonth}`
                  : 'entire month'}
              </span>
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setBillingCycle('1-15')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                  billingCycle === '1-15'
                    ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span>1 – 15th</span>
                <span className="text-[9px] font-khmer opacity-75 hidden sm:inline">ថ្ងៃទី ១–១៥</span>
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle('16-end')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                  billingCycle === '16-end'
                    ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span>16 – {daysInMonth}th</span>
                <span className="text-[9px] font-khmer opacity-75 hidden sm:inline">ថ្ងៃទី ១៦–{daysInMonth}</span>
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle('full')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                  billingCycle === 'full'
                    ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80 font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span>Full Month</span>
                <span className="text-[9px] font-khmer opacity-75 hidden sm:inline">ពេញមួយខែ</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Month Metrics Pill (Desktop only - mobile uses dedicated Statement Card below) */}
        <div className="hidden xl:flex items-center space-x-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs shrink-0">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Orders</span>
            <span className="font-bold text-slate-900">
              {matchingInvoices.length} {matchingInvoices.length === 1 ? 'invoice' : 'invoices'}
            </span>
          </div>
          <div className="pl-4 border-l border-slate-200">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Qty</span>
            <span className="font-bold text-slate-900">{totalBoxes.toLocaleString()} boxes</span>
          </div>
          <div className="pl-4 border-l border-slate-200">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Bill</span>
            <span className="font-mono font-black text-emerald-800">{formatUSD(totalUSD)}</span>
          </div>
        </div>
      </div>

      {/* Mobile Concise Statement Summary Card (< sm) */}
      <div className="block sm:hidden no-print space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
          {/* Store & Period Header */}
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold font-mono">
                {currentStore.code}
              </span>
              <span className="text-xs font-bold text-slate-500 font-mono">
                {periodLabel}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1.5 leading-tight">
              {currentStore.shipTo || currentStore.customerName}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {currentStore.customerName}
            </p>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Orders</span>
              <span className="text-base font-black text-slate-800">
                {matchingInvoices.length} {matchingInvoices.length === 1 ? 'invoice' : 'invoices'}
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Boxes</span>
              <span className="text-base font-black text-slate-800">{totalBoxes.toLocaleString()} boxes</span>
            </div>
            <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 col-span-2">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Total Bill (USD)</span>
                  <span className="text-xl font-black text-emerald-900 font-mono">{formatUSD(totalUSD)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">In Khmer Riel</span>
                  <span className="text-xs font-bold text-slate-700 font-mono">
                    {formatKHR(totalUSD * (settings.exchangeRate || 4050))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Settled vs Pending breakdown */}
          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <div className="flex items-center space-x-1.5 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Settled: <strong className="font-mono">{formatUSD(settledUSD)}</strong></span>
            </div>
            <div className="flex items-center space-x-1.5 text-amber-700">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Pending: <strong className="font-mono">{formatUSD(pendingUSD)}</strong></span>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handlePrint}
            className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition active:scale-98 text-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Export A4 Statement</span>
          </button>
        </div>

        {/* Concise Invoices Mini-List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Included {matchingInvoices.length === 1 ? 'Invoice' : 'Invoices'} ({matchingInvoices.length})
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Sorted by date</span>
          </div>

          {matchingInvoices.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              No matching deliveries found for {currentStore.code} in {periodLabel}.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {matchingInvoices.map((inv) => (
                <div key={inv.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800 font-mono">{inv.invoiceNumber}</div>
                    <div className="text-[11px] text-slate-500">
                      {formatDateDisplay(inv.invoiceDate)} • {inv.totalQuantity} boxes
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold font-mono text-slate-900">{formatUSD(inv.totalAmountUSD)}</div>
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        inv.status !== 'pending'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {inv.status !== 'pending' ? 'Settled' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Single-Page A4 Statement Document (hidden on mobile screen to prevent oversized QR overflow; visible on sm+ screens and in print) */}
      <div className="printable-document hidden sm:block print:block">
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
