'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabase';
import {
  Activity,
  ArrowLeft,
  Users,
  Search,
  Filter,
  Download,
  Database,
  Copy,
  Check,
  Pencil,
  Plus,
  RefreshCw,
  Phone,
  MessageCircle,
  Building2,
  Cake,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  Layers,
  Sparkles
} from 'lucide-react';
import { MasterContact, CONTACT_CATEGORIES, ContactCategory } from '../../lib/contactTypes';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<MasterContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'supabase' | 'bundled'>('bundled');
  const [hasSupabaseTable, setHasSupabaseTable] = useState<boolean | null>(null);
  
  // Filtering & Pagination
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('All');
  const [selectedState, setSelectedState] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Modals & UI States
  const [editingContact, setEditingContact] = useState<MasterContact | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Syncing to Supabase
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // New Contact Form State
  const [newContact, setNewContact] = useState<Omit<MasterContact, 'id'>>({
    name: '',
    phone: '',
    district: '',
    state: '',
    business: '',
    birthday: '',
    category: 'Others (Friends, Personal & Unsorted)',
    notes: ''
  });

  // Show toast notification
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Load Contacts (Fetch from bundled JSON first for instant render, then try Supabase)
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        // Try fetching bundled JSON directly from public folder for instant 0ms startup
        const res = await fetch('/master_contacts.json');
        if (res.ok) {
          const data: MasterContact[] = await res.json();
          setContacts(data);
          setSource('bundled');
        }

        // Now check if Supabase has live master_contacts data
        try {
          const { data: dbData, error } = await supabase
            .from('master_contacts')
            .select('*')
            .order('id', { ascending: true })
            .limit(10);

          if (!error) {
            setHasSupabaseTable(true);
            if (dbData && dbData.length > 0) {
              // Live table exists with data! Fetch full records from Supabase
              const { data: fullDbData, error: fullErr } = await supabase
                .from('master_contacts')
                .select('*')
                .order('id', { ascending: true });

              if (!fullErr && fullDbData && fullDbData.length > 0) {
                setContacts(fullDbData as MasterContact[]);
                setSource('supabase');
              }
            }
          } else {
            setHasSupabaseTable(false);
          }
        } catch {
          setHasSupabaseTable(false);
        }
      } catch (err) {
        console.warn('Initial data load notice:', err);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  // Compute unique districts & states for filters
  const { districts, states, categoryCounts } = useMemo(() => {
    const distSet = new Set<string>();
    const stateSet = new Set<string>();
    const counts: Record<string, number> = { All: contacts.length };

    for (const cat of CONTACT_CATEGORIES) {
      counts[cat] = 0;
    }

    for (const c of contacts) {
      if (c.district) distSet.add(c.district);
      if (c.state) stateSet.add(c.state);
      if (counts[c.category] !== undefined) {
        counts[c.category]++;
      } else {
        counts['Others (Friends, Personal & Unsorted)'] = 
          (counts['Others (Friends, Personal & Unsorted)'] || 0) + 1;
      }
    }

    return {
      districts: Array.from(distSet).sort(),
      states: Array.from(stateSet).sort(),
      categoryCounts: counts
    };
  }, [contacts]);

  // Filtered contacts based on category, search query, district, state
  const filteredContacts = useMemo(() => {
    let result = contacts;

    if (selectedCategory !== 'All') {
      result = result.filter((c) => c.category === selectedCategory);
    }

    if (selectedDistrict !== 'All') {
      result = result.filter((c) => c.district.toLowerCase() === selectedDistrict.toLowerCase());
    }

    if (selectedState !== 'All') {
      result = result.filter((c) => c.state.toLowerCase() === selectedState.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => {
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.district.toLowerCase().includes(q) ||
          c.state.toLowerCase().includes(q) ||
          c.business.toLowerCase().includes(q) ||
          c.birthday.toLowerCase().includes(q) ||
          (c.notes && c.notes.toLowerCase().includes(q))
        );
      });
    }

    return result;
  }, [contacts, selectedCategory, selectedDistrict, selectedState, searchQuery]);

  // Reset page when category or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery, selectedDistrict, selectedState, pageSize]);

  // Paginated results
  const totalPages = Math.ceil(filteredContacts.length / pageSize) || 1;
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContacts.slice(start, start + pageSize);
  }, [filteredContacts, currentPage, pageSize]);

  // Fast Reassign Category (Special feature for "Others" category or any contact)
  const handleQuickCategoryChange = async (contactId: number, newCategory: string) => {
    const contactToUpdate = contacts.find((c) => c.id === contactId);
    if (!contactToUpdate) return;

    const oldCategory = contactToUpdate.category;
    const updated = { ...contactToUpdate, category: newCategory, updated_at: new Date().toISOString() };

    // Update state immediately
    setContacts((prev) => prev.map((c) => (c.id === contactId ? updated : c)));
    showToast(`Moved "${contactToUpdate.name}" from [${oldCategory}] to [${newCategory}]`, 'success');

    // Update in Supabase / API in background
    try {
      await fetch('/api/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: contactId, category: newCategory })
      });
      if (hasSupabaseTable) {
        await supabase
          .from('master_contacts')
          .update({ category: newCategory, updated_at: new Date().toISOString() })
          .eq('id', contactId);
      }
    } catch (err) {
      console.warn('Backend sync notice:', err);
    }
  };

  // Save Full Edit Contact
  const handleSaveEdit = async () => {
    if (!editingContact) return;

    const id = editingContact.id;
    const updated = { ...editingContact, updated_at: new Date().toISOString() };

    setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)));
    setEditingContact(null);
    showToast(`Contact "${updated.name}" updated successfully!`, 'success');

    try {
      await fetch('/api/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (hasSupabaseTable) {
        await supabase
          .from('master_contacts')
          .update(updated)
          .eq('id', id);
      }
    } catch (err) {
      console.warn('Backend sync notice:', err);
    }
  };

  // Add New Contact
  const handleCreateContact = async () => {
    if (!newContact.name.trim()) {
      showToast('Contact Name is required', 'error');
      return;
    }

    const maxId = contacts.reduce((max, c) => (c.id > max ? c.id : max), 5599);
    const created: MasterContact = {
      ...newContact,
      id: maxId + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setContacts((prev) => [created, ...prev]);
    setIsAddingNew(false);
    setNewContact({
      name: '',
      phone: '',
      district: '',
      state: '',
      business: '',
      birthday: '',
      category: 'Others (Friends, Personal & Unsorted)',
      notes: ''
    });
    showToast(`Contact "${created.name}" created successfully!`, 'success');

    try {
      await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(created)
      });
      if (hasSupabaseTable) {
        await supabase.from('master_contacts').insert([created]);
      }
    } catch (err) {
      console.warn('Backend sync notice:', err);
    }
  };

  // Sync to Supabase in batches
  const handleSyncToSupabase = async () => {
    if (syncing) return;

    // Check if table exists in Supabase first
    const { error: probeError } = await supabase.from('master_contacts').select('id').limit(1);
    if (probeError) {
      setHasSupabaseTable(false);
      setShowSqlGuide(true);
      showToast('Table "master_contacts" does not exist in Supabase yet. Please run the SQL schema first.', 'info');
      return;
    }

    setHasSupabaseTable(true);
    setSyncing(true);
    setSyncProgress(0);

    try {
      const batchSize = 250;
      const total = contacts.length;
      let processed = 0;

      for (let i = 0; i < total; i += batchSize) {
        const chunk = contacts.slice(i, i + batchSize);
        // Sanitize strings from null bytes and control chars
        const cleanChunk = chunk.map((c) => ({
          id: c.id,
          name: (c.name || '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim(),
          phone: (c.phone || '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim(),
          district: (c.district || '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim(),
          state: (c.state || '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim(),
          business: (c.business || '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim(),
          birthday: (c.birthday || '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim(),
          category: (c.category || '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim(),
          notes: (c.notes || '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim(),
        }));

        const { error } = await supabase.from('master_contacts').upsert(cleanChunk, { onConflict: 'id' });

        if (error) {
          setSyncing(false);
          showToast(`Sync issue: ${error.message}`, 'error');
          setShowSqlGuide(true);
          return;
        }

        processed = Math.min(i + batchSize, total);
        setSyncProgress(Math.round((processed / total) * 100));
      }

      setSource('supabase');
      showToast(`Successfully synced all ${total} contacts to Supabase!`, 'success');
    } catch (err: any) {
      showToast(`Sync notice: ${err?.message || 'Check connection'}`, 'error');
      setShowSqlGuide(true);
    } finally {
      setSyncing(false);
    }
  };

  // Export Filtered Contacts to CSV
  const handleExportCSV = () => {
    if (filteredContacts.length === 0) {
      showToast('No contacts to export', 'info');
      return;
    }

    const headers = ['ID', 'Name', 'Phone Number', 'District', 'State', 'Business', 'Birthday', 'Category', 'Notes'];
    const rows = filteredContacts.map((c) => [
      c.id,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      `"${(c.district || '').replace(/"/g, '""')}"`,
      `"${(c.state || '').replace(/"/g, '""')}"`,
      `"${(c.business || '').replace(/"/g, '""')}"`,
      `"${(c.birthday || '').replace(/"/g, '""')}"`,
      `"${(c.category || '').replace(/"/g, '""')}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const catSanitized = selectedCategory.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('download', `Master_Contacts_${catSanitized}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredContacts.length} contacts to CSV!`, 'success');
  };

  const sqlCode = `-- Run this in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS master_contacts (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  district TEXT DEFAULT '',
  state TEXT DEFAULT '',
  business TEXT DEFAULT '',
  birthday TEXT DEFAULT '',
  category TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE master_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all" ON master_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_mc_category ON master_contacts(category);
CREATE INDEX IF NOT EXISTS idx_mc_name ON master_contacts(name);
CREATE INDEX IF NOT EXISTS idx_mc_phone ON master_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_mc_district ON master_contacts(district);`;

  return (
    <main className="min-h-screen bg-[#f4f7f9] p-4 md:p-8 font-sans uppercase text-sm">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border text-white font-black tracking-wide transition-all transform animate-bounce ${
            toastMessage.type === 'error'
              ? 'bg-red-600 border-red-700'
              : toastMessage.type === 'info'
              ? 'bg-blue-600 border-blue-700'
              : 'bg-emerald-600 border-emerald-700'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-white" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-white" />
          )}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <header className="mb-6 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-black text-gray-700 bg-white border border-gray-200 hover:border-blue-400 px-3.5 py-2.5 rounded-xl transition-all shadow-sm group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Dashboard</span>
          </Link>
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-sm">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                Master Contact Directory
              </h1>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                  source === 'supabase'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}
              >
                {source === 'supabase' ? '● Supabase Live' : '● Database Ready (5,599)'}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-bold lowercase">
              complete categorized phonebook from pdf · view, search, edit & reassign
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAddingNew(true)}
            className="flex items-center gap-1.5 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>

          <button
            onClick={handleSyncToSupabase}
            disabled={syncing}
            className={`flex items-center gap-1.5 text-xs font-black px-4 py-2.5 rounded-xl shadow-sm transition-all border ${
              syncing
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
            }`}
          >
            <Database className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? `Syncing (${syncProgress}%)` : 'Sync Supabase'}</span>
          </button>

          <button
            onClick={() => setShowSqlGuide(true)}
            className="flex items-center gap-1.5 text-xs font-black bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-3 py-2.5 rounded-xl shadow-sm transition-all"
            title="View Supabase SQL Table Setup"
          >
            <Copy className="w-3.5 h-3.5 text-gray-500" />
            <span>SQL Schema</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs font-black bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-3 py-2.5 rounded-xl shadow-sm transition-all"
            title="Export filtered contacts to CSV"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* Banner if Supabase table is not yet detected */}
      {hasSupabaseTable === false && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-gray-900 text-xs">
                RUNNING FROM LOCAL DATASET (ALL 5,599 CONTACTS READY)
              </div>
              <div className="text-[11px] text-gray-500 font-bold lowercase">
                all contacts, search, and category moves work instantly. to sync to cloud supabase, run the sql schema once.
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowSqlGuide(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-sm transition-all"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>View SQL Schema</span>
          </button>
        </div>
      )}

      {/* Sync progress bar */}
      {syncing && (
        <div className="mb-6 bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm">
          <div className="flex justify-between items-center mb-1 text-xs font-black text-emerald-800">
            <span>Syncing contacts to Supabase master_contacts table...</span>
            <span>{syncProgress}%</span>
          </div>
          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${syncProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Category Pills & Breakdown (Categories Wise) */}
      <section className="mb-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span className="font-black text-xs text-gray-800 tracking-wider">
              Browse By Category ({CONTACT_CATEGORIES.length} Categories from PDF)
            </span>
          </div>
          <span className="text-xs font-black text-gray-400 lowercase">
            {filteredContacts.length} contacts matching current filters
          </span>
        </div>

        {/* Categories Bar */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 border ${
              selectedCategory === 'All'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
            }`}
          >
            <span>All Categories</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedCategory === 'All' ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {categoryCounts['All'] || 0}
            </span>
          </button>

          {CONTACT_CATEGORIES.map((cat, idx) => {
            const isSelected = selectedCategory === cat;
            const count = categoryCounts[cat] || 0;
            const isOthers = cat.startsWith('Others');
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? isOthers
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : isOthers
                    ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                }`}
              >
                <span>
                  {idx + 1}. {cat}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? 'bg-black/20 text-white'
                      : isOthers
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Special Banner When Viewing "Others" Category */}
        {selectedCategory === 'Others (Friends, Personal & Unsorted)' && (
          <div className="mt-3 bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 font-bold">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-black uppercase">Category Reassignment Active: </span>
              In this "Others" section, you can use the dropdown in each row below to choose a category. The contact will automatically move into that category table!
            </div>
          </div>
        )}
      </section>

      {/* Filter and Search Bar */}
      <section className="mb-6 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH BY NAME, PHONE, DISTRICT, STATE, BUSINESS, BIRTHDAY..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500 placeholder-gray-400 transition-colors uppercase"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* District Filter */}
        <div className="flex items-center gap-1.5 text-xs font-black text-gray-700">
          <MapPin className="w-4 h-4 text-gray-400" />
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-blue-500 uppercase"
          >
            <option value="All">All Districts ({districts.length})</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* State Filter */}
        <div className="flex items-center gap-1.5 text-xs font-black text-gray-700">
          <Building2 className="w-4 h-4 text-gray-400" />
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-blue-500 uppercase"
          >
            <option value="All">All States ({states.length})</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Page size */}
        <div className="flex items-center gap-1.5 text-xs font-black text-gray-700">
          <span className="text-gray-400 lowercase">per page:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-xs font-bold text-gray-800 focus:outline-none focus:border-blue-500"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
      </section>

      {/* Main Table */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-black text-gray-600 tracking-wider">
                <th className="py-3 px-3 w-12 text-center">#</th>
                <th className="py-3 px-4 min-w-[200px]">NAME</th>
                <th className="py-3 px-4 min-w-[170px]">PHONE NUMBER</th>
                <th className="py-3 px-4 min-w-[120px]">DISTRICT</th>
                <th className="py-3 px-4 min-w-[110px]">STATE</th>
                <th className="py-3 px-4 min-w-[170px]">BUSINESS</th>
                <th className="py-3 px-4 min-w-[120px]">BIRTHDAY</th>
                <th className="py-3 px-4 min-w-[180px]">CATEGORY</th>
                <th className="py-3 px-4 min-w-[190px] text-center">ACTIONS / MOVE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 font-bold">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Loading 5,599 Contacts...</span>
                  </td>
                </tr>
              ) : paginatedContacts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400 font-bold">
                    No contacts found matching the filters.
                  </td>
                </tr>
              ) : (
                paginatedContacts.map((c) => {
                  const isOthers = c.category.startsWith('Others');
                  const primaryPhone = c.phone ? c.phone.split(',')[0].replace(/\D/g, '') : '';

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      {/* ID */}
                      <td className="py-3 px-3 text-center text-gray-400 font-mono text-[11px]">
                        {c.id}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4">
                        <div className="font-black text-gray-900">{c.name || '—'}</div>
                        {c.notes && (
                          <div className="text-[10px] text-gray-400 font-normal lowercase truncate max-w-[260px]">
                            {c.notes}
                          </div>
                        )}
                      </td>

                      {/* Phone Number */}
                      <td className="py-3 px-4">
                        {c.phone ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-gray-800">{c.phone}</span>
                            {primaryPhone.length >= 10 && (
                              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <a
                                  href={`tel:${primaryPhone}`}
                                  className="p-1 hover:bg-blue-100 rounded text-blue-600 transition-colors"
                                  title="Call"
                                >
                                  <Phone className="w-3 h-3" />
                                </a>
                                <a
                                  href={`https://wa.me/${primaryPhone.length === 10 ? '91' + primaryPhone : primaryPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 hover:bg-emerald-100 rounded text-emerald-600 transition-colors"
                                  title="WhatsApp"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 font-normal italic lowercase">no number</span>
                        )}
                      </td>

                      {/* District */}
                      <td className="py-3 px-4">
                        {c.district ? (
                          <span className="inline-block bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-black text-[11px]">
                            {c.district}
                          </span>
                        ) : (
                          <span className="text-gray-300 italic lowercase">—</span>
                        )}
                      </td>

                      {/* State */}
                      <td className="py-3 px-4">
                        {c.state ? (
                          <span className="font-bold text-gray-700 text-[11px]">
                            {c.state}
                          </span>
                        ) : (
                          <span className="text-gray-300 italic lowercase">—</span>
                        )}
                      </td>

                      {/* Business */}
                      <td className="py-3 px-4">
                        {c.business ? (
                          <div className="flex items-center gap-1 font-bold text-gray-800">
                            <Building2 className="w-3 h-3 text-purple-600 shrink-0" />
                            <span className="truncate max-w-[200px]" title={c.business}>
                              {c.business}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-300 italic lowercase">—</span>
                        )}
                      </td>

                      {/* Birthday */}
                      <td className="py-3 px-4">
                        {c.birthday ? (
                          <div className="flex items-center gap-1 font-bold text-pink-700 bg-pink-50 px-2 py-0.5 rounded w-fit text-[11px]">
                            <Cake className="w-3 h-3 text-pink-500 shrink-0" />
                            <span>{c.birthday}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 italic lowercase">—</span>
                        )}
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-md ${
                            isOthers
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}
                        >
                          {c.category}
                        </span>
                      </td>

                      {/* Actions & Category Move Dropdown */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* Quick Category Move Dropdown (Highly emphasized for Others) */}
                          <div className="relative">
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleQuickCategoryChange(c.id, e.target.value);
                                }
                              }}
                              className={`text-[10px] font-black rounded-lg px-2 py-1 focus:outline-none transition-all cursor-pointer border ${
                                isOthers
                                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm'
                                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                              }`}
                              title="Move contact to another category"
                            >
                              <option value="" disabled>
                                {isOthers ? '⚡ Move Category...' : 'Move to...'}
                              </option>
                              {CONTACT_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat} disabled={cat === c.category}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Edit Button */}
                          <button
                            onClick={() => setEditingContact(c)}
                            className="p-1.5 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-600 rounded-lg transition-colors"
                            title="Edit Contact Details"
                          >
                            <Pencil className="w-3.5 h-3.5" />
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

        {/* Pagination Footer */}
        <div className="py-3 px-4 bg-gray-50 border-t border-gray-200 flex flex-wrap justify-between items-center gap-3 text-xs font-black text-gray-600">
          <div>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredContacts.length)} of{' '}
            <span className="text-gray-900">{filteredContacts.length}</span> contacts
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className={`p-1.5 rounded-lg border flex items-center gap-1 ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
                  : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev</span>
            </button>

            <span className="px-2 font-mono">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className={`p-1.5 rounded-lg border flex items-center gap-1 ${
                currentPage >= totalPages
                  ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
                  : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
              }`}
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* EDIT CONTACT MODAL */}
      {editingContact && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Pencil className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-gray-900">
                  Edit Contact #{editingContact.id}
                </h3>
              </div>
              <button
                onClick={() => setEditingContact(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">
                  FULL NAME *
                </label>
                <input
                  type="text"
                  value={editingContact.name}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">
                  PHONE NUMBER
                </label>
                <input
                  type="text"
                  value={editingContact.phone}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, phone: e.target.value })
                  }
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">
                    DISTRICT
                  </label>
                  <input
                    type="text"
                    value={editingContact.district}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, district: e.target.value })
                    }
                    placeholder="e.g. Ludhiana, Patiala"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">
                    STATE
                  </label>
                  <input
                    type="text"
                    value={editingContact.state}
                    onChange={(e) =>
                      setEditingContact({ ...editingContact, state: e.target.value })
                    }
                    placeholder="e.g. Punjab, Haryana"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">
                  BUSINESS / CLINIC / ORG
                </label>
                <input
                  type="text"
                  value={editingContact.business}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, business: e.target.value })
                  }
                  placeholder="e.g. Goenka TAL Care, Medtronic"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">
                  BIRTHDAY
                </label>
                <input
                  type="text"
                  value={editingContact.birthday}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, birthday: e.target.value })
                  }
                  placeholder="e.g. 24-03-1982 or March 31, 1970"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">
                  CATEGORY (CHOOSE TO MOVE)
                </label>
                <select
                  value={editingContact.category}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, category: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                >
                  {CONTACT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">
                  NOTES / ALIASES
                </label>
                <textarea
                  value={editingContact.notes}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, notes: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-gray-100">
              <button
                onClick={() => setEditingContact(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW CONTACT MODAL */}
      {isAddingNew && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-gray-900">
                  Add New Contact
                </h3>
              </div>
              <button
                onClick={() => setIsAddingNew(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">
                  FULL NAME *
                </label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="Enter full name or clinic"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">
                  PHONE NUMBER
                </label>
                <input
                  type="text"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">
                    DISTRICT
                  </label>
                  <input
                    type="text"
                    value={newContact.district}
                    onChange={(e) =>
                      setNewContact({ ...newContact, district: e.target.value })
                    }
                    placeholder="e.g. Ludhiana, Patiala"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1">
                    STATE
                  </label>
                  <input
                    type="text"
                    value={newContact.state}
                    onChange={(e) =>
                      setNewContact({ ...newContact, state: e.target.value })
                    }
                    placeholder="e.g. Punjab, Haryana"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">
                  BUSINESS / CLINIC / ORG
                </label>
                <input
                  type="text"
                  value={newContact.business}
                  onChange={(e) =>
                    setNewContact({ ...newContact, business: e.target.value })
                  }
                  placeholder="e.g. Dental Care, Diagnostic"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">
                  BIRTHDAY
                </label>
                <input
                  type="text"
                  value={newContact.birthday}
                  onChange={(e) =>
                    setNewContact({ ...newContact, birthday: e.target.value })
                  }
                  placeholder="e.g. 24-03-1982 or March 31, 1970"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">
                  CATEGORY
                </label>
                <select
                  value={newContact.category}
                  onChange={(e) =>
                    setNewContact({ ...newContact, category: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                >
                  {CONTACT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">
                  NOTES
                </label>
                <textarea
                  value={newContact.notes}
                  onChange={(e) =>
                    setNewContact({ ...newContact, notes: e.target.value })
                  }
                  rows={2}
                  placeholder="Optional notes or details"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-gray-100">
              <button
                onClick={() => setIsAddingNew(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateContact}
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Create Contact</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQL SCHEMA GUIDE MODAL */}
      {showSqlGuide && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-gray-900">
                  Supabase Table Setup (SQL Script)
                </h3>
              </div>
              <button
                onClick={() => setShowSqlGuide(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 font-bold mb-3 lowercase">
              if you want to persist contacts in your live supabase database, run this script once in your supabase sql editor:
            </p>

            <div className="relative mb-4">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre">
                {sqlCode}
              </pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(sqlCode);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 2500);
                }}
                className="absolute top-3 right-3 flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-gray-400 font-bold lowercase">
                note: even without running sql, all 5,599 contacts work immediately in local mode!
              </span>
              <button
                onClick={() => setShowSqlGuide(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

