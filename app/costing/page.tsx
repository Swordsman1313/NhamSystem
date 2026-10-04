'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calculator,
  Coins,
  Fuel,
  Sparkles,
  TrendingUp,
  Percent,
  DollarSign,
  Package,
  Save,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Scale,
  Receipt,
  ExternalLink,
  Eye,
  Check,
} from 'lucide-react';
import {
  getProducts,
  getSettings,
  getBatches,
  addBatch,
  deleteBatch,
  generateNextBatchNumber,
  getTodayDateString,
  formatUSD,
  formatKHR,
  formatDateDisplay,
  getPackagingItems,
  getInvoices,
  saveInvoices,
  getCostingDraft,
  saveCostingDraft,
  clearCostingDraft,
} from '@/lib/storage';
import { Product, AppSettings, BatchCostRecord, BatchYieldItem, PackagingItem, Invoice, CostingDraft } from '@/lib/types';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function BatchCostingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [packagingItems, setPackagingItems] = useState<PackagingItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [batches, setBatches] = useState<BatchCostRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Toggle for dynamic recipe BOM vs manual override
  const [useDynamicBOM, setUseDynamicBOM] = useState<boolean>(true);
  const [manualBOMOverrideKHR, setManualBOMOverrideKHR] = useState<number>(872);

  // Modal Dialog States (replacing browser native alert & confirm)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string;
    num: string;
  }>({ isOpen: false, id: '', num: '' });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: '', message: '' });

  // Batch Form State
  const [batchDate, setBatchDate] = useState<string>(getTodayDateString());
  const [marketSpendKHR, setMarketSpendKHR] = useState<number>(90000);
  const [fuelExpenseKHR, setFuelExpenseKHR] = useState<number>(8000);
  const [notes, setNotes] = useState<string>('Morning wholesale fruit purchase from Phsar Derm Kor');

  // Yield Inputs per SKU
  const [yieldInputs, setYieldInputs] = useState<Record<string, number>>({});
  const [deliveryRevenueInputUSD, setDeliveryRevenueInputUSD] = useState<number>(75.78);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [revenueApplied, setRevenueApplied] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  // Helper to extract SKU packed quantities from delivery invoices on a specific date
  const getInvoiceSKUQuantities = (
    date: string,
    invoiceList: Invoice[],
    productList: Product[]
  ): Record<string, number> => {
    const dayInvoices = invoiceList.filter((inv) => {
      const invDate = (inv.invoiceDate || inv.createdAt || '').split('T')[0];
      return invDate === date;
    });

    const counts: Record<string, number> = {};
    productList.forEach((p) => {
      counts[p.barcode] = 0;
    });

    dayInvoices.forEach((inv) => {
      inv.items?.forEach((item) => {
        if (item.barcode) {
          counts[item.barcode] = (counts[item.barcode] || 0) + (Number(item.quantity) || 0);
        }
      });
    });

    return counts;
  };

  const isLoadedRef = React.useRef(false);

  const loadData = () => {
    const p = getProducts();
    const pkg = getPackagingItems();
    const s = getSettings();
    const b = getBatches();
    const inv = getInvoices();
    setProducts(p);
    setPackagingItems(pkg);
    setSettings(s);
    setBatches(b);
    setInvoices(inv);

    // If an in-progress auto-saved draft exists, restore it directly!
    const draft = getCostingDraft();
    if (draft && !isLoadedRef.current) {
      if (draft.batchDate) setBatchDate(draft.batchDate);
      if (draft.marketSpendKHR !== undefined) setMarketSpendKHR(draft.marketSpendKHR);
      if (draft.fuelExpenseKHR !== undefined) setFuelExpenseKHR(draft.fuelExpenseKHR);
      if (draft.notes !== undefined) setNotes(draft.notes);
      if (draft.manualBOMOverrideKHR !== undefined) setManualBOMOverrideKHR(draft.manualBOMOverrideKHR);
      if (draft.useDynamicBOM !== undefined) setUseDynamicBOM(draft.useDynamicBOM);
      if (draft.deliveryRevenueInputUSD !== undefined) setDeliveryRevenueInputUSD(draft.deliveryRevenueInputUSD);
      if (draft.revenueApplied !== undefined) setRevenueApplied(draft.revenueApplied);
      if (draft.yieldInputs && Object.keys(draft.yieldInputs).length > 0) {
        setYieldInputs(draft.yieldInputs);
      } else {
        setYieldInputs(getInvoiceSKUQuantities(draft.batchDate || batchDate, inv, p));
      }
      setLastAutoSaved(draft.updatedAt || 'Restored');
      isLoadedRef.current = true;
      return;
    }

    if (!isLoadedRef.current) {
      // Link SKU yield quantities directly from delivery invoices by default
      setYieldInputs((curr) => {
        if (Object.keys(curr).length === 0) {
          return getInvoiceSKUQuantities(batchDate, inv, p);
        }
        return curr;
      });

      const dayInvoices = inv.filter((item) => {
        const invDate = (item.invoiceDate || item.createdAt || '').split('T')[0];
        return invDate === batchDate;
      });
      const dayRevenue = dayInvoices.reduce((sum, item) => sum + (Number(item.totalAmountUSD) || 0), 0);
      if (dayRevenue > 0) {
        setDeliveryRevenueInputUSD(Number(dayRevenue.toFixed(2)));
      }
      isLoadedRef.current = true;
    }
  };

  // Auto-Save in-progress inputs to draft so user never loses work when navigating or refreshing
  useEffect(() => {
    if (!isLoadedRef.current) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const draft: CostingDraft = {
      batchDate,
      marketSpendKHR,
      fuelExpenseKHR,
      notes,
      yieldInputs,
      deliveryRevenueInputUSD,
      useDynamicBOM,
      manualBOMOverrideKHR,
      revenueApplied,
      updatedAt: now,
    };
    saveCostingDraft(draft);
    setLastAutoSaved(now);
  }, [
    batchDate,
    marketSpendKHR,
    fuelExpenseKHR,
    notes,
    yieldInputs,
    deliveryRevenueInputUSD,
    useDynamicBOM,
    manualBOMOverrideKHR,
    revenueApplied,
  ]);

  const handleDateChange = (newDate: string) => {
    setBatchDate(newDate);
    const p = products.length > 0 ? products : getProducts();
    const inv = invoices.length > 0 ? invoices : getInvoices();
    const invoicedYields = getInvoiceSKUQuantities(newDate, inv, p);
    setYieldInputs(invoicedYields);
    setRevenueApplied(false);

    const dayInvoices = inv.filter((item) => {
      const invDate = (item.invoiceDate || item.createdAt || '').split('T')[0];
      return invDate === newDate;
    });
    const dayRevenue = dayInvoices.reduce((sum, item) => sum + (Number(item.totalAmountUSD) || 0), 0);
    if (dayRevenue > 0) {
      setDeliveryRevenueInputUSD(Number(dayRevenue.toFixed(2)));
    }
  };

  const syncFromInvoices = (targetDate = batchDate) => {
    const invoicedYields = getInvoiceSKUQuantities(targetDate, invoices, products);
    setYieldInputs(invoicedYields);

    const dayInvoices = invoices.filter((item) => {
      const invDate = (item.invoiceDate || item.createdAt || '').split('T')[0];
      return invDate === targetDate;
    });
    const dayRevenue = dayInvoices.reduce((sum, item) => sum + (Number(item.totalAmountUSD) || 0), 0);
    if (dayRevenue > 0) {
      setDeliveryRevenueInputUSD(Number(dayRevenue.toFixed(2)));
    }
    setRevenueApplied(true);
  };

  const handleResetDraft = () => {
    clearCostingDraft();
    setBatchDate(getTodayDateString());
    setMarketSpendKHR(90000);
    setFuelExpenseKHR(8000);
    setNotes('Morning wholesale fruit purchase from Phsar Derm Kor');
    setRevenueApplied(false);
    const p = products.length > 0 ? products : getProducts();
    const inv = invoices.length > 0 ? invoices : getInvoices();
    setYieldInputs(getInvoiceSKUQuantities(getTodayDateString(), inv, p));
    const dayInvoices = inv.filter((item) => (item.invoiceDate || '').startsWith(getTodayDateString()));
    const dayRev = dayInvoices.reduce((sum, item) => sum + (Number(item.totalAmountUSD) || 0), 0);
    setDeliveryRevenueInputUSD(dayRev > 0 ? Number(dayRev.toFixed(2)) : 44.5);
    setLastAutoSaved(null);
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => {
      // Re-fetch products, packaging, and invoices without wiping user's typed inputs
      setProducts(getProducts());
      setPackagingItems(getPackagingItems());
      setSettings(getSettings());
      setBatches(getBatches());
      setInvoices(getInvoices());
    };
    window.addEventListener('products_updated', handleUpdate);
    window.addEventListener('packaging_updated', handleUpdate);
    window.addEventListener('inventory_updated', handleUpdate);
    window.addEventListener('invoices_updated', handleUpdate);
    window.addEventListener('batches_updated', handleUpdate);
    return () => {
      window.removeEventListener('products_updated', handleUpdate);
      window.removeEventListener('packaging_updated', handleUpdate);
      window.removeEventListener('inventory_updated', handleUpdate);
      window.removeEventListener('invoices_updated', handleUpdate);
      window.removeEventListener('batches_updated', handleUpdate);
    };
  }, []);

  // Update yield for SKU with reliable numeric parsing
  const handleYieldChange = (barcode: string, boxes: number) => {
    const cleanVal = Math.max(0, Number(boxes) || 0);
    setYieldInputs((prev) => ({
      ...prev,
      [barcode]: cleanVal,
    }));
  };

  const packagingMap = React.useMemo(() => {
    return new Map<string, PackagingItem>(packagingItems.map((p) => [p.id, p]));
  }, [packagingItems]);

  // Calculate live packaging cost for each product based on its configured BOM
  const getProductBOMCostKHR = (prod: Product): number => {
    if (!prod.bom || prod.bom.length === 0) return settings.defaultTubStickerKHR || 500;
    return prod.bom.reduce((sum, item) => {
      const pkg = packagingMap.get(item.packagingItemId) ||
        packagingItems.find((p) => p.id === item.packagingItemId || p.barcodeRef === item.packagingItemId.replace('sticker-', ''));
      return sum + (pkg ? (pkg.unitCostKHR ?? pkg.costPerUnitKHR ?? 0) : 0) * item.quantity;
    }, 0);
  };

  // Fixed BOM Overheads
  const coldWashBOM = settings.defaultColdWashKHR || 10;
  const exchangeRate = settings.exchangeRate || 4050;

  // Real-time Calculations: dynamically recalculates exact sum of all entered box quantities
  const totalBoxesYielded = Object.values(yieldInputs).reduce(
    (sum, qty) => sum + (Number(qty) || 0),
    0
  );

  // Total packaging cost for all yielded boxes in this batch
  const totalBatchPackagingCostKHR = products.reduce((sum, p) => {
    const count = Number(yieldInputs[p.barcode]) || 0;
    return sum + count * getProductBOMCostKHR(p);
  }, 0);

  // Dynamic weighted BOM per box
  const dynamicWeightedBOMPerBoxKHR =
    totalBoxesYielded > 0
      ? Math.round(totalBatchPackagingCostKHR / totalBoxesYielded)
      : (settings.defaultTubStickerKHR || 500);

  // Effective BOM per box to use in landed cost calculation
  const tubStickerBOM = useDynamicBOM
    ? dynamicWeightedBOMPerBoxKHR
    : manualBOMOverrideKHR;

  // Raw Fruit Share (KHR) = Fruit Market Spend (KHR) / totalBoxesYielded
  const rawFruitCostPerBoxKHR =
    totalBoxesYielded > 0 ? Math.round(marketSpendKHR / totalBoxesYielded) : 0;

  // Route Fuel Share (KHR) = Route Fuel Expense (KHR) / totalBoxesYielded
  const fuelSharePerBoxKHR =
    totalBoxesYielded > 0 ? Math.round(fuelExpenseKHR / totalBoxesYielded) : 0;

  // Total Landed Unit Cost (KHR) = Raw Fruit Share + Route Fuel Share + Weighted BOM packaging cost + Cold Wash Dip (10 KHR)
  const landedUnitCostKHR =
    totalBoxesYielded > 0
      ? rawFruitCostPerBoxKHR + fuelSharePerBoxKHR + tubStickerBOM + coldWashBOM
      : 0;

  const landedUnitCostUSD =
    totalBoxesYielded > 0 ? Number((landedUnitCostKHR / exchangeRate).toFixed(2)) : 0;

  // Total Production Cost (USD) = (Total Landed Unit Cost * totalBoxesYielded) / 4050
  const totalProductionCostUSD =
    totalBoxesYielded > 0 ? (landedUnitCostKHR * totalBoxesYielded) / exchangeRate : 0;
  const totalProductionCostKHR = Math.round(totalProductionCostUSD * exchangeRate);

  // Expected standard revenue if all yielded boxes are sold at wholesale list price
  const catalogExpectedRevenueUSD = products.reduce((sum, p) => {
    const count = Number(yieldInputs[p.barcode]) || 0;
    return sum + count * (p.wholesalePriceUSD ?? p.wholesalePrice ?? 0);
  }, 0);

  // Delivery Revenue & Profit Reconciliation
  const effectiveRevenueUSD = deliveryRevenueInputUSD || catalogExpectedRevenueUSD;

  // Net Profit (USD) = Estimated Delivery Revenue - Total Production Cost
  const netProfitUSD = Number((effectiveRevenueUSD - totalProductionCostUSD).toFixed(2));
  const netProfitKHR = Math.round(netProfitUSD * exchangeRate);

  // Gross Margin % = (Net Profit / Estimated Delivery Revenue) * 100
  const grossMarginPercent =
    effectiveRevenueUSD > 0
      ? Number(((netProfitUSD / effectiveRevenueUSD) * 100).toFixed(1))
      : 0;

  // Auto-fill delivery revenue from catalog prices
  const handleAutoFillRevenue = () => {
    const wholesale = Number(catalogExpectedRevenueUSD.toFixed(2));
    setDeliveryRevenueInputUSD(wholesale);
    setRevenueApplied(false);
    showToast(`Loaded wholesale catalog expected revenue (${formatUSD(wholesale)})`);
  };

  // ==========================================
  // DAILY RUN PROFIT RECONCILIATION ENGINE
  // ==========================================
  // 1. Connect Invoices to Batch Run by Date:
  // Scan the delivery ledger and pull all invoices created on that same date
  const linkedInvoices = React.useMemo(() => {
    return invoices.filter((inv) => {
      const invDate = (inv.invoiceDate || inv.createdAt || '').split('T')[0];
      return invDate === batchDate;
    });
  }, [invoices, batchDate]);

  // Auto-calculate Total Delivered Revenue: Sum of all invoice totals for that date
  const totalDeliveredRevenueUSD = React.useMemo(() => {
    return linkedInvoices.reduce(
      (sum, inv) => sum + (Number(inv.totalAmountUSD) || 0),
      0
    );
  }, [linkedInvoices]);

  // Apply / Sync revenue from today's delivery invoices to batch record
  const handleApplyRevenue = () => {
    if (totalDeliveredRevenueUSD === 0) {
      showToast('No invoices found for this date to apply revenue.');
      return;
    }
    const rev = Number(totalDeliveredRevenueUSD.toFixed(2));
    setDeliveryRevenueInputUSD(rev);
    setRevenueApplied(true);
    showToast(`Invoiced revenue (${formatUSD(rev)}) applied to batch record!`);

    // Smooth scroll to reconciliation card
    const card = document.getElementById('profit-reconciliation-card');
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const syncInvoicedRevenue = handleApplyRevenue;

  // Auto-calculate Total Invoiced Units: Sum of boxes across those invoices
  const totalInvoicedUnits = React.useMemo(() => {
    return linkedInvoices.reduce(
      (sum, inv) => sum + (Number(inv.totalQuantity) || 0),
      0
    );
  }, [linkedInvoices]);

  // Unique stores count and names
  const linkedStores = React.useMemo(() => {
    const list = linkedInvoices
      .map((inv) => inv.shipTo || inv.customerName || inv.storeCode)
      .filter(Boolean);
    return Array.from(new Set(list));
  }, [linkedInvoices]);

  // 2. Automated Same-Day P&L Calculation:
  // - Total Day Revenue = Invoices Total ($75.78 USD)
  // - Total Day Expenses = 
  //     (Fruit Market Spend KHR / 4050) + 
  //     (Route Fuel KHR / 4050) + 
  //     (Total Packaging BOM Cost for the 87 boxes)
  const sameDayFruitSpendUSD = marketSpendKHR / exchangeRate;
  const sameDayFuelExpenseUSD = fuelExpenseKHR / exchangeRate;

  // Total Packaging BOM Cost for the invoiced boxes
  const totalInvoicedPackagingBOMCostKHR = React.useMemo(() => {
    if (totalInvoicedUnits === 0) return 0;

    let bomSum = 0;
    if (useDynamicBOM) {
      linkedInvoices.forEach((inv) => {
        inv.items?.forEach((item) => {
          const prod = products.find((p) => p.barcode === item.barcode);
          const itemBOM = prod ? getProductBOMCostKHR(prod) : tubStickerBOM;
          bomSum += itemBOM * (Number(item.quantity) || 0);
        });
      });
    } else {
      bomSum = totalInvoicedUnits * tubStickerBOM;
    }

    if (bomSum === 0 && totalInvoicedUnits > 0) {
      bomSum = totalInvoicedUnits * (tubStickerBOM || 872);
    }
    return bomSum;
  }, [linkedInvoices, totalInvoicedUnits, useDynamicBOM, products, tubStickerBOM, packagingItems, settings]);

  const totalInvoicedPackagingBOMCostUSD =
    totalInvoicedPackagingBOMCostKHR / exchangeRate;

  const totalDayExpensesUSD =
    sameDayFruitSpendUSD + sameDayFuelExpenseUSD + totalInvoicedPackagingBOMCostUSD;
  const totalDayExpensesKHR = Math.round(totalDayExpensesUSD * exchangeRate);

  // Daily Net Profit ($ USD & KHR) = Total Day Revenue - Total Day Expenses
  const dailyNetProfitUSD = totalDeliveredRevenueUSD - totalDayExpensesUSD;
  const dailyNetProfitKHR = Math.round(dailyNetProfitUSD * exchangeRate);

  // Daily Net Margin % = (Daily Net Profit / Total Day Revenue) * 100
  const dailyNetMarginPercent =
    totalDeliveredRevenueUSD > 0
      ? Number(((dailyNetProfitUSD / totalDeliveredRevenueUSD) * 100).toFixed(1))
      : 0;

  // Seed demo invoices if none exist on this date
  const handleSeedTodayInvoices = () => {
    const todaySeeds: Invoice[] = [
      {
        id: `inv-seed-1-${Date.now()}`,
        invoiceNumber: 'INV-2610-001',
        storeCode: 'ON-TK592',
        customerName: 'Angkor Prototype LTD.',
        shipTo: 'ON Mart St.592 TK',
        address: '#ដីឡូត៍លេខ១ ផ្លូវ ៥៩២ កែងបណ្តោយ ៦ សង្កាត់បឹងកក់ទី២ ខណ្ឌទួលគោក ភ្នំពេញ',
        phone: '099 423 599',
        invoiceDate: batchDate,
        dueDate: batchDate,
        items: [
          { id: 'item-1', barcode: '2016800000025', name: 'Sweet Melon Cubes 300G', khmerName: 'ត្រសក់ផ្អែមស្រស់', uom: 'Pcs', quantity: 24, unitPrice: 1.00 },
          { id: 'item-2', barcode: '2016800000032', name: 'Baby Mango Bites', khmerName: 'ក្តឹបស្វាយស្រស់', uom: 'Pcs', quantity: 13, unitPrice: 0.76 },
          { id: 'item-3', barcode: '2016800000087', name: 'Jujube Bites', khmerName: 'ពុទ្រាស្រស់', uom: 'Pcs', quantity: 8, unitPrice: 0.71 },
        ],
        totalQuantity: 45,
        totalAmountUSD: 39.56,
        totalAmountKHR: 160218,
        status: 'paid_aba',
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        notes: 'Morning fresh delivery to Tuol Kouk branch',
      },
      {
        id: `inv-seed-2-${Date.now()}`,
        invoiceNumber: 'INV-2610-002',
        storeCode: 'ON-PDK',
        customerName: 'Sambath Linda Mart',
        shipTo: 'ON Mart Phsar Derm Thkov',
        address: '#០១៥៤ ផ្លូវ១៦៣ ភូមិ៣ សង្កាត់ផ្សារដើមថ្កូវ ខណ្ឌចំការមន រាជធានីភ្នំពេញ',
        phone: '097 91 97 054',
        invoiceDate: batchDate,
        dueDate: batchDate,
        items: [
          { id: 'item-201', barcode: '2016800000049', name: 'Jackfruit Bites 300G', khmerName: 'ខ្នុរសាច់លឿងស្រស់', uom: 'Pcs', quantity: 20, unitPrice: 1.00 },
          { id: 'item-202', barcode: '2016800000094', name: 'Mixed Sour Fruits', khmerName: 'ម្ជូរចម្រុះ', uom: 'Pcs', quantity: 13, unitPrice: 0.76 },
          { id: 'item-203', barcode: '2016800000087', name: 'Jujube Bites', khmerName: 'ពុទ្រាស្រស់', uom: 'Pcs', quantity: 8, unitPrice: 0.71 },
          { id: 'item-204', barcode: '2016800000070', name: 'Jicama Bites', khmerName: 'ប៉ិកួក់ស្រស់', uom: 'Pcs', quantity: 1, unitPrice: 0.66 },
        ],
        totalQuantity: 42,
        totalAmountUSD: 36.22,
        totalAmountKHR: 146691,
        status: 'pending',
        createdAt: new Date().toISOString(),
        notes: 'Morning fresh delivery to Phsar Derm Thkov branch',
      },
    ];

    const current = getInvoices();
    const updated = [...todaySeeds, ...current.filter((c) => !todaySeeds.some((s) => s.invoiceNumber === c.invoiceNumber))];
    saveInvoices(updated);
    setInvoices(updated);

    const p = products.length > 0 ? products : getProducts();
    const invoicedYields = getInvoiceSKUQuantities(batchDate, updated, p);
    setYieldInputs(invoicedYields);
    setDeliveryRevenueInputUSD(75.78);
  };

  const handleLoadBatchForReconciliation = (record: BatchCostRecord) => {
    setBatchDate(record.date);
    setMarketSpendKHR(record.marketSpendKHR);
    setFuelExpenseKHR(record.fuelExpenseKHR);
    if (record.tubStickerBOMKHR) {
      setManualBOMOverrideKHR(record.tubStickerBOMKHR);
    }
    if (record.deliveryRevenueUSD) {
      setDeliveryRevenueInputUSD(record.deliveryRevenueUSD);
    }
    if (record.yieldItems && record.yieldItems.length > 0) {
      const loadedYields: Record<string, number> = {};
      record.yieldItems.forEach((y) => {
        loadedYields[y.barcode] = y.boxes;
      });
      setYieldInputs(loadedYields);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save Batch to Ledger
  const handleSaveBatch = () => {
    if (totalBoxesYielded === 0) {
      setAlertModal({
        isOpen: true,
        title: 'No Boxes Yielded',
        message: 'Please enter at least 1 yielded packed box before saving this batch calculation.',
      });
      return;
    }

    const yieldList: BatchYieldItem[] = products
      .filter((p) => (yieldInputs[p.barcode] || 0) > 0)
      .map((p) => ({
        barcode: p.barcode,
        name: p.name,
        khmerName: p.khmerName,
        boxes: yieldInputs[p.barcode] || 0,
      }));

    const newRecord: BatchCostRecord = {
      id: `batch-${Date.now()}`,
      batchNumber: generateNextBatchNumber(batchDate),
      date: batchDate,
      marketSpendKHR,
      fuelExpenseKHR,
      tubStickerBOMKHR: tubStickerBOM,
      packagingBOMPerBoxKHR: tubStickerBOM,
      totalPackagingBOMCostKHR: totalBatchPackagingCostKHR,
      isDynamicBOM: useDynamicBOM,
      coldWashBOMKHR: coldWashBOM,
      exchangeRate,
      yieldItems: yieldList,
      totalBoxesYielded,
      rawFruitCostPerBoxKHR,
      fuelSharePerBoxKHR,
      landedUnitCostKHR,
      landedUnitCostUSD,
      deliveryRevenueUSD: effectiveRevenueUSD,
      netProfitUSD,
      netProfitKHR,
      grossMarginPercent,
      createdAt: new Date().toISOString(),
      notes,
    };

    addBatch(newRecord);
    setBatches(getBatches());
    clearCostingDraft();
    setLastAutoSaved(null);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleDeleteBatch = (id: string, num: string) => {
    setDeleteConfirm({
      isOpen: true,
      id,
      num,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Dynamic Batch-Yield Costing &amp; BOM Calculator
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-citrus-100 text-citrus-800 border border-citrus-300 text-xs font-bold uppercase">
              BOM Engine
            </span>
          </div>
          <p className="text-xs text-slate-700 font-khmer mt-0.5">
            ដោះស្រាយថ្លៃដើមផ្លែឈើទិញដុំពីផ្សារ គណនាថ្លៃដើមពិតប្រាកដក្នុងមួយប្រអប់ (រួមបញ្ចូលប្រអប់ ស្លាក និងសាំង)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {lastAutoSaved && (
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-medium inline-flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                <span>Auto-saved ({lastAutoSaved})</span>
              </span>
              <button
                type="button"
                onClick={handleResetDraft}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 hover:underline px-2 py-1 cursor-pointer"
                title="Discard current draft and reset inputs"
              >
                Reset Inputs
              </button>
            </div>
          )}

          <button
            onClick={handleSaveBatch}
            disabled={totalBoxesYielded === 0}
            className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-xs transition ${
              totalBoxesYielded > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Batch Saved to Log!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Batch Calculation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Breadcrumb Navigation Header */}
      <div className="flex items-center space-x-2 text-xs text-slate-500 pb-1">
        <span className="font-semibold text-slate-700">Production &amp; Inventory</span>
        <span>/</span>
        <span className="font-bold text-slate-900">Batch Yield Costing (គណនាថ្លៃដើមផលិត)</span>
      </div>

      {/* Main Grid: Inputs (Left) and Real-Time Calculation Cards (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 Cols): Batch Costing Inputs & Yield Per SKU */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Batch Spend & Overheads */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>Lump-Sum Production Inputs (រៀល - KHR)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Batch Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Batch Run Date
                </label>
                <input
                  type="date"
                  value={batchDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Total Market Spend */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fruit Market Spend (KHR)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={marketSpendKHR}
                    onChange={(e) => setMarketSpendKHR(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    ៛
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  e.g. 90,000៛ (Phsar Derm Kor)
                </span>
              </div>

              {/* Route Fuel / Transport */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Route Fuel Expense (KHR)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="500"
                    min="0"
                    value={fuelExpenseKHR}
                    onChange={(e) => setFuelExpenseKHR(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    ៛
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Delivery route fuel (default 8,000៛)
                </span>
              </div>
            </div>

            {/* Dynamic Packaging BOM Overheads Strip (Linked to Products & Packaging) */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 bg-slate-50/90 p-3 rounded-xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-slate-900">
                    {useDynamicBOM ? '⚡ Live Weighted BOM:' : 'Fixed BOM:'}
                  </span>
                  <span className="font-mono font-black text-emerald-800 text-sm">
                    {tubStickerBOM.toLocaleString()} ៛ / box
                  </span>
                  {useDynamicBOM && (
                    <span className="text-[10px] text-slate-500">
                      (Total {formatKHR(totalBatchPackagingCostKHR)} for {totalBoxesYielded} boxes)
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setUseDynamicBOM(!useDynamicBOM)}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline px-2 py-0.5 rounded bg-emerald-100/60"
                  >
                    {useDynamicBOM ? 'Switch to Manual Override' : 'Use Live Recipe BOM'}
                  </button>
                  <Link
                    href="/products"
                    className="text-[10px] text-slate-500 hover:text-slate-800 hover:underline"
                  >
                    Edit Recipes →
                  </Link>
                </div>
              </div>

              {!useDynamicBOM && (
                <div className="flex items-center space-x-2 pt-1 border-t border-slate-200 text-xs">
                  <span className="text-slate-600 font-semibold">Custom Packaging BOM (៛):</span>
                  <input
                    type="number"
                    step="10"
                    min="0"
                    value={manualBOMOverrideKHR}
                    onChange={(e) => setManualBOMOverrideKHR(parseInt(e.target.value, 10) || 0)}
                    className="w-24 text-xs font-mono font-bold px-2 py-1 rounded border border-slate-300 bg-white"
                  />
                  <span className="text-[10px] text-slate-500">Overrides live fruit recipes</span>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                <span>
                  Cold Wash Sanitization: <strong>{coldWashBOM.toLocaleString()} ៛/box</strong>
                </span>
                <span className="font-mono">
                  Exchange: <strong>1$ = {exchangeRate.toLocaleString()} ៛</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Sellable Boxes Yielded per SKU */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Sellable Boxes Packed per SKU (10 Fruits)
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>Linked from Invoices</span>
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-khmer mt-0.5">
                  ចំនួនប្រអប់ភ្ជាប់ដោយស្វ័យប្រវត្តិតាមវិក្កយបត្រថ្ងៃនេះ ({formatDateDisplay(batchDate)}) • អ្នកក៏អាចកែប្រែដោយដៃបាន
                </p>
              </div>

              <div className="flex items-center space-x-3 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => syncFromInvoices(batchDate)}
                  className="px-2.5 py-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-white hover:bg-emerald-50 rounded-lg border border-emerald-300 shadow-2xs inline-flex items-center space-x-1 transition cursor-pointer"
                  title="Re-sync quantities directly from this date's invoices"
                >
                  <RotateCcw className="w-3 h-3 text-emerald-600" />
                  <span>Sync Invoices</span>
                </button>

                <div className="text-right">
                  <span className="text-xs text-slate-500 font-medium block">Total Yield</span>
                  <span className="text-lg font-black text-emerald-800">
                    {totalBoxesYielded} <span className="text-xs font-normal text-slate-500">boxes</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
              {products.map((item, index) => {
                const count = yieldInputs[item.barcode] || 0;
                const itemBOMCostKHR = getProductBOMCostKHR(item);

                return (
                  <div
                    key={item.barcode}
                    className="p-3 sm:px-5 flex items-center justify-between hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-5 text-center text-xs font-medium text-slate-400">
                        {index + 1}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-slate-900 leading-tight">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-600 font-khmer leading-tight flex items-center space-x-2 mt-0.5">
                          <span>{item.khmerName}</span>
                          <span className="text-slate-300">•</span>
                          <span>List: ${item.wholesalePrice.toFixed(2)}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-emerald-700 font-semibold font-mono bg-emerald-50 px-1 rounded">
                            BOM: {formatKHR(itemBOMCostKHR)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stepper + Input with 44px x 44px Touch Targets for Food Prep */}
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleYieldChange(item.barcode, count - 1)}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition active:scale-95 text-base touch-manipulation shadow-2xs"
                        aria-label={`Decrease ${item.name}`}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={count === 0 ? '' : count}
                        placeholder="0"
                        onChange={(e) =>
                          handleYieldChange(item.barcode, Number(e.target.value) || 0)
                        }
                        className={`w-14 h-11 text-center font-black text-sm rounded-xl border focus:ring-2 focus:ring-emerald-500 focus:outline-hidden ${
                          count > 0
                            ? 'border-emerald-500 bg-white text-slate-900 font-black shadow-xs'
                            : 'border-slate-200 bg-slate-50 text-slate-400'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleYieldChange(item.barcode, count + 1)}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold flex items-center justify-center transition active:scale-95 text-base touch-manipulation shadow-2xs"
                        aria-label={`Increase ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (5 Cols): Real-time Landed Cost & Profit Reconciliation */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Daily Run Profit Reconciliation Hero Widget */}
          <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950 text-white rounded-2xl p-5 shadow-md border border-emerald-500/40 relative overflow-hidden">
            {/* Glowing ambient background accents */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-citrus-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Widget Header */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-emerald-800/50">
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                    <Scale className="w-3.5 h-3.5" />
                  </span>
                  <h2 className="text-sm font-black tracking-tight text-white uppercase sm:whitespace-nowrap">
                    Daily Run Profit Reconciliation
                  </h2>
                </div>
                <p className="text-[11px] text-emerald-300/80 font-khmer mt-0.5 leading-snug">
                  ការផ្ទៀងផ្ទាត់ចំណូល ចំណាយ និងប្រាក់ចំណេញរត់ចែកជូនតាមហាងជាក់ស្តែង
                </p>
              </div>

              {/* Date Indicator */}
              <div className="flex items-center space-x-1.5 text-xs self-start sm:self-auto shrink-0 whitespace-nowrap">
                <span className="text-slate-400 text-[11px]">Run:</span>
                <span className="font-mono font-bold text-emerald-300 bg-emerald-900/60 px-2.5 py-1 rounded text-[11px] border border-emerald-700/60 whitespace-nowrap inline-block">
                  {formatDateDisplay(batchDate)}
                </span>
                {batchDate !== getTodayDateString() && (
                  <button
                    type="button"
                    onClick={() => setBatchDate(getTodayDateString())}
                    className="text-[10px] font-bold text-citrus-400 hover:text-citrus-300 hover:underline ml-1 whitespace-nowrap cursor-pointer"
                  >
                    Today
                  </button>
                )}
              </div>
            </div>

            {/* 1. Invoices Linked Strip */}
            <div className="relative z-10 mt-3 p-3 rounded-xl bg-slate-900/90 border border-emerald-800/40 backdrop-blur-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2 flex-wrap">
                  <Receipt className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-200">
                    Invoices Linked:
                  </span>
                  {linkedInvoices.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {linkedInvoices.map((inv) => (
                        <Link
                          key={inv.id}
                          href="/deliveries/new"
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 border border-emerald-500/40 transition"
                          title={`${inv.customerName || inv.shipTo} (${inv.totalQuantity} boxes • $${inv.totalAmountUSD.toFixed(2)})`}
                        >
                          <span>{inv.invoiceNumber}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-amber-300 font-medium italic">
                      None found for this date
                    </span>
                  )}
                </div>

                {linkedInvoices.length > 0 ? (
                  <div className="text-[11px] text-emerald-400 font-medium sm:text-right">
                    <span>
                      {formatUSD(totalDeliveredRevenueUSD)} USD across {linkedStores.length} {linkedStores.length === 1 ? 'store' : 'stores'}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSeedTodayInvoices}
                    className="text-[11px] font-bold text-citrus-400 hover:text-citrus-300 hover:underline inline-flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3 mr-0.5" />
                    <span>Link Demo Invoices (87 boxes / $75.78)</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. Core 4-Metrics Summary Card */}
            <div className="relative z-10 mt-3 grid grid-cols-2 gap-2.5">
              {/* Metric 1: Units Delivered */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/40 transition">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Units Delivered
                </span>
                <div className="text-lg sm:text-xl font-black text-white font-mono mt-0.5">
                  {totalInvoicedUnits}{' '}
                  <span className="text-xs font-normal text-slate-400">boxes</span>
                </div>
                <div className="text-[10px] text-emerald-400 mt-0.5 truncate">
                  {totalBoxesYielded === totalInvoicedUnits && totalInvoicedUnits > 0 ? (
                    <span className="text-emerald-300 font-semibold">✓ Matches Yield ({totalBoxesYielded})</span>
                  ) : (
                    <span className="text-slate-400">Yield: {totalBoxesYielded} boxes</span>
                  )}
                </div>
              </div>

              {/* Metric 2: Revenue */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-400/50 transition">
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                  Revenue
                </span>
                <div className="text-lg sm:text-xl font-black text-emerald-300 font-mono mt-0.5">
                  {formatUSD(totalDeliveredRevenueUSD)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  ≈ {formatKHR(Math.round(totalDeliveredRevenueUSD * exchangeRate))}
                </div>
              </div>

              {/* Metric 3: Total Run Cost */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/30 transition">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Run Cost
                </span>
                <div className="text-lg sm:text-xl font-black text-slate-200 font-mono mt-0.5">
                  {formatUSD(totalDayExpensesUSD)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Fruit + Fuel + BOM
                </div>
              </div>

              {/* Metric 4: Net Profit & Margin */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-600/30 to-teal-600/30 border border-emerald-400/50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                    Net Profit
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-400 text-slate-950">
                    {dailyNetMarginPercent}%
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-black text-emerald-200 font-mono mt-0.5">
                  {formatUSD(dailyNetProfitUSD)}
                </div>
                <div className="text-[10px] text-emerald-300/80 mt-0.5">
                  ≈ {formatKHR(dailyNetProfitKHR)}
                </div>
              </div>
            </div>

            {/* 3. Automated Same-Day P&L Formula Breakdown */}
            <div className="relative z-10 mt-3 p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] space-y-1 font-mono">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans mb-1 flex items-center justify-between">
                <span className="whitespace-nowrap">Automated Same-Day P&amp;L</span>
                <span className="text-slate-400 text-[10px] whitespace-nowrap">Rate: 1$ = {exchangeRate.toLocaleString()}៛</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="font-sans text-slate-400 whitespace-nowrap">Total Day Revenue:</span>
                <span className="font-bold text-emerald-300 whitespace-nowrap">{formatUSD(totalDeliveredRevenueUSD)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="font-sans text-slate-400 whitespace-nowrap">
                  Fruit Spend ({marketSpendKHR.toLocaleString()}៛ / {exchangeRate}):
                </span>
                <span className="whitespace-nowrap">${sameDayFruitSpendUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="font-sans text-slate-400 whitespace-nowrap">
                  Route Fuel ({fuelExpenseKHR.toLocaleString()}៛ / {exchangeRate}):
                </span>
                <span className="whitespace-nowrap">${sameDayFuelExpenseUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="font-sans text-slate-400 whitespace-nowrap">
                  Packaging BOM ({totalInvoicedUnits} boxes):
                </span>
                <span className="whitespace-nowrap">${totalInvoicedPackagingBOMCostUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-200 pt-1 border-t border-white/10 font-bold">
                <span className="font-sans text-slate-300 whitespace-nowrap">Total Day Expenses:</span>
                <span className="text-amber-300 whitespace-nowrap">{formatUSD(totalDayExpensesUSD)}</span>
              </div>
              <div className="flex justify-between text-emerald-300 pt-1 border-t border-emerald-500/30 text-xs font-bold">
                <span className="font-sans text-emerald-200 whitespace-nowrap">Daily Net Profit &amp; Margin:</span>
                <span className="whitespace-nowrap">
                  {formatUSD(dailyNetProfitUSD)} ({dailyNetMarginPercent}%)
                </span>
              </div>
            </div>

            {/* Action Strip: Apply Revenue Button */}
            <div className="relative z-10 mt-3 pt-2.5 border-t border-emerald-800/40 flex items-center justify-start">
              <button
                type="button"
                onClick={handleApplyRevenue}
                disabled={totalDeliveredRevenueUSD === 0}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center space-x-1.5 shadow-xs cursor-pointer whitespace-nowrap ${
                  revenueApplied && Math.abs(deliveryRevenueInputUSD - totalDeliveredRevenueUSD) < 0.01
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white ring-2 ring-emerald-300/40'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {revenueApplied && Math.abs(deliveryRevenueInputUSD - totalDeliveredRevenueUSD) < 0.01 ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-100" />
                    <span>Revenue Applied ({formatUSD(totalDeliveredRevenueUSD)})</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply Revenue ({formatUSD(totalDeliveredRevenueUSD)}) to Batch Record</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card: Landed Cost Breakdown Formula */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Landed Unit Cost (Per Box)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Formula Output
              </span>
            </div>

            <div className="my-4 text-center bg-gradient-to-br from-emerald-50 to-teal-50/60 p-4 rounded-xl border border-emerald-100">
              <div className="text-3xl font-black text-emerald-900 font-mono">
                ${landedUnitCostUSD.toFixed(2)}
              </div>
              <div className="text-sm font-bold text-emerald-700 mt-1">
                {landedUnitCostKHR.toLocaleString()} KHR / box
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                Based on {totalBoxesYielded} total packed boxes
              </div>
            </div>

            {/* Formula Breakdown Breakdown Table */}
            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="flex justify-between py-1.5">
                <span className="text-slate-600">
                  Raw Fruit Share ({marketSpendKHR.toLocaleString()}៛ / {totalBoxesYielded || 1}):
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {rawFruitCostPerBoxKHR.toLocaleString()} ៛
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-600">
                  Route Fuel Share ({fuelExpenseKHR.toLocaleString()}៛ / {totalBoxesYielded || 1}):
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {fuelSharePerBoxKHR.toLocaleString()} ៛
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-600">Tub &amp; UV Sticker BOM:</span>
                <span className="font-mono font-bold text-slate-900">
                  {tubStickerBOM.toLocaleString()} ៛
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-600">Cold Wash Dip BOM:</span>
                <span className="font-mono font-bold text-slate-900">
                  {coldWashBOM.toLocaleString()} ៛
                </span>
              </div>
              <div className="flex justify-between py-2 font-bold border-t border-slate-200 text-slate-900 text-sm">
                <span>Total Landed Unit Cost:</span>
                <span className="font-mono text-emerald-800">
                  {landedUnitCostKHR.toLocaleString()} ៛ (${landedUnitCostUSD.toFixed(2)})
                </span>
              </div>
            </div>
          </div>

          {/* Card: Profit Reconciliation Card */}
          <div
            id="profit-reconciliation-card"
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs transition duration-300"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Run Profit Reconciliation
              </span>
              <div className="flex items-center space-x-2">
                {totalDeliveredRevenueUSD > 0 && (
                  <button
                    type="button"
                    onClick={syncInvoicedRevenue}
                    className={`text-xs font-bold flex items-center space-x-1 px-2 py-0.5 rounded transition cursor-pointer ${
                      Math.abs(deliveryRevenueInputUSD - totalDeliveredRevenueUSD) < 0.01
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                    title="Sync revenue from today's invoices"
                  >
                    {Math.abs(deliveryRevenueInputUSD - totalDeliveredRevenueUSD) < 0.01 ? (
                      <Check className="w-3 h-3 text-emerald-700 stroke-[3]" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                    )}
                    <span>Sync Invoices (${totalDeliveredRevenueUSD.toFixed(2)})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAutoFillRevenue}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline flex items-center space-x-1 cursor-pointer"
                  title="Calculate revenue from catalog wholesale prices"
                >
                  <span>Wholesale (${catalogExpectedRevenueUSD.toFixed(2)})</span>
                </button>
              </div>
            </div>

            {/* Delivery Revenue Input */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Estimated Delivery Revenue ($ USD)
                </label>
                {totalDeliveredRevenueUSD > 0 && Math.abs(deliveryRevenueInputUSD - totalDeliveredRevenueUSD) < 0.01 && (
                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                    <span>Linked from Invoices</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={deliveryRevenueInputUSD}
                  onChange={(e) => {
                    setDeliveryRevenueInputUSD(parseFloat(e.target.value) || 0);
                    setRevenueApplied(false);
                  }}
                  className="w-full text-base font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                  USD
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Typical store run: $40.00 – $46.00 (~162,000 – 186,000 KHR)
              </span>
            </div>

            {/* Profit & Margin Metrics */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Net Profit (USD)
                </span>
                <div className="text-xl font-black text-emerald-900 font-mono mt-0.5">
                  {formatUSD(netProfitUSD)}
                </div>
                <div className="text-[10px] text-emerald-700 font-medium">
                  ≈ {formatKHR(netProfitKHR)}
                </div>
              </div>

              <div className="p-3 bg-citrus-50 rounded-xl border border-citrus-200">
                <span className="text-[10px] font-bold text-citrus-900 uppercase tracking-wider block">
                  Gross Margin %
                </span>
                <div className="text-xl font-black text-citrus-950 font-mono mt-0.5">
                  {grossMarginPercent}%
                </div>
                <div className="text-[10px] text-citrus-800 font-medium">
                  {grossMarginPercent >= 30 ? 'Healthy Margin' : 'Thin Margin'}
                </div>
              </div>
            </div>

            {/* Total Batch Cost Summary */}
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Total Production Cost:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatUSD(totalProductionCostUSD)} ({totalProductionCostKHR.toLocaleString()} ៛)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Expected Revenue:</span>
                <span className="font-mono font-bold text-emerald-800">
                  {formatUSD(effectiveRevenueUSD)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Production Batches Log History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden mt-8">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Batch Costing &amp; Production History
            </h2>
            <p className="text-xs text-slate-700 font-khmer mt-0.5">
              កំណត់ត្រាថ្លៃដើមផលិត និងប្រាក់ចំណេញតាមជុំនីមួយៗ
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {batches.length} batch runs logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Batch #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-right">Market Spend</th>
                <th className="py-2.5 px-3 text-center">Yield</th>
                <th className="py-2.5 px-3 text-right">Landed Cost / Box</th>
                <th className="py-2.5 px-3 text-right">Revenue</th>
                <th className="py-2.5 px-3 text-right">Net Profit</th>
                <th className="py-2.5 px-3 text-center">Margin</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                    No batch costing calculations saved yet.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {b.batchNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {formatDateDisplay(b.date)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">
                      {b.marketSpendKHR.toLocaleString()} ៛
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">
                      {b.totalBoxesYielded} boxes
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">
                      ${b.landedUnitCostUSD.toFixed(2)}{' '}
                      <span className="text-[10px] text-slate-600 block">
                        ({b.landedUnitCostKHR.toLocaleString()} ៛)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatUSD(b.deliveryRevenueUSD)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                      {formatUSD(b.netProfitUSD)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-citrus-100 text-citrus-900 border border-citrus-300">
                        {b.grossMarginPercent}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => handleLoadBatchForReconciliation(b)}
                          className="text-emerald-700 hover:text-emerald-900 font-bold text-[10px] px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 inline-flex items-center space-x-1 transition cursor-pointer"
                          title="Load batch data and reconcile same-day invoices"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Reconcile</span>
                        </button>
                        <button
                          onClick={() => handleDeleteBatch(b.id, b.batchNumber)}
                          className="text-slate-400 hover:text-red-600 p-1 transition cursor-pointer"
                          title="Delete batch calculation"
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

      {/* Modern UI Confirm Modal for Batch Deletion */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Delete Batch Calculation?"
        khmerTitle="លុបការគណនាថ្លៃដើមផលិតផល B2B"
        badgeText={deleteConfirm.num}
        message="Are you sure you want to permanently delete this production batch record? All associated yield numbers and profit metrics will be removed."
        confirmText="Delete Batch"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          deleteBatch(deleteConfirm.id);
          setBatches(getBatches());
          setDeleteConfirm({ isOpen: false, id: '', num: '' });
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: '', num: '' })}
      />

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

      {/* Floating Interactive Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-2xl border border-emerald-500/60 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
