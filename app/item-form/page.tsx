'use client';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabase';
import { 
  Activity, 
  ArrowLeft, 
  Boxes, 
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
  ShoppingCart,
  TrendingUp
} from 'lucide-react';
import { ALL_ITEMS, CATEGORIZED_ITEMS } from '../../lib/item-constants';

export interface ItemRecord {
  id?: number;
  item_name: string;
  opening_stock: number;
  received_party: string;
  received_date: string;
  received_qty: number;
  delivered_qty: number;
  delivered_date: string;
  delivered_party: string;
  closing_stock: number;
  notes?: string;
  created_at?: string;
}

export default function ItemFormPage() {
  const [records, setRecords] = useState<ItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'entries' | 'master'>('entries');

  // Form State (New Entry)
  const [selectedItem, setSelectedItem] = useState('');
  const [itemSearchFilter, setItemSearchFilter] = useState('');
  const [openingStock, setOpeningStock] = useState<number | ''>(0);
  
  // Received / Inward Fields
  const [receivedParty, setReceivedParty] = useState('');
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [receivedQty, setReceivedQty] = useState<number | ''>('');
  
  // Delivered / Outward Fields
  const [deliveredQty, setDeliveredQty] = useState<number | ''>('');
  const [deliveredDate, setDeliveredDate] = useState('');
  const [deliveredParty, setDeliveredParty] = useState('');

  // Closing Stock & Notes
  const [manualClosingStock, setManualClosingStock] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<ItemRecord | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editOpeningStock, setEditOpeningStock] = useState<number | ''>(0);
  const [editReceivedParty, setEditReceivedParty] = useState('');
  const [editReceivedDate, setEditReceivedDate] = useState('');
  const [editReceivedQty, setEditReceivedQty] = useState<number | ''>('');
  const [editDeliveredQty, setEditDeliveredQty] = useState<number | ''>('');
  const [editDeliveredDate, setEditDeliveredDate] = useState('');
  const [editDeliveredParty, setEditDeliveredParty] = useState('');
  const [editManualClosingStock, setEditManualClosingStock] = useState<number | ''>('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatusMessage, setEditStatusMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Filters for Table
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const supabaseSql = `-- 1. Create the item_inventory table in Supabase
CREATE TABLE IF NOT EXISTS item_inventory (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  item_name TEXT NOT NULL,
  opening_stock NUMERIC DEFAULT 0,
  received_party TEXT,
  received_date DATE,
  received_qty NUMERIC DEFAULT 0,
  delivered_qty NUMERIC DEFAULT 0,
  delivered_date DATE,
  delivered_party TEXT,
  closing_stock NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE item_inventory ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy for full read/write access (matching your other dashboard tables)
CREATE POLICY "Allow public read and write access on item_inventory"
ON item_inventory
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
        .from('item_inventory')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setTableExists(false);
        } else {
          console.error('Error fetching item_inventory:', error);
        }
      } else if (data) {
        setRecords(data);
        setTableExists(true);
      }
    } catch (err) {
      console.error('Exception fetching records:', err);
    } finally {
      setLoading(false);
    }
  }

  // Auto-calculate Closing Stock for New Entry Form
  const calculatedClosingStock = useMemo(() => {
    const open = Number(openingStock) || 0;
    const rcv = Number(receivedQty) || 0;
    const del = Number(deliveredQty) || 0;
    return open + rcv - del;
  }, [openingStock, receivedQty, deliveredQty]);

  // Auto-calculate Closing Stock for Edit Modal
  const editCalculatedClosingStock = useMemo(() => {
    const open = Number(editOpeningStock) || 0;
    const rcv = Number(editReceivedQty) || 0;
    const del = Number(editDeliveredQty) || 0;
    return open + rcv - del;
  }, [editOpeningStock, editReceivedQty, editDeliveredQty]);

  // When an item is selected from dropdown, autofill previous closing stock as opening stock
  const handleItemSelect = (itemName: string) => {
    setSelectedItem(itemName);
    if (!itemName) return;

    // Find the latest record for this item to get its last closing stock
    const lastRecord = records.find(r => r.item_name === itemName);
    if (lastRecord && lastRecord.closing_stock !== undefined) {
      setOpeningStock(Number(lastRecord.closing_stock));
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(supabaseSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      setStatusMessage('ERROR: PLEASE SELECT AN ITEM.');
      return;
    }

    setStatusMessage('SAVING ITEM DETAILS...');

    const finalClosingStock = manualClosingStock !== '' ? Number(manualClosingStock) : calculatedClosingStock;

    const payload = {
      item_name: selectedItem.trim().toUpperCase(),
      opening_stock: Number(openingStock) || 0,
      received_party: receivedParty.trim().toUpperCase() || null,
      received_date: receivedDate || null,
      received_qty: Number(receivedQty) || 0,
      delivered_qty: Number(deliveredQty) || 0,
      delivered_date: deliveredDate || null,
      delivered_party: deliveredParty.trim().toUpperCase() || null,
      closing_stock: finalClosingStock,
      notes: notes.trim().toUpperCase() || null,
    };

    const { error } = await supabase.from('item_inventory').insert([payload]).select().single();

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        setTableExists(false);
        setStatusMessage('ERROR: TABLE "item_inventory" DOES NOT EXIST IN SUPABASE. PLEASE RUN SQL SETUP BELOW.');
      } else {
        setStatusMessage(`ERROR: ${error.message}`);
      }
    } else {
      setStatusMessage('PERFECT! SUCCESS: ITEM ENTRY SAVED SUCCESSFULLY.');
      // Reset form fields
      setSelectedItem('');
      setOpeningStock(0);
      setReceivedParty('');
      setReceivedQty('');
      setDeliveredQty('');
      setDeliveredDate('');
      setDeliveredParty('');
      setManualClosingStock('');
      setNotes('');
      // Refresh list
      fetchRecords();
    }
  };

  // Open Edit Modal with selected record's data
  const handleOpenEditModal = (record: ItemRecord) => {
    setEditingRecord(record);
    setEditItemName(record.item_name || '');
    setEditOpeningStock(record.opening_stock ?? 0);
    setEditReceivedParty(record.received_party || '');
    setEditReceivedDate(record.received_date || '');
    setEditReceivedQty(record.received_qty > 0 ? record.received_qty : '');
    setEditDeliveredQty(record.delivered_qty > 0 ? record.delivered_qty : '');
    setEditDeliveredDate(record.delivered_date || '');
    setEditDeliveredParty(record.delivered_party || '');
    setEditManualClosingStock(record.closing_stock ?? '');
    setEditNotes(record.notes || '');
    setEditStatusMessage('');
  };

  const handleCloseEditModal = () => {
    setEditingRecord(null);
    setEditStatusMessage('');
    setIsUpdating(false);
  };

  // Handle Update submission
  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord?.id) return;

    setIsUpdating(true);
    setEditStatusMessage('UPDATING RECORD...');

    const finalClosingStock = editManualClosingStock !== '' 
      ? Number(editManualClosingStock) 
      : editCalculatedClosingStock;

    const updatePayload = {
      item_name: editItemName.trim().toUpperCase(),
      opening_stock: Number(editOpeningStock) || 0,
      received_party: editReceivedParty.trim().toUpperCase() || null,
      received_date: editReceivedDate || null,
      received_qty: Number(editReceivedQty) || 0,
      delivered_qty: Number(editDeliveredQty) || 0,
      delivered_date: editDeliveredDate || null,
      delivered_party: editDeliveredParty.trim().toUpperCase() || null,
      closing_stock: finalClosingStock,
      notes: editNotes.trim().toUpperCase() || null,
    };

    const { error } = await supabase
      .from('item_inventory')
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

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!window.confirm('ARE YOU SURE YOU WANT TO DELETE THIS ITEM ENTRY?')) return;

    const { error } = await supabase.from('item_inventory').delete().eq('id', id);
    if (error) {
      alert('Error deleting: ' + error.message);
    } else {
      setRecords(prev => prev.filter(r => r.id !== id));
    }
  };

  // Filtered records for Entered Details table
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const q = searchQuery.toUpperCase();
      const matchesSearch =
        !q ||
        (r.item_name && r.item_name.toUpperCase().includes(q)) ||
        (r.received_party && r.received_party.toUpperCase().includes(q)) ||
        (r.delivered_party && r.delivered_party.toUpperCase().includes(q)) ||
        (r.notes && r.notes.toUpperCase().includes(q));

      if (!matchesSearch) return false;

      if (categoryFilter !== 'ALL') {
        const catObj = CATEGORIZED_ITEMS.find((c) => c.category === categoryFilter);
        if (catObj && !catObj.items.includes(r.item_name)) {
          return false;
        }
      }

      return true;
    });
  }, [records, searchQuery, categoryFilter]);

  // Master Ledger Sheet (All 92 Items aggregated/latest view)
  const masterSheetData = useMemo(() => {
    return ALL_ITEMS.map((itemName) => {
      const itemLogs = records.filter((r) => r.item_name === itemName);
      
      if (itemLogs.length === 0) {
        return {
          item_name: itemName,
          opening_stock: 0,
          received_party: '-',
          received_date: '-',
          received_qty: 0,
          delivered_qty: 0,
          delivered_date: '-',
          delivered_party: '-',
          closing_stock: 0,
          entries_count: 0,
          latest_id: undefined,
        };
      }

      const latestLog = itemLogs[0];
      const oldestLog = itemLogs[itemLogs.length - 1];

      const totalReceived = itemLogs.reduce((acc, curr) => acc + (Number(curr.received_qty) || 0), 0);
      const totalDelivered = itemLogs.reduce((acc, curr) => acc + (Number(curr.delivered_qty) || 0), 0);

      const latestWithReceived = itemLogs.find((r) => (Number(r.received_qty) || 0) > 0 || r.received_party);
      const latestWithDelivered = itemLogs.find((r) => (Number(r.delivered_qty) || 0) > 0 || r.delivered_party);

      return {
        item_name: itemName,
        opening_stock: oldestLog.opening_stock ?? 0,
        received_party: latestWithReceived?.received_party || '-',
        received_date: latestWithReceived?.received_date || '-',
        received_qty: totalReceived,
        delivered_qty: totalDelivered,
        delivered_date: latestWithDelivered?.delivered_date || '-',
        delivered_party: latestWithDelivered?.delivered_party || '-',
        closing_stock: latestLog.closing_stock ?? (Number(oldestLog.opening_stock) + totalReceived - totalDelivered),
        entries_count: itemLogs.length,
        latest_record: latestLog,
      };
    }).filter((row) => {
      const q = searchQuery.toUpperCase();
      const matchesSearch =
        !q ||
        row.item_name.toUpperCase().includes(q) ||
        row.received_party.toUpperCase().includes(q) ||
        row.delivered_party.toUpperCase().includes(q);

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
    const totalReceived = records.reduce((acc, r) => acc + (Number(r.received_qty) || 0), 0);
    const totalDelivered = records.reduce((acc, r) => acc + (Number(r.delivered_qty) || 0), 0);
    const uniqueItemsWithStock = new Set(
      masterSheetData.filter((i) => i.closing_stock > 0).map((i) => i.item_name)
    ).size;
    const totalCurrentStock = masterSheetData.reduce((acc, i) => acc + Number(i.closing_stock || 0), 0);

    return { totalEntries, totalReceived, totalDelivered, uniqueItemsWithStock, totalCurrentStock };
  }, [records, masterSheetData]);

  // Filtered item options for the dropdown search
  const visibleItemOptions = useMemo(() => {
    if (!itemSearchFilter) return CATEGORIZED_ITEMS;
    const filterUpper = itemSearchFilter.toUpperCase();
    return CATEGORIZED_ITEMS.map((cat) => ({
      category: cat.category,
      items: cat.items.filter((i) => i.toUpperCase().includes(filterUpper)),
    })).filter((cat) => cat.items.length > 0);
  }, [itemSearchFilter]);

  // Download CSV export
  const exportToCSV = () => {
    let csvHeaders = 'ITEM NAME,OPENING STOCK,RECEIVED PARTY,RECEIVED DATE,RECEIVED QTY,DELIVERED QTY,DELIVERED DATE,DELIVERED PARTY,CLOSING STOCK\n';
    let rowsData = '';

    if (activeTab === 'entries') {
      if (filteredRecords.length === 0) return alert('NO ENTERED RECORDS TO EXPORT.');
      rowsData = filteredRecords.map((r) => 
        `"${r.item_name}",${r.opening_stock},"${r.received_party || ''}","${r.received_date || ''}",${r.received_qty || 0},${r.delivered_qty || 0},"${r.delivered_date || ''}","${r.delivered_party || ''}",${r.closing_stock}`
      ).join('\n');
    } else {
      if (masterSheetData.length === 0) return alert('NO MASTER SHEET ITEMS TO EXPORT.');
      rowsData = masterSheetData.map((r) => 
        `"${r.item_name}",${r.opening_stock},"${r.received_party}","${r.received_date}",${r.received_qty},${r.delivered_qty},"${r.delivered_date}","${r.delivered_party}",${r.closing_stock}`
      ).join('\n');
    }

    const blob = new Blob([csvHeaders + rowsData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Item_Stock_${activeTab === 'entries' ? 'Entries' : 'Master_Sheet'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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
              className="flex items-center gap-2 text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 px-3.5 py-2.5 rounded-xl transition-all shadow-sm"
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
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-teal-600 text-white shadow-xs">
            <Boxes className="w-4 h-4" />
            <span>Item Inventory Form (Active)</span>
          </div>
          <Link
            href="/purchase"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all text-gray-600 hover:bg-gray-100"
          >
            <ShoppingCart className="w-4 h-4 text-blue-600" />
            <span>Purchase Section</span>
          </Link>
          <Link
            href="/sale"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all text-gray-600 hover:bg-gray-100"
          >
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span>Sale Section</span>
          </Link>
        </div>

        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-teal-500/10 p-2.5 rounded-xl text-teal-700">
              <Boxes className="w-8 h-8" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter">Item Stock Form</h1>
          </div>
          <p className="text-gray-500 text-base font-bold">
            Record inventory transactions with opening stock, inward/received party details, outward/delivered party details, and closing stock.
          </p>
        </div>

        {/* Supabase Notice Box if table not yet created */}
        {!tableExists && (
          <div className="mb-8 p-6 bg-amber-50 border-2 border-amber-300 rounded-2xl shadow-sm">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-black text-lg text-amber-900 mb-1">
                  SUPABASE SETUP REQUIRED: TABLE &quot;item_inventory&quot; NOT FOUND
                </h3>
                <p className="text-sm font-bold text-amber-800 mb-4 normal-case">
                  To save and query item entries, open your Supabase project dashboard, navigate to the <strong>SQL Editor</strong>, paste the SQL below and click <strong>Run</strong>:
                </p>
                <div className="relative bg-gray-900 text-gray-100 p-4 rounded-xl font-mono text-xs overflow-x-auto mb-3">
                  <pre>{supabaseSql}</pre>
                  <button
                    onClick={handleCopySql}
                    className="absolute top-3 right-3 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black px-3 py-1.5 rounded-lg text-xs transition-all shadow"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'COPIED!' : 'COPY SQL'}</span>
                  </button>
                </div>
                <button
                  onClick={fetchRecords}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-4 py-2 rounded-lg transition-all"
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
                <h3 className="font-black text-base text-gray-900">Supabase SQL Schema & Instructions</h3>
              </div>
              <button
                onClick={handleCopySql}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-3 py-1.5 rounded-lg text-xs transition-all shadow"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'COPIED!' : 'COPY SQL'}</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 font-bold mb-3 normal-case">
              Run this in your Supabase SQL Editor if you ever need to recreate or inspect the table schema:
            </p>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-xl font-mono text-xs overflow-x-auto">
              <pre>{supabaseSql}</pre>
            </div>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <span className="text-xs font-black text-gray-400 block mb-1">TOTAL LOGS</span>
            <span className="text-2xl font-black text-gray-900">{stats.totalEntries}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <span className="text-xs font-black text-gray-400 block mb-1">ITEMS W/ STOCK</span>
            <span className="text-2xl font-black text-teal-600">{stats.uniqueItemsWithStock} / 92</span>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <span className="text-xs font-black text-gray-400 block mb-1">TOTAL RECEIVED</span>
            <span className="text-2xl font-black text-blue-600">+{stats.totalReceived}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <span className="text-xs font-black text-gray-400 block mb-1">TOTAL DELIVERED</span>
            <span className="text-2xl font-black text-orange-600">-{stats.totalDelivered}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 col-span-2 lg:col-span-1">
            <span className="text-xs font-black text-gray-400 block mb-1">NET STOCK IN HAND</span>
            <span className={`text-2xl font-black ${stats.totalCurrentStock < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {stats.totalCurrentStock}
            </span>
          </div>
        </div>

        {/* Main Grid: Form & Tables */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-12">
          {/* ===================== FORM SECTION ===================== */}
          <div className="xl:col-span-4 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 h-fit">
            <div className="flex items-center gap-2 mb-6">
              <Boxes className="w-6 h-6 text-teal-600" />
              <h2 className="text-xl md:text-2xl font-black text-gray-900">Record Item Stock</h2>
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
              {/* Item Dropdown with Live Search */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="font-black text-gray-700 text-sm">
                    Select Item <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs text-gray-400 font-bold">{ALL_ITEMS.length} Options</span>
                </div>

                {/* Optional Item Filter text to narrow dropdown */}
                <div className="relative mb-1">
                  <input
                    type="text"
                    placeholder="TYPE TO FILTER 92 ITEMS..."
                    value={itemSearchFilter}
                    onChange={(e) => setItemSearchFilter(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-lg py-2 pl-8 pr-3 text-gray-900 uppercase placeholder-gray-400 focus:border-teal-500 outline-none"
                  />
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                </div>

                <select
                  required
                  value={selectedItem}
                  onChange={(e) => handleItemSelect(e.target.value)}
                  className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-teal-100 focus:border-teal-500 outline-none transition-all bg-white uppercase font-bold text-xs md:text-sm"
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
              </div>

              {/* Opening Stock */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="font-black text-gray-700 text-sm">Opening Stock</label>
                  <span className="text-xs text-gray-400 font-normal normal-case">(Initial balance)</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={openingStock}
                  onChange={(e) => setOpeningStock(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-teal-100 focus:border-teal-500 outline-none transition-all uppercase"
                />
              </div>

              {/* Inward Section: PARTY | DATE | RECEIVED */}
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <h3 className="font-black text-sm text-blue-900">Inward / Received Details</h3>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-black text-gray-700 text-xs">Party (Supplier / Vendor)</label>
                  <input
                    type="text"
                    placeholder="E.G. BIOSTI DENTAL LAB / GLOBAL IMPLANTS"
                    value={receivedParty}
                    onChange={(e) => setReceivedParty(e.target.value.toUpperCase())}
                    className="border border-gray-200 rounded-lg p-2.5 bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="font-black text-gray-700 text-xs">Received Date</label>
                    <input
                      type="date"
                      value={receivedDate}
                      onChange={(e) => setReceivedDate(e.target.value)}
                      className="border border-gray-200 rounded-lg p-2.5 bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-black text-gray-700 text-xs">Received Qty</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={receivedQty}
                      onChange={(e) => setReceivedQty(e.target.value === '' ? '' : Number(e.target.value))}
                      className="border border-gray-200 rounded-lg p-2.5 bg-white text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-sm uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Outward Section: DELIVERED | DATE | PARTY */}
              <div className="p-4 bg-orange-50/60 rounded-xl border border-orange-100 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
                  <h3 className="font-black text-sm text-orange-900">Outward / Delivered Details</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="font-black text-gray-700 text-xs">Delivered Qty</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={deliveredQty}
                      onChange={(e) => setDeliveredQty(e.target.value === '' ? '' : Number(e.target.value))}
                      className="border border-gray-200 rounded-lg p-2.5 bg-white text-gray-900 focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all text-sm uppercase"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="font-black text-gray-700 text-xs">Delivered Date</label>
                    <input
                      type="date"
                      value={deliveredDate}
                      onChange={(e) => setDeliveredDate(e.target.value)}
                      className="border border-gray-200 rounded-lg p-2.5 bg-white text-gray-900 focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="font-black text-gray-700 text-xs">Party (Doctor / Clinic / Hospital)</label>
                  <input
                    type="text"
                    placeholder="E.G. DR. SHARMA / APOLLO CLINIC"
                    value={deliveredParty}
                    onChange={(e) => setDeliveredParty(e.target.value.toUpperCase())}
                    className="border border-gray-200 rounded-lg p-2.5 bg-white text-gray-900 focus:ring-2 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all uppercase text-sm"
                  />
                </div>
              </div>

              {/* Closing Stock (Auto Calculated or Manual Override) */}
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="font-black text-sm text-emerald-900">Closing Stock Balance</span>
                  <span className="text-xl font-black text-emerald-700">
                    {manualClosingStock !== '' ? manualClosingStock : calculatedClosingStock}
                  </span>
                </div>
                <div className="text-xs text-gray-500 font-bold normal-case">
                  Formula: Opening ({Number(openingStock) || 0}) + Received ({Number(receivedQty) || 0}) - Delivered ({Number(deliveredQty) || 0}) = <strong>{calculatedClosingStock}</strong>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <label className="text-xs font-bold text-gray-600 whitespace-nowrap">Override:</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="OPTIONAL OVERRIDE"
                    value={manualClosingStock}
                    onChange={(e) => setManualClosingStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="border border-gray-200 rounded-lg p-2 bg-white text-gray-900 text-xs outline-none w-full"
                  />
                </div>
              </div>

              {/* Notes / Remarks */}
              <div className="flex flex-col gap-2">
                <label className="font-black text-gray-700 text-xs">Remarks / Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="BATCH NO., INVOICE NO., OR REMARKS"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.toUpperCase())}
                  className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-teal-100 focus:border-teal-500 outline-none transition-all uppercase text-sm"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="bg-[#0077b6] hover:bg-blue-700 text-white font-black text-base py-4 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Boxes className="w-5 h-5" />
                <span>SAVE ITEM ENTRY</span>
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
                    className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-black rounded-lg transition-all uppercase ${
                      activeTab === 'entries'
                        ? 'bg-white shadow-sm text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ListOrdered className="w-4 h-4" />
                    <span>Entered Details ({records.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('master')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-black rounded-lg transition-all uppercase ${
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
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs md:text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>EXPORT TO EXCEL / CSV</span>
                </button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                {/* Search Query */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="SEARCH BY ITEM, PARTY NAME, OR REMARKS..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg py-2.5 pl-9 pr-3 text-gray-900 uppercase text-xs md:text-sm outline-none focus:border-blue-500"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>

                {/* Category Dropdown */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-gray-900 uppercase text-xs md:text-sm font-bold bg-white outline-none focus:border-blue-500"
                  >
                    <option value="ALL">ALL CATEGORIES (ALL 92 ITEMS)</option>
                    {CATEGORIZED_ITEMS.map((cat) => (
                      <option key={cat.category} value={cat.category}>
                        {cat.category.toUpperCase()} ({cat.items.length})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* TAB 1: Entered Records Table */}
            {activeTab === 'entries' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50/70 flex justify-between items-center">
                  <h3 className="font-black text-base text-gray-800 uppercase flex items-center gap-2">
                    <ListOrdered className="w-5 h-5 text-blue-600" />
                    <span>Entered Stock Transactions ({filteredRecords.length})</span>
                  </h3>
                  <span className="text-xs text-gray-400 font-bold">LATEST FIRST</span>
                </div>

                <div className="overflow-x-auto max-h-[680px]">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10 shadow-xs">
                      <tr>
                        {/* FULL ITEM NAME: given generous width and normal wrapping so full name is visible */}
                        <th className="p-3 font-black text-gray-900 uppercase min-w-[280px]">
                          Item Name
                        </th>
                        {/* NUMBER COLUMNS: shortened headers and compact widths */}
                        <th className="px-2 py-3 font-black text-gray-800 uppercase text-right w-16 whitespace-nowrap" title="Opening Stock">
                          OPN
                        </th>
                        <th className="p-3 font-black text-blue-700 uppercase bg-blue-50/50 min-w-[130px] whitespace-nowrap">
                          Rcv Party
                        </th>
                        <th className="p-3 font-black text-blue-700 uppercase bg-blue-50/50 w-24 whitespace-nowrap">
                          Rcv Date
                        </th>
                        <th className="px-2 py-3 font-black text-blue-700 uppercase text-right bg-blue-50/50 w-16 whitespace-nowrap" title="Received Quantity">
                          +RCV
                        </th>
                        <th className="px-2 py-3 font-black text-orange-700 uppercase text-right bg-orange-50/50 w-16 whitespace-nowrap" title="Delivered Quantity">
                          -DEL
                        </th>
                        <th className="p-3 font-black text-orange-700 uppercase bg-orange-50/50 w-24 whitespace-nowrap">
                          Del Date
                        </th>
                        <th className="p-3 font-black text-orange-700 uppercase bg-orange-50/50 min-w-[130px] whitespace-nowrap">
                          Del Party
                        </th>
                        <th className="px-2 py-3 font-black text-emerald-800 uppercase text-right bg-emerald-50/50 w-20 whitespace-nowrap" title="Closing Stock">
                          CLS STK
                        </th>
                        <th className="p-3 font-black text-gray-800 uppercase text-center w-24 whitespace-nowrap">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-gray-400 font-bold uppercase">
                            LOADING RECORDS...
                          </td>
                        </tr>
                      ) : filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-gray-400 font-bold uppercase">
                            {records.length === 0
                              ? 'NO ITEM ENTRIES YET. USE THE FORM ON THE LEFT TO LOG YOUR FIRST ITEM STOCK.'
                              : 'NO MATCHING RECORDS FOUND FOR THIS FILTER.'}
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((r) => (
                          <tr
                            key={r.id}
                            className="border-b border-gray-100 odd:bg-white even:bg-gray-50 hover:bg-teal-50/30 transition-colors"
                          >
                            {/* FULL ITEM NAME: No truncation, full wrapping */}
                            <td className="p-3 font-black text-gray-900 min-w-[280px] break-words whitespace-normal leading-snug">
                              {r.item_name}
                            </td>
                            {/* SHORTENED NUMBER COLUMNS */}
                            <td className="px-2 py-3 font-bold text-gray-700 text-right w-16 whitespace-nowrap">
                              {r.opening_stock ?? 0}
                            </td>
                            <td className="p-3 font-bold text-gray-800 bg-blue-50/20 whitespace-nowrap">
                              {r.received_party || '-'}
                            </td>
                            <td className="p-3 font-medium text-gray-600 bg-blue-50/20 whitespace-nowrap">
                              {r.received_date || '-'}
                            </td>
                            <td className="px-2 py-3 font-black text-blue-600 text-right bg-blue-50/20 w-16 whitespace-nowrap">
                              {r.received_qty > 0 ? `+${r.received_qty}` : 0}
                            </td>
                            <td className="px-2 py-3 font-black text-orange-600 text-right bg-orange-50/20 w-16 whitespace-nowrap">
                              {r.delivered_qty > 0 ? `-${r.delivered_qty}` : 0}
                            </td>
                            <td className="p-3 font-medium text-gray-600 bg-orange-50/20 whitespace-nowrap">
                              {r.delivered_date || '-'}
                            </td>
                            <td className="p-3 font-bold text-gray-800 bg-orange-50/20 whitespace-nowrap">
                              {r.delivered_party || '-'}
                            </td>
                            <td className="px-2 py-3 font-black text-right bg-emerald-50/20 w-20 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-md text-xs font-black inline-block min-w-[36px] text-center ${
                                Number(r.closing_stock) > 0 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : Number(r.closing_stock) < 0 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {r.closing_stock}
                              </span>
                            </td>
                            {/* ACTION BUTTONS: UPDATE & DELETE */}
                            <td className="p-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEditModal(r)}
                                  title="Update / Edit Entry"
                                  className="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1 cursor-pointer font-bold text-xs"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">EDIT</span>
                                </button>
                                <button
                                  onClick={() => handleDelete(r.id)}
                                  title="Delete Entry"
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

            {/* TAB 2: Master Ledger Sheet (Matches PDF Exactly) */}
            {activeTab === 'master' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-teal-50/50 flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <h3 className="font-black text-base text-teal-900 uppercase flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-teal-700" />
                      <span>PDF Stock Register (All 92 Dental Items)</span>
                    </h3>
                    <p className="text-xs text-gray-500 font-bold normal-case">
                      Mirrors the exact columns from the PDF inventory sheet. Shows complete item names and quick stock update options.
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
                        {/* FULL ITEM NAME */}
                        <th className="p-3 font-black text-gray-900 uppercase border-r border-gray-200 min-w-[280px]">
                          ITEMS
                        </th>
                        {/* SHORTENED NUMBER COLUMNS */}
                        <th className="px-2 py-3 font-black text-gray-900 uppercase text-right border-r border-gray-200 w-16 whitespace-nowrap" title="Opening Stock">
                          OPN
                        </th>
                        <th className="p-3 font-black text-gray-900 uppercase border-r border-gray-200 min-w-[130px] whitespace-nowrap">
                          PARTY (RCV)
                        </th>
                        <th className="p-3 font-black text-gray-900 uppercase border-r border-gray-200 w-24 whitespace-nowrap">
                          DATE
                        </th>
                        <th className="px-2 py-3 font-black text-blue-700 uppercase text-right border-r border-gray-200 w-16 whitespace-nowrap" title="Total Received">
                          +RCV
                        </th>
                        <th className="px-2 py-3 font-black text-orange-700 uppercase text-right border-r border-gray-200 w-16 whitespace-nowrap" title="Total Delivered">
                          -DEL
                        </th>
                        <th className="p-3 font-black text-gray-900 uppercase border-r border-gray-200 w-24 whitespace-nowrap">
                          DATE
                        </th>
                        <th className="p-3 font-black text-gray-900 uppercase border-r border-gray-200 min-w-[130px] whitespace-nowrap">
                          PARTY (DEL)
                        </th>
                        <th className="px-2 py-3 font-black text-emerald-800 uppercase text-right border-r border-gray-200 w-20 whitespace-nowrap" title="Closing Stock">
                          CLS STK
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
                                ? 'bg-white hover:bg-teal-50/40 font-bold'
                                : 'bg-gray-50/40 hover:bg-gray-100/60 text-gray-500'
                            }`}
                          >
                            {/* FULL ITEM NAME: No cut-off */}
                            <td className="p-3 font-black text-gray-900 border-r border-gray-200 min-w-[280px] break-words whitespace-normal leading-snug">
                              {row.item_name}
                            </td>
                            {/* SHORTENED NUMBERS */}
                            <td className="px-2 py-3 text-right border-r border-gray-200 font-bold text-gray-700 w-16 whitespace-nowrap">
                              {row.opening_stock}
                            </td>
                            <td className="p-3 border-r border-gray-200 font-medium whitespace-nowrap">
                              {row.received_party}
                            </td>
                            <td className="p-3 border-r border-gray-200 font-medium whitespace-nowrap">
                              {row.received_date}
                            </td>
                            <td className="px-2 py-3 text-right border-r border-gray-200 font-black text-blue-600 w-16 whitespace-nowrap">
                              {row.received_qty > 0 ? row.received_qty : '-'}
                            </td>
                            <td className="px-2 py-3 text-right border-r border-gray-200 font-black text-orange-600 w-16 whitespace-nowrap">
                              {row.delivered_qty > 0 ? row.delivered_qty : '-'}
                            </td>
                            <td className="p-3 border-r border-gray-200 font-medium whitespace-nowrap">
                              {row.delivered_date}
                            </td>
                            <td className="p-3 border-r border-gray-200 font-medium whitespace-nowrap">
                              {row.delivered_party}
                            </td>
                            <td className="px-2 py-3 text-right border-r border-gray-200 font-black w-20 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 rounded-md text-xs font-black inline-block min-w-[36px] text-center ${
                                  row.closing_stock > 0
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : row.closing_stock < 0
                                    ? 'bg-red-100 text-red-800 border border-red-300'
                                    : 'bg-gray-200 text-gray-600'
                                }`}
                              >
                                {row.closing_stock}
                              </span>
                            </td>
                            <td className="p-2 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                {row.latest_record ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(row.latest_record)}
                                    title="Edit Latest Entry"
                                    className="text-xs font-black px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors uppercase whitespace-nowrap cursor-pointer flex items-center gap-1"
                                  >
                                    <Pencil className="w-3 h-3" />
                                    <span>EDIT</span>
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleItemSelect(row.item_name);
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
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-2 rounded-lg text-white">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-gray-900 uppercase">Update Item Entry</h3>
                  <p className="text-xs text-gray-500 font-bold normal-case">Modify inventory numbers, party details, or dates.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseEditModal}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateRecord} className="p-6 flex flex-col gap-5 text-sm font-bold">
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

              {/* Item Name (Full name displayed, searchable dropdown) */}
              <div className="flex flex-col gap-2">
                <label className="font-black text-gray-700 text-xs uppercase">Item Name</label>
                <select
                  required
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  className="border border-gray-200 rounded-lg p-3 text-gray-900 bg-white font-bold text-xs uppercase focus:border-blue-500 outline-none"
                >
                  {CATEGORIZED_ITEMS.map((group) => (
                    <optgroup key={group.category} label={group.category.toUpperCase()}>
                      {group.items.map((item) => (
                        <option key={item} value={item} className="uppercase font-bold text-xs py-1">
                          {item}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Opening Stock */}
              <div className="flex flex-col gap-1.5">
                <label className="font-black text-gray-700 text-xs uppercase">Opening Stock</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editOpeningStock}
                  onChange={(e) => setEditOpeningStock(e.target.value === '' ? '' : Number(e.target.value))}
                  className="border border-gray-200 rounded-lg p-2.5 text-gray-900 uppercase focus:border-blue-500 outline-none text-sm"
                />
              </div>

              {/* Inward Details */}
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <h4 className="font-black text-xs text-blue-900 uppercase">Inward / Received Details</h4>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600 font-bold uppercase">Party (Supplier / Vendor)</label>
                  <input
                    type="text"
                    value={editReceivedParty}
                    onChange={(e) => setEditReceivedParty(e.target.value.toUpperCase())}
                    className="border border-gray-200 rounded-lg p-2 bg-white text-gray-900 text-xs uppercase outline-none focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-600 font-bold uppercase">Received Date</label>
                    <input
                      type="date"
                      value={editReceivedDate}
                      onChange={(e) => setEditReceivedDate(e.target.value)}
                      className="border border-gray-200 rounded-lg p-2 bg-white text-gray-900 text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-600 font-bold uppercase">Received Qty</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editReceivedQty}
                      onChange={(e) => setEditReceivedQty(e.target.value === '' ? '' : Number(e.target.value))}
                      className="border border-gray-200 rounded-lg p-2 bg-white text-gray-900 text-xs uppercase outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Outward Details */}
              <div className="p-4 bg-orange-50/60 rounded-xl border border-orange-100 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
                  <h4 className="font-black text-xs text-orange-900 uppercase">Outward / Delivered Details</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-600 font-bold uppercase">Delivered Qty</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editDeliveredQty}
                      onChange={(e) => setEditDeliveredQty(e.target.value === '' ? '' : Number(e.target.value))}
                      className="border border-gray-200 rounded-lg p-2 bg-white text-gray-900 text-xs uppercase outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-600 font-bold uppercase">Delivered Date</label>
                    <input
                      type="date"
                      value={editDeliveredDate}
                      onChange={(e) => setEditDeliveredDate(e.target.value)}
                      className="border border-gray-200 rounded-lg p-2 bg-white text-gray-900 text-xs outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-600 font-bold uppercase">Party (Doctor / Clinic)</label>
                  <input
                    type="text"
                    value={editDeliveredParty}
                    onChange={(e) => setEditDeliveredParty(e.target.value.toUpperCase())}
                    className="border border-gray-200 rounded-lg p-2 bg-white text-gray-900 text-xs uppercase outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Closing Stock */}
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100 flex justify-between items-center">
                <div>
                  <span className="font-black text-xs text-emerald-900 uppercase block">Updated Closing Stock</span>
                  <span className="text-xs text-gray-500 font-normal normal-case">
                    Calculated: ({Number(editOpeningStock) || 0}) + ({Number(editReceivedQty) || 0}) - ({Number(editDeliveredQty) || 0}) = <strong>{editCalculatedClosingStock}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder={String(editCalculatedClosingStock)}
                    value={editManualClosingStock}
                    onChange={(e) => setEditManualClosingStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="border border-gray-200 rounded-lg p-2 bg-white text-emerald-700 font-black text-sm w-24 text-right outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-600 font-bold uppercase">Remarks / Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value.toUpperCase())}
                  className="border border-gray-200 rounded-lg p-2.5 text-gray-900 uppercase text-xs outline-none focus:border-blue-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-black text-xs uppercase transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isUpdating ? 'SAVING...' : 'UPDATE ENTRY'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
