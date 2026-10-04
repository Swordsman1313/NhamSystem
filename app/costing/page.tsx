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
} from '@/lib/storage';
import { Product, AppSettings, BatchCostRecord, BatchYieldItem, PackagingItem } from '@/lib/types';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function BatchCostingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [packagingItems, setPackagingItems] = useState<PackagingItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [batches, setBatches] = useState<BatchCostRecord[]>([]);

  // Toggle for dynamic recipe BOM vs manual override
  const [useDynamicBOM, setUseDynamicBOM] = useState<boolean>(true);
  const [manualBOMOverrideKHR, setManualBOMOverrideKHR] = useState<number>(500);

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
  const [deliveryRevenueInputUSD, setDeliveryRevenueInputUSD] = useState<number>(44.5);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const loadData = () => {
    const p = getProducts();
    const pkg = getPackagingItems();
    const s = getSettings();
    const b = getBatches();
    setProducts(p);
    setPackagingItems(pkg);
    setSettings(s);
    setBatches(b);

    // Default yield initialization (e.g. 10 boxes per first 5 SKUs)
    setYieldInputs((curr) => {
      if (Object.keys(curr).length > 0) return curr;
      const initialYields: Record<string, number> = {};
      p.forEach((item, index) => {
        initialYields[item.barcode] = index < 5 ? 10 : 0;
      });
      return initialYields;
    });
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('products_updated', handleUpdate);
    window.addEventListener('packaging_updated', handleUpdate);
    window.addEventListener('inventory_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('products_updated', handleUpdate);
      window.removeEventListener('packaging_updated', handleUpdate);
      window.removeEventListener('inventory_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
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
    setDeliveryRevenueInputUSD(Number(catalogExpectedRevenueUSD.toFixed(2)));
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
                  onChange={(e) => setBatchDate(e.target.value)}
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
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Sellable Boxes Packed per SKU (10 Fruits)
                </h2>
                <p className="text-xs text-slate-700 font-khmer mt-0.5">
                  បញ្ចូលចំនួនប្រអប់ផ្លែឈើដែលវេចខ្ចប់បានពីការទិញដុំលើកនេះ (តម្លៃ BOM គណនាស្វ័យប្រវត្តិតាមរូបមន្ត)
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 font-medium block">Total Yield</span>
                <span className="text-lg font-black text-emerald-800">
                  {totalBoxesYielded} <span className="text-xs font-normal text-slate-500">boxes</span>
                </span>
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
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Run Profit Reconciliation
              </span>
              <button
                type="button"
                onClick={handleAutoFillRevenue}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center space-x-1"
                title="Calculate revenue from catalog wholesale prices"
              >
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Auto-Calc (${catalogExpectedRevenueUSD.toFixed(2)})</span>
              </button>
            </div>

            {/* Delivery Revenue Input */}
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Estimated Delivery Revenue ($ USD)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={deliveryRevenueInputUSD}
                  onChange={(e) => setDeliveryRevenueInputUSD(parseFloat(e.target.value) || 0)}
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
                      <button
                        onClick={() => handleDeleteBatch(b.id, b.batchNumber)}
                        className="text-slate-400 hover:text-red-600 p-1 transition"
                        title="Delete batch calculation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
    </div>
  );
}
