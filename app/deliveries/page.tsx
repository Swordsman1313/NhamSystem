'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Truck,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  FileText,
  DollarSign,
  Package,
  Calendar,
  X,
  Trash2,
  ExternalLink,
  ChevronDown,
  Building2,
  ArrowUpDown,
} from 'lucide-react';
import {
  getInvoices,
  getStores,
  getSettings,
  updateInvoice,
  deleteInvoice,
  formatUSD,
  formatKHR,
  formatDateDisplay,
} from '@/lib/storage';
import { Invoice, Store, InvoiceStatus, AppSettings } from '@/lib/types';
import { rollbackInvoiceInventory } from '@/lib/inventoryStore';
import CommercialInvoice from '@/components/documents/CommercialInvoice';
import DeliveryNote from '@/components/documents/DeliveryNote';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { triggerCleanPrint } from '@/lib/print';

function DeliveriesLedgerContent() {
  const searchParams = useSearchParams();
  const initialStatusFilter = searchParams.get('status') || 'all';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getSettings());

  // Inventory rollback notification toast
  const [rollbackToast, setRollbackToast] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal Preview State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [modalDocType, setModalDocType] = useState<'invoice' | 'do'>('invoice');

  // Delete Confirm Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string;
    invNum: string;
  }>({ isOpen: false, id: '', invNum: '' });

  const refreshData = () => {
    setInvoices(getInvoices());
    setStores(getStores());
    setSettings(getSettings());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Update Status handler
  const handleStatusChange = (inv: Invoice, newStatus: InvoiceStatus) => {
    const updated: Invoice = {
      ...inv,
      status: newStatus,
      paidAt: newStatus !== 'pending' ? new Date().toISOString() : undefined,
    };
    updateInvoice(updated);
    refreshData();
  };

  // Delete invoice handler
  const handleDelete = (id: string, invNum: string) => {
    setDeleteConfirm({
      isOpen: true,
      id,
      invNum,
    });
  };

  // Filtered Invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'pending'
        ? inv.status === 'pending'
        : inv.status === statusFilter;

    const matchStore = storeFilter === 'all' || inv.storeCode === storeFilter;

    const matchSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.shipTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.storeCode.toLowerCase().includes(searchQuery.toLowerCase());

    return matchStatus && matchStore && matchSearch;
  });

  // KPI Calculations
  const totalReceivablesUSD = invoices
    .filter((inv) => inv.status === 'pending')
    .reduce((sum, inv) => sum + (inv.totalAmountUSD || 0), 0);

  const totalCollectedUSD = invoices
    .filter((inv) => inv.status !== 'pending')
    .reduce((sum, inv) => sum + (inv.totalAmountUSD || 0), 0);

  const totalUnits = invoices.reduce((sum, inv) => sum + (inv.totalQuantity || 0), 0);

  const pendingCount = invoices.filter((inv) => inv.status === 'pending').length;

  // Open Document Modal
  const openModal = (inv: Invoice, type: 'invoice' | 'do') => {
    setSelectedInvoice(inv);
    setModalDocType(type);
    setModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {/* Rollback Success Banner */}
      {rollbackToast && (
        <div className="no-print p-4 rounded-xl bg-emerald-900 text-white shadow-lg flex items-center justify-between border border-emerald-700 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 flex items-center justify-center text-emerald-300 shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-300">Inventory Stock-In Rollback Complete</div>
              <div className="text-xs sm:text-sm font-semibold">{rollbackToast}</div>
            </div>
          </div>
          <button
            onClick={() => setRollbackToast(null)}
            className="text-emerald-300 hover:text-white p-1.5 rounded-lg transition"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Delivery Ledger &amp; AR Tracker
          </h1>
          <p className="text-xs text-slate-700 font-khmer mt-0.5">
            បញ្ជីដឹកជញ្ជូន តាមដានបំណុលអតិថិជន (Net 15) និងប្រមូលប្រាក់តាម ABA
          </p>
        </div>

        <Link
          href="/deliveries/new"
          className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs transition transform active:scale-95 text-xs sm:text-sm self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Create Delivery Note</span>
        </Link>
      </div>

      {/* High-Level Metric Tiles */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Unpaid Receivables */}
        <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pending Receivables (AR)
            </div>
            <div className="text-2xl font-black text-amber-700 mt-1 font-mono">
              {formatUSD(totalReceivablesUSD)}
            </div>
            <div className="text-[11px] text-amber-800 font-medium">
              ≈ {formatKHR(Math.round(totalReceivablesUSD * settings.exchangeRate))} ({pendingCount} pending)
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Collected Revenue */}
        <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Collected / Settled
            </div>
            <div className="text-2xl font-black text-emerald-800 mt-1 font-mono">
              {formatUSD(totalCollectedUSD)}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium">
              Paid via ABA &amp; Cash
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Units Delivered */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Units Delivered
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {totalUnits.toLocaleString()}{' '}
              <span className="text-sm font-normal text-slate-500">boxes</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Across {invoices.length} delivery runs
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="no-print bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by invoice #, store, address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        {/* Store Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Store:
          </label>
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Stores (3)</option>
            {stores.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} ({s.shipTo})
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter Badges */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
          {[
            { id: 'all', label: 'All' },
            { id: 'pending', label: 'Pending Net 15' },
            { id: 'paid_aba', label: 'Paid ABA' },
            { id: 'paid_cash', label: 'Paid Cash' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Ledger Table */}
      <div className="no-print bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Store Destination</th>
                <th className="py-3 px-3 text-center">Delivery Date</th>
                <th className="py-3 px-3 text-center">Due Date (Net 15)</th>
                <th className="py-3 px-3 text-center">Units</th>
                <th className="py-3 px-4 text-right">Amount ($)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Documents</th>
                <th className="py-3 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 italic">
                    No delivery records match your current filters.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Invoice Number */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900 block text-xs">
                        {inv.invoiceNumber}
                      </span>
                      {inv.notes && (
                        <span className="text-[10px] text-slate-500 truncate block max-w-xs">
                          {inv.notes}
                        </span>
                      )}
                    </td>

                    {/* Destination Store */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{inv.shipTo}</div>
                      <div className="text-[11px] text-slate-600">{inv.customerName}</div>
                      <span className="inline-block mt-0.5 font-mono text-[9px] px-1 rounded bg-slate-100 text-slate-700">
                        {inv.storeCode}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3 text-center font-medium text-slate-700">
                      {formatDateDisplay(inv.invoiceDate)}
                    </td>

                    {/* Due Date */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-semibold ${
                          inv.status === 'pending' ? 'text-red-700' : 'text-slate-500'
                        }`}
                      >
                        {formatDateDisplay(inv.dueDate)}
                      </span>
                    </td>

                    {/* Total Quantity */}
                    <td className="py-3 px-3 text-center font-black text-slate-900 text-sm">
                      {inv.totalQuantity}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right">
                      <div className="font-mono font-black text-slate-950 text-sm">
                        {formatUSD(inv.totalAmountUSD)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {formatKHR(inv.totalAmountKHR)}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 text-center">
                      {inv.status === 'pending' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 mr-1" />
                          Net 15
                        </span>
                      ) : inv.status === 'paid_aba' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Paid ABA
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Paid Cash
                        </span>
                      )}
                    </td>

                    {/* Document Preview Buttons */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          onClick={() => openModal(inv, 'invoice')}
                          title="View / Print Commercial Invoice"
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openModal(inv, 'do')}
                          title="View / Print Delivery Note (DO)"
                          className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition"
                        >
                          <Truck className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Status Toggle / Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {inv.status === 'pending' ? (
                          <button
                            onClick={() => handleStatusChange(inv, 'paid_aba')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition"
                          >
                            Mark Paid
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(inv, 'pending')}
                            className="px-2 py-1 rounded text-[11px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                            title="Revert to Pending Net 15"
                          >
                            Revert
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(inv.id, inv.invoiceNumber)}
                          className="text-slate-400 hover:text-red-600 p-1 transition"
                          title="Delete invoice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Modal for Document Viewing & Printing */}
      {modalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
            {/* Modal Header */}
            <div className="no-print p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg text-xs font-bold">
                  <button
                    onClick={() => setModalDocType('invoice')}
                    className={`px-3 py-1.5 rounded-md transition ${
                      modalDocType === 'invoice'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Commercial Invoice
                  </button>
                  <button
                    onClick={() => setModalDocType('do')}
                    className={`px-3 py-1.5 rounded-md transition ${
                      modalDocType === 'do'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Delivery Note (DO)
                  </button>
                </div>
                <span className="font-mono text-xs font-bold text-slate-700">
                  {selectedInvoice.invoiceNumber}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => triggerCleanPrint()}
                  className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-black text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Render Area */}
            <div className="p-4 sm:p-6 bg-slate-100 flex-1 overflow-x-auto printable-document">
              {modalDocType === 'invoice' ? (
                <CommercialInvoice
                  invoice={selectedInvoice}
                  supplier={settings.supplierProfile}
                  exchangeRate={settings.exchangeRate}
                />
              ) : (
                <DeliveryNote
                  invoice={selectedInvoice}
                  supplier={settings.supplierProfile}
                />
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modern UI Confirm Modal for Invoice Deletion with Automatic Stock Rollback */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Delivery Invoice?"
        khmerTitle="លុបវិក្កយបត្រដឹកជញ្ជូន និងបញ្ចូលសម្ភារៈវេចខ្ចប់ត្រឡប់មកស្តុកវិញ"
        badgeText={deleteConfirm.invNum}
        message="Are you sure you want to permanently delete this delivery invoice? All deducted packaging items (boxes, skewers, stickers) will be automatically returned to inventory stock."
        confirmText="Delete & Rollback Stock"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          const inv = invoices.find((i) => i.id === deleteConfirm.id);
          let toastMsg = `Invoice ${deleteConfirm.invNum} deleted.`;
          if (inv?.deductedItems && inv.deductedItems.length > 0) {
            const rollbackResult = rollbackInvoiceInventory(inv.deductedItems);
            toastMsg = `Invoice deleted: ${rollbackResult.summary} returned to stock.`;
          } else {
            toastMsg = `Invoice ${deleteConfirm.invNum} deleted.`;
          }
          deleteInvoice(deleteConfirm.id);
          refreshData();
          setDeleteConfirm({ isOpen: false, id: '', invNum: '' });
          setRollbackToast(toastMsg);
          setTimeout(() => setRollbackToast(null), 7000);
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: '', invNum: '' })}
      />
    </div>
  );
}

export default function DeliveriesLedgerPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-500 font-medium">
          Loading delivery ledger...
        </div>
      }
    >
      <DeliveriesLedgerContent />
    </Suspense>
  );
}
