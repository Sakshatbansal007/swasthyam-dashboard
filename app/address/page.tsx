'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Activity, ArrowLeft, Search, MapPin, CheckCircle2, Copy } from 'lucide-react';

export default function AddressArchive() {
  const [addressRecords, setAddressRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [existingPatients, setExistingPatients] = useState<any[]>([]);
  
  const [patientName, setPatientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [addressText, setAddressText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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

  const handlePatientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const typedName = e.target.value;
    setPatientName(typedName);

    const foundPatient = existingPatients.find(p => p.name.toLowerCase() === typedName.toLowerCase());
    if (foundPatient) {
      setPhoneNumber(foundPatient.phone || '');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressText.trim()) return setMessage('ERROR: PLEASE ENTER AN ADDRESS.');
    
    setSaving(true);
    setMessage('SAVING...');

    try {
      let patientExists = existingPatients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
      if (!patientExists) {
        const { data: newP, error: pErr } = await supabase
          .from('patients')
          .insert([{ name: patientName, phone: phoneNumber }])
          .select()
          .single();
        if (!pErr && newP) {
          setExistingPatients([...existingPatients, newP]);
        }
      } else if (patientExists.phone !== phoneNumber) {
        await supabase.from('patients').update({ phone: phoneNumber }).eq('id', patientExists.id);
      }

      const { error: dbError } = await supabase.from('patient_addresses').insert([{ 
        patient_name: patientName, 
        phone_number: phoneNumber, 
        address_text: addressText 
      }]);
      if (dbError) throw dbError;

      setMessage('SUCCESS: ADDRESS SAVED TO ARCHIVE!');
      setPatientName('');
      setPhoneNumber('');
      setAddressText('');
      fetchAddresses(); 
    } catch (error: any) {
      setMessage(`ERROR: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("ADDRESS COPIED TO CLIPBOARD!");
  };

  const filteredAddresses = addressRecords.filter(p => 
    p.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.phone_number.includes(searchQuery)
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
        <p className="text-gray-500 text-base font-bold">Save, search, and copy formatted shipping addresses for couriers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="col-span-1 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-2xl font-black text-gray-900 mb-6">Add New Address</h2>
          
          <form onSubmit={handleSave} className="flex flex-col gap-5 text-sm font-bold">
            <div className="flex flex-col gap-1.5">
              <label className="font-black text-gray-700 text-sm">Patient Name</label>
              <input 
                list="patient-list" required placeholder="E.G. ARIA MONTGOMERY" 
                value={patientName} onChange={handlePatientNameChange} 
                className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" 
              />
              <datalist id="patient-list">{existingPatients.map(p => <option key={p.id} value={p.name} />)}</datalist>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-black text-gray-700 text-sm">Patient Phone</label>
              <input 
                type="text" required placeholder="+1 (555) 893-1122" 
                value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} 
                className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" 
              />
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
                onChange={(e) => setAddressText(e.target.value)}
                className="border border-gray-200 rounded-xl p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all resize-none leading-relaxed uppercase"
              />
            </div>

            <button 
              type="submit" disabled={saving}
              className="bg-[#0077b6] text-white font-black py-4 mt-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:bg-gray-400 flex items-center justify-center gap-2 text-base uppercase"
            >
              <MapPin className="w-5 h-5" />
              {saving ? 'SAVING...' : 'SAVE ADDRESS'}
            </button>
            
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
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
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
                <div key={record.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
                  
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

                  <button 
                    onClick={() => copyToClipboard(record.address_text)}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-black text-sm py-3 rounded-lg transition-colors mt-auto uppercase"
                  >
                    <Copy className="w-5 h-5 text-blue-600" /> COPY ADDRESS FOR COURIER
                  </button>

                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </main>
  );
}