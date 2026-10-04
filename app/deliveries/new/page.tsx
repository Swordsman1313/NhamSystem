'use client';

import React, { useState, useEffect } from 'react';
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
  Calendar,
  DollarSign,
  Package,
  Layers,
  AlertTriangle,
  Boxes,
  Tag,
} from 'lucide-react';
import {
  getProducts,
  getStores,
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

export default function NewDeliveryPage() {
  const router = useRouter();

  // Master Data
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getSettings());

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
      deductedItems,
    };
    addInvoice(invoiceToSave);
    setSavedSuccess(true);
    setTimeout(() => {
      router.push('/deliveries');
    }, 1200);
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
            <p className="text-xs text-slate-700 font-khmer mt-0.5">
              បង្កើតវិក្កយបត្រពាណិជ្ជកម្ម និងប័ណ្ណដឹកជញ្ជូនទំនិញស្រស់ (DO)
            </p>
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
              onClick={() => setActiveTab('preview_invoice')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'preview_invoice'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Commercial Invoice</span>
            </button>
            <button
              onClick={() => setActiveTab('preview_do')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'preview_do'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
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
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
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

      {/* Main Content: Edit Form OR Printable A4 Document Preview */}
      {activeTab === 'edit' ? (
        <div className="space-y-6">
          {/* Top Form Controls: Store, Date, Auto-Numbering, Terms */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Store Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Destination Store / សាខាទទួល
                </label>
                <select
                  value={selectedStoreCode}
                  onChange={(e) => setSelectedStoreCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  {stores.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.shipTo}
                    </option>
                  ))}
                </select>
                <div className="mt-1.5 text-[11px] text-slate-600">
                  <span className="font-semibold">{currentStore.customerName}</span>
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
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Auto-formatted: INV-YYMM-XXX
                </span>
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
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Defaults to current date
                </span>
              </div>

              {/* Payment Terms & Due Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Terms / ថ្ងៃផុតកំណត់ (Net 15)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <span className="text-[10px] text-emerald-800 font-medium mt-1 block">
                  Auto: {invoiceDate} + {creditTermsDays} days
                </span>
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
                <p className="text-xs text-slate-700 font-khmer mt-0.5">
                  បញ្ជាក់ចំនួនប្រអប់ផ្លែឈើសម្រាប់ដឹកជញ្ជូន (ចំនួន 0 នឹងមិនបង្ហាញលើឯកសារបោះពុម្ព)
                </p>
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
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 font-bold text-xs border border-amber-300 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Custom Item</span>
                </button>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
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

                        {/* Editable Unit Price */}
                        <td className="py-2 px-3 text-right">
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

            {/* Totals Summary Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-3 text-sm">
                  <span className="text-slate-600 font-medium">Included SKUs:</span>
                  <span className="font-bold text-slate-900">
                    {activeItems.length} items with non-zero qty
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Rate used: 1 USD = {settings.exchangeRate.toLocaleString()} KHR
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
