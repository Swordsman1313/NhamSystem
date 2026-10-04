'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  Boxes,
  Tag,
  Layers,
  PlusCircle,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ArrowLeft,
  X,
  Plus,
  Coins,
  Warehouse,
  TrendingDown,
  Sparkles,
  Edit3,
} from 'lucide-react';
import { InventoryItem, InventoryCategory, PackagingCategory } from '@/lib/types';
import {
  getInventory,
  restockItem,
  resetInventory,
} from '@/lib/inventoryStore';
import { getSettings, formatKHR, formatUSD, updatePackagingItem, addPackagingItem } from '@/lib/storage';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function InventoryDashboardPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(4050);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'box' | 'sticker' | 'skewer' | 'low_stock'>('all');

  // Restock Modal State
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [addedQty, setAddedQty] = useState<number>(100);

  // Edit Material & Unit Cost Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEditItem, setSelectedEditItem] = useState<InventoryItem | null>(null);
  const [editFormName, setEditFormName] = useState<string>('');
  const [editFormCategory, setEditFormCategory] = useState<PackagingCategory>('box');
  const [editFormCostKHR, setEditFormCostKHR] = useState<number>(0);
  const [editFormOnHand, setEditFormOnHand] = useState<number>(0);
  const [editFormThreshold, setEditFormThreshold] = useState<number>(25);

  // New Packaging Material Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState<string>('');
  const [createCategory, setCreateCategory] = useState<PackagingCategory>('box');
  const [createCostKHR, setCreateCostKHR] = useState<number>(380);
  const [createOnHand, setCreateOnHand] = useState<number>(100);

  // Success Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reset Confirm Modal
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const openCreateMaterialModal = () => {
    setCreateName('');
    setCreateCategory('box');
    setCreateCostKHR(380);
    setCreateOnHand(100);
    setCreateModalOpen(true);
  };

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      triggerToast('Please enter a packaging material name.');
      return;
    }

    const newId = `pkg-${createCategory}-${Date.now().toString().slice(-6)}`;
    addPackagingItem({
      id: newId,
      name: createName.trim(),
      category: createCategory,
      unitCostKHR: Math.max(0, createCostKHR),
      costPerUnitKHR: Math.max(0, createCostKHR),
      onHand: Math.max(0, createOnHand),
      lowStockThreshold: createCategory === 'box' ? 40 : createCategory === 'sticker' ? 25 : 50,
    });

    setCreateModalOpen(false);
    loadData();
    triggerToast(`Added new material "${createName.trim()}" (${formatKHR(createCostKHR)}) to packaging warehouse.`);
  };

  const loadData = () => {
    setItems(getInventory());
    const settings = getSettings();
    setExchangeRate(settings.exchangeRate || 4050);
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('inventory_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('inventory_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Open restock modal for a specific item
  const openRestock = (item: InventoryItem) => {
    setSelectedItem(item);
    setAddedQty(item.category === 'skewer' ? 500 : item.category === 'box' ? 100 : 50);
    setRestockModalOpen(true);
  };

  // Confirm restock submission
  const handleConfirmRestock = () => {
    if (!selectedItem || addedQty <= 0) return;
    const res = restockItem(selectedItem.id, addedQty);
    if (res.success) {
      loadData();
      setRestockModalOpen(false);
      triggerToast(`Restocked ${addedQty.toLocaleString()} pcs of ${selectedItem.name}. New on-hand: ${res.newOnHand.toLocaleString()} pcs.`);
    }
  };

  // Reset to initial seed
  const handleResetToSeed = () => {
    resetInventory();
    loadData();
    setResetConfirmOpen(false);
    triggerToast('Packaging inventory reset to initial factory seed values.');
  };

  // Open edit material modal
  const openEditItem = (item: InventoryItem) => {
    setSelectedEditItem(item);
    setEditFormName(item.name);
    setEditFormCategory((item.category as PackagingCategory) || 'box');
    setEditFormCostKHR(item.costPerUnitKHR ?? item.unitCostKHR ?? 0);
    setEditFormOnHand(item.onHand);
    setEditFormThreshold(item.lowStockThreshold || 25);
    setEditModalOpen(true);
  };

  // Save edit material details
  const handleSaveItemEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditItem) return;
    updatePackagingItem({
      id: selectedEditItem.id,
      name: editFormName.trim() || selectedEditItem.name,
      category: editFormCategory,
      unitCostKHR: Math.max(0, editFormCostKHR),
      costPerUnitKHR: Math.max(0, editFormCostKHR),
      onHand: Math.max(0, editFormOnHand),
      lowStockThreshold: Math.max(0, editFormThreshold),
    });
    setEditModalOpen(false);
    loadData();
    triggerToast(`Updated "${selectedEditItem.name}" — Unit cost: ${formatKHR(editFormCostKHR)} (synced to BOM recipes & Costing)`);
  };

  // Synchronize Warehouse KPI Cards with exact category filtering
  const boxItems = items.filter((i) => i.category === 'box');
  const totalBoxes = boxItems.reduce((sum, i) => sum + Number(i.onHand || 0), 0);
  const smallBoxes = boxItems.find((i) => i.id === 'box-small-std')?.onHand || 0;
  const bigBoxes = boxItems.find((i) => i.id === 'box-big-300g')?.onHand || 0;

  const stickerItems = items.filter((i) => i.category === 'sticker');
  const totalStickers = stickerItems.reduce((acc, i) => acc + Number(i.onHand || 0), 0);
  const lowStockStickers = stickerItems.filter((i) => Number(i.onHand || 0) < (i.lowStockThreshold || 25));

  const skewerItems = items.filter((i) => i.category === 'skewer');
  const totalSkewers = skewerItems.reduce((acc, i) => acc + Number(i.onHand || 0), 0);

  // Total Packaging Capital ($) = sum(item.onHand * (item.unitCostKHR / 4050))
  const totalValuationUSD = items.reduce((sum, item) => {
    const unitCost = Number(item.unitCostKHR ?? item.costPerUnitKHR ?? 0);
    const onHand = Number(item.onHand || 0);
    return sum + onHand * (unitCost / (exchangeRate || 4050));
  }, 0);
  const totalValuationKHR = Math.round(totalValuationUSD * (exchangeRate || 4050));

  // Filtered Items
  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.khmerName && item.khmerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.barcodeRef && item.barcodeRef.includes(searchQuery));

    let matchCategory = true;
    if (categoryFilter === 'box') matchCategory = item.category === 'box';
    else if (categoryFilter === 'sticker') matchCategory = item.category === 'sticker';
    else if (categoryFilter === 'skewer') matchCategory = item.category === 'skewer';
    else if (categoryFilter === 'low_stock') matchCategory = item.onHand <= item.lowStockThreshold;

    return matchSearch && matchCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-900 text-white shadow-xl flex items-center justify-between border border-emerald-700 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 flex items-center justify-center text-emerald-300 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-300">Packaging Inventory Updated</div>
              <div className="text-xs sm:text-sm font-semibold">{toastMessage}</div>
            </div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-300 hover:text-white p-1.5 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold uppercase tracking-wider">
              Warehouse &amp; BOM Logistics
            </span>
            <span className="text-xs text-slate-500">Auto-Deducted per Delivery</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Packaging Inventory &amp; Stock-Out
          </h1>
          <p className="text-xs text-slate-700 font-khmer mt-0.5">
            គ្រប់គ្រងស្តុកប្រអប់ផ្លែឈើ (តូច/ធំ) ឈើចាក់ផ្លែឈើ និងស្ទីគ័រ UV ទាំង១០មុខ តាម BOM
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setResetConfirmOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition"
            title="Reset packaging inventory to default factory values"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={openCreateMaterialModal}
            className="inline-flex items-center space-x-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold px-3.5 py-2 rounded-xl shadow-2xs transition transform active:scale-95 text-xs sm:text-sm"
            title="Create new raw packaging material (Box, Sticker, Skewer, Other)"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>New Material</span>
          </button>

          <button
            onClick={() => {
              if (items.length > 0) openRestock(items[0]);
            }}
            className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl shadow-xs transition transform active:scale-95 text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Restock Packaging</span>
          </button>
        </div>
      </div>

      {/* Breadcrumb Navigation Header */}
      <div className="flex items-center space-x-2 text-xs text-slate-500 pb-1">
        <span className="font-semibold text-slate-700">Production &amp; Inventory</span>
        <span>/</span>
        <span className="font-bold text-slate-900">Packaging Warehouse (ស្តុកសម្ភារៈ)</span>
      </div>

      {/* 3 Core Summary Cards (User Requested) + Asset Valuation Tile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Summary Card 1: Total Boxes On-Hand */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              1. Total Boxes On-Hand
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {totalBoxes.toLocaleString()}{' '}
              <span className="text-sm font-semibold text-slate-500">boxes</span>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Small Std: <strong className="text-emerald-800">{smallBoxes.toLocaleString()}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600">
                Big 300G: <strong className="text-emerald-800">{bigBoxes.toLocaleString()}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Summary Card 2: Total Stickers On-Hand */}
        <div className="bg-white rounded-2xl p-5 border border-indigo-200 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              2. Total Stickers On-Hand
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-slate-900 tracking-tight">
                {totalStickers.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-slate-500">pcs (10 SKUs)</span>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              {lowStockStickers.length > 0 ? (
                <span className="inline-flex items-center text-amber-700 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-500" />
                  {lowStockStickers.length} SKUs &lt; 25 pcs
                </span>
              ) : (
                <span className="inline-flex items-center text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  All 10 SKUs healthy (≥ 25)
                </span>
              )}
              <span className="text-[11px] text-slate-400">110៛/pc</span>
            </div>
          </div>
        </div>

        {/* Summary Card 3: Total Skewers On-Hand */}
        <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              3. Total Skewers On-Hand
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {totalSkewers.toLocaleString()}{' '}
              <span className="text-sm font-semibold text-slate-500">skewers</span>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                1:1 consumption per box
              </span>
              <span className="text-[11px] text-slate-400">30៛/pc</span>
            </div>
          </div>
        </div>

        {/* Card 4: Packaging Asset Valuation */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Packaging Capital
            </span>
            <div className="w-10 h-10 rounded-xl bg-white/10 text-citrus-300 flex items-center justify-center">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
              {formatUSD(totalValuationUSD)}
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-300">
                ≈ {formatKHR(totalValuationKHR)}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                1$={exchangeRate.toLocaleString()}៛
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search packaging item, Khmer name, or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        {/* Filter Badges */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'all', label: `All (${items.length})` },
            { id: 'box', label: `Boxes (${boxItems.length})` },
            { id: 'sticker', label: `Stickers (${stickerItems.length})` },
            { id: 'skewer', label: `Skewers (1)` },
            {
              id: 'low_stock',
              label: `Low Stock (${items.filter((i) => i.onHand <= i.lowStockThreshold).length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                categoryFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Packaging Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Item Name / Khmer Description</th>
                <th className="py-3 px-3 text-center">Category</th>
                <th className="py-3 px-4 text-center">On-Hand Qty</th>
                <th className="py-3 px-4 text-right">Unit Cost (KHR)</th>
                <th className="py-3 px-4 text-right">Total Value (KHR)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                    No packaging items match your current filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLow = item.onHand <= item.lowStockThreshold;
                  const isZero = item.onHand === 0;
                  const totalValue = item.onHand * item.costPerUnitKHR;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isZero
                          ? 'bg-red-50/30'
                          : isLow
                          ? 'bg-amber-50/30'
                          : ''
                      }`}
                    >
                      {/* Name & Khmer */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">
                          {item.name}
                        </div>
                        {item.khmerName && (
                          <div className="text-[11px] text-slate-600 font-khmer mt-0.5">
                            {item.khmerName}
                          </div>
                        )}
                        {item.barcodeRef && (
                          <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 inline-block mt-1">
                            Barcode: {item.barcodeRef}
                          </span>
                        )}
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-3 text-center">
                        {item.category === 'box' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Box
                          </span>
                        ) : item.category === 'sticker' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                            UV Sticker
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Skewer
                          </span>
                        )}
                      </td>

                      {/* On-Hand Quantity */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono font-black text-base ${
                            isZero
                              ? 'text-red-600'
                              : isLow
                              ? 'text-amber-700'
                              : 'text-slate-900'
                          }`}
                        >
                          {item.onHand.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          pcs (Min: {item.lowStockThreshold})
                        </span>
                      </td>

                      {/* Unit Cost KHR */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                        {formatKHR(item.costPerUnitKHR)}
                      </td>

                      {/* Total Value KHR */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-black text-slate-900 text-xs">
                          {formatKHR(totalValue)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ≈ {formatUSD(totalValue / exchangeRate)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isZero ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Low Stock (&lt;{item.lowStockThreshold})
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            In Stock
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => openEditItem(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-slate-100 transition"
                            title="Edit unit cost & stock settings"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openRestock(item)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-900 font-bold border border-emerald-200 transition text-xs shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Restock</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock Modal */}
      {restockModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Restock Packaging
                  </h3>
                  <p className="text-xs text-slate-500 font-khmer">
                    បន្ថែមចំនួនស្តុកសម្ភារៈវេចខ្ចប់ថ្មី
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRestockModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Item Details Summary */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Target Item:
              </div>
              <div className="font-bold text-slate-900 text-sm">
                {selectedItem.name}
              </div>
              {selectedItem.khmerName && (
                <div className="text-xs text-slate-600 font-khmer">
                  {selectedItem.khmerName}
                </div>
              )}
              <div className="pt-2 mt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">Current On-Hand:</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedItem.onHand.toLocaleString()} pcs
                </span>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Quick Add Presets:
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[50, 100, 200, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAddedQty(preset)}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                      addedQty === preset
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    +{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Quantity Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Quantity to Add (Pcs):
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={addedQty || ''}
                  onChange={(e) => setAddedQty(Math.max(1, parseInt(e.target.value, 10) || 0))}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-xl text-lg font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-slate-500 uppercase">
                  Pcs
                </span>
              </div>
            </div>

            {/* Calculation Preview */}
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">New On-Hand Total:</span>
                <span className="font-mono font-black text-emerald-900 text-sm">
                  {(selectedItem.onHand + addedQty).toLocaleString()} pcs
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Estimated Batch Cost:</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatKHR(addedQty * selectedItem.costPerUnitKHR)}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setRestockModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestock}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition active:scale-95 flex items-center space-x-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Confirm Restock</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Material & Unit Cost Modal */}
      {editModalOpen && selectedEditItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Edit Packaging Material
                  </h3>
                  <p className="text-xs text-slate-500 font-khmer">
                    កែប្រែតម្លៃដើម និងកម្រិតស្តុកអប្បបរមា
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItemEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Material Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFormName}
                  onChange={(e) => setEditFormName(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category *
                </label>
                <select
                  value={editFormCategory}
                  onChange={(e) => setEditFormCategory(e.target.value as PackagingCategory)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="box">Box (ប្រអប់ផ្លែឈើ)</option>
                  <option value="sticker">Sticker (ស្ទីគ័រ UV)</option>
                  <option value="skewer">Skewer (ឈើចាក់ផ្លែឈើ)</option>
                  <option value="other">Other Material</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                    Unit Cost (៛ KHR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={editFormCostKHR}
                    onChange={(e) => setEditFormCostKHR(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-xs font-mono font-bold border border-emerald-300 rounded-xl px-3 py-2 text-emerald-950 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-emerald-50/40"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    ≈ {formatUSD(editFormCostKHR / exchangeRate)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Current Stock (Pcs) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={editFormOnHand}
                    onChange={(e) => setEditFormOnHand(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Low Stock Alert Threshold (Pcs)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editFormThreshold}
                  onChange={(e) => setEditFormThreshold(parseInt(e.target.value, 10) || 0)}
                  className="w-full text-xs font-mono font-bold border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                ⚡ <strong>Instant Sync:</strong> Changing material cost here immediately recalculates BOM recipe costs in Product Studio and batch profit margins in Batch Costing.
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition active:scale-95"
                >
                  Save &amp; Sync
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Raw Packaging Material Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Add New Packaging Material
                  </h3>
                  <p className="text-xs text-slate-500 font-khmer">
                    បន្ថែមសម្ភារៈវេចខ្ចប់ថ្មី (ប្រអប់ ស្ទីគ័រ ឈើចាក់ ឬផ្សេងៗ)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMaterial} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Material Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 500ml Clear Fruit Tub, Logo Bag..."
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category *
                </label>
                <select
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value as PackagingCategory)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="box">Box (ប្រអប់ផ្លែឈើ)</option>
                  <option value="sticker">Sticker (ស្ទីគ័រ UV)</option>
                  <option value="skewer">Skewer (ឈើចាក់ផ្លែឈើ)</option>
                  <option value="other">Other Material (ផ្សេងៗ / ម្សៅម្ទេស)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                    Unit Cost (៛ KHR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={createCostKHR}
                    onChange={(e) => setCreateCostKHR(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-xs font-mono font-bold border border-emerald-300 rounded-xl px-3 py-2 text-emerald-950 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-emerald-50/40"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    ≈ {formatUSD(createCostKHR / exchangeRate)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Initial Stock (Pcs) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={createOnHand}
                    onChange={(e) => setCreateOnHand(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Available in Recipe Studio:</strong> Once created, this packaging material is instantly available in the BOM Recipe Builder across all fruit products.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition active:scale-95 flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Material</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={resetConfirmOpen}
        title="Reset Packaging Inventory?"
        khmerTitle="កំណត់ស្តុកសម្ភារៈវេចខ្ចប់ឡើងវិញ"
        message="Are you sure you want to reset all packaging stock to initial factory defaults (300 small boxes, 200 big boxes, 1,000 skewers, and 100 UV stickers per SKU)?"
        confirmText="Reset to Defaults"
        cancelText="Cancel"
        variant="warning"
        onConfirm={handleResetToSeed}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  );
}
