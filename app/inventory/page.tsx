'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ArrowLeft,
  X,
  Plus,
  Coins,
  Warehouse,
  TrendingDown,
  Sparkles,
  Edit3,
  Trash2,
  FolderPlus,
  Pencil,
  Check,
  ChevronDown,
} from 'lucide-react';
import { InventoryItem, InventoryCategory, PackagingCategory, PackagingCategoryRecord } from '@/lib/types';
import {
  getInventory,
  restockItem,
} from '@/lib/inventoryStore';
import {
  getSettings,
  formatKHR,
  formatUSD,
  updatePackagingItem,
  addPackagingItem,
  getPackagingCategories,
  savePackagingCategories,
  savePackagingItems,
  getPackagingItems,
  addPackagingCategory,
  updatePackagingCategory,
  deletePackagingCategory,
} from '@/lib/storage';
import ConfirmModal from '@/components/ui/ConfirmModal';

function CategorySelect({
  value,
  onChange,
  categories,
}: {
  value: string;
  onChange: (val: string) => void;
  categories: PackagingCategoryRecord[];
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

  const selectedCat = categories.find(
    (c) => c.id === value || c.name.toLowerCase() === value.toLowerCase()
  );
  const label = selectedCat?.name || value || 'Select Category';

  const getCategoryIcon = (idOrName: string) => {
    const id = idOrName.toLowerCase();
    if (id === 'box') return <Boxes className="w-4 h-4 text-emerald-600" />;
    if (id === 'sticker') return <Tag className="w-4 h-4 text-indigo-600" />;
    if (id === 'skewer') return <Layers className="w-4 h-4 text-amber-600" />;
    return <Package className="w-4 h-4 text-purple-600" />;
  };

  const getCategoryBadgeClass = (idOrName: string) => {
    const id = idOrName.toLowerCase();
    if (id === 'box') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (id === 'sticker') return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    if (id === 'skewer') return 'bg-amber-50 text-amber-800 border-amber-200';
    return 'bg-purple-50 text-purple-800 border-purple-200';
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-white border border-slate-300 hover:border-emerald-500 rounded-xl transition shadow-2xs text-left focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer group"
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
            {getCategoryIcon(selectedCat?.id || value)}
          </div>
          <span className="font-bold text-xs text-slate-900 truncate">
            {label}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${getCategoryBadgeClass(selectedCat?.id || value)}`}>
            {selectedCat?.id || value}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-emerald-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 space-y-1 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          {categories.map((cat) => {
            const isSelected = (selectedCat?.id || value) === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onChange(cat.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200 shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    {getCategoryIcon(cat.id)}
                  </div>
                  <span className="truncate">{cat.name}</span>
                  <span className={`text-[9px] font-mono px-1 py-0.2 rounded border ${getCategoryBadgeClass(cat.id)}`}>
                    {cat.id}
                  </span>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function InventoryDashboardPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<PackagingCategoryRecord[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(4050);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Category Manager Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<PackagingCategoryRecord | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState<string>('');

  // Restock Modal State
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [addedQty, setAddedQty] = useState<number>(100);

  // Edit Material & Unit Cost Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEditItem, setSelectedEditItem] = useState<InventoryItem | null>(null);
  const [editFormName, setEditFormName] = useState<string>('');
  const [editFormCategory, setEditFormCategory] = useState<string>('box');
  const [editFormCostKHR, setEditFormCostKHR] = useState<number>(0);
  const [editFormOnHand, setEditFormOnHand] = useState<number>(0);
  const [editFormThreshold, setEditFormThreshold] = useState<number>(25);

  // New Packaging Material Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState<string>('');
  const [createCategory, setCreateCategory] = useState<string>('box');
  const [createCostKHR, setCreateCostKHR] = useState<number>(380);
  const [createOnHand, setCreateOnHand] = useState<number>(100);

  // Success Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const openCreateMaterialModal = () => {
    setCreateName('');
    setCreateCategory(categories.length > 0 ? categories[0].id : 'box');
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

  const handleCreateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      triggerToast('Please enter a category name.');
      return;
    }
    const duplicate = categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      triggerToast(`Category "${trimmed}" already exists.`);
      return;
    }

    const slug = (str: string) =>
      str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `cat-${Date.now()}`;
    const id = slug(trimmed);
    const uniqueId = categories.some((c) => c.id === id) ? `${id}-${Date.now().toString().slice(-4)}` : id;

    const newCategory: PackagingCategoryRecord = {
      id: uniqueId,
      name: trimmed,
      isProtected: false,
    };
    const updated = [...categories, newCategory];
    setCategories(updated);
    savePackagingCategories(updated);
    setNewCategoryName('');
    triggerToast(`Created packaging category "${trimmed}".`);
  };

  const handleStartRename = (cat: PackagingCategoryRecord) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
  };

  const handleCancelRename = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const handleSaveRename = (cat: PackagingCategoryRecord) => {
    const trimmed = editingCategoryName.trim();
    if (!trimmed) {
      triggerToast('Category name cannot be empty.');
      return;
    }
    if (trimmed === cat.name) {
      setEditingCategoryId(null);
      return;
    }
    const isDuplicate = categories.some(
      (c) => c.id !== cat.id && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      triggerToast(`Category "${trimmed}" already exists.`);
      return;
    }

    const oldName = cat.name;
    const newName = trimmed;

    // a. Update category's name in categories list
    const updatedCategories = categories.map((c) =>
      c.id === cat.id ? { ...c, name: newName } : c
    );
    setCategories(updatedCategories);
    savePackagingCategories(updatedCategories);

    // b. Cascade update all items in packagingItems:
    // find all materials where item.category === oldName and update them to item.category = newName
    const currentItems = getPackagingItems();
    let cascadeCount = 0;
    const updatedItems = currentItems.map((item) => {
      const itemCat = typeof item.category === 'string' ? item.category : (item.category as any)?.id || (item.category as any)?.name;
      if (itemCat === oldName || itemCat?.toLowerCase() === oldName.toLowerCase()) {
        cascadeCount++;
        return {
          ...item,
          category: newName,
        };
      }
      return item;
    });

    // c. Save both updated categories and updated packaging items to LocalStorage
    if (cascadeCount > 0) {
      savePackagingItems(updatedItems);
      setItems(getInventory());
    }

    setEditingCategoryId(null);
    setEditingCategoryName('');
    triggerToast(`Renamed category to "${newName}"${cascadeCount > 0 ? ` and updated ${cascadeCount} linked material(s)` : ''}.`);
  };

  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    const success = deletePackagingCategory(categoryToDelete.id);
    if (success) {
      triggerToast(`Deleted category "${categoryToDelete.name}".`);
      setCategories(getPackagingCategories());
    } else {
      triggerToast('Cannot delete system core category.');
    }
    setCategoryToDelete(null);
  };

  const loadData = () => {
    setItems(getInventory());
    setCategories(getPackagingCategories());
    const settings = getSettings();
    setExchangeRate(settings.exchangeRate || 4050);
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('inventory_updated', handleUpdate);
    window.addEventListener('categories_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('inventory_updated', handleUpdate);
      window.removeEventListener('categories_updated', handleUpdate);
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

  // Open edit material modal
  const openEditItem = (item: InventoryItem) => {
    setSelectedEditItem(item);
    setEditFormName(item.name);
    setEditFormCategory((typeof item.category === 'string' ? item.category : (item.category as any)?.id) || 'box');
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
    if (categoryFilter === 'low_stock') {
      matchCategory = item.onHand <= item.lowStockThreshold;
    } else if (categoryFilter !== 'all') {
      matchCategory = item.category === categoryFilter;
    }

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
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCategoryModalOpen(true)}
            className="inline-flex items-center space-x-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold px-3 py-2 rounded-xl shadow-2xs transition transform active:scale-95 text-xs sm:text-sm cursor-pointer"
            title="Manage packaging material categories"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Categories</span>
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

      {/* 3 Core Summary Cards (User Requested) + Asset Valuation Tile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Summary Card 1: Total Boxes On-Hand */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-emerald-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              1. Total Boxes
            </span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Boxes className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {totalBoxes.toLocaleString()}{' '}
              <span className="text-xs sm:text-sm font-semibold text-slate-500">boxes</span>
            </div>
            <div className="mt-2 pt-2 sm:mt-2.5 sm:pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs flex-wrap gap-1">
              <span className="text-slate-600">
                Sm: <strong className="text-emerald-800">{smallBoxes.toLocaleString()}</strong>
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-slate-600">
                Big: <strong className="text-emerald-800">{bigBoxes.toLocaleString()}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Summary Card 2: Total Stickers On-Hand */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-indigo-200 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              2. Total Stickers
            </span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="flex items-baseline space-x-1 sm:space-x-2">
              <span className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {totalStickers.toLocaleString()}
              </span>
              <span className="text-[11px] sm:text-sm font-semibold text-slate-500">pcs</span>
            </div>
            <div className="mt-2 pt-2 sm:mt-2.5 sm:pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs">
              {lowStockStickers.length > 0 ? (
                <span className="inline-flex items-center text-amber-700 font-bold">
                  <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 text-amber-500" />
                  {lowStockStickers.length} low
                </span>
              ) : (
                <span className="inline-flex items-center text-emerald-700 font-semibold truncate">
                  <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 text-emerald-600 shrink-0" />
                  Healthy
                </span>
              )}
              <span className="text-[10px] sm:text-[11px] text-slate-400">110៛/pc</span>
            </div>
          </div>
        </div>

        {/* Summary Card 3: Total Skewers On-Hand */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-amber-200 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
              3. Total Skewers
            </span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {totalSkewers.toLocaleString()}{' '}
              <span className="text-[11px] sm:text-sm font-semibold text-slate-500">pcs</span>
            </div>
            <div className="mt-2 pt-2 sm:mt-2.5 sm:pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs">
              <span className="text-slate-600">
                1:1 box
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-400">30៛/pc</span>
            </div>
          </div>
        </div>

        {/* Card 4: Packaging Asset Valuation */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-3.5 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
              Packaging Capital
            </span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/10 text-citrus-300 flex items-center justify-center shrink-0">
              <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-3xl font-black text-white tracking-tight font-mono">
              {formatUSD(totalValuationUSD)}
            </div>
            <div className="mt-2 pt-2 sm:mt-2.5 sm:pt-2.5 border-t border-white/10 text-[11px] sm:text-xs">
              <span className="text-slate-300">
                ≈ {formatKHR(totalValuationKHR)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
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
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-1 max-w-full">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
              categoryFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({items.length})
          </button>
          {categories.map((cat) => {
            const count = items.filter((i) => i.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                  categoryFilter === cat.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
          <button
            onClick={() => setCategoryFilter('low_stock')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
              categoryFilter === 'low_stock'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Low Stock ({items.filter((i) => i.onHand <= i.lowStockThreshold).length})
          </button>
        </div>
      </div>

      {/* Packaging Inventory List: Desktop Table (hidden on mobile) + Mobile Stacked Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Mobile View: Clean Stacked Cards (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 italic text-xs">
              No packaging items match your current filter.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isLow = item.onHand <= item.lowStockThreshold;
              const isZero = item.onHand === 0;
              const totalValue = item.onHand * item.costPerUnitKHR;

              const categoryStr = typeof item.category === 'string' ? item.category : (item.category as any)?.id || 'box';
              const catObj = categories.find((c) => c.id === categoryStr);
              const categoryLabel: string = catObj?.name || (categoryStr === 'box' ? 'Box' : categoryStr === 'sticker' ? 'UV Sticker' : categoryStr === 'skewer' ? 'Skewer' : categoryStr);
              const isBox = categoryStr === 'box';
              const isSticker = categoryStr === 'sticker';
              const isSkewer = categoryStr === 'skewer';

              const colorClass = isBox
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : isSticker
                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                : isSkewer
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-purple-50 text-purple-800 border-purple-200';

              return (
                <div
                  key={item.id}
                  className={`p-4 space-y-3 transition-colors ${
                    isZero ? 'bg-red-50/20' : isLow ? 'bg-amber-50/20' : 'bg-white'
                  }`}
                >
                  {/* Card Header: Item Name (Khmer + English) + Category Badge + Stock Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-sm leading-snug">
                        {item.name}
                      </div>
                      {item.khmerName && (
                        <div className="text-[11px] text-slate-600 font-khmer mt-0.5">
                          {item.khmerName}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0 flex-wrap justify-end gap-y-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${colorClass}`}>
                        {categoryLabel}
                      </span>
                      {isZero ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                          <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                          Out
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                          Low
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 text-emerald-600" />
                          In Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body: Grid with On-Hand Quantity, Unit Cost, and Total Value */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block">On-Hand</span>
                      <span
                        className={`font-mono font-black text-sm block ${
                          isZero ? 'text-red-600' : isLow ? 'text-amber-700' : 'text-slate-900'
                        }`}
                      >
                        {item.onHand.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">pcs</span>
                      </span>
                      <span className="text-[9px] text-slate-400 block">Min: {item.lowStockThreshold}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 font-medium block">Unit Cost</span>
                      <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block">
                        {formatKHR(item.costPerUnitKHR)}
                      </span>
                      <span className="text-[9px] text-slate-400 block font-mono">
                        ≈ {formatUSD(item.costPerUnitKHR / exchangeRate)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-medium block">Total Value</span>
                      <span className="font-mono font-black text-slate-900 text-xs mt-0.5 block">
                        {formatKHR(totalValue)}
                      </span>
                      <span className="text-[9px] text-slate-400 block font-mono">
                        ≈ {formatUSD(totalValue / exchangeRate)}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer: Barcode chip (if sticker) + Action buttons */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div>
                      {item.barcodeRef ? (
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 inline-block border border-slate-200">
                          Barcode: {item.barcodeRef}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No barcode</span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => openEditItem(item)}
                        className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold transition flex items-center space-x-1 shadow-2xs active:scale-95"
                        title="Edit unit cost & stock settings"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openRestock(item)}
                        className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center space-x-1 shadow-2xs active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Restock</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Standard Table (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
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
                        {(() => {
                          const categoryStr = typeof item.category === 'string' ? item.category : (item.category as any)?.id || 'box';
                          const catObj = categories.find((c) => c.id === categoryStr);
                          const label: string = catObj?.name || (categoryStr === 'box' ? 'Box' : categoryStr === 'sticker' ? 'UV Sticker' : categoryStr === 'skewer' ? 'Skewer' : categoryStr);
                          const isBox = categoryStr === 'box';
                          const isSticker = categoryStr === 'sticker';
                          const isSkewer = categoryStr === 'skewer';

                          const colorClass = isBox
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : isSticker
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            : isSkewer
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-purple-50 text-purple-800 border-purple-200';

                          return (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${colorClass}`}>
                              {label}
                            </span>
                          );
                        })()}
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 max-h-[90dvh] overflow-y-auto shadow-2xl border-t sm:border border-slate-200 space-y-5 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 max-h-[90dvh] overflow-y-auto shadow-2xl border-t sm:border border-slate-200 space-y-4 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
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
                <CategorySelect
                  value={editFormCategory}
                  onChange={setEditFormCategory}
                  categories={categories}
                />
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 max-h-[90dvh] overflow-y-auto shadow-2xl border-t sm:border border-slate-200 space-y-4 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
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
                <CategorySelect
                  value={createCategory}
                  onChange={setCreateCategory}
                  categories={categories}
                />
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



      {/* Packaging Categories Management Modal */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 max-h-[90dvh] overflow-y-auto shadow-2xl border-t sm:border border-slate-200 space-y-5 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Packaging Categories
                  </h3>
                  <p className="text-xs text-slate-500 font-khmer">
                    គ្រប់គ្រងប្រភេទសម្ភារៈវេចខ្ចប់ (Box, Sticker, Skewer, etc.)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add Category Form */}
            <form onSubmit={handleCreateCategorySubmit} className="flex items-center space-x-2">
              <div className="relative flex-1">
                <FolderPlus className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="New category name (e.g. Shrink Wrap, Sauce Cup)..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 shrink-0 flex items-center space-x-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            {/* Categories List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                Active Categories ({categories.length})
              </div>
              {categories.map((cat) => {
                const count = items.filter((item) => {
                  const itemCat = typeof item.category === 'string' ? item.category : (item.category as any)?.id || (item.category as any)?.name;
                  return (
                    itemCat?.toLowerCase() === cat.id?.toLowerCase() ||
                    itemCat?.toLowerCase() === cat.name?.toLowerCase()
                  );
                }).length;
                const isCore = cat.isProtected || cat.id === 'box' || cat.id === 'sticker' || cat.id === 'skewer';
                const isEditing = editingCategoryId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 flex items-center justify-between text-xs transition gap-2"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      {isEditing ? (
                        <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveRename(cat);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                handleCancelRename();
                              }
                            }}
                            autoFocus
                            placeholder="Category name..."
                            className="w-full px-2.5 py-1 text-xs font-bold border border-indigo-400 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(cat)}
                            className="p-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 transition shrink-0 cursor-pointer"
                            title="Save name"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelRename}
                            className="p-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-300 transition shrink-0 cursor-pointer"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <span className="truncate">{cat.name}</span>
                            <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                              {cat.id}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {count} material items linked
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {/* Pencil Icon Button (for all categories including core categories) */}
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => handleStartRename(cat)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          title={`Rename "${cat.name}" category`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isCore ? (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200"
                          title="Core system category required by Fruit Products BOM"
                        >
                          Core System
                        </span>
                      ) : (
                        <div className="relative group">
                          <button
                            type="button"
                            disabled={count > 0}
                            onClick={() => {
                              if (count === 0) setCategoryToDelete(cat);
                            }}
                            className={`p-1.5 rounded-lg transition ${
                              count > 0
                                ? 'text-slate-300 cursor-not-allowed opacity-40'
                                : 'text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                            }`}
                            title={
                              count > 0
                                ? 'Cannot delete category with active materials. Reassign or delete the items first.'
                                : `Delete "${cat.name}" category`
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Helper Info */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-[11px] text-indigo-900">
              💡 <strong>System Note:</strong> Core categories (Box, UV Sticker, Skewer) are required for standard Fruit BOM cost calculations and cannot be deleted. Custom categories can be added and assigned to any packaging material.
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCategoryModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirm Modal */}
      <ConfirmModal
        isOpen={!!categoryToDelete}
        title={`Delete Category "${categoryToDelete?.name}"?`}
        khmerTitle="លុបប្រភេទសម្ភារៈវេចខ្ចប់"
        message={`Are you sure you want to delete the category "${categoryToDelete?.name}"? Items currently assigned to this category will remain in inventory.`}
        confirmText="Delete Category"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDeleteCategory}
        onCancel={() => setCategoryToDelete(null)}
      />
    </div>
  );
}
