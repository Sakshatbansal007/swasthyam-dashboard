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
    if (!addressText.trim()) return setMessage('Error: Please enter an address.');
    
    setSaving(true);
    setMessage('Saving...');

    try {
      // Update patient list if new
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

      // Save to new text address table
      const { error: dbError } = await supabase.from('patient_addresses').insert([{ 
        patient_name: patientName, 
        phone_number: phoneNumber, 
        address_text: addressText 
      }]);
      if (dbError) throw dbError;

      setMessage('Success: Address saved to archive!');
      setPatientName('');
      setPhoneNumber('');
      setAddressText('');
      fetchAddresses(); 
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Address copied to clipboard!");
  };

  const filteredAddresses = addressRecords.filter(p => 
    p.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.phone_number.includes(searchQuery)
  );

  return (
    <main className="min-h-screen bg-[#f4f7f9] p-8 md:p-12 font-sans">
      
      <header className="mb-8 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg"><Activity className="text-white w-5 h-5" /></div>
          <span className="font-bold text-gray-900 text-lg tracking-tight">Healthcare Dashboard</span>
        </div>
        <Link href="/" className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </header>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Patient Address Archive</h1>
        <p className="text-gray-500 text-sm font-medium">Save, search, and copy formatted shipping addresses for couriers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Input Form */}
        <div className="col-span-1 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Add New Address</h2>
          
          <form onSubmit={handleSave} className="flex flex-col gap-5 text-sm">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-gray-700 text-xs">Patient Name</label>
              <input 
                list="patient-list" required placeholder="e.g. Aria Montgomery" 
                value={patientName} onChange={handlePatientNameChange} 
                className="border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" 
              />
              <datalist id="patient-list">{existingPatients.map(p => <option key={p.id} value={p.name} />)}</datalist>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-gray-700 text-xs">Patient Phone</label>
              <input 
                type="text" required placeholder="+1 (555) 893-1122" 
                value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} 
                className="border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" 
              />
            </div>

            <div className="flex flex-col gap-1.5 mt-2">
              <label className="font-semibold text-gray-700 text-xs flex justify-between items-end">
                <span>Shipping Address</span>
                <span className="text-[10px] text-gray-400 font-normal">Press Enter for new line</span>
              </label>
              {/* Multi-line text area */}
              <textarea 
                required
                rows={5}
                placeholder="123 Main Street&#10;Apartment 4B&#10;Mumbai, Maharashtra 400001"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                className="border border-gray-200 rounded-xl p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all resize-none leading-relaxed"
              />
            </div>

            <button 
              type="submit" disabled={saving}
              className="bg-[#0077b6] text-white font-bold py-3 mt-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Address'}
            </button>
            
            {message && (
              <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${message.includes('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                {message.includes('Success') && <CheckCircle2 className="w-4 h-4"/>}
                {message}
              </div>
            )}
          </form>
        </div>

        {/* Right Side Gallery / List */}
        <div className="col-span-1 lg:col-span-2">
          
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" placeholder="Search by Patient Name or Phone..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 shadow-sm transition-all bg-white" 
            />
          </div>

          <h3 className="text-sm font-bold text-gray-800 mb-4 tracking-wide">Saved Addresses ({filteredAddresses.length})</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredAddresses.length === 0 ? (
              <div className="col-span-full p-8 text-center text-gray-400 font-medium bg-white rounded-2xl border border-gray-100 shadow-sm">
                No addresses found matching your search.
              </div>
            ) : (
              filteredAddresses.map((record) => (
                <div key={record.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
                  
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">{record.patient_name}</h3>
                      <p className="text-gray-500 text-xs font-medium">📞 {record.phone_number}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                      {new Date(record.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {/* The Address Display - Notice 'whitespace-pre-wrap' handles the line breaks perfectly */}
                  <div className="bg-[#f8fcff] p-4 rounded-xl border border-blue-50 mb-4 flex-grow">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap font-medium leading-relaxed font-mono">
                      {record.address_text}
                    </p>
                  </div>

                  <button 
                    onClick={() => copyToClipboard(record.address_text)}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-bold text-xs py-2.5 rounded-lg transition-colors mt-auto"
                  >
                    <Copy className="w-4 h-4 text-blue-600" /> Copy Address for Courier
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