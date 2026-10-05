'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Truck,
  Printer,
  Save,
  RotateCcw,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle,
  Eye,
  ArrowLeft,
  Store as StoreIcon,
  DollarSign,
  Package,
  Layers,
  AlertTriangle,
  Boxes,
  Tag,
  X,
  ChevronDown,
} from 'lucide-react';
import {
  getProducts,
  getStores,
  addStore,
  getSettings,
  addInvoice,
  generateNextInvoiceNumber,
  calculateDueDate,
  getTodayDateString,
  formatUSD,
  formatKHR,
} from '@/lib/storage';
import { Product, Store, InvoiceLineItem, Invoice, AppSettings } from '@/lib/types';
import {
  checkStockAvailability,
  deductForInvoice,
  calculateRequiredPackaging,
} from '@/lib/inventoryStore';
import CommercialInvoice from '@/components/documents/CommercialInvoice';
import DeliveryNote from '@/components/documents/DeliveryNote';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { triggerCleanPrint } from '@/lib/print';

function StoreSelect({
  value,
  onChange,
  stores,
}: {
  value: string;
  onChange: (val: string) => void;
  stores: Store[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const currentStore = stores.find((s) => s.code === value) || stores[0];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-white border border-slate-300 hover:border-emerald-500 rounded-xl transition shadow-2xs text-left focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer group"
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
            <StoreIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                {currentStore?.code}
              </span>
              <span className="font-bold text-xs text-slate-900 truncate">
                {currentStore?.shipTo}
              </span>
            </div>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-emerald-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 space-y-1 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          {stores
            .filter((s) => s.isActive !== false || s.code === value)
            .map((s) => {
              const isSelected = s.code === value;
              return (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => {
                    onChange(s.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-950 font-bold shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-bold text-[10px] text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {s.code}
                      </span>
                      <span className="font-bold text-xs truncate">{s.shipTo}</span>
                      {s.isActive === false && (
                        <span className="text-[9px] text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                          Archived
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center justify-between">
                      <span>{s.customerName}</span>
                      <span className="font-mono text-[10px] text-slate-400">Net {s.termsDays || s.creditTermsDays || 15}d</span>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}

export default function NewDeliveryPage() {
  const router = useRouter();

  // Master Data
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getSettings());

  // Quick New Store Modal State
  const [newStoreModalOpen, setNewStoreModalOpen] = useState(false);
  const [newStoreCode, setNewStoreCode] = useState('');
  const [newStoreShipTo, setNewStoreShipTo] = useState('');
  const [newStoreCustomerName, setNewStoreCustomerName] = useState('');
  const [newStoreAddress, setNewStoreAddress] = useState('');
  const [newStorePhone, setNewStorePhone] = useState('');
  const [newStoreTermsDays, setNewStoreTermsDays] = useState(15);

  // Alert Modal State
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: '', message: '' });

  // Stock Shortfall Confirm Modal State
  const [stockWarningModal, setStockWarningModal] = useState<{
    isOpen: boolean;
    warnings: string[];
  }>({ isOpen: false, warnings: [] });

  // Form State
  const [selectedStoreCode, setSelectedStoreCode] = useState<string>('ON-TK592');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(getTodayDateString());
  const [dueDate, setDueDate] = useState<string>(calculateDueDate(getTodayDateString(), 15));
  const [creditTermsDays, setCreditTermsDays] = useState<number>(15);
  const [notes, setNotes] = useState<string>('');

  // Items State (Pre-populated with 10 fruit SKUs + custom items)
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);

  // Preview Mode: 'edit' | 'preview_invoice' | 'preview_do'
  const [activeTab, setActiveTab] = useState<'edit' | 'preview_invoice' | 'preview_do'>('edit');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleQuickCreateStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreCode.trim() || !newStoreShipTo.trim() || !newStoreCustomerName.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Missing Required Fields',
        message: 'Please provide Store Code, Destination (Ship To), and Legal Entity (Bill To).',
      });
      return;
    }

    const created = addStore({
      code: newStoreCode.trim().toUpperCase(),
      shipTo: newStoreShipTo.trim(),
      customerName: newStoreCustomerName.trim(),
      address: newStoreAddress.trim(),
      phone: newStorePhone.trim(),
      termsDays: Math.max(0, Number(newStoreTermsDays)),
      creditTermsDays: Math.max(0, Number(newStoreTermsDays)),
      isActive: true,
    });

    const refreshedStores = getStores();
    setStores(refreshedStores);
    setSelectedStoreCode(created.code);
    const terms = created.termsDays || 15;
    setCreditTermsDays(terms);
    setDueDate(calculateDueDate(invoiceDate, terms));

    setNewStoreModalOpen(false);
    setNewStoreCode('');
    setNewStoreShipTo('');
    setNewStoreCustomerName('');
    setNewStoreAddress('');
    setNewStorePhone('');
    setNewStoreTermsDays(15);

    setToastMessage(`Created and selected store "${created.code} - ${created.shipTo}"`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Initialize on mount
  useEffect(() => {
    const loadedStores = getStores();
    const loadedProducts = getProducts();
    const loadedSettings = getSettings();

    setStores(loadedStores);
    setProducts(loadedProducts);
    setSettings(loadedSettings);

    const initialNumber = generateNextInvoiceNumber(invoiceDate);
    setInvoiceNumber(initialNumber);

    // Prepopulate all 10 fruit SKUs with 0 quantity initially
    const initialItems: InvoiceLineItem[] = loadedProducts.map((p) => ({
      id: `sku-${p.barcode}`,
      barcode: p.barcode,
      name: p.name,
      khmerName: p.khmerName,
      uom: p.uom,
      quantity: 0,
      unitPrice: p.wholesalePrice,
      isCustom: false,
    }));

    setLineItems(initialItems);
  }, []);

  // Update due date when invoice date or terms change
  const handleDateChange = (newDate: string) => {
    setInvoiceDate(newDate);
    setDueDate(calculateDueDate(newDate, creditTermsDays));
    setInvoiceNumber(generateNextInvoiceNumber(newDate));
  };

  const handleTermsChange = (days: number) => {
    setCreditTermsDays(days);
    setDueDate(calculateDueDate(invoiceDate, days));
  };

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

  // Line item handlers
  const updateQuantity = (id: string, qty: number) => {
    const cleanQty = Math.max(0, isNaN(qty) ? 0 : qty);
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: cleanQty } : item))
    );
  };

  const updatePrice = (id: string, price: number) => {
    const cleanPrice = Math.max(0, isNaN(price) ? 0 : price);
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unitPrice: cleanPrice } : item))
    );
  };

  // Quick actions
  const handleQuickFillMOQ = () => {
    setLineItems((prev) =>
      prev.map((item) => (!item.isCustom ? { ...item, quantity: 3 } : item))
    );
  };

  const handleClearQuantities = () => {
    setLineItems((prev) =>
      prev.map((item) => (!item.isCustom ? { ...item, quantity: 0 } : item))
    );
  };

  const handleAddCustomItem = () => {
    const customId = `custom-${Date.now()}`;
    const newItem: InvoiceLineItem = {
      id: customId,
      barcode: `CUSTOM-${String(lineItems.filter((i) => i.isCustom).length + 1).padStart(2, '0')}`,
      name: 'Insulated Cooler Box',
      khmerName: 'កេសស្ងោររក្សាសីតុណ្ហភាព',
      uom: 'Pcs',
      quantity: 1,
      unitPrice: 5.0,
      isCustom: true,
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleRemoveCustomItem = (id: string) => {
    setLineItems(lineItems.filter((i) => i.id !== id));
  };

  // Totals
  const activeItems = lineItems.filter((item) => Number(item.quantity) > 0);
  const totalQuantity = activeItems.reduce((acc, it) => acc + Number(it.quantity), 0);
  const totalAmountUSD = activeItems.reduce(
    (acc, it) => acc + Number(it.quantity) * Number(it.unitPrice),
    0
  );
  const totalAmountKHR = Math.round(totalAmountUSD * (settings.exchangeRate || 4050));

  // Construct current invoice object
  const currentInvoiceData: Invoice = {
    id: `inv-${Date.now()}`,
    invoiceNumber: invoiceNumber || 'INV-2610-001',
    storeCode: currentStore.code,
    customerName: currentStore.customerName,
    shipTo: currentStore.shipTo,
    address: currentStore.address,
    phone: currentStore.phone,
    invoiceDate,
    dueDate,
    items: lineItems,
    totalQuantity,
    totalAmountUSD,
    totalAmountKHR,
    status: 'pending',
    createdAt: new Date().toISOString(),
    notes,
  };

  // Packaging stock check
  const stockCheck = checkStockAvailability(lineItems);

  // Commit save with automated stock deduction
  const commitSaveInvoice = () => {
    const deductedItems = deductForInvoice(lineItems);
    const invoiceToSave: Invoice = {
      ...currentInvoiceData,
      status: 'pending',
      deductedItems,
    };
    addInvoice(invoiceToSave);
    setSavedSuccess(true);
    setToastMessage(`Invoice ${invoiceToSave.invoiceNumber} saved to ledger and packaging stock deducted.`);
    setTimeout(() => {
      router.push('/deliveries');
    }, 1500);
  };

  // Save to persistent storage with packaging stock pre-flight check
  const handleSaveInvoice = () => {
    if (totalQuantity === 0) {
      setAlertModal({
        isOpen: true,
        title: 'No Fruit Boxes Selected',
        message: 'Please enter a quantity for at least one fruit SKU or custom item before saving this invoice.',
      });
      return;
    }

    if (!stockCheck.available) {
      setStockWarningModal({
        isOpen: true,
        warnings: stockCheck.warnings,
      });
      return;
    }

    commitSaveInvoice();
  };

  // Direct print
  const handlePrint = () => {
    triggerCleanPrint();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <Link
            href="/deliveries"
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Create Invoice &amp; Delivery Note
            </h1>
          </div>
        </div>

        {/* View Switcher Tabs & Print Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-200/80 p-1 rounded-xl flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'edit'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Order Form
            </button>
            <button
              onClick={() => {
                if (totalQuantity > 0) setActiveTab('preview_invoice');
              }}
              disabled={totalQuantity === 0}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'preview_invoice'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : totalQuantity > 0
                  ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/60 cursor-pointer'
                  : 'text-slate-400 cursor-not-allowed opacity-60'
              }`}
              title={totalQuantity === 0 ? 'Enter item quantities or Quick-Fill MOQ first' : 'View Commercial Invoice'}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Commercial Invoice</span>
            </button>
            <button
              onClick={() => {
                if (totalQuantity > 0) setActiveTab('preview_do');
              }}
              disabled={totalQuantity === 0}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'preview_do'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : totalQuantity > 0
                  ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/60 cursor-pointer'
                  : 'text-slate-400 cursor-not-allowed opacity-60'
              }`}
              title={totalQuantity === 0 ? 'Enter item quantities or Quick-Fill MOQ first' : 'View Delivery Note'}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Delivery Note (DO)</span>
            </button>
          </div>

          {activeTab !== 'edit' && (
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4 Document</span>
            </button>
          )}

          <button
            onClick={handleSaveInvoice}
            disabled={totalQuantity === 0}
            className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
              totalQuantity > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            {savedSuccess ? (
              <>
                <CheckCircle className="w-4 h-4 text-white" />
                <span>Saved &amp; Redirecting...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save to Ledger</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Floating Success Toast Notification */}
      {toastMessage && (
        <div className="no-print p-4 rounded-2xl bg-emerald-950 text-white shadow-2xl flex items-center justify-between border border-emerald-700 animate-in fade-in slide-in-from-top-3 duration-200 z-50 fixed top-6 right-6 max-w-md">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-800 flex items-center justify-center text-emerald-300 shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Ledger Updated &amp; Stock-Out
              </div>
              <div className="text-sm font-semibold">{toastMessage}</div>
            </div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-400 hover:text-white p-1.5 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content: Edit Form OR Printable A4 Document Preview */}
      {activeTab === 'edit' ? (
        <div className="space-y-6">
          {/* Top Form Controls: Store, Date, Auto-Numbering, Terms */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Store Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Destination Store / សាខាទទួល
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewStoreModalOpen(true)}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-emerald-600" />
                    <span>+ New Store</span>
                  </button>
                </div>
                <StoreSelect
                  value={selectedStoreCode}
                  onChange={(newCode) => {
                    setSelectedStoreCode(newCode);
                    const selected = stores.find((s) => s.code === newCode);
                    if (selected) {
                      const terms = selected.termsDays || selected.creditTermsDays || 15;
                      setCreditTermsDays(terms);
                      setDueDate(calculateDueDate(invoiceDate, terms));
                    }
                  }}
                  stores={stores}
                />
                <div className="mt-1.5 text-[11px] text-slate-600 flex items-center justify-between">
                  <span className="font-semibold truncate max-w-[180px]">{currentStore.customerName}</span>
                  <span className="font-mono text-slate-500">Terms: Net {currentStore.termsDays || currentStore.creditTermsDays || 15}d</span>
                </div>
              </div>

              {/* Invoice Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Invoice Number / លេខវិក្កយបត្រ
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Invoice Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Delivery Date / កាលបរិច្ឆេទ
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Payment Terms & Due Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Terms / ថ្ងៃផុតកំណត់ (Net {creditTermsDays})
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Readonly Destination Summary Strip */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
              <div className="flex items-center space-x-2">
                <StoreIcon className="w-3.5 h-3.5 text-emerald-700" />
                <span className="font-semibold text-slate-800">{currentStore.shipTo}:</span>
                <span className="font-khmer text-slate-700">{currentStore.address}</span>
              </div>
              <div>
                Tel: <strong className="text-slate-800">{currentStore.phone}</strong>
              </div>
            </div>
          </div>

          {/* Line Items Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Master Fruit Catalog (10 SKUs) &amp; Custom Add-ons
                </h2>
              </div>

              {/* Quick Fill Actions */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleQuickFillMOQ}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold text-xs border border-emerald-300 transition"
                  title="Fills 3 boxes for each standard fruit SKU"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Quick-Fill MOQ (3 per SKU)</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearQuantities}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold text-xs transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear (0)</span>
                </button>

                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold text-xs border border-amber-300 transition shadow-2xs"
                >
                  <Plus className="w-4 h-4 mr-1 text-amber-700" />
                  <span>Add Custom Item</span>
                </button>
              </div>
            </div>

            {/* Desktop Items Table (md: and above) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">#</th>
                    <th className="py-2.5 px-3 w-32">Barcode</th>
                    <th className="py-2.5 px-4">Item Name / Khmer Description</th>
                    <th className="py-2.5 px-3 text-center w-16">UOM</th>
                    <th className="py-2.5 px-4 text-center w-40">Order QTY</th>
                    <th className="py-2.5 px-3 text-right w-24">Wholesale ($)</th>
                    <th className="py-2.5 px-4 text-right w-28">Subtotal ($)</th>
                    <th className="py-2.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineItems.map((item, index) => {
                    const lineTotal = Number(item.quantity) * Number(item.unitPrice);
                    const isNonZero = Number(item.quantity) > 0;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isNonZero ? 'bg-emerald-50/40' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-medium">
                          {index + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-medium text-[11px] text-slate-600">
                          {item.barcode}
                        </td>
                        <td className="py-2 px-4">
                          {item.isCustom ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) =>
                                  setLineItems((prev) =>
                                    prev.map((i) =>
                                      i.id === item.id ? { ...i, name: e.target.value } : i
                                    )
                                  )
                                }
                                placeholder="Custom item name"
                                className="w-full text-xs font-bold border border-slate-300 rounded px-2 py-1 text-slate-900"
                              />
                              <input
                                type="text"
                                value={item.khmerName}
                                onChange={(e) =>
                                  setLineItems((prev) =>
                                    prev.map((i) =>
                                      i.id === item.id ? { ...i, khmerName: e.target.value } : i
                                    )
                                  )
                                }
                                placeholder="ឈ្មោះជាភាសាខ្មែរ"
                                className="w-full text-xs font-khmer border border-slate-300 rounded px-2 py-1 text-slate-700"
                              />
                            </div>
                          ) : (
                            <div>
                              <div className="font-bold text-slate-900 text-sm">
                                {item.name}
                              </div>
                              <div className="text-[11px] text-emerald-800 font-khmer">
                                {item.khmerName}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-600 font-medium">
                          {item.uom}
                        </td>

                        {/* Interactive Quantity Stepper + Input */}
                        <td className="py-2 px-4">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, Number(item.quantity) - 1)}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition active:scale-95"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={item.quantity === 0 ? '' : item.quantity}
                              placeholder="0"
                              onChange={(e) =>
                                updateQuantity(item.id, parseInt(e.target.value, 10) || 0)
                              }
                              className={`w-16 text-center font-bold text-sm py-1 rounded-lg border focus:ring-2 focus:ring-emerald-500 focus:outline-hidden ${
                                isNonZero
                                  ? 'border-emerald-500 bg-white text-slate-900 font-black shadow-xs'
                                  : 'border-slate-200 bg-slate-50 text-slate-400'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, Number(item.quantity) + 1)}
                              className="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold flex items-center justify-center transition active:scale-95"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Wholesale Price ($) */}
                        <td className="py-2 px-3 text-right">
                          {item.isCustom ? (
                            <div className="flex items-center justify-end space-x-1">
                              <span className="text-slate-400 font-mono">$</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  updatePrice(item.id, parseFloat(e.target.value) || 0)
                                }
                                className="w-16 text-right font-mono font-medium text-xs border border-slate-200 rounded px-1.5 py-1 focus:bg-white focus:ring-1 focus:ring-emerald-500 text-slate-800"
                              />
                            </div>
                          ) : (
                            <div className="font-mono font-bold text-slate-800 text-xs pr-1">
                              ${Number(item.unitPrice).toFixed(2)}
                            </div>
                          )}
                        </td>

                        {/* Calculated Subtotal */}
                        <td className="py-2 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                          ${lineTotal.toFixed(2)}
                        </td>

                        {/* Delete action for custom items */}
                        <td className="py-2 px-2 text-center">
                          {item.isCustom && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomItem(item.id)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Delete custom line item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Touch-Friendly Card List (< md) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {lineItems.map((item, index) => {
                const lineTotal = Number(item.quantity) * Number(item.unitPrice);
                const isNonZero = Number(item.quantity) > 0;

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                      isNonZero ? 'bg-emerald-50/50' : 'bg-white'
                    }`}
                  >
                    {/* Left: Fruit name, Khmer subtitle, and unit price */}
                    <div className="min-w-0 flex-1">
                      {item.isCustom ? (
                        <div className="space-y-1.5 mb-1.5">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) =>
                              setLineItems((prev) =>
                                prev.map((i) =>
                                  i.id === item.id ? { ...i, name: e.target.value } : i
                                )
                              )
                            }
                            placeholder="Custom item name"
                            className="w-full text-xs font-bold border border-slate-300 rounded px-2 py-1 text-slate-900 bg-white"
                          />
                          <input
                            type="text"
                            value={item.khmerName}
                            onChange={(e) =>
                              setLineItems((prev) =>
                                prev.map((i) =>
                                  i.id === item.id ? { ...i, khmerName: e.target.value } : i
                                )
                              )
                            }
                            placeholder="ឈ្មោះជាភាសាខ្មែរ"
                            className="w-full text-xs font-khmer border border-slate-300 rounded px-2 py-1 text-slate-700 bg-white"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="font-bold text-slate-900 text-sm leading-snug">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-emerald-800 font-khmer">
                            {item.khmerName}
                          </div>
                        </div>
                      )}
                      <div className="mt-1 flex items-center space-x-2 text-xs">
                        <span className="font-mono font-bold text-slate-800">
                          ${Number(item.unitPrice).toFixed(2)}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500 font-medium">{item.uom}</span>
                        {isNonZero && (
                          <>
                            <span className="text-slate-400">•</span>
                            <span className="font-mono font-bold text-emerald-800">
                              Subtotal: ${lineTotal.toFixed(2)}
                            </span>
                          </>
                        )}
                        {item.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomItem(item.id)}
                            className="text-red-500 hover:text-red-700 text-[11px] font-bold underline ml-1"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Right: Stepper component with minimum 44×44px touch targets */}
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, Number(item.quantity) - 1)}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-xl flex items-center justify-center transition active:scale-95 touch-manipulation"
                        aria-label={`Decrease ${item.name}`}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={item.quantity === 0 ? '' : item.quantity}
                        placeholder="0"
                        onChange={(e) =>
                          updateQuantity(item.id, parseInt(e.target.value, 10) || 0)
                        }
                        className={`w-12 h-11 text-center font-bold text-base rounded-xl border focus:ring-2 focus:ring-emerald-500 focus:outline-hidden touch-manipulation ${
                          isNonZero
                            ? 'border-emerald-500 bg-white text-slate-900 font-black shadow-xs'
                            : 'border-slate-200 bg-slate-50 text-slate-400'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, Number(item.quantity) + 1)}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 text-emerald-900 font-bold text-xl flex items-center justify-center transition active:scale-95 touch-manipulation"
                        aria-label={`Increase ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals Summary Footer (Desktop only: hidden md:flex to avoid double stacking on mobile) */}
            <div className="hidden md:flex p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-3 text-sm">
                  <span className="text-slate-600 font-medium">Included SKUs:</span>
                  <span className="font-bold text-slate-900">
                    {activeItems.length} items with non-zero qty
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-6 text-right">
                <div>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
                    Total Quantity
                  </span>
                  <span className="text-xl font-black text-slate-900">
                    {totalQuantity} <span className="text-xs font-normal text-slate-500">boxes</span>
                  </span>
                </div>

                <div className="pl-6 border-l border-slate-200">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
                    Total Amount
                  </span>
                  <div className="text-2xl font-black text-emerald-800 font-mono">
                    {formatUSD(totalAmountUSD)}
                  </div>
                  <div className="text-xs font-semibold text-emerald-700">
                    ≈ {formatKHR(totalAmountKHR)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Packaging BOM Requirements & Real-Time Stock Status */}
          {activeItems.filter((i) => !i.isCustom).length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Packaging BOM Deduction &amp; Stock Availability
                    </h3>
                    <p className="text-[11px] text-slate-500 font-khmer">
                      សម្ភារៈវេចខ្ចប់ដែលត្រូវកាត់ចេញពីស្តុកដោយស្វ័យប្រវត្តិនឹងពិនិត្យស្តុកជាក់ស្តែង
                    </p>
                  </div>
                </div>

                {stockCheck.available ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    All Packaging In Stock
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
                    Insufficient Packaging Stock ({stockCheck.warnings.length})
                  </span>
                )}
              </div>

              {/* Warning Notice if short */}
              {!stockCheck.available && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-amber-900 flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Warning: Fruit quantity entered exceeds available packaging on-hand:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-800 font-medium pl-1">
                    {stockCheck.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                  <div className="text-[11px] text-amber-700 pt-1">
                    If you proceed to save, packaging items will be deducted down to 0 on-hand.
                  </div>
                </div>
              )}

              {/* Grid of packaging items needed */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {stockCheck.required.map((req) => {
                  const isShort = req.onHand < req.needed;
                  return (
                    <div
                      key={req.itemId}
                      className={`p-3 rounded-xl border text-xs transition-colors ${
                        isShort
                          ? 'bg-amber-50/60 border-amber-300 text-amber-950'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between font-medium">
                        <span className="truncate max-w-[170px] font-semibold text-slate-900" title={req.name}>
                          {req.name}
                        </span>
                        {isShort ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                            Short {req.needed - req.onHand}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            OK
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Needs: <strong className="text-slate-900">{req.needed} pcs</strong></span>
                        <span className="text-slate-500">On-Hand: <strong className={isShort ? 'text-amber-800' : 'text-slate-700'}>{req.onHand} pcs</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Delivery Instructions / Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Morning 8:00 AM delivery to front chiller; received by Linda"
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Mobile Sticky Summary Footer (above mobile navigation bar) */}
          <div className="md:hidden sticky bottom-[60px] md:bottom-0 bg-white/95 backdrop-blur-md border border-slate-200 p-3.5 rounded-2xl shadow-xl z-30 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block leading-tight">
                Total: {totalQuantity} boxes
              </span>
              <div className="font-mono font-black text-slate-900 text-lg leading-tight">
                {formatUSD(totalAmountUSD)}
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold leading-tight">
                ≈ {formatKHR(totalAmountKHR)}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveInvoice}
              disabled={totalQuantity === 0}
              className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5 touch-manipulation ${
                totalQuantity > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              {savedSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save to Ledger</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : activeTab === 'preview_invoice' ? (
        /* Single-Page A4 Commercial Invoice Preview */
        <div className="space-y-4">
          <div className="no-print p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-emerald-700" />
              <span>
                <strong>A4 Single-Page Invoice Preview:</strong> Fits cleanly on standard A4 paper.
                Zero-quantity items are hidden automatically.
              </span>
            </div>
            <button
              onClick={handlePrint}
              className="bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-800 flex items-center space-x-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Now</span>
            </button>
          </div>

          <div className="printable-document">
            <CommercialInvoice
              invoice={currentInvoiceData}
              supplier={settings.supplierProfile}
              exchangeRate={settings.exchangeRate}
            />
          </div>
        </div>
      ) : (
        /* Single-Page A4 Delivery Note (DO) Preview */
        <div className="space-y-4">
          <div className="no-print p-3 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-900 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Truck className="w-4 h-4 text-brand-700" />
              <span>
                <strong>A4 Single-Page Delivery Note (DO) Preview:</strong> Contains store address,
                verified receiving quantities, and dual signature slots (without prices).
              </span>
            </div>
            <button
              onClick={handlePrint}
              className="bg-brand-700 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-brand-800 flex items-center space-x-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print DO</span>
            </button>
          </div>

          <div className="printable-document">
            <DeliveryNote
              invoice={currentInvoiceData}
              supplier={settings.supplierProfile}
            />
          </div>
        </div>
      )}

      {/* Modern UI Alert Modal */}
      <ConfirmModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="Got it"
        variant="warning"
        isAlertOnly={true}
        onConfirm={() => setAlertModal({ isOpen: false, title: '', message: '' })}
        onCancel={() => setAlertModal({ isOpen: false, title: '', message: '' })}
      />

      {/* Quick New Store Modal */}
      {newStoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <StoreIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Add New Client / Destination Store
                  </h3>
                  <p className="text-xs text-slate-500 font-khmer">
                    បង្កើតសាខា ឬអតិថិជនថ្មីភ្លាមៗសម្រាប់វិក្កយបត្រនេះ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewStoreModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateStore} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Store Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ON-OU3, AEON-1"
                    value={newStoreCode}
                    onChange={(e) => setNewStoreCode(e.target.value.toUpperCase())}
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Branch / Ship To *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ON Mart OU 3"
                    value={newStoreShipTo}
                    onChange={(e) => setNewStoreShipTo(e.target.value)}
                    className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Legal Entity / Bill To *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Heng Kimchy Investment"
                  value={newStoreCustomerName}
                  onChange={(e) => setNewStoreCustomerName(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Delivery Address
                </label>
                <textarea
                  rows={2}
                  placeholder="ផ្លូវ ភូមិ៥ សង្កាត់៤ ក្រុងព្រះសីហនុ..."
                  value={newStoreAddress}
                  onChange={(e) => setNewStoreAddress(e.target.value)}
                  className="w-full text-xs font-khmer border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Telephone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 096 67 69 536"
                    value={newStorePhone}
                    onChange={(e) => setNewStorePhone(e.target.value)}
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Terms (Days) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={newStoreTermsDays}
                    onChange={(e) => setNewStoreTermsDays(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewStoreModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition transform active:scale-95"
                >
                  Create &amp; Select Store
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Packaging Stock Shortfall Warning Modal */}
      <ConfirmModal
        isOpen={stockWarningModal.isOpen}
        title="Insufficient Packaging Stock"
        khmerTitle="ស្តុកសម្ភារៈវេចខ្ចប់មិនគ្រប់គ្រាន់"
        message={`The entered quantities exceed available on-hand packaging:\n\n• ${stockWarningModal.warnings.join('\n• ')}\n\nDo you want to proceed and save this invoice anyway? Packaging stock on-hand will be deducted down to 0.`}
        confirmText="Proceed & Save Anyway"
        cancelText="Review Quantities"
        variant="warning"
        onConfirm={() => {
          setStockWarningModal({ isOpen: false, warnings: [] });
          commitSaveInvoice();
        }}
        onCancel={() => setStockWarningModal({ isOpen: false, warnings: [] })}
      />
    </div>
  );
}
