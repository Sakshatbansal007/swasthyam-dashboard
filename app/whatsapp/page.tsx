'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../supabase';
import { MasterContact, CONTACT_CATEGORIES } from '../../lib/contactTypes';
import {
  Activity,
  ArrowLeft,
  Send,
  MessageSquare,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ExternalLink,
  Search,
  Settings,
  HelpCircle,
  Copy,
  Check,
  X,
  Play,
  Pause,
  RotateCcw,
  Users,
  Layers,
  Sparkles,
  Phone,
  Paperclip,
  CheckCheck,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

export default function WhatsAppBroadcastPage() {
  const [contacts, setContacts] = useState<MasterContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Selected Categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'Doctors – Endocrinology & Diabetes',
    'Doctors – Cardiology & Other Specialists',
    'Doctors – Physicians, Pediatrics & General',
  ]);

  // Excluded Contact IDs (unchecking specific individuals)
  const [excludedContactIds, setExcludedContactIds] = useState<Set<number>>(new Set());

  // Search within selected audience
  const [audienceSearch, setAudienceSearch] = useState('');

  // Message Composer
  const [messageText, setMessageText] = useState(
    'Respected *{name}*,\n\nGreetings from *Swasthyam Healthcare*! We are delighted to share our latest clinical catalog and updates with you.\n\nFor inquiries or supply orders, feel free to reply directly to this message.\n\nWarm regards,\n*Swasthyam Healthcare Team*'
  );
  const [hasPhoto, setHasPhoto] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [localImagePreview, setLocalImagePreview] = useState<string | null>(null);

  // Sending Mode: 'api' (Official Meta API - Anti-ban) or 'queue' (Interactive Web Queue)
  const [sendingMode, setSendingMode] = useState<'api' | 'queue'>('api');

  // Meta Cloud API Credentials (Stored in LocalStorage or Env)
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [apiStatus, setApiStatus] = useState<'untested' | 'connected' | 'invalid'>('untested');
  const [apiDetails, setApiDetails] = useState<any>(null);

  // Broadcast Progress States
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState(0);
  const [broadcastLogs, setBroadcastLogs] = useState<
    Array<{ name: string; phone: string; status: 'sent' | 'failed'; error?: string; time: string }>
  >([]);

  // Interactive Queue State (for Web Queue mode)
  const [queueIndex, setQueueIndex] = useState(0);
  const [autoAdvanceDelay, setAutoAdvanceDelay] = useState(5); // seconds

  // Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAntiBanGuide, setShowAntiBanGuide] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load Contacts & Credentials on mount
  useEffect(() => {
    async function loadData() {
      setLoadingContacts(true);
      try {
        // Load contacts from bundled JSON
        const res = await fetch('/master_contacts.json');
        if (res.ok) {
          const data: MasterContact[] = await res.json();
          setContacts(data);
        }
      } catch (err) {
        console.warn('Contacts load note:', err);
      } finally {
        setLoadingContacts(false);
      }

      // Load saved Meta API keys from localStorage
      if (typeof window !== 'undefined') {
        const savedPhoneId = localStorage.getItem('swasthyam_wa_phone_id') || '';
        const savedToken = localStorage.getItem('swasthyam_wa_token') || '';
        setPhoneNumberId(savedPhoneId);
        setAccessToken(savedToken);

        if (savedPhoneId && savedToken) {
          testApiConnection(savedPhoneId, savedToken);
        }
      }
    }
    loadData();
  }, []);

  // Test Meta API Connection
  const testApiConnection = async (phoneId = phoneNumberId, token = accessToken) => {
    if (!phoneId || !token) {
      setApiStatus('untested');
      return;
    }
    try {
      const res = await fetch(`/api/whatsapp/broadcast?phoneNumberId=${encodeURIComponent(phoneId)}&accessToken=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (data.valid) {
        setApiStatus('connected');
        setApiDetails(data);
      } else {
        setApiStatus('invalid');
      }
    } catch {
      setApiStatus('invalid');
    }
  };

  // Save Meta API Settings
  const handleSaveSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('swasthyam_wa_phone_id', phoneNumberId.trim());
      localStorage.setItem('swasthyam_wa_token', accessToken.trim());
    }
    testApiConnection(phoneNumberId.trim(), accessToken.trim());
    setShowSettingsModal(false);
    showToast('WhatsApp API credentials saved!', 'success');
  };

  // Filtered Audience based on category selections
  const categoryAudience = useMemo(() => {
    if (selectedCategories.length === 0) return [];
    const catSet = new Set(selectedCategories);
    return contacts.filter((c) => catSet.has(c.category));
  }, [contacts, selectedCategories]);

  // Audience list after excluding individual contact IDs
  const activeAudience = useMemo(() => {
    return categoryAudience.filter((c) => !excludedContactIds.has(c.id));
  }, [categoryAudience, excludedContactIds]);

  // Audience matching current search
  const searchedAudience = useMemo(() => {
    if (!audienceSearch.trim()) return categoryAudience;
    const q = audienceSearch.toLowerCase().trim();
    return categoryAudience.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.area && c.area.toLowerCase().includes(q)) ||
        c.district.toLowerCase().includes(q) ||
        c.business.toLowerCase().includes(q)
    );
  }, [categoryAudience, audienceSearch]);

  // Valid phone numbers count
  const validPhoneCount = useMemo(() => {
    return activeAudience.filter((c) => {
      const digits = (c.phone || '').replace(/\D/g, '');
      return digits.length >= 10;
    }).length;
  }, [activeAudience]);

  // Toggle Category Selection
  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Toggle Single Contact Exclude/Include
  const toggleExcludeContact = (id: number) => {
    setExcludedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select / Deselect All in Search View
  const handleToggleAllSearched = (selectAll: boolean) => {
    setExcludedContactIds((prev) => {
      const next = new Set(prev);
      for (const c of searchedAudience) {
        if (selectAll) {
          next.delete(c.id);
        } else {
          next.add(c.id);
        }
      }
      return next;
    });
  };

  // Insert Personalized Tag into Message
  const insertPlaceholder = (tag: string) => {
    setMessageText((prev) => prev + ` {${tag}}`);
  };

  // Handle Local Photo File Upload Preview
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLocalImagePreview(result);
      setImageUrl(result);
      setHasPhoto(true);
      showToast('Photo attached successfully!', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Generate Personalized WhatsApp Message for Preview or Dispatch
  const formatPersonalizedMessage = (contact: MasterContact | null) => {
    if (!contact) return messageText;
    let text = messageText;
    text = text.replace(/{name}/gi, contact.name || 'Valued Partner');
    text = text.replace(/{business}/gi, contact.business || 'Clinic / Center');
    text = text.replace(/{district}/gi, contact.district || 'Punjab');
    text = text.replace(/{area}/gi, contact.area || '');
    text = text.replace(/{category}/gi, contact.category || '');
    return text;
  };

  // Sample contact for live preview
  const sampleContact = activeAudience[0] || contacts[0] || null;

  // Run Official Meta API Broadcast
  const handleStartMetaBroadcast = async () => {
    if (validPhoneCount === 0) {
      showToast('No valid recipients selected with a phone number', 'error');
      return;
    }

    if (apiStatus !== 'connected') {
      setShowSettingsModal(true);
      showToast('Please configure your Meta WhatsApp Cloud API credentials first', 'info');
      return;
    }

    const confirmSend = window.confirm(
      `Send WhatsApp Broadcast to ${validPhoneCount} contacts via Official Meta Cloud API?\n\nThis is 100% compliant and ban-proof.`
    );
    if (!confirmSend) return;

    setIsBroadcasting(true);
    setBroadcastProgress(0);
    setBroadcastLogs([]);

    try {
      const res = await fetch('/api/whatsapp/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: activeAudience,
          message: messageText,
          imageUrl: hasPhoto ? imageUrl : undefined,
          credentials: {
            phoneNumberId,
            accessToken,
          },
        }),
      });

      const data = await res.json();

      if (data.success) {
        setBroadcastProgress(100);
        showToast(`Broadcast completed! Sent: ${data.sentCount}, Failed: ${data.failedCount}`, 'success');
        if (data.results) {
          setBroadcastLogs(
            data.results.map((r: any) => ({
              name: r.name,
              phone: r.phone,
              status: r.status === 'sent' ? 'sent' : 'failed',
              error: r.error,
              time: new Date().toLocaleTimeString(),
            }))
          );
        }
      } else {
        showToast(`Broadcast failed: ${data.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Queue Dispatcher Next / Previous
  const currentQueueContact = activeAudience[queueIndex] || null;

  const handleOpenWhatsAppWeb = (contact: MasterContact) => {
    const rawPhone = (contact.phone || '').split(',')[0].replace(/\D/g, '');
    let cleanPhone = rawPhone;
    if (cleanPhone.startsWith('0') && cleanPhone.length === 11) cleanPhone = cleanPhone.slice(1);
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    const message = formatPersonalizedMessage(contact);
    const url = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    setBroadcastLogs((prev) => [
      {
        name: contact.name,
        phone: cleanPhone,
        status: 'sent',
        time: new Date().toLocaleTimeString(),
      },
      ...prev,
    ]);

    if (queueIndex < activeAudience.length - 1) {
      setQueueIndex((prev) => prev + 1);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f7f9] p-4 md:p-8 font-sans uppercase text-sm">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl border text-white font-black tracking-wide transition-all transform animate-bounce ${
            toast.type === 'error'
              ? 'bg-red-600 border-red-700'
              : toast.type === 'info'
              ? 'bg-blue-600 border-blue-700'
              : 'bg-emerald-600 border-emerald-700'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-white" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-white" />
          )}
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <header className="mb-6 flex flex-wrap justify-between items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-sm">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                WhatsApp Broadcast Suite
              </h1>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                100% Anti-Ban Architecture
              </span>
            </div>
            <p className="text-xs text-gray-500 font-bold lowercase">
              send tailored campaigns & media to categorized doctors, dentists & clients
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAntiBanGuide(true)}
            className="flex items-center gap-1.5 text-xs font-black bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 px-3.5 py-2.5 rounded-xl shadow-xs transition-all"
          >
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Anti-Ban & Pricing Guide</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1.5 text-xs font-black bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-3.5 py-2.5 rounded-xl shadow-xs transition-all"
          >
            <Settings className="w-4 h-4 text-gray-500" />
            <span>
              {apiStatus === 'connected' ? '● Meta API Ready' : 'API Settings'}
            </span>
          </button>

          <Link
            href="/contacts"
            className="flex items-center gap-1.5 text-xs font-black bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-3.5 py-2.5 rounded-xl shadow-xs transition-all"
          >
            <Users className="w-4 h-4 text-gray-500" />
            <span>View All Contacts</span>
          </Link>
        </div>
      </header>

      {/* Main Grid: Left Column (Targeting & Audience) | Right Column (Composer & Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        {/* LEFT COLUMN: AUDIENCE & CATEGORY SELECTOR (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Step 1: Category Targeting */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="font-black text-xs text-gray-900 tracking-wider">
                  Step 1: Select Target Categories
                </h3>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedCategories([...CONTACT_CATEGORIES])}
                  className="text-blue-600 hover:underline"
                >
                  All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedCategories([])}
                  className="text-gray-500 hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Category Pills */}
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
              {CONTACT_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                const count = contacts.filter((c) => c.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-black flex items-center justify-between border transition-all ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-2xs'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    <span className="truncate pr-2">{cat}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-bold ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Audience Filter & Individual Deselection */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <h3 className="font-black text-xs text-gray-900 tracking-wider">
                  Audience List ({validPhoneCount} Active)
                </h3>
              </div>
              <span className="text-[11px] font-bold text-gray-400 lowercase">
                {excludedContactIds.size > 0 && `${excludedContactIds.size} deselected`}
              </span>
            </div>

            {/* Search within selected audience */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={audienceSearch}
                onChange={(e) => setAudienceSearch(e.target.value)}
                placeholder="SEARCH NAME, CLINIC OR NUMBER TO DESELECT..."
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold text-gray-800 focus:outline-none focus:border-blue-500 uppercase"
              />
            </div>

            {/* Bulk Select/Deselect Bar */}
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 pb-2 mb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleAllSearched(true)}
                  className="text-emerald-700 hover:underline"
                >
                  Select All
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => handleToggleAllSearched(false)}
                  className="text-red-600 hover:underline"
                >
                  Deselect All
                </button>
              </div>
              <span className="text-[10px] text-gray-400 lowercase">
                showing {searchedAudience.length} contacts
              </span>
            </div>

            {/* Audience List Table */}
            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
              {searchedAudience.length === 0 ? (
                <div className="text-center py-8 text-gray-400 font-bold text-xs lowercase">
                  no contacts matching current selection.
                </div>
              ) : (
                searchedAudience.map((contact) => {
                  const isChecked = !excludedContactIds.has(contact.id);
                  const hasPhone = !!contact.phone && contact.phone.replace(/\D/g, '').length >= 10;
                  return (
                    <div
                      key={contact.id}
                      onClick={() => toggleExcludeContact(contact.id)}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-white border-emerald-200 hover:bg-emerald-50/40'
                          : 'bg-gray-50 border-gray-200 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-emerald-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="font-black text-gray-900 truncate text-[11px]">
                            {contact.name || 'Unnamed'}
                          </div>
                          <div className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                            <span className="font-mono">{contact.phone || 'no phone'}</span>
                            {contact.district && <span>• {contact.district}</span>}
                          </div>
                        </div>
                      </div>

                      {!hasPhone && (
                        <span className="text-[9px] bg-red-100 text-red-700 font-black px-1.5 py-0.5 rounded shrink-0">
                          No Phone
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MESSAGE COMPOSER & PREVIEW (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* Composer Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                <h3 className="font-black text-xs text-gray-900 tracking-wider">
                  Step 2: Compose Message & Attachment
                </h3>
              </div>
              <span className="text-[11px] font-bold text-gray-400 lowercase">
                supports whatsapp markdown (*bold*, _italic_)
              </span>
            </div>

            {/* Quick Placeholder Pill Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap mb-3 text-[11px]">
              <span className="text-gray-400 font-bold lowercase text-[10px]">Insert tags:</span>
              <button
                type="button"
                onClick={() => insertPlaceholder('name')}
                className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md font-bold text-[10px] border border-blue-200 transition-colors"
              >
                + &#123;name&#125;
              </button>
              <button
                type="button"
                onClick={() => insertPlaceholder('business')}
                className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md font-bold text-[10px] border border-blue-200 transition-colors"
              >
                + &#123;business&#125;
              </button>
              <button
                type="button"
                onClick={() => insertPlaceholder('district')}
                className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md font-bold text-[10px] border border-blue-200 transition-colors"
              >
                + &#123;district&#125;
              </button>
              <button
                type="button"
                onClick={() => insertPlaceholder('area')}
                className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md font-bold text-[10px] border border-blue-200 transition-colors"
              >
                + &#123;area&#125;
              </button>
            </div>

            {/* Message Textarea */}
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={5}
              placeholder="Type your message here... Use {name} to personalize for each doctor or contact."
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:border-emerald-500 font-sans mb-3"
            />

            {/* Photo Attachment Section */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPhoto}
                    onChange={(e) => setHasPhoto(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-0 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-black text-gray-800">
                    Attach Image / Clinical Flyer
                  </span>
                </label>
                {hasPhoto && (
                  <span className="text-[10px] text-emerald-700 font-black bg-emerald-100 px-2 py-0.5 rounded">
                    Photo Active
                  </span>
                )}
              </div>

              {hasPhoto && (
                <div className="space-y-2 pt-2 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 mb-1">
                        Option A: Upload Image File
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="w-full text-[11px] text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-emerald-600 file:text-white hover:file:bg-emerald-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 mb-1">
                        Option B: Or Enter Public Image URL
                      </label>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://example.com/flyer.jpg"
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>

                  {imageUrl && (
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-gray-600">
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                      <span className="truncate max-w-xs font-mono text-[10px]">{imageUrl}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrl('');
                          setLocalImagePreview(null);
                        }}
                        className="text-red-500 hover:text-red-700 font-bold ml-auto"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SEND CONTROLS & MODE TOGGLE */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-gray-800">
                  Select Sending Gateway:
                </span>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSendingMode('api')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                      sendingMode === 'api'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Meta Official API (Bulk)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendingMode('queue')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                      sendingMode === 'queue'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Web Queue (Interactive)
                  </button>
                </div>
              </div>

              {/* Mode A: Meta Cloud API Broadcast */}
              {sendingMode === 'api' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-gray-900">
                        Official Meta WhatsApp Cloud API
                      </div>
                      <div className="text-[11px] text-gray-500 lowercase font-bold">
                        100% compliant with zero risk of phone number blocking
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartMetaBroadcast}
                      disabled={isBroadcasting || validPhoneCount === 0}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs shadow-sm transition-all ${
                        isBroadcasting
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : validPhoneCount === 0
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      <Send className="w-4 h-4" />
                      <span>
                        {isBroadcasting
                          ? 'Broadcasting...'
                          : `Broadcast to ${validPhoneCount} Contacts`}
                      </span>
                    </button>
                  </div>

                  {/* Progress Bar when Broadcasting */}
                  {isBroadcasting && (
                    <div className="bg-gray-50 p-3 rounded-xl border border-emerald-200">
                      <div className="flex justify-between text-xs font-black text-emerald-800 mb-1">
                        <span>Sending broadcast via Meta Cloud API...</span>
                        <span>{broadcastProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${broadcastProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Mode B: Interactive Web Queue */
                <div className="bg-blue-50/60 border border-blue-200 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-blue-900">
                        Interactive Web Dispatcher Queue
                      </span>
                      <p className="text-[11px] text-blue-700 lowercase font-bold">
                        step through selected contacts one-by-one with 1-click WhatsApp Web launch
                      </p>
                    </div>
                    <span className="text-xs font-black bg-blue-200 text-blue-800 px-2 py-0.5 rounded">
                      Contact {queueIndex + 1} of {activeAudience.length}
                    </span>
                  </div>

                  {currentQueueContact ? (
                    <div className="bg-white p-3 rounded-lg border border-blue-200 flex items-center justify-between">
                      <div>
                        <div className="font-black text-xs text-gray-900">
                          {currentQueueContact.name}
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono">
                          {currentQueueContact.phone} • {currentQueueContact.district}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQueueIndex((prev) => Math.max(0, prev - 1))}
                          disabled={queueIndex === 0}
                          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 disabled:opacity-30"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenWhatsAppWeb(currentQueueContact)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-xs transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Send in WhatsApp Web</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setQueueIndex((prev) => Math.min(activeAudience.length - 1, prev + 1))}
                          disabled={queueIndex >= activeAudience.length - 1}
                          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 disabled:opacity-30"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 font-bold text-center py-2">
                      No contacts selected in current audience.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp Live Preview Bubble Card */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h3 className="font-black text-xs text-gray-900 tracking-wider">
                  Live WhatsApp Message Preview
                </h3>
              </div>
              <span className="text-[10px] text-gray-400 font-bold lowercase">
                previewing for: {sampleContact?.name || 'Sample Contact'}
              </span>
            </div>

            {/* WhatsApp Chat Window Mockup */}
            <div className="bg-[#efeae2] p-4 rounded-xl border border-gray-200 max-w-md mx-auto shadow-inner relative overflow-hidden">
              {/* WhatsApp Chat Header */}
              <div className="bg-[#075e54] text-white p-2.5 -m-4 mb-4 flex items-center gap-2 text-xs font-bold">
                <div className="w-7 h-7 rounded-full bg-emerald-400 text-[#075e54] flex items-center justify-center font-black text-xs">
                  {sampleContact?.name ? sampleContact.name.charAt(0) : 'S'}
                </div>
                <div className="truncate">
                  <div className="font-black truncate">
                    {sampleContact?.name || 'Dr. Sharma'}
                  </div>
                  <div className="text-[9px] opacity-80 font-normal">Online</div>
                </div>
              </div>

              {/* Message Bubble */}
              <div className="bg-white rounded-xl shadow-xs p-3 max-w-[90%] ml-auto text-xs space-y-2 border border-gray-100">
                {/* Image Preview if Attached */}
                {hasPhoto && imageUrl && (
                  <div className="rounded-lg overflow-hidden border border-gray-100 bg-gray-100 max-h-48 flex items-center justify-center">
                    <img
                      src={imageUrl}
                      alt="Attached preview"
                      className="w-full h-auto object-cover"
                      onError={() => {}}
                    />
                  </div>
                )}

                {/* Formatted Message Content */}
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed font-sans text-xs">
                  {formatPersonalizedMessage(sampleContact)}
                </div>

                {/* WhatsApp Timestamp & Blue Ticks */}
                <div className="flex items-center justify-end gap-1 text-[10px] text-gray-400 font-sans pt-1">
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast History & Logs */}
      {broadcastLogs.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-xs text-gray-900 tracking-wider">
              Recent Broadcast Dispatch Logs ({broadcastLogs.length})
            </h3>
            <button
              onClick={() => setBroadcastLogs([])}
              className="text-[11px] font-bold text-gray-400 hover:text-gray-600"
            >
              Clear Logs
            </button>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin text-xs">
            {broadcastLogs.map((log, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      log.status === 'sent' ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
                  <span className="font-black text-gray-900">{log.name}</span>
                  <span className="font-mono text-gray-500 text-[11px]">{log.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  {log.error && (
                    <span className="text-[10px] text-red-600 truncate max-w-xs">{log.error}</span>
                  )}
                  <span className="text-[10px] text-gray-400 font-mono">{log.time}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* META CLOUD API SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-gray-900">
                  Meta WhatsApp API Settings
                </h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 mb-5 text-xs">
              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">
                  WHATSAPP PHONE NUMBER ID *
                </label>
                <input
                  type="text"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  placeholder="e.g. 104829104928192"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-gray-400 font-bold lowercase mt-1">
                  found in your Meta App Dashboard under WhatsApp &gt; API Setup
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1">
                  SYSTEM USER ACCESS TOKEN *
                </label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="EAAG..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-gray-400 font-bold lowercase mt-1">
                  permanent access token generated in Meta Business Settings
                </p>
              </div>

              {/* Status Badge */}
              <div className="p-3 rounded-xl border flex items-center justify-between text-xs font-black bg-gray-50 border-gray-200">
                <span>Connection Status:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] ${
                    apiStatus === 'connected'
                      ? 'bg-emerald-100 text-emerald-800'
                      : apiStatus === 'invalid'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {apiStatus === 'connected'
                    ? '● Connected'
                    : apiStatus === 'invalid'
                    ? '● Invalid Keys'
                    : '● Not Tested'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => testApiConnection()}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black transition-colors"
              >
                Test Connection
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANTI-BAN & META PRICING GUIDE MODAL */}
      {showAntiBanGuide && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-black text-gray-900">
                  WhatsApp Anti-Ban Architecture & Platform Guide
                </h3>
              </div>
              <button
                onClick={() => setShowAntiBanGuide(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-medium text-gray-700 leading-relaxed">
              <div className="bg-purple-50 border border-purple-200 p-3.5 rounded-xl text-purple-950 font-bold">
                <span className="font-black uppercase">How to Ensure WhatsApp Never Blocks Your Number:</span>
                <p className="mt-1 font-normal">
                  Meta automatically bans personal and unverified business WhatsApp numbers when automated third-party scrapers or chrome extensions blast hundreds of messages.
                  The <strong>only 100% ban-proof method</strong> recognized worldwide is using the <strong>Official Meta WhatsApp Business Cloud API</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-xl">
                  <div className="font-black text-red-900 mb-1">❌ Unofficial Bots (Risk of Ban)</div>
                  <ul className="list-disc list-inside space-y-1 text-red-800 text-[11px]">
                    <li>Automated web clicks on personal SIM numbers</li>
                    <li>Meta flags rapid identical messages as spam</li>
                    <li>Number gets permanently blacklisted within 50 messages</li>
                  </ul>
                </div>

                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                  <div className="font-black text-emerald-900 mb-1">✅ Official Meta Cloud API (100% Safe)</div>
                  <ul className="list-disc list-inside space-y-1 text-emerald-800 text-[11px]">
                    <li>Verified Business WhatsApp Account (WABA)</li>
                    <li>Official Meta servers deliver the messages</li>
                    <li>Send to thousands of contacts with zero ban risk</li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <h4 className="font-black text-gray-900 uppercase text-xs mb-1.5">
                  Platform Costs & Official Meta Pricing (India)
                </h4>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1 text-[11px]">
                  <p>• <strong>Free Tier:</strong> Meta provides <strong>1,000 free service conversations every month</strong> at zero cost.</p>
                  <p>• <strong>Marketing Messages:</strong> Approximately <strong>₹0.70 to ₹0.80 per conversation</strong> in India.</p>
                  <p>• <strong>Utility / Account Messages:</strong> Approximately <strong>₹0.30 per conversation</strong> in India.</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <h4 className="font-black text-gray-900 uppercase text-xs mb-1.5">
                  Top Recommended Official Gateways:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-gray-50 border rounded-lg">
                    <span className="font-black text-gray-900">1. Direct Meta Cloud API (Lowest Cost)</span>
                    <p className="text-gray-500 font-normal">Free developer account at developers.facebook.com. You only pay Meta's official per-message fee.</p>
                  </div>
                  <div className="p-2.5 bg-gray-50 border rounded-lg">
                    <span className="font-black text-gray-900">2. Official BSPs (Wati, AiSensy, Twilio)</span>
                    <p className="text-gray-500 font-normal">Full turnkey dashboard with customer support, shared team inbox, and automated replies.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-gray-100">
              <button
                onClick={() => setShowAntiBanGuide(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
