'use client';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabase';
import {
  Activity,
  ArrowLeft,
  TrendingUp,
  CheckCircle2,
  Search,
  Download,
  Trash2,
  Database,
  Copy,
  Check,
  Filter,
  ListOrdered,
  FileSpreadsheet,
  AlertCircle,
  Pencil,
  X,
  Save,
  Boxes,
  ShoppingCart,
  Clock,
  RefreshCw,
  Plus
} from 'lucide-react';
import { ALL_ITEMS, CATEGORIZED_ITEMS } from '../../lib/item-constants';

export interface SaleRecord {
  id?: number;
  entry_date: string;
  party_name: string;
  item_name: string;
  qty: number;
  status: string; // 'PENDING' | 'STOCK' | 'REPLACEMENT'
  notes?: string;
  created_at?: string;
}

export default function SalePage() {
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'entries' | 'master'>('entries');

  // Form State (New Sale Entry)
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [partyName, setPartyName] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [customItem, setCustomItem] = useState('');
  const [isCustomItem, setIsCustomItem] = useState(false);
  const [itemSearchFilter, setItemSearchFilter] = useState('');
  const [qty, setQty] = useState<number | ''>(1);
  const [status, setStatus] = useState<'PENDING' | 'STOCK' | 'REPLACEMENT'>('STOCK');
  const [notes, setNotes] = useState('');

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<SaleRecord | null>(null);
  const [editEntryDate, setEditEntryDate] = useState('');
  const [editPartyName, setEditPartyName] = useState('');
  const [editItemName, setEditItemName] = useState('');
  const [editQty, setEditQty] = useState<number | ''>(1);
  const [editStatus, setEditStatus] = useState<string>('STOCK');
  const [editNotes, setEditNotes] = useState('');
  const [editStatusMessage, setEditStatusMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Table Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const supabaseSql = `-- 1. Create the item_sales table in Supabase
CREATE TABLE IF NOT EXISTS item_sales (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entry_date DATE DEFAULT CURRENT_DATE,
  party_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  qty NUMERIC DEFAULT 1,
  status TEXT DEFAULT 'STOCK', -- 'PENDING', 'STOCK', 'REPLACEMENT'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE item_sales ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy for full read/write access (matching your other dashboard tables)
CREATE POLICY "Allow public read and write access on item_sales"
ON item_sales
FOR ALL
USING (true)
WITH CHECK (true);`;

  useEffect(() => {
    fetchRecords();
  }, []);

  async function fetchRecords() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('item_sales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setTableExists(false);
        } else {
          console.error('Error fetching item_sales:', error);
        }
      } else if (data) {
        setRecords(data);
        setTableExists(true);
      }
    } catch (err) {
      console.error('Exception fetching sales records:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleCopySql = () => {
    navigator.clipboard.writeText(supabaseSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalItemName = isCustomItem ? customItem.trim().toUpperCase() : selectedItem.trim().toUpperCase();

    if (!finalItemName) {
      setStatusMessage('ERROR: PLEASE SELECT OR ENTER AN ITEM NAME.');
      return;
    }

    if (!partyName.trim()) {
      setStatusMessage('ERROR: PLEASE ENTER PARTY NAME (DOCTOR / CLINIC).');
      return;
    }

    if (!qty || Number(qty) <= 0) {
      setStatusMessage('ERROR: QUANTITY MUST BE GREATER THAN 0.');
      return;
    }

    setStatusMessage('SAVING SALE ENTRY...');

    const payload = {
      entry_date: entryDate || new Date().toISOString().split('T')[0],
      party_name: partyName.trim().toUpperCase(),
      item_name: finalItemName,
      qty: Number(qty),
      status: status,
      notes: notes.trim().toUpperCase() || null,
    };

    const { error } = await supabase.from('item_sales').insert([payload]).select().single();

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        setTableExists(false);
        setStatusMessage('ERROR: TABLE "item_sales" DOES NOT EXIST IN SUPABASE. PLEASE RUN SQL SETUP BELOW.');
      } else {
        setStatusMessage(`ERROR: ${error.message}`);
      }
    } else {
      setStatusMessage('PERFECT! SUCCESS: SALE ENTRY RECORDED SUCCESSFULLY.');
      // Reset form
      setPartyName('');
      setSelectedItem('');
      setCustomItem('');
      setIsCustomItem(false);
      setQty(1);
      setStatus('STOCK');
      setNotes('');
      // Refresh list
      fetchRecords();
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (record: SaleRecord) => {
    setEditingRecord(record);
    setEditEntryDate(record.entry_date || '');
    setEditPartyName(record.party_name || '');
    setEditItemName(record.item_name || '');
    setEditQty(record.qty ?? 1);
    setEditStatus(record.status || 'STOCK');
    setEditNotes(record.notes || '');
    setEditStatusMessage('');
  };

  const handleCloseEditModal = () => {
    setEditingRecord(null);
    setEditStatusMessage('');
    setIsUpdating(false);
  };

  // Update Record Submission
  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord?.id) return;

    if (!editItemName.trim()) {
      setEditStatusMessage('ERROR: ITEM NAME CANNOT BE EMPTY.');
      return;
    }

    if (!editPartyName.trim()) {
      setEditStatusMessage('ERROR: PARTY NAME CANNOT BE EMPTY.');
      return;
    }

    setIsUpdating(true);
    setEditStatusMessage('UPDATING RECORD...');

    const updatePayload = {
      entry_date: editEntryDate || null,
      party_name: editPartyName.trim().toUpperCase(),
      item_name: editItemName.trim().toUpperCase(),
      qty: Number(editQty) || 1,
      status: editStatus.toUpperCase(),
      notes: editNotes.trim().toUpperCase() || null,
    };

    const { error } = await supabase
      .from('item_sales')
      .update(updatePayload)
      .eq('id', editingRecord.id);

    setIsUpdating(false);

    if (error) {
      setEditStatusMessage(`ERROR: ${error.message}`);
    } else {
      setEditStatusMessage('SUCCESS: RECORD UPDATED!');
      setTimeout(() => {
        handleCloseEditModal();
        fetchRecords();
      }, 700);
    }
  };

  // Delete Record
  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!window.confirm('ARE YOU SURE YOU WANT TO DELETE THIS SALE RECORD?')) return;

    const { error } = await supabase.from('item_sales').delete().eq('id', id);
    if (error) {
      alert('Error deleting: ' + error.message);
    } else {
      setRecords((prev) => prev.filter((r) => r.id !== id));
    }
  };

  // Filtered item options for the dropdown search
  const visibleItemOptions = useMemo(() => {
    if (!itemSearchFilter) return CATEGORIZED_ITEMS;
    const filterUpper = itemSearchFilter.toUpperCase();
    return CATEGORIZED_ITEMS.map((cat) => ({
      category: cat.category,
      items: cat.items.filter((i) => i.toUpperCase().includes(filterUpper)),
    })).filter((cat) => cat.items.length > 0);
  }, [itemSearchFilter]);

  // Filtered records for the entered details table
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const q = searchQuery.toUpperCase();
      const matchesSearch =
        !q ||
        (r.item_name && r.item_name.toUpperCase().includes(q)) ||
        (r.party_name && r.party_name.toUpperCase().includes(q)) ||
        (r.notes && r.notes.toUpperCase().includes(q)) ||
        (r.status && r.status.toUpperCase().includes(q));

      if (!matchesSearch) return false;

      if (categoryFilter !== 'ALL') {
        const catObj = CATEGORIZED_ITEMS.find((c) => c.category === categoryFilter);
        if (catObj && !catObj.items.includes(r.item_name)) {
          return false;
        }
      }

      if (statusFilter !== 'ALL') {
        if ((r.status || '').toUpperCase() !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [records, searchQuery, categoryFilter, statusFilter]);

  // Master Ledger Summary Sheet (Aggregated per Dental Item)
  const masterSheetData = useMemo(() => {
    return ALL_ITEMS.map((itemName) => {
      const itemLogs = records.filter((r) => r.item_name === itemName);

      const totalQty = itemLogs.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);
      const pendingQty = itemLogs
        .filter((r) => (r.status || '').toUpperCase() === 'PENDING')
        .reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);
      const inStockQty = itemLogs
        .filter((r) => (r.status || '').toUpperCase() === 'STOCK')
        .reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);
      const replacementQty = itemLogs
        .filter((r) => (r.status || '').toUpperCase() === 'REPLACEMENT')
        .reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0);

      const latestLog = itemLogs[0];

      return {
        item_name: itemName,
        total_qty: totalQty,
        pending_qty: pendingQty,
        stock_qty: inStockQty,
        replacement_qty: replacementQty,
        latest_party: latestLog?.party_name || '-',
        latest_date: latestLog?.entry_date || '-',
        latest_status: latestLog?.status || '-',
        entries_count: itemLogs.length,
        latest_record: latestLog,
      };
    }).filter((row) => {
      const q = searchQuery.toUpperCase();
      const matchesSearch =
        !q ||
        row.item_name.toUpperCase().includes(q) ||
        row.latest_party.toUpperCase().includes(q);

      if (!matchesSearch) return false;

      if (categoryFilter !== 'ALL') {
        const catObj = CATEGORIZED_ITEMS.find((c) => c.category === categoryFilter);
        if (catObj && !catObj.items.includes(row.item_name)) {
          return false;
        }
      }

      return true;
    });
  }, [records, searchQuery, categoryFilter]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalEntries = records.length;
    const totalQty = records.reduce((acc, r) => acc + (Number(r.qty) || 0), 0);
    const pendingQty = records
      .filter((r) => (r.status || '').toUpperCase() === 'PENDING')
      .reduce((acc, r) => acc + (Number(r.qty) || 0), 0);
    const stockQty = records
      .filter((r) => (r.status || '').toUpperCase() === 'STOCK')
      .reduce((acc, r) => acc + (Number(r.qty) || 0), 0);
    const replacementQty = records
      .filter((r) => (r.status || '').toUpperCase() === 'REPLACEMENT')
      .reduce((acc, r) => acc + (Number(r.qty) || 0), 0);
    const uniqueItemsSold = new Set(records.map((r) => r.item_name)).size;

    return { totalEntries, totalQty, pendingQty, stockQty, replacementQty, uniqueItemsSold };
  }, [records]);

  // CSV Export matching Excel columns: DATE, PARTY NAME, ITEMS, QTY, PENDING/ STOCK/REPLACEMENT, NOTES
  const exportToCSV = () => {
    if (activeTab === 'entries') {
      if (filteredRecords.length === 0) return alert('NO SALE RECORDS TO EXPORT.');
      const headers = 'DATE,PARTY NAME,ITEMS,QTY,PENDING/ STOCK/REPLACEMENT,NOTES\n';
      const rows = filteredRecords
        .map(
          (r) =>
            `"${r.entry_date || ''}","${r.party_name || ''}","${r.item_name || ''}",${r.qty || 0},"${r.status || 'STOCK'}","${r.notes || ''}"`
        )
        .join('\n');

      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Sale_Records_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } else {
      if (masterSheetData.length === 0) return alert('NO MASTER SHEET DATA TO EXPORT.');
      const headers = 'ITEM NAME,TOTAL SOLD QTY,DISPATCHED QTY,PENDING QTY,REPLACEMENT QTY,LATEST BUYER,LATEST DATE,TOTAL LOGS\n';
      const rows = masterSheetData
        .map(
          (r) =>
            `"${r.item_name}",${r.total_qty},${r.stock_qty},${r.pending_qty},${r.replacement_qty},"${r.latest_party}","${r.latest_date}",${r.entries_count}`
        )
        .join('\n');

      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Sale_Master_Register_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    }
  };

  const renderStatusBadge = (st: string) => {
    const s = (st || '').toUpperCase();
    if (s === 'PENDING') {
      return (
        <span className="px-2.5 py-1 rounded-md text-xs font-black inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300">
          <Clock className="w-3 h-3" /> PENDING
        </span>
      );
    }
    if (s === 'REPLACEMENT') {
      return (
        <span className="px-2.5 py-1 rounded-md text-xs font-black inline-flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-300">
          <RefreshCw className="w-3 h-3" /> REPLACEMENT
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-md text-xs font-black inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300">
        <Check className="w-3 h-3" /> STOCK
      </span>
    );
  };

  return (
    <main className="min-h-screen bg-[#f4f7f9] p-4 md:p-8 lg:p-12 font-sans uppercase text-base">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Header */}
        <header className="mb-8 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Activity className="text-white w-6 h-6" />
            </div>
            <span className="font-black text-gray-900 text-xl tracking-tight">Swasthyam Healthcare</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSqlGuide(!showSqlGuide)}
              className="flex items-center gap-2 text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-3.5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>{showSqlGuide ? 'Hide Supabase SQL' : 'Supabase SQL Guide'}</span>
            </button>
            <Link
              href="/"
              className="flex items-center gap-2 text-base font-black text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" /> Back to Dashboard
            </Link>
          </div>
        </header>

        {/* Section Navigation Switcher */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white border border-gray-200 rounded-2xl shadow-xs mb-8">
          <Link
            href="/item-form"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all text-gray-600 hover:bg-gray-100"
          >
            <Boxes className="w-4 h-4 text-teal-600" />
            <span>Item Inventory Form</span>
          </Link>
          <Link
            href="/purchase"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all text-gray-600 hover:bg-gray-100"
          >
            <ShoppingCart className="w-4 h-4 text-blue-600" />
            <span>Purchase Section</span>
          </Link>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-purple-600 text-white shadow-xs">
            <TrendingUp className="w-4 h-4" />
            <span>Sale Section (Active)</span>
          </div>
        </div>

        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-purple-500/10 p-2.5 rounded-xl text-purple-700">
              <TrendingUp className="w-8 h-8" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter">Sale Form & Ledger</h1>
          </div>
          <p className="text-gray-500 text-base font-bold">
            Record and track dental item sales to doctors, clinics, and hospitals with date, party name, item, quantity, and pending / stock / replacement status.
          </p>
        </div>

        {/* Supabase Notice Box if table not yet created */}
        {!tableExists && (
          <div className="mb-8 p-6 bg-amber-50 border-2 border-amber-300 rounded-2xl shadow-sm">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-black text-lg text-amber-900 mb-1">
                  SUPABASE SETUP REQUIRED: TABLE &quot;item_sales&quot; NOT FOUND
                </h3>
                <p className="text-sm font-bold text-amber-800 mb-4 normal-case">
                  To save and query sale entries, open your Supabase project dashboard, navigate to the <strong>SQL Editor</strong>, paste the SQL below and click <strong>Run</strong>:
                </p>
                <div className="relative bg-gray-900 text-gray-100 p-4 rounded-xl font-mono text-xs overflow-x-auto mb-3">
                  <pre>{supabaseSql}</pre>
                  <button
                    onClick={handleCopySql}
                    className="absolute top-3 right-3 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black px-3 py-1.5 rounded-lg text-xs transition-all shadow cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'COPIED!' : 'COPY SQL'}</span>
                  </button>
                </div>
                <button
                  onClick={fetchRecords}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-4 py-2 rounded-lg transition-all cursor-pointer"
                >
                  RECHECK SUPABASE CONNECTION
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Optional Collapsible SQL Guide */}
        {showSqlGuide && tableExists && (
          <div className="mb-8 p-6 bg-white border border-indigo-100 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-base text-gray-900">Sale Schema & Instructions</h3>
              </div>
              <button
                onClick={handleCopySql}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-3 py-1.5 rounded-lg text-xs transition-all shadow cursor-pointer"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'COPIED!' : 'COPY SQL'}</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 font-bold mb-3 normal-case">
              Run this in your Supabase SQL Editor if you ever need to inspect or recreate the sale table:
            </p>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-xl font-mono text-xs overflow-x-auto">
              <pre>{supabaseSql}</pre>
            </div>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <span className="text-xs font-black text-gray-400 block mb-1">TOTAL LOGS</span>
            <span className="text-2xl font-black text-gray-900">{stats.totalEntries}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <span className="text-xs font-black text-gray-400 block mb-1">TOTAL SALE QTY</span>
            <span className="text-2xl font-black text-purple-600">+{stats.totalQty}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <span className="text-xs font-black text-gray-400 block mb-1">DISPATCHED STOCK</span>
            <span className="text-2xl font-black text-emerald-600">{stats.stockQty}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <span className="text-xs font-black text-gray-400 block mb-1">PENDING DISPATCH</span>
            <span className="text-2xl font-black text-amber-600">{stats.pendingQty}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <span className="text-xs font-black text-gray-400 block mb-1">REPLACEMENTS</span>
            <span className="text-2xl font-black text-orange-600">{stats.replacementQty}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <span className="text-xs font-black text-gray-400 block mb-1">ITEMS SOLD</span>
            <span className="text-2xl font-black text-teal-600">{stats.uniqueItemsSold} / 92</span>
          </div>
        </div>

        {/* Main Grid: Form & Tables */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-12">
          {/* ===================== FORM SECTION ===================== */}
          <div className="xl:col-span-4 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl md:text-2xl font-black text-gray-900">Record Sale</h2>
            </div>

            {statusMessage && (
              <div
                className={`p-4 rounded-xl mb-6 flex items-center gap-2 text-sm font-black ${
                  statusMessage.includes('ERROR')
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-sm font-bold">
              {/* DATE */}
              <div className="flex flex-col gap-2">
                <label className="font-black text-gray-700 text-xs">
                  DATE <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="border border-gray-200 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all text-sm"
                />
              </div>

              {/* PARTY NAME */}
              <div className="flex flex-col gap-2">
                <label className="font-black text-gray-700 text-xs">
                  PARTY NAME (DOCTOR / CLINIC / HOSPITAL) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="E.G. DR. SHARMA / APOLLO DENTAL CLINIC"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value.toUpperCase())}
                  className="border border-gray-200 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all uppercase text-sm"
                />
              </div>

              {/* ITEMS */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="font-black text-gray-700 text-xs">
                    ITEMS <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomItem(!isCustomItem)}
                    className="text-xs text-purple-600 hover:text-purple-800 font-black underline cursor-pointer"
                  >
                    {isCustomItem ? 'Choose from 92 Catalog' : '+ Custom Item'}
                  </button>
                </div>

                {!isCustomItem ? (
                  <>
                    {/* Live filter input */}
                    <div className="relative mb-1">
                      <input
                        type="text"
                        placeholder="TYPE TO FILTER 92 ITEMS..."
                        value={itemSearchFilter}
                        onChange={(e) => setItemSearchFilter(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg py-2 pl-8 pr-3 text-gray-900 uppercase placeholder-gray-400 focus:border-purple-500 outline-none"
                      />
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                    </div>

                    <select
                      required={!isCustomItem}
                      value={selectedItem}
                      onChange={(e) => setSelectedItem(e.target.value)}
                      className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all bg-white uppercase font-bold text-xs md:text-sm"
                    >
                      <option value="" disabled>-- SELECT AN ITEM FROM PDF --</option>
                      {visibleItemOptions.map((group) => (
                        <optgroup key={group.category} label={group.category.toUpperCase()}>
                          {group.items.map((item) => (
                            <option key={item} value={item} className="uppercase font-bold text-xs py-1">
                              {item}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </>
                ) : (
                  <input
                    type="text"
                    required={isCustomItem}
                    placeholder="ENTER CUSTOM DENTAL ITEM NAME"
                    value={customItem}
                    onChange={(e) => setCustomItem(e.target.value.toUpperCase())}
                    className="border border-gray-200 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all uppercase text-sm"
                  />
                )}
              </div>

              {/* QTY & PENDING/ STOCK/REPLACEMENT */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <label className="font-black text-gray-700 text-xs">
                    QTY <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={qty}
                    onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="border border-gray-200 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all text-sm font-bold"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-black text-gray-700 text-xs">
                    PENDING / STOCK / REPLACEMENT <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="border border-gray-200 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all text-xs font-black uppercase"
                  >
                    <option value="STOCK">STOCK (DISPATCHED)</option>
                    <option value="PENDING">PENDING (AWAITING DISPATCH)</option>
                    <option value="REPLACEMENT">REPLACEMENT (REPLACEMENT DISPATCHED)</option>
                  </select>
                </div>
              </div>

              {/* REMARKS / NOTES */}
              <div className="flex flex-col gap-2">
                <label className="font-black text-gray-700 text-xs">REMARKS / NOTES (OPTIONAL)</label>
                <input
                  type="text"
                  placeholder="DOCTOR CONTACT, CLINIC AREA, OR INVOICE NO."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.toUpperCase())}
                  className="border border-gray-200 rounded-lg p-3 bg-white text-gray-900 focus:ring-2 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all uppercase text-sm"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white font-black text-base py-4 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <TrendingUp className="w-5 h-5" />
                <span>SAVE SALE ENTRY</span>
              </button>
            </form>
          </div>

          {/* ===================== TABLE SECTION ===================== */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            {/* Table Controls Header: Tabs, Search, Category Filter, and Export */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
              <div className="flex flex-wrap justify-between items-center gap-4">
                {/* Tabs */}
                <div className="flex bg-gray-100 p-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveTab('entries')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-black rounded-lg transition-all uppercase cursor-pointer ${
                      activeTab === 'entries'
                        ? 'bg-white shadow-sm text-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ListOrdered className="w-4 h-4" />
                    <span>Entered Sales ({records.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('master')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-black rounded-lg transition-all uppercase cursor-pointer ${
                      activeTab === 'master'
                        ? 'bg-white shadow-sm text-teal-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>PDF Master Ledger (92 Items)</span>
                  </button>
                </div>

                {/* CSV Download Button */}
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs md:text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>EXPORT TO EXCEL / CSV</span>
                </button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                {/* Search Query */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="SEARCH BY ITEM, PARTY NAME, OR NOTES..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg py-2.5 pl-9 pr-3 text-gray-900 uppercase text-xs md:text-sm outline-none focus:border-purple-500"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>

                {/* Category Dropdown */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-gray-900 uppercase text-xs md:text-sm font-bold bg-white outline-none focus:border-purple-500"
                  >
                    <option value="ALL">ALL CATEGORIES (92 ITEMS)</option>
                    {CATEGORIZED_ITEMS.map((cat) => (
                      <option key={cat.category} value={cat.category}>
                        {cat.category.toUpperCase()} ({cat.items.length})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Dropdown */}
                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-gray-900 uppercase text-xs md:text-sm font-bold bg-white outline-none focus:border-purple-500"
                  >
                    <option value="ALL">ALL STATUSES</option>
                    <option value="STOCK">STOCK ONLY</option>
                    <option value="PENDING">PENDING ONLY</option>
                    <option value="REPLACEMENT">REPLACEMENT ONLY</option>
                  </select>
                </div>
              </div>
            </div>

            {/* TAB 1: Entered Records Table */}
            {activeTab === 'entries' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50/70 flex justify-between items-center">
                  <h3 className="font-black text-base text-gray-800 uppercase flex items-center gap-2">
                    <ListOrdered className="w-5 h-5 text-purple-600" />
                    <span>Sale Records According to Excel ({filteredRecords.length})</span>
                  </h3>
                  <span className="text-xs text-gray-400 font-bold">LATEST FIRST</span>
                </div>

                <div className="overflow-x-auto max-h-[680px]">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10 shadow-xs">
                      <tr>
                        <th className="p-3 font-black text-gray-900 uppercase w-28 whitespace-nowrap">
                          DATE
                        </th>
                        <th className="p-3 font-black text-gray-900 uppercase min-w-[140px] whitespace-nowrap">
                          PARTY NAME
                        </th>
                        <th className="p-3 font-black text-gray-900 uppercase min-w-[260px]">
                          ITEMS
                        </th>
                        <th className="px-2 py-3 font-black text-gray-900 uppercase text-right w-16 whitespace-nowrap">
                          QTY
                        </th>
                        <th className="p-3 font-black text-gray-900 uppercase text-center min-w-[150px] whitespace-nowrap">
                          PENDING/ STOCK/REPLACEMENT
                        </th>
                        <th className="p-3 font-black text-gray-600 uppercase min-w-[120px]">
                          NOTES
                        </th>
                        <th className="p-3 font-black text-gray-800 uppercase text-center w-24 whitespace-nowrap">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-400 font-bold uppercase">
                            LOADING SALE ENTRIES...
                          </td>
                        </tr>
                      ) : filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-400 font-bold uppercase">
                            {records.length === 0
                              ? 'NO SALES LOGGED YET. USE THE FORM ON THE LEFT TO LOG YOUR FIRST SALE.'
                              : 'NO MATCHING SALES FOUND FOR THIS FILTER.'}
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((r) => (
                          <tr
                            key={r.id}
                            className="border-b border-gray-100 odd:bg-white even:bg-gray-50 hover:bg-purple-50/30 transition-colors"
                          >
                            <td className="p-3 font-bold text-gray-700 whitespace-nowrap">
                              {r.entry_date}
                            </td>
                            <td className="p-3 font-black text-gray-900 whitespace-nowrap">
                              {r.party_name}
                            </td>
                            <td className="p-3 font-black text-gray-900 min-w-[260px] break-words whitespace-normal leading-snug">
                              {r.item_name}
                            </td>
                            <td className="px-2 py-3 font-black text-purple-600 text-right w-16 whitespace-nowrap">
                              {r.qty}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              {renderStatusBadge(r.status)}
                            </td>
                            <td className="p-3 font-medium text-gray-500 break-words whitespace-normal">
                              {r.notes || '-'}
                            </td>
                            <td className="p-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEditModal(r)}
                                  title="Edit Sale"
                                  className="text-purple-600 hover:text-purple-800 p-1.5 rounded-lg hover:bg-purple-50 transition-colors flex items-center gap-1 cursor-pointer font-bold text-xs"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>EDIT</span>
                                </button>
                                <button
                                  onClick={() => handleDelete(r.id)}
                                  title="Delete Sale"
                                  className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
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
            )}

            {/* TAB 2: Master Ledger Sheet */}
            {activeTab === 'master' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-teal-50/50 flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <h3 className="font-black text-base text-teal-900 uppercase flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-teal-700" />
                      <span>Item-Wise Sale Register (All 92 Dental Items)</span>
                    </h3>
                    <p className="text-xs text-gray-500 font-bold normal-case">
                      Cumulative overview of sales quantities, dispatched stock, pending orders, and replacements for every catalog item.
                    </p>
                  </div>
                  <span className="text-xs font-black text-teal-800 bg-teal-100 px-3 py-1 rounded-full">
                    {masterSheetData.length} ITEMS
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[680px]">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead className="sticky top-0 bg-gray-100 border-b-2 border-gray-300 z-10 shadow-xs">
                      <tr>
                        <th className="p-3 font-black text-gray-900 uppercase border-r border-gray-200 min-w-[280px]">
                          ITEMS
                        </th>
                        <th className="px-2 py-3 font-black text-gray-900 uppercase text-right border-r border-gray-200 w-16 whitespace-nowrap">
                          TOTAL SOLD
                        </th>
                        <th className="px-2 py-3 font-black text-emerald-800 uppercase text-right border-r border-gray-200 w-16 whitespace-nowrap">
                          STOCK
                        </th>
                        <th className="px-2 py-3 font-black text-amber-800 uppercase text-right border-r border-gray-200 w-16 whitespace-nowrap">
                          PENDING
                        </th>
                        <th className="px-2 py-3 font-black text-purple-800 uppercase text-right border-r border-gray-200 w-16 whitespace-nowrap">
                          REPLACE
                        </th>
                        <th className="p-3 font-black text-gray-900 uppercase border-r border-gray-200 min-w-[130px] whitespace-nowrap">
                          LATEST BUYER (DR/CLINIC)
                        </th>
                        <th className="p-3 font-black text-gray-900 uppercase border-r border-gray-200 w-24 whitespace-nowrap">
                          LATEST DATE
                        </th>
                        <th className="p-3 font-black text-gray-900 uppercase text-center w-28 whitespace-nowrap">
                          ACTION
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterSheetData.map((row) => {
                        const hasActivity = row.entries_count > 0;
                        return (
                          <tr
                            key={row.item_name}
                            className={`border-b border-gray-200 transition-colors ${
                              hasActivity
                                ? 'bg-white hover:bg-purple-50/40 font-bold'
                                : 'bg-gray-50/40 hover:bg-gray-100/60 text-gray-500'
                            }`}
                          >
                            <td className="p-3 font-black text-gray-900 border-r border-gray-200 min-w-[280px] break-words whitespace-normal leading-snug">
                              {row.item_name}
                            </td>
                            <td className="px-2 py-3 text-right border-r border-gray-200 font-black text-purple-600 w-16 whitespace-nowrap">
                              {row.total_qty > 0 ? row.total_qty : '-'}
                            </td>
                            <td className="px-2 py-3 text-right border-r border-gray-200 font-black text-emerald-700 w-16 whitespace-nowrap">
                              {row.stock_qty > 0 ? row.stock_qty : '-'}
                            </td>
                            <td className="px-2 py-3 text-right border-r border-gray-200 font-black text-amber-700 w-16 whitespace-nowrap">
                              {row.pending_qty > 0 ? row.pending_qty : '-'}
                            </td>
                            <td className="px-2 py-3 text-right border-r border-gray-200 font-black text-purple-700 w-16 whitespace-nowrap">
                              {row.replacement_qty > 0 ? row.replacement_qty : '-'}
                            </td>
                            <td className="p-3 border-r border-gray-200 font-medium whitespace-nowrap">
                              {row.latest_party}
                            </td>
                            <td className="p-3 border-r border-gray-200 font-medium whitespace-nowrap">
                              {row.latest_date}
                            </td>
                            <td className="p-2 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                {row.latest_record ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(row.latest_record)}
                                    title="Edit Latest Entry"
                                    className="text-xs font-black px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg transition-colors uppercase whitespace-nowrap cursor-pointer flex items-center gap-1"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    <span>EDIT</span>
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedItem(row.item_name);
                                    setIsCustomItem(false);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }}
                                  className="text-xs font-black px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-lg transition-colors uppercase whitespace-nowrap cursor-pointer"
                                >
                                  + LOG
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===================== UPDATE / EDIT MODAL ===================== */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="bg-purple-600 p-2 rounded-lg text-white">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-gray-900 uppercase">Update Sale Entry</h3>
                  <p className="text-xs text-gray-500 font-bold normal-case">Modify date, party name, item, qty, or status.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateRecord} className="p-6 flex flex-col gap-4 text-sm font-bold">
              {editStatusMessage && (
                <div
                  className={`p-3.5 rounded-xl flex items-center gap-2 text-xs font-black ${
                    editStatusMessage.includes('ERROR')
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{editStatusMessage}</span>
                </div>
              )}

              {/* DATE */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-700 font-black uppercase">Date</label>
                <input
                  type="date"
                  required
                  value={editEntryDate}
                  onChange={(e) => setEditEntryDate(e.target.value)}
                  className="border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:border-purple-500 outline-none"
                />
              </div>

              {/* PARTY NAME */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-700 font-black uppercase">Party Name (Doctor / Clinic)</label>
                <input
                  type="text"
                  required
                  value={editPartyName}
                  onChange={(e) => setEditPartyName(e.target.value.toUpperCase())}
                  className="border border-gray-200 rounded-lg p-2.5 text-gray-900 uppercase focus:border-purple-500 outline-none text-xs"
                />
              </div>

              {/* ITEM NAME */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-700 font-black uppercase">Item Name</label>
                <input
                  type="text"
                  required
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value.toUpperCase())}
                  className="border border-gray-200 rounded-lg p-2.5 text-gray-900 uppercase focus:border-purple-500 outline-none text-xs"
                />
              </div>

              {/* QTY & STATUS */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-700 font-black uppercase">Qty</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:border-purple-500 outline-none text-xs font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-700 font-black uppercase">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="border border-gray-200 rounded-lg p-2.5 text-gray-900 uppercase focus:border-purple-500 outline-none text-xs font-black bg-white"
                  >
                    <option value="STOCK">STOCK</option>
                    <option value="PENDING">PENDING</option>
                    <option value="REPLACEMENT">REPLACEMENT</option>
                  </select>
                </div>
              </div>

              {/* NOTES */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-700 font-black uppercase">Remarks / Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value.toUpperCase())}
                  className="border border-gray-200 rounded-lg p-2.5 text-gray-900 uppercase text-xs outline-none focus:border-purple-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-black text-xs uppercase transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isUpdating ? 'SAVING...' : 'UPDATE SALE'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

