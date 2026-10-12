'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Activity, ArrowLeft, Search, MapPin, CheckCircle2, Copy, Edit3, X, Check } from 'lucide-react';

export default function AddressArchive() {
  const [addressRecords, setAddressRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [existingPatients, setExistingPatients] = useState<any[]>([]);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [patientName, setPatientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [area, setArea] = useState('');
  const [addressText, setAddressText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    fetchAddresses();
    fetchPatients();
  }, []);

  async function fetchAddresses() {
    const { data } = await supabase.from('patient_addresses').select('*').order('created_at', { ascending: false });
    if (data) setAddressRecords(data);
  }

  async function fetchPatients() {
    const { data } = await supabase.from('patients').select('*');
    if (data) setExistingPatients(data);
  }

  const autoFillPatient = async (nameToMatch: string) => {
    const cleanName = nameToMatch.trim().toUpperCase();
    if (!cleanName) {
      if (!editingId) {
        setPhoneNumber('');
        setArea('');
        setAddressText('');
      }
      return;
    }

    let foundPatient = existingPatients.find(p => (p.name || '').trim().toUpperCase() === cleanName);
    if (!foundPatient) {
      const { data: dbPatient } = await supabase
        .from('patients')
        .select('*')
        .ilike('name', cleanName)
        .limit(1)
        .maybeSingle();
      if (dbPatient) foundPatient = dbPatient;
    }

    if (foundPatient) {
      if (foundPatient.phone != null) setPhoneNumber(String(foundPatient.phone).toUpperCase());
      if (foundPatient.area != null) setArea(String(foundPatient.area).toUpperCase());
    }

    // Fetch previous address text from patient_addresses
    let addrRecord = addressRecords.find(a => (a.patient_name || '').trim().toUpperCase() === cleanName);
    if (!addrRecord) {
      const { data: dbAddr } = await supabase
        .from('patient_addresses')
        .select('*')
        .ilike('patient_name', cleanName)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (dbAddr) addrRecord = dbAddr;
    }

    if (addrRecord) {
      if (!foundPatient?.phone && addrRecord.phone_number != null) {
        setPhoneNumber(String(addrRecord.phone_number).toUpperCase());
      }
      if (addrRecord.address_text != null) {
        setAddressText(String(addrRecord.address_text).toUpperCase());
      }
    }
  };

  const handlePatientNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const typedName = e.target.value.toUpperCase();
    setPatientName(typedName);
    await autoFillPatient(typedName);
  };

  const startEdit = (record: any) => {
    setEditingId(record.id);
    const upperName = String(record.patient_name || '').toUpperCase();
    setPatientName(upperName);
    setPhoneNumber(String(record.phone_number || '').toUpperCase());
    
    const foundPatient = existingPatients.find(p => (p.name || '').toUpperCase() === upperName);
    setArea(String(foundPatient?.area || '').toUpperCase());
    setAddressText(String(record.address_text || '').toUpperCase());
    setMessage('');

    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setPatientName('');
    setPhoneNumber('');
    setArea('');
    setAddressText('');
    setMessage('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressText.trim()) return setMessage('ERROR: PLEASE ENTER AN ADDRESS.');
    
    setSaving(true);
    setMessage(editingId ? 'UPDATING ADDRESS...' : 'SAVING ADDRESS...');

    const cleanName = patientName.trim().toUpperCase();
    const cleanPhone = phoneNumber.trim().toUpperCase();
    const cleanArea = area.trim().toUpperCase();
    const cleanAddress = addressText.trim().toUpperCase();

    try {
      let patientExists = existingPatients.find(p => (p.name || '').toUpperCase() === cleanName);
      if (!patientExists) {
        const { data: newP, error: pErr } = await supabase
          .from('patients')
          .insert([{ name: cleanName, phone: cleanPhone, area: cleanArea }])
          .select()
          .single();
        if (!pErr && newP) {
          setExistingPatients([...existingPatients, newP]);
        }
      } else if (patientExists.phone !== cleanPhone || patientExists.area !== cleanArea) {
        await supabase.from('patients').update({ phone: cleanPhone, area: cleanArea }).eq('id', patientExists.id);
      }

      if (editingId) {
        const { error: dbError } = await supabase.from('patient_addresses').update({ 
          patient_name: cleanName, 
          phone_number: cleanPhone, 
          address_text: cleanAddress 
        }).eq('id', editingId);
        if (dbError) throw dbError;

        setMessage('SUCCESS: ADDRESS UPDATED SUCCESSFULLY!');
      } else {
        const { error: dbError } = await supabase.from('patient_addresses').insert([{ 
          patient_name: cleanName, 
          phone_number: cleanPhone, 
          address_text: cleanAddress 
        }]);
        if (dbError) throw dbError;

        setMessage('SUCCESS: ADDRESS SAVED TO ARCHIVE!');
      }

      setEditingId(null);
      setPatientName('');
      setPhoneNumber('');
      setArea('');
      setAddressText('');
      fetchAddresses(); 
    } catch (error: any) {
      setMessage(`ERROR: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (record: any) => {
    const name = String(record.patient_name || '').trim().toUpperCase();
    const phone = String(record.phone_number || '').trim().toUpperCase();
    let addr = String(record.address_text || '').trim().toUpperCase();

    // If the address text already starts with the patient name, remove the duplicate prefix
    let restAddr = addr;
    if (name && restAddr.startsWith(name)) {
      restAddr = restAddr.slice(name.length).replace(/^[\r\n\s,]+/, '');
    }

    // Plain text (WhatsApp / markdown bold using *NAME*):
    const plainParts: string[] = [];
    if (name) plainParts.push(`*${name}*`);
    if (phone) plainParts.push(`PHONE: ${phone}`);
    if (restAddr) plainParts.push(restAddr);
    const plainText = plainParts.join('\n');

    // Rich HTML (Word / Google Docs / Email using <b>NAME</b>):
    const htmlParts: string[] = [];
    if (name) htmlParts.push(`<b>${name}</b>`);
    if (phone) htmlParts.push(`PHONE: ${phone}`);
    if (restAddr) {
      const formattedLines = restAddr.split('\n').map((l: string) => l.trim()).filter(Boolean).join('<br/>');
      htmlParts.push(formattedLines);
    }
    const htmlText = htmlParts.join('<br/>');

    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
        const item = new ClipboardItem({
          'text/plain': new Blob([plainText], { type: 'text/plain' }),
          'text/html': new Blob([htmlText], { type: 'text/html' })
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
    } catch {
      await navigator.clipboard.writeText(plainText);
    }

    setCopiedId(record.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredAddresses = addressRecords.filter(p => 
    (p.patient_name || '').toUpperCase().includes(searchQuery.toUpperCase()) || 
    (p.phone_number || '').includes(searchQuery)
  );

  return (
    <main className="min-h-screen bg-[#f4f7f9] p-8 md:p-12 font-sans uppercase text-base">
      
      <header className="mb-8 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg"><Activity className="text-white w-6 h-6" /></div>
          <span className="font-black text-gray-900 text-xl tracking-tight">Healthcare Dashboard</span>
        </div>
        <Link href="/" className="flex items-center gap-2 text-base font-black text-blue-600 hover:text-blue-800 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Back to Dashboard
        </Link>
      </header>

      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tighter">Patient Address Archive</h1>
        <p className="text-gray-500 text-base font-bold">Save, edit, search, and copy formatted shipping addresses for couriers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="col-span-1 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-gray-900">
              {editingId ? 'Edit Address' : 'Add New Address'}
            </h2>
            {editingId && (
              <button 
                type="button" 
                onClick={cancelEdit}
                className="flex items-center gap-1 text-xs font-black text-rose-600 hover:text-rose-800 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 transition-colors uppercase"
              >
                <X className="w-3.5 h-3.5" /> CANCEL
              </button>
            )}
          </div>

          {editingId && (
            <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-black text-amber-800 flex items-center justify-between uppercase">
              <span>✏️ EDITING MODE ACTIVE</span>
              <span className="text-gray-500 font-bold">RECORD #{editingId}</span>
            </div>
          )}
          
          <form onSubmit={handleSave} className="flex flex-col gap-5 text-sm font-bold">
            <div className="flex flex-col gap-1.5">
              <label className="font-black text-gray-700 text-sm">Patient Name</label>
              <input 
                list="patient-list" required placeholder="E.G. ARIA MONTGOMERY" 
                value={patientName} onChange={handlePatientNameChange} 
                onBlur={() => autoFillPatient(patientName)}
                className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" 
              />
              <datalist id="patient-list">{existingPatients.map(p => <option key={p.id} value={p.name} />)}</datalist>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-black text-gray-700 text-sm">Patient Phone</label>
              <input 
                type="text" required placeholder="+1 (555) 893-1122" 
                value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.toUpperCase())} 
                className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" 
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-black text-gray-700 text-sm">Patient Area</label>
              <input 
                list="area-list" type="text" required placeholder="E.G. SOUTH SIDE" 
                value={area} onChange={(e) => setArea(e.target.value.toUpperCase())} 
                className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" 
              />
              <datalist id="area-list">
                {Array.from(new Set(existingPatients.map(p => p.area).filter(Boolean))).map((a, i) => (
                  <option key={i} value={a as string} />
                ))}
              </datalist>
            </div>

            <div className="flex flex-col gap-1.5 mt-2">
              <label className="font-black text-gray-700 text-sm flex justify-between items-end">
                <span>Shipping Address</span>
                <span className="text-xs text-gray-400 font-bold">Press Enter for new line</span>
              </label>
              <textarea 
                required
                rows={5}
                placeholder="123 MAIN STREET&#10;APARTMENT 4B&#10;MUMBAI, MAHARASHTRA 400001"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value.toUpperCase())}
                className="border border-gray-200 rounded-xl p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all resize-none leading-relaxed uppercase"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="submit" disabled={saving}
                className={`flex-1 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#0077b6] hover:bg-blue-700'} text-white font-black py-4 rounded-lg transition-colors shadow-sm disabled:bg-gray-400 flex items-center justify-center gap-2 text-base uppercase`}
              >
                <MapPin className="w-5 h-5" />
                {saving ? (editingId ? 'UPDATING...' : 'SAVING...') : (editingId ? 'UPDATE ADDRESS' : 'SAVE ADDRESS')}
              </button>
              {editingId && (
                <button 
                  type="button" 
                  onClick={cancelEdit}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-black py-4 px-5 rounded-lg transition-colors text-base uppercase"
                >
                  CANCEL
                </button>
              )}
            </div>
            
            {message && (
              <div className={`p-4 rounded-lg text-sm font-black flex items-center gap-2 ${message.includes('ERROR') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                {message.includes('SUCCESS') && <CheckCircle2 className="w-5 h-5"/>}
                {message}
              </div>
            )}
          </form>
        </div>

        <div className="col-span-1 lg:col-span-2">
          
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-600" />
            <input 
              type="text" placeholder="SEARCH BY PATIENT NAME OR PHONE..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value.toUpperCase())} 
              className="w-full pl-14 pr-4 py-4 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-600 text-sm font-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm transition-all bg-white uppercase" 
            />
          </div>

          <h3 className="text-lg font-black text-gray-800 mb-4 tracking-wide">Saved Addresses ({filteredAddresses.length})</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredAddresses.length === 0 ? (
              <div className="col-span-full p-8 text-center text-gray-400 font-black bg-white rounded-2xl border border-gray-100 shadow-sm text-lg">
                NO ADDRESSES FOUND MATCHING YOUR SEARCH.
              </div>
            ) : (
              filteredAddresses.map((record) => (
                <div 
                  key={record.id} 
                  className={`bg-white rounded-2xl p-5 shadow-sm border flex flex-col hover:shadow-md transition-all ${
                    editingId === record.id ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-100'
                  }`}
                >
                  
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-black text-gray-900 mb-1 text-lg">{record.patient_name}</h3>
                      <p className="text-gray-500 text-sm font-bold">📞 {record.phone_number}</p>
                    </div>
                    <span className="text-xs text-gray-400 font-black uppercase tracking-wider bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                      {new Date(record.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="bg-[#f8fcff] p-4 rounded-xl border border-blue-50 mb-4 flex-grow">
                    <p className="text-base text-gray-800 whitespace-pre-wrap font-bold leading-relaxed font-mono uppercase">
                      {record.address_text}
                    </p>
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <button 
                      type="button"
                      onClick={() => startEdit(record)}
                      title="Edit this address"
                      className="flex items-center justify-center gap-1.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 font-black text-xs py-3 px-4 rounded-lg transition-colors uppercase"
                    >
                      <Edit3 className="w-4 h-4" /> EDIT
                    </button>
                    
                    <button 
                      type="button"
                      onClick={() => copyToClipboard(record)}
                      className={`flex-1 flex items-center justify-center gap-2 border font-black text-xs py-3 px-4 rounded-lg transition-colors uppercase ${
                        copiedId === record.id 
                          ? 'bg-emerald-600 text-white border-emerald-600' 
                          : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-800'
                      }`}
                    >
                      {copiedId === record.id ? (
                        <>
                          <Check className="w-4 h-4 text-white" /> COPIED (BOLD NAME)!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-blue-600" /> COPY FOR COURIER
                        </>
                      )}
                    </button>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </main>
  );
}