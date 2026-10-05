'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Coins,
  Package,
  Building2,
  Save,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  Store as StoreIcon,
  Barcode,
  CreditCard,
  Phone,
  MapPin,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Archive,
  Check,
  Search,
  X,
} from 'lucide-react';
import {
  getSettings,
  saveSettings,
  getStores,
  saveStores,
  addStore,
  updateStore,
  deleteStore,
  toggleStoreActive,
  getProducts,
  saveProducts,
  exportAllData,
  importAllData,
  resetAllData,
} from '@/lib/storage';
import { AppSettings, Store, Product } from '@/lib/types';
import { resetInventory } from '@/lib/inventoryStore';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function SettingsPage() {
  const [settings, setSettingsState] = useState<AppSettings>(getSettings());
  const [stores, setStoresState] = useState<Store[]>([]);
  const [products, setProductsState] = useState<Product[]>([]);
  const [saveToast, setSaveToast] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Store CRUD State
  const [storeSearch, setStoreSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [storeFormCode, setStoreFormCode] = useState('');
  const [storeFormCustomerName, setStoreFormCustomerName] = useState('');
  const [storeFormShipTo, setStoreFormShipTo] = useState('');
  const [storeFormAddress, setStoreFormAddress] = useState('');
  const [storeFormPhone, setStoreFormPhone] = useState('');
  const [storeFormTermsDays, setStoreFormTermsDays] = useState(15);
  const [storeFormIsActive, setStoreFormIsActive] = useState(true);

  // Store Delete Confirm
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);

  // Modal Dialog States
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmPackagingResetOpen, setConfirmPackagingResetOpen] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
  }>({ isOpen: false, title: '', message: '' });

  const loadData = () => {
    setSettingsState(getSettings());
    setStoresState(getStores());
    setProductsState(getProducts());
  };

  useEffect(() => {
    loadData();
    const handleStoresUpdated = () => loadData();
    window.addEventListener('stores_updated', handleStoresUpdated);
    window.addEventListener('storage', handleStoresUpdated);
    return () => {
      window.removeEventListener('stores_updated', handleStoresUpdated);
      window.removeEventListener('storage', handleStoresUpdated);
    };
  }, []);

  const handleSaveSettings = () => {
    saveSettings(settings);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const openNewStoreModal = () => {
    setEditingStoreId(null);
    setStoreFormCode('');
    setStoreFormCustomerName('');
    setStoreFormShipTo('');
    setStoreFormAddress('');
    setStoreFormPhone('');
    setStoreFormTermsDays(15);
    setStoreFormIsActive(true);
    setStoreModalOpen(true);
  };

  const openEditStoreModal = (s: Store) => {
    setEditingStoreId(s.id || s.code);
    setStoreFormCode(s.code);
    setStoreFormCustomerName(s.customerName);
    setStoreFormShipTo(s.shipTo);
    setStoreFormAddress(s.address);
    setStoreFormPhone(s.phone);
    setStoreFormTermsDays(s.termsDays || 15);
    setStoreFormIsActive(s.isActive !== false);
    setStoreModalOpen(true);
  };

  const handleSaveStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeFormCode.trim() || !storeFormCustomerName.trim() || !storeFormShipTo.trim()) {
      setAlertModal({
        isOpen: true,
        title: 'Missing Required Fields',
        message: 'Please provide Store Code, Legal Entity (Bill To), and Branch (Ship To).',
        variant: 'warning',
      });
      return;
    }

    if (editingStoreId) {
      updateStore({
        id: editingStoreId,
        code: storeFormCode.trim().toUpperCase(),
        customerName: storeFormCustomerName.trim(),
        shipTo: storeFormShipTo.trim(),
        address: storeFormAddress.trim(),
        phone: storeFormPhone.trim(),
        termsDays: Math.max(0, Number(storeFormTermsDays)),
        creditTermsDays: Math.max(0, Number(storeFormTermsDays)),
        isActive: storeFormIsActive,
      });
    } else {
      addStore({
        code: storeFormCode.trim().toUpperCase(),
        customerName: storeFormCustomerName.trim(),
        shipTo: storeFormShipTo.trim(),
        address: storeFormAddress.trim(),
        phone: storeFormPhone.trim(),
        termsDays: Math.max(0, Number(storeFormTermsDays)),
        creditTermsDays: Math.max(0, Number(storeFormTermsDays)),
        isActive: storeFormIsActive,
      });
    }

    setStoreModalOpen(false);
    loadData();
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleToggleStoreActive = (storeId: string) => {
    toggleStoreActive(storeId);
    loadData();
  };

  const handleConfirmDeleteStore = () => {
    if (!storeToDelete) return;
    deleteStore(storeToDelete.id || storeToDelete.code);
    setStoreToDelete(null);
    loadData();
  };

  const filteredStores = stores.filter((s) => {
    if (storeFilter === 'active' && s.isActive === false) return false;
    if (storeFilter === 'archived' && s.isActive !== false) return false;
    if (!storeSearch.trim()) return true;
    const q = storeSearch.toLowerCase();
    return (
      s.code.toLowerCase().includes(q) ||
      s.shipTo.toLowerCase().includes(q) ||
      s.customerName.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q) ||
      s.phone.includes(q)
    );
  });

  // Export JSON backup
  const handleExportJSON = () => {
    const dataStr = exportAllData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nhamnham-ops-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importAllData(content);
        if (success) {
          setImportStatus('Backup restored successfully!');
          loadData();
        } else {
          setImportStatus('Error importing JSON file. Please check format.');
        }
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  // Reset to seed data
  const handleResetToDefaults = () => {
    setConfirmResetOpen(true);
  };

  const executeReset = () => {
    resetAllData();
    loadData();
    setConfirmResetOpen(false);
    setAlertModal({
      isOpen: true,
      title: 'Database Reset Complete',
      message: 'All stores, fruit catalog SKUs, settings, and seed delivery invoices have been successfully restored to initial defaults.',
      variant: 'success',
    });
  };

  // Reset Packaging Warehouse Stock
  const handleResetPackagingStock = () => {
    setConfirmPackagingResetOpen(true);
  };

  const executePackagingReset = () => {
    resetInventory();
    loadData();
    setConfirmPackagingResetOpen(false);
    setAlertModal({
      isOpen: true,
      title: 'Packaging Inventory Reset',
      message: 'All packaging materials, boxes, skewers, and UV stickers have been restored to initial factory starting quantities (300 small boxes, 200 big boxes, 1,000 skewers, 100 stickers per SKU).',
      variant: 'success',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              System Settings &amp; Master Data
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold uppercase">
              Configuration
            </span>
          </div>
          <p className="text-xs text-slate-700 font-khmer mt-0.5">
            កំណត់អត្រាប្តូរប្រាក់ ថ្លៃដើមសម្ភារៈវេចខ្ចប់ (BOM) គណនីធនាគារ ABA និងទិន្នន័យសាខា
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-xs transition transform active:scale-95 text-xs sm:text-sm self-start sm:self-auto"
        >
          {saveToast ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Settings Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Financial & BOM Defaults */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Coins className="w-4 h-4 text-amber-500" />
              <span>Financial &amp; BOM Defaults</span>
            </h2>

            <div className="space-y-3">
              {/* Exchange Rate */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Exchange Rate (KHR per 1 USD)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={settings.exchangeRate}
                    onChange={(e) =>
                      setSettingsState({
                        ...settings,
                        exchangeRate: parseInt(e.target.value, 10) || 4050,
                      })
                    }
                    className="w-full text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    KHR / $
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Default standard in Cambodia: 4,050 KHR
                </span>
              </div>

              {/* Tub + Sticker Cost */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Tub + UV Sticker Overhead (KHR / box)
                </label>
                <input
                  type="number"
                  value={settings.defaultTubStickerKHR}
                  onChange={(e) =>
                    setSettingsState({
                      ...settings,
                      defaultTubStickerKHR: parseInt(e.target.value, 10) || 500,
                    })
                  }
                  className="w-full text-sm font-mono font-semibold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Cold Wash Dip */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Cold Wash Dip Solution (KHR / box)
                </label>
                <input
                  type="number"
                  value={settings.defaultColdWashKHR}
                  onChange={(e) =>
                    setSettingsState({
                      ...settings,
                      defaultColdWashKHR: parseInt(e.target.value, 10) || 10,
                    })
                  }
                  className="w-full text-sm font-mono font-semibold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {/* Route Fuel Expense */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Route Fuel Expense (KHR / batch run)
                </label>
                <input
                  type="number"
                  value={settings.defaultFuelKHR}
                  onChange={(e) =>
                    setSettingsState({
                      ...settings,
                      defaultFuelKHR: parseInt(e.target.value, 10) || 8000,
                    })
                  }
                  className="w-full text-sm font-mono font-semibold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Supplier Profile (Header & ABA Payment Footer) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Supplier Profile &amp; ABA Payment Footer</span>
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supplier Name
                </label>
                <input
                  type="text"
                  value={settings.supplierProfile.name}
                  onChange={(e) =>
                    setSettingsState({
                      ...settings,
                      supplierProfile: { ...settings.supplierProfile, name: e.target.value },
                    })
                  }
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Khmer Name (Header)
                </label>
                <input
                  type="text"
                  value={settings.supplierProfile.khmerName}
                  onChange={(e) =>
                    setSettingsState({
                      ...settings,
                      supplierProfile: { ...settings.supplierProfile, khmerName: e.target.value },
                    })
                  }
                  className="w-full text-xs font-khmer font-bold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Address (អាសយដ្ឋាន)
                </label>
                <input
                  type="text"
                  value={settings.supplierProfile.address}
                  onChange={(e) =>
                    setSettingsState({
                      ...settings,
                      supplierProfile: { ...settings.supplierProfile, address: e.target.value },
                    })
                  }
                  className="w-full text-xs font-khmer bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Telephone
                  </label>
                  <input
                    type="text"
                    value={settings.supplierProfile.phone}
                    onChange={(e) =>
                      setSettingsState({
                        ...settings,
                        supplierProfile: { ...settings.supplierProfile, phone: e.target.value },
                      })
                    }
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={settings.supplierProfile.bankName}
                    onChange={(e) =>
                      setSettingsState({
                        ...settings,
                        supplierProfile: { ...settings.supplierProfile, bankName: e.target.value },
                      })
                    }
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={settings.supplierProfile.accountName}
                    onChange={(e) =>
                      setSettingsState({
                        ...settings,
                        supplierProfile: { ...settings.supplierProfile, accountName: e.target.value },
                      })
                    }
                    className="w-full text-xs font-bold uppercase bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={settings.supplierProfile.accountNumber}
                    onChange={(e) =>
                      setSettingsState({
                        ...settings,
                        supplierProfile: { ...settings.supplierProfile, accountNumber: e.target.value },
                      })
                    }
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Stores Directory & Catalog & Backup */}
        <div className="space-y-6">
          {/* Client Stores Overview */}
          {/* Client Stores Overview & CRUD */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                  <StoreIcon className="w-4 h-4 text-emerald-600" />
                  <span>Partner Stores &amp; Clients Directory ({stores.length})</span>
                </h2>
                <p className="text-xs text-slate-500 font-khmer mt-0.5">
                  គ្រប់គ្រងបញ្ជីអតិថិជន សាខាទទួល និងលក្ខខណ្ឌទូទាត់ (Terms)
                </p>
              </div>

              <button
                type="button"
                onClick={openNewStoreModal}
                className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl shadow-2xs transition transform active:scale-95 text-xs self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Store</span>
              </button>
            </div>

            {/* Store Search & Filter Tabs */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by code, branch, client name, or phone..."
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                {storeSearch && (
                  <button
                    type="button"
                    onClick={() => setStoreSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-1">
                {[
                  { id: 'all', label: `All (${stores.length})` },
                  { id: 'active', label: `Active (${stores.filter((s) => s.isActive !== false).length})` },
                  { id: 'archived', label: `Archived (${stores.filter((s) => s.isActive === false).length})` },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setStoreFilter(chip.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      storeFilter === chip.id
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stores List */}
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredStores.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1">
                  <p>No partner stores found matching your criteria.</p>
                  <button
                    type="button"
                    onClick={openNewStoreModal}
                    className="text-emerald-600 font-bold hover:underline"
                  >
                    Create a new store now
                  </button>
                </div>
              ) : (
                filteredStores.map((s) => {
                  const isActive = s.isActive !== false;
                  return (
                    <div
                      key={s.id || s.code}
                      className={`p-3 rounded-xl border transition-all text-xs space-y-1.5 ${
                        isActive
                          ? 'bg-white border-slate-200 hover:border-emerald-300 shadow-2xs'
                          : 'bg-slate-50/80 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-black text-emerald-800 text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {s.code}
                          </span>
                          <span className="font-bold text-slate-900">{s.shipTo}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isActive ? 'Active' : 'Archived'}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditStoreModal(s)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
                            title="Edit Store Information"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStoreActive(s.id || s.code)}
                            className={`p-1.5 rounded-lg transition ${
                              isActive
                                ? 'text-slate-400 hover:text-amber-700 hover:bg-amber-50'
                                : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={isActive ? 'Archive Store (hide from invoices)' : 'Unarchive Store'}
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setStoreToDelete(s)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Delete Store"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-slate-700 flex items-center space-x-1">
                        <span className="text-slate-400 font-semibold">Bill To:</span>
                        <span className="font-medium text-slate-900">{s.customerName}</span>
                      </div>

                      {s.address && (
                        <div className="text-[11px] text-slate-500 font-khmer flex items-start space-x-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{s.address}</span>
                        </div>
                      )}

                      <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{s.phone || 'No phone'}</span>
                        </span>
                        <span className="font-mono text-slate-600 font-semibold">
                          Terms: Net {s.termsDays || s.creditTermsDays || 15} Days
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Master 10 Fruit SKUs Catalog */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 mb-3">
              <Barcode className="w-4 h-4 text-teal-600" />
              <span>Master Fruit Catalog (10 SKUs - Watermelon Excluded)</span>
            </h2>

            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto text-xs">
              {products.map((p) => (
                <div key={p.barcode} className="py-2 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">{p.name}</span>
                    <span className="text-[11px] text-slate-600 font-khmer">{p.khmerName}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-800 block">
                      ${p.wholesalePrice.toFixed(2)}
                    </span>
                    <span className="font-mono text-[10px] text-slate-600">{p.barcode}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: JSON Backup & State Management */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Download className="w-4 h-4 text-slate-700" />
              <span>Data Backup &amp; Disaster Recovery</span>
            </h2>

            <p className="text-xs text-slate-600 leading-relaxed">
              Export all stored invoices, stores, production batches, and BOM settings to an encrypted JSON backup file, or restore from a previously exported backup.
            </p>

            {importStatus && (
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                {importStatus}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleExportJSON}
                className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-black transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON Backup</span>
              </button>

              <label className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer transition border border-slate-300">
                <Upload className="w-3.5 h-3.5" />
                <span>Restore JSON Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Section 5: Danger Zone / Reset Data */}
          <div className="bg-red-50/60 rounded-2xl border border-red-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-red-900 uppercase tracking-wider">
                  Danger Zone / Reset Data
                </h2>
                <p className="text-xs text-red-600/80">
                  Irreversible database and stock maintenance operations
                </p>
              </div>
            </div>

            <div className="divide-y divide-red-100 bg-white rounded-xl border border-red-100 p-4 text-xs space-y-4">
              {/* Reset Packaging Defaults */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div>
                  <span className="font-bold text-slate-900 block">Reset Packaging Warehouse Stock</span>
                  <span className="text-slate-500">
                    Reset all packaging materials, boxes, skewers, and UV stickers back to factory starting inventory counts (300 small boxes, 200 big boxes, 1,000 skewers, 100 stickers per SKU).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetPackagingStock}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-amber-800 bg-amber-50 hover:bg-amber-100 font-bold text-xs transition border border-amber-300 shrink-0 self-start sm:self-center cursor-pointer shadow-2xs"
                  title="Reset packaging inventory to factory seed values"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Reset Packaging Stock</span>
                </button>
              </div>

              {/* Reset Entire Database */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
                <div>
                  <span className="font-bold text-slate-900 block">Reset Entire System Database</span>
                  <span className="text-slate-500">
                    Permanently erase all custom changes and restore all stores, catalog SKUs, settings, and seed delivery records to initial defaults.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-white bg-red-600 hover:bg-red-700 font-bold text-xs transition shadow-xs shrink-0 self-start sm:self-center cursor-pointer"
                  title="Reset complete database to factory seed values"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Reset Entire Database</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Store Create/Edit Modal */}
      {storeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 max-h-[90dvh] overflow-y-auto shadow-2xl border-t sm:border border-slate-200 space-y-4 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <StoreIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingStoreId ? 'Edit Partner Store / Client' : 'Add New Partner Store / Client'}
                  </h3>
                  <p className="text-xs text-slate-500 font-khmer">
                    កំណត់ព័ត៌មានសាខា ទីតាំង និងលក្ខខណ្ឌទូទាត់
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStoreModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStoreSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Store Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ON-TK592"
                    value={storeFormCode}
                    onChange={(e) => setStoreFormCode(e.target.value.toUpperCase())}
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
                    placeholder="e.g. ON Mart St.592 TK"
                    value={storeFormShipTo}
                    onChange={(e) => setStoreFormShipTo(e.target.value)}
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
                  placeholder="e.g. Angkor Prototype LTD."
                  value={storeFormCustomerName}
                  onChange={(e) => setStoreFormCustomerName(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Delivery Address (អាសយដ្ឋាន)
                </label>
                <textarea
                  rows={2}
                  placeholder="#ដីឡូត៍លេខ១ ផ្លូវ ៥៩២ សង្កាត់បឹងកក់ទី២..."
                  value={storeFormAddress}
                  onChange={(e) => setStoreFormAddress(e.target.value)}
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
                    placeholder="e.g. 099 423 599"
                    value={storeFormPhone}
                    onChange={(e) => setStoreFormPhone(e.target.value)}
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Credit Terms (Days) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={storeFormTermsDays}
                    onChange={(e) => setStoreFormTermsDays(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-xs font-mono font-bold border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="storeFormIsActive"
                  checked={storeFormIsActive}
                  onChange={(e) => setStoreFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="storeFormIsActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Active Store (Visible in Invoice Creator &amp; Deliveries)
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStoreModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition transform active:scale-95"
                >
                  {editingStoreId ? 'Save Store Changes' : 'Create Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Store Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(storeToDelete)}
        title="Delete Partner Store?"
        khmerTitle="លុបសាខាអតិថិជននេះ"
        message={`Are you sure you want to delete "${storeToDelete?.code} - ${storeToDelete?.shipTo}"? Historical invoices referencing this store will remain preserved.`}
        confirmText="Yes, Delete Store"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDeleteStore}
        onCancel={() => setStoreToDelete(null)}
      />

      {/* Packaging Inventory Reset Confirm Modal */}
      <ConfirmModal
        isOpen={confirmPackagingResetOpen}
        title="Reset Packaging Inventory?"
        khmerTitle="កំណត់ស្តុកសម្ភារៈវេចខ្ចប់ឡើងវិញ"
        message="Are you sure you want to reset all packaging stock to initial factory defaults (300 small boxes, 200 big boxes, 1,000 skewers, and 100 UV stickers per SKU)?"
        confirmText="Reset Packaging Stock"
        cancelText="Cancel"
        variant="warning"
        onConfirm={executePackagingReset}
        onCancel={() => setConfirmPackagingResetOpen(false)}
      />

      {/* Modern UI Confirm Modal for Database Reset */}
      <ConfirmModal
        isOpen={confirmResetOpen}
        title="Reset All Data to Initial Seed?"
        khmerTitle="កំណត់ទិន្នន័យឡើងវិញទៅលំនាំដើម"
        message="Are you sure you want to reset all data? This will restore the default 10 fruit SKUs, 3 stores, initial BOM rates, and default seed delivery records. Any custom changes made will be lost."
        confirmText="Reset Everything"
        cancelText="Cancel"
        variant="danger"
        onConfirm={executeReset}
        onCancel={() => setConfirmResetOpen(false)}
      />

      {/* Modern UI Alert Modal */}
      <ConfirmModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="Done"
        variant={alertModal.variant || 'success'}
        isAlertOnly={true}
        onConfirm={() => setAlertModal({ isOpen: false, title: '', message: '' })}
        onCancel={() => setAlertModal({ isOpen: false, title: '', message: '' })}
      />
    </div>
  );
}

