'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabase';
import {
  Activity,
  Package,
  ShoppingCart,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Shield,
  Search,
  ArrowRight,
  Send,
  UserCheck
} from 'lucide-react';
import { CATEGORIZED_ITEMS } from '../../lib/item-constants';

type FormTab = 'courier' | 'purchase' | 'sale';

const COMMON_COURIERS = [
  'SHREE ANJANI COURIER',
  'DTDC',
  'BLUE DART',
  'TRACKON',
  'TIRUPATI COURIER',
  'MARUTI COURIER',
  'PROFESSIONAL COURIER',
  'DELHIVERY',
  'SPEED POST',
  'OTHER',
];

export default function EmployeePortalPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FormTab>('courier');
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(null);

  // ===================== COURIER FORM STATE =====================
  const [courierPatientName, setCourierPatientName] = useState('');
  const [courierPhone, setCourierPhone] = useState('');
  const [courierEmail, setCourierEmail] = useState('');
  const [courierArea, setCourierArea] = useState('');
  const [courierSentFrom, setCourierSentFrom] = useState('');
  const [courierCompany, setCourierCompany] = useState('SHREE ANJANI COURIER');
  const [customCourierCompany, setCustomCourierCompany] = useState('');
  const [courierTracking, setCourierTracking] = useState('');
  const [courierDate, setCourierDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [courierStatusMsg, setCourierStatusMsg] = useState('');
  const [courierLoading, setCourierLoading] = useState(false);

  // ===================== PURCHASE FORM STATE =====================
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [purchaseParty, setPurchaseParty] = useState('');
  const [purchaseItem, setPurchaseItem] = useState('');
  const [purchaseCustomItem, setPurchaseCustomItem] = useState('');
  const [isPurchaseCustom, setIsPurchaseCustom] = useState(false);
  const [purchaseFilter, setPurchaseFilter] = useState('');
  const [purchaseQty, setPurchaseQty] = useState<number | ''>(1);
  const [purchaseStatus, setPurchaseStatus] = useState<'STOCK' | 'PENDING' | 'REPLACEMENT'>('STOCK');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [purchaseStatusMsg, setPurchaseStatusMsg] = useState('');
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  // ===================== SALE FORM STATE =====================
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [saleParty, setSaleParty] = useState('');
  const [saleItem, setSaleItem] = useState('');
  const [saleCustomItem, setSaleCustomItem] = useState('');
  const [isSaleCustom, setIsSaleCustom] = useState(false);
  const [saleFilter, setSaleFilter] = useState('');
  const [saleQty, setSaleQty] = useState<number | ''>(1);
  const [saleStatus, setSaleStatus] = useState<'STOCK' | 'PENDING' | 'REPLACEMENT'>('STOCK');
  const [saleNotes, setSaleNotes] = useState('');
  const [saleStatusMsg, setSaleStatusMsg] = useState('');
  const [saleLoading, setSaleLoading] = useState(false);

  // Check auth user
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  // Filtered item options for Purchase
  const visiblePurchaseOptions = useMemo(() => {
    if (!purchaseFilter) return CATEGORIZED_ITEMS;
    const q = purchaseFilter.toUpperCase();
    return CATEGORIZED_ITEMS.map((cat) => ({
      category: cat.category,
      items: cat.items.filter((i) => i.toUpperCase().includes(q)),
    })).filter((cat) => cat.items.length > 0);
  }, [purchaseFilter]);

  // Filtered item options for Sale
  const visibleSaleOptions = useMemo(() => {
    if (!saleFilter) return CATEGORIZED_ITEMS;
    const q = saleFilter.toUpperCase();
    return CATEGORIZED_ITEMS.map((cat) => ({
      category: cat.category,
      items: cat.items.filter((i) => i.toUpperCase().includes(q)),
    })).filter((cat) => cat.items.length > 0);
  }, [saleFilter]);

  // ===================== SUBMIT HANDLERS =====================

  // Courier Submit
  const handleCourierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCourierStatusMsg('');

    if (!courierPatientName.trim()) {
      setCourierStatusMsg('ERROR: PATIENT NAME IS REQUIRED.');
      return;
    }

    if (!courierTracking.trim()) {
      setCourierStatusMsg('ERROR: TRACKING / SERIAL NUMBER IS REQUIRED.');
      return;
    }

    const finalCompany =
      courierCompany === 'OTHER'
        ? customCourierCompany.trim().toUpperCase()
        : courierCompany.trim().toUpperCase();

    if (!finalCompany) {
      setCourierStatusMsg('ERROR: PLEASE ENTER COURIER COMPANY NAME.');
      return;
    }

    setCourierLoading(true);
    setCourierStatusMsg('SAVING COURIER SHIPMENT...');

    try {
      const upperName = courierPatientName.trim().toUpperCase();
      const upperPhone = courierPhone.trim().toUpperCase();
      const upperEmail = courierEmail.trim().toUpperCase();
      const upperArea = courierArea.trim().toUpperCase();
      const upperSentFrom = courierSentFrom.trim().toUpperCase();
      const upperTracking = courierTracking.trim().toUpperCase();

      // Check if duplicate tracking number exists
      const { data: existingCheck } = await supabase
        .from('couriers')
        .select('id')
        .eq('tracking_number', upperTracking)
        .limit(1);

      if (existingCheck && existingCheck.length > 0) {
        setCourierLoading(false);
        setCourierStatusMsg('ERROR: THIS TRACKING NUMBER HAS ALREADY BEEN RECORDED.');
        return;
      }

      // Safe patient upsert
      if (upperName) {
        const { data: existingP } = await supabase
          .from('patients')
          .select('id')
          .ilike('name', upperName)
          .limit(1);

        if (!existingP || existingP.length === 0) {
          await supabase.from('patients').insert([
            {
              name: upperName,
              phone: upperPhone || null,
              email: upperEmail || null,
              area: upperArea || null,
            },
          ]);
        }
      }

      // Insert courier shipment
      const { error } = await supabase.from('couriers').insert([
        {
          patient_name: upperName,
          patient_phone: upperPhone || null,
          patient_email: upperEmail || null,
          patient_area: upperArea || null,
          sent_from: upperSentFrom || null,
          tracking_number: upperTracking,
          courier_company: finalCompany,
          dispatch_date: courierDate || new Date().toISOString().split('T')[0],
          status: 'In Transit',
        },
      ]);

      setCourierLoading(false);

      if (error) {
        setCourierStatusMsg(`ERROR: ${error.message}`);
      } else {
        setCourierStatusMsg(
          `SUCCESS: COURIER SHIPMENT RECORDED FOR ${upperName} (${upperTracking})!`
        );
        // Reset form
        setCourierPatientName('');
        setCourierPhone('');
        setCourierEmail('');
        setCourierArea('');
        setCourierSentFrom('');
        setCourierTracking('');
        setCustomCourierCompany('');
        setCourierCompany('SHREE ANJANI COURIER');
      }
    } catch (err: any) {
      setCourierLoading(false);
      setCourierStatusMsg(`ERROR: ${err.message || 'COULD NOT SAVE RECORD'}`);
    }
  };

  // Purchase Submit
  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPurchaseStatusMsg('');

    const finalItemName = isPurchaseCustom
      ? purchaseCustomItem.trim().toUpperCase()
      : purchaseItem.trim().toUpperCase();

    if (!finalItemName) {
      setPurchaseStatusMsg('ERROR: PLEASE SELECT OR ENTER AN ITEM NAME.');
      return;
    }

    if (!purchaseParty.trim()) {
      setPurchaseStatusMsg('ERROR: PLEASE ENTER PARTY NAME (SUPPLIER / VENDOR).');
      return;
    }

    if (!purchaseQty || Number(purchaseQty) <= 0) {
      setPurchaseStatusMsg('ERROR: QUANTITY MUST BE GREATER THAN 0.');
      return;
    }

    setPurchaseLoading(true);
    setPurchaseStatusMsg('SAVING PURCHASE ENTRY...');

    try {
      const payload = {
        entry_date: purchaseDate || new Date().toISOString().split('T')[0],
        party_name: purchaseParty.trim().toUpperCase(),
        item_name: finalItemName,
        qty: Number(purchaseQty),
        status: purchaseStatus,
        notes: purchaseNotes.trim().toUpperCase() || null,
      };

      const { error } = await supabase.from('item_purchases').insert([payload]);
      setPurchaseLoading(false);

      if (error) {
        setPurchaseStatusMsg(`ERROR: ${error.message}`);
      } else {
        setPurchaseStatusMsg(`SUCCESS: PURCHASE ENTRY RECORDED FOR ${payload.party_name}!`);
        // Reset form
        setPurchaseParty('');
        setPurchaseItem('');
        setPurchaseCustomItem('');
        setIsPurchaseCustom(false);
        setPurchaseQty(1);
        setPurchaseStatus('STOCK');
        setPurchaseNotes('');
      }
    } catch (err: any) {
      setPurchaseLoading(false);
      setPurchaseStatusMsg(`ERROR: ${err.message || 'COULD NOT SAVE RECORD'}`);
    }
  };

  // Sale Submit
  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaleStatusMsg('');

    const finalItemName = isSaleCustom
      ? saleCustomItem.trim().toUpperCase()
      : saleItem.trim().toUpperCase();

    if (!finalItemName) {
      setSaleStatusMsg('ERROR: PLEASE SELECT OR ENTER AN ITEM NAME.');
      return;
    }

    if (!saleParty.trim()) {
      setSaleStatusMsg('ERROR: PLEASE ENTER PARTY NAME (DOCTOR / CLINIC).');
      return;
    }

    if (!saleQty || Number(saleQty) <= 0) {
      setSaleStatusMsg('ERROR: QUANTITY MUST BE GREATER THAN 0.');
      return;
    }

    setSaleLoading(true);
    setSaleStatusMsg('SAVING SALE ENTRY...');

    try {
      const payload = {
        entry_date: saleDate || new Date().toISOString().split('T')[0],
        party_name: saleParty.trim().toUpperCase(),
        item_name: finalItemName,
        qty: Number(saleQty),
        status: saleStatus,
        notes: saleNotes.trim().toUpperCase() || null,
      };

      const { error } = await supabase.from('item_sales').insert([payload]);
      setSaleLoading(false);

      if (error) {
        setSaleStatusMsg(`ERROR: ${error.message}`);
      } else {
        setSaleStatusMsg(`SUCCESS: SALE ENTRY RECORDED FOR ${payload.party_name}!`);
        // Reset form
        setSaleParty('');
        setSaleItem('');
        setSaleCustomItem('');
        setIsSaleCustom(false);
        setSaleQty(1);
        setSaleStatus('STOCK');
        setSaleNotes('');
      }
    } catch (err: any) {
      setSaleLoading(false);
      setSaleStatusMsg(`ERROR: ${err.message || 'COULD NOT SAVE RECORD'}`);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f7f9] p-4 md:p-8 font-sans uppercase text-base">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-6 flex flex-wrap justify-between items-center gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-xs border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-xs">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <span className="font-black text-gray-900 text-lg md:text-xl tracking-tight block">
                Swasthyam Healthcare
              </span>
              <span className="text-xs font-bold text-gray-400 block normal-case">
                Staff Data Entry Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs font-black">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>{currentUser.username}</span>
                <span className="text-[10px] bg-blue-200 px-1.5 py-0.5 rounded text-blue-900">
                  {currentUser.role}
                </span>
              </div>
            )}

            {currentUser?.role === 'admin' && (
              <Link
                href="/"
                className="text-xs font-black text-gray-600 hover:text-blue-600 px-3 py-2 border border-gray-200 rounded-xl transition-all"
              >
                ← Full Dashboard
              </Link>
            )}

            <a
              href="/api/auth/logout"
              className="flex items-center gap-1.5 text-xs font-black text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </a>
          </div>
        </header>

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-100 rounded-2xl flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-sm text-gray-900">
              Staff Entry Mode: Courier, Purchase & Sale
            </h2>
            <p className="text-xs text-gray-500 font-bold normal-case">
              Fill in the fields below and submit. Submissions are saved securely to Swasthyam database.
            </p>
          </div>
        </div>

        {/* Tab Switcher (Courier / Purchase / Sale) */}
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-white border border-gray-200 rounded-2xl shadow-xs mb-8">
          <button
            type="button"
            onClick={() => setActiveTab('courier')}
            className={`flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs md:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'courier'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Courier Form</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('purchase')}
            className={`flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs md:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'purchase'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Purchase Form</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sale')}
            className={`flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs md:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'sale'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Sale Form</span>
          </button>
        </div>

        {/* ===================== FORM 1: COURIER FORM ===================== */}
        {activeTab === 'courier' && (
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-gray-100">
              <div className="bg-blue-100 text-blue-700 p-2 rounded-xl">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">Courier Shipment Entry</h3>
                <p className="text-xs text-gray-400 font-bold normal-case">
                  Log package dispatch, tracking number, and recipient details.
                </p>
              </div>
            </div>

            {courierStatusMsg && (
              <div
                className={`p-4 rounded-xl mb-6 flex items-center gap-2 text-xs md:text-sm font-black ${
                  courierStatusMsg.includes('ERROR')
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}
              >
                {courierStatusMsg.includes('ERROR') ? (
                  <AlertCircle className="w-5 h-5 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                )}
                <span>{courierStatusMsg}</span>
              </div>
            )}

            <form onSubmit={handleCourierSubmit} className="flex flex-col gap-4 text-xs font-bold">
              {/* Row 1: Dispatch Date & Patient Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-black text-gray-700 uppercase">
                    Dispatch Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={courierDate}
                    onChange={(e) => setCourierDate(e.target.value)}
                    className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-blue-500 outline-none transition-all text-sm font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-black text-gray-700 uppercase">
                    Patient / Recipient Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ENTER FULL PATIENT NAME"
                    value={courierPatientName}
                    onChange={(e) => setCourierPatientName(e.target.value.toUpperCase())}
                    className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-blue-500 outline-none uppercase text-sm font-bold"
                  />
                </div>
              </div>

              {/* Row 2: Phone & Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-black text-gray-700 uppercase">Phone Number</label>
                  <input
                    type="text"
                    placeholder="ENTER 10-DIGIT MOBILE NUMBER"
                    value={courierPhone}
                    onChange={(e) => setCourierPhone(e.target.value.toUpperCase())}
                    className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-blue-500 outline-none uppercase text-sm font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-black text-gray-700 uppercase">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="PATIENT@EXAMPLE.COM"
                    value={courierEmail}
                    onChange={(e) => setCourierEmail(e.target.value.toUpperCase())}
                    className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-blue-500 outline-none uppercase text-sm font-bold normal-case"
                  />
                </div>
              </div>

              {/* Row 3: Area & Sent From */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-black text-gray-700 uppercase">Area / City</label>
                  <input
                    type="text"
                    placeholder="E.G. SOUTH EXTENSION, JAIPUR, NOIDA"
                    value={courierArea}
                    onChange={(e) => setCourierArea(e.target.value.toUpperCase())}
                    className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-blue-500 outline-none uppercase text-sm font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-black text-gray-700 uppercase">Sent From</label>
                  <input
                    type="text"
                    placeholder="E.G. DELHI CLINIC, JAIPUR, MAIN LAB"
                    value={courierSentFrom}
                    onChange={(e) => setCourierSentFrom(e.target.value.toUpperCase())}
                    className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-blue-500 outline-none uppercase text-sm font-bold"
                  />
                </div>
              </div>

              {/* Row 4: Courier Company & Tracking Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-black text-gray-700 uppercase">
                    Courier Company <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={courierCompany}
                    onChange={(e) => setCourierCompany(e.target.value)}
                    className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-blue-500 outline-none uppercase text-sm font-bold"
                  >
                    {COMMON_COURIERS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  {courierCompany === 'OTHER' && (
                    <input
                      type="text"
                      required
                      placeholder="ENTER OTHER COURIER NAME"
                      value={customCourierCompany}
                      onChange={(e) => setCustomCourierCompany(e.target.value.toUpperCase())}
                      className="border border-gray-200 rounded-xl p-2.5 mt-2 bg-white text-gray-900 uppercase text-xs font-bold"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-black text-gray-700 uppercase">
                    Serial / Tracking Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ENTER COURIER AWB / TRACKING NO."
                    value={courierTracking}
                    onChange={(e) => setCourierTracking(e.target.value.toUpperCase())}
                    className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-blue-500 outline-none uppercase text-sm font-bold"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={courierLoading}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm py-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{courierLoading ? 'SAVING SHIPMENT...' : 'RECORD COURIER SHIPMENT'}</span>
              </button>
            </form>
          </div>
        )}

        {/* ===================== FORM 2: PURCHASE FORM ===================== */}
        {activeTab === 'purchase' && (
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-gray-100">
              <div className="bg-blue-100 text-blue-700 p-2 rounded-xl">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">Purchase Entry Form</h3>
                <p className="text-xs text-gray-400 font-bold normal-case">
                  Log dental item purchases from suppliers matching Excel columns.
                </p>
              </div>
            </div>

            {purchaseStatusMsg && (
              <div
                className={`p-4 rounded-xl mb-6 flex items-center gap-2 text-xs md:text-sm font-black ${
                  purchaseStatusMsg.includes('ERROR')
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}
              >
                {purchaseStatusMsg.includes('ERROR') ? (
                  <AlertCircle className="w-5 h-5 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                )}
                <span>{purchaseStatusMsg}</span>
              </div>
            )}

            <form onSubmit={handlePurchaseSubmit} className="flex flex-col gap-4 text-xs font-bold">
              {/* DATE */}
              <div className="flex flex-col gap-1.5">
                <label className="font-black text-gray-700 uppercase">
                  DATE <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-blue-500 outline-none text-sm font-bold"
                />
              </div>

              {/* PARTY NAME */}
              <div className="flex flex-col gap-1.5">
                <label className="font-black text-gray-700 uppercase">
                  PARTY NAME (SUPPLIER / VENDOR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ENTER SUPPLIER / VENDOR NAME"
                  value={purchaseParty}
                  onChange={(e) => setPurchaseParty(e.target.value.toUpperCase())}
                  className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-blue-500 outline-none uppercase text-sm font-bold"
                />
              </div>

              {/* ITEMS */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-black text-gray-700 uppercase">
                    ITEMS <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsPurchaseCustom(!isPurchaseCustom)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-black underline cursor-pointer"
                  >
                    {isPurchaseCustom ? 'Select From 92 Catalog' : '+ Custom Item'}
                  </button>
                </div>

                {!isPurchaseCustom ? (
                  <>
                    <div className="relative mb-1">
                      <input
                        type="text"
                        placeholder="TYPE TO FILTER 92 ITEMS..."
                        value={purchaseFilter}
                        onChange={(e) => setPurchaseFilter(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg py-2 pl-8 pr-3 text-gray-900 uppercase placeholder-gray-400 focus:border-blue-500 outline-none"
                      />
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                    </div>

                    <select
                      required={!isPurchaseCustom}
                      value={purchaseItem}
                      onChange={(e) => setPurchaseItem(e.target.value)}
                      className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-blue-500 outline-none uppercase text-xs md:text-sm font-bold"
                    >
                      <option value="" disabled>
                        -- SELECT AN ITEM FROM CATALOG --
                      </option>
                      {visiblePurchaseOptions.map((group) => (
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
                    required={isPurchaseCustom}
                    placeholder="ENTER CUSTOM DENTAL ITEM NAME"
                    value={purchaseCustomItem}
                    onChange={(e) => setPurchaseCustomItem(e.target.value.toUpperCase())}
                    className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-blue-500 outline-none uppercase text-sm font-bold"
                  />
                )}
              </div>

              {/* QTY & PENDING / STOCK / REPLACEMENT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-black text-gray-700 uppercase">
                    QTY <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={purchaseQty}
                    onChange={(e) =>
                      setPurchaseQty(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-blue-500 outline-none text-sm font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-black text-gray-700 uppercase">
                    PENDING / STOCK / REPLACEMENT <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={purchaseStatus}
                    onChange={(e) => setPurchaseStatus(e.target.value as any)}
                    className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-blue-500 outline-none uppercase text-xs font-black"
                  >
                    <option value="STOCK">STOCK (IN STOCK)</option>
                    <option value="PENDING">PENDING (AWAITING)</option>
                    <option value="REPLACEMENT">REPLACEMENT</option>
                  </select>
                </div>
              </div>

              {/* REMARKS / NOTES */}
              <div className="flex flex-col gap-1.5">
                <label className="font-black text-gray-700 uppercase">REMARKS / NOTES (OPTIONAL)</label>
                <input
                  type="text"
                  placeholder="INVOICE NO., BATCH NO., OR VENDOR REMARKS"
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value.toUpperCase())}
                  className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-blue-500 outline-none uppercase text-sm font-bold"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={purchaseLoading}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm py-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{purchaseLoading ? 'SAVING ENTRY...' : 'SAVE PURCHASE ENTRY'}</span>
              </button>
            </form>
          </div>
        )}

        {/* ===================== FORM 3: SALE FORM ===================== */}
        {activeTab === 'sale' && (
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-gray-100">
              <div className="bg-purple-100 text-purple-700 p-2 rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">Sale Entry Form</h3>
                <p className="text-xs text-gray-400 font-bold normal-case">
                  Log dental item sales to doctors/clinics matching Excel columns.
                </p>
              </div>
            </div>

            {saleStatusMsg && (
              <div
                className={`p-4 rounded-xl mb-6 flex items-center gap-2 text-xs md:text-sm font-black ${
                  saleStatusMsg.includes('ERROR')
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}
              >
                {saleStatusMsg.includes('ERROR') ? (
                  <AlertCircle className="w-5 h-5 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                )}
                <span>{saleStatusMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaleSubmit} className="flex flex-col gap-4 text-xs font-bold">
              {/* DATE */}
              <div className="flex flex-col gap-1.5">
                <label className="font-black text-gray-700 uppercase">
                  DATE <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-purple-500 outline-none text-sm font-bold"
                />
              </div>

              {/* PARTY NAME */}
              <div className="flex flex-col gap-1.5">
                <label className="font-black text-gray-700 uppercase">
                  PARTY NAME (DOCTOR / CLINIC) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ENTER DOCTOR / CLINIC / HOSPITAL NAME"
                  value={saleParty}
                  onChange={(e) => setSaleParty(e.target.value.toUpperCase())}
                  className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-purple-500 outline-none uppercase text-sm font-bold"
                />
              </div>

              {/* ITEMS */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-black text-gray-700 uppercase">
                    ITEMS <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSaleCustom(!isSaleCustom)}
                    className="text-xs text-purple-600 hover:text-purple-800 font-black underline cursor-pointer"
                  >
                    {isSaleCustom ? 'Select From 92 Catalog' : '+ Custom Item'}
                  </button>
                </div>

                {!isSaleCustom ? (
                  <>
                    <div className="relative mb-1">
                      <input
                        type="text"
                        placeholder="TYPE TO FILTER 92 ITEMS..."
                        value={saleFilter}
                        onChange={(e) => setSaleFilter(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg py-2 pl-8 pr-3 text-gray-900 uppercase placeholder-gray-400 focus:border-purple-500 outline-none"
                      />
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                    </div>

                    <select
                      required={!isSaleCustom}
                      value={saleItem}
                      onChange={(e) => setSaleItem(e.target.value)}
                      className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-purple-500 outline-none uppercase text-xs md:text-sm font-bold"
                    >
                      <option value="" disabled>
                        -- SELECT AN ITEM FROM CATALOG --
                      </option>
                      {visibleSaleOptions.map((group) => (
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
                    required={isSaleCustom}
                    placeholder="ENTER CUSTOM DENTAL ITEM NAME"
                    value={saleCustomItem}
                    onChange={(e) => setSaleCustomItem(e.target.value.toUpperCase())}
                    className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-purple-500 outline-none uppercase text-sm font-bold"
                  />
                )}
              </div>

              {/* QTY & PENDING / STOCK / REPLACEMENT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-black text-gray-700 uppercase">
                    QTY <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={saleQty}
                    onChange={(e) =>
                      setSaleQty(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-purple-500 outline-none text-sm font-bold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-black text-gray-700 uppercase">
                    PENDING / STOCK / REPLACEMENT <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={saleStatus}
                    onChange={(e) => setSaleStatus(e.target.value as any)}
                    className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-purple-500 outline-none uppercase text-xs font-black"
                  >
                    <option value="STOCK">STOCK (DISPATCHED)</option>
                    <option value="PENDING">PENDING (AWAITING DISPATCH)</option>
                    <option value="REPLACEMENT">REPLACEMENT (REPLACEMENT DISPATCHED)</option>
                  </select>
                </div>
              </div>

              {/* REMARKS / NOTES */}
              <div className="flex flex-col gap-1.5">
                <label className="font-black text-gray-700 uppercase">REMARKS / NOTES (OPTIONAL)</label>
                <input
                  type="text"
                  placeholder="DOCTOR CONTACT, CLINIC AREA, OR INVOICE NO."
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value.toUpperCase())}
                  className="border border-gray-200 rounded-xl p-3 bg-white text-gray-900 focus:border-purple-500 outline-none uppercase text-sm font-bold"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={saleLoading}
                className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-black text-sm py-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <TrendingUp className="w-4 h-4" />
                <span>{saleLoading ? 'SAVING ENTRY...' : 'SAVE SALE ENTRY'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
