'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

export default function CourierTracker() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [existingPatients, setExistingPatients] = useState<any[]>([]);
  
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState(''); // NEW phone state
  const [sentFrom, setSentFrom] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [courierCompany, setCourierCompany] = useState('');
  const [dispatchDate, setDispatchDate] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    fetchCouriers();
    fetchPatients();
  }, []);

  async function fetchCouriers() {
    const { data } = await supabase.from('couriers').select('*').order('dispatch_date', { ascending: false });
    if (data) setCouriers(data);
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
      setPatientPhone(foundPatient.phone || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage('Saving...');

    // 1. Auto-save patient to central table if not present
    let patientExists = existingPatients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
    if (!patientExists) {
      const { data: newP, error: pErr } = await supabase
        .from('patients')
        .insert([{ name: patientName, phone: patientPhone }])
        .select()
        .single();
      if (!pErr && newP) {
        setExistingPatients([...existingPatients, newP]);
      }
    } else if (patientExists.phone !== patientPhone) {
      await supabase.from('patients').update({ phone: patientPhone }).eq('id', patientExists.id);
    }

    // 2. Save courier shipment
    const { error } = await supabase.from('couriers').insert([{ 
      patient_name: patientName, 
      patient_phone: patientPhone, // Saving phone to courier table
      sent_from: sentFrom, 
      tracking_number: trackingNumber, 
      courier_company: courierCompany,
      dispatch_date: dispatchDate,
      status: 'In Transit'
    }]);

    if (error) {
      setStatusMessage('Error: ' + error.message);
    } else {
      setStatusMessage('Courier logged successfully!');
      setPatientName('');
      setPatientPhone('');
      setSentFrom('');
      setTrackingNumber('');
      setCourierCompany('');
      setDispatchDate('');
      fetchCouriers(); 
    }
  };

  const updateStatus = async (id: number, newStatus: string) => {
    await supabase.from('couriers').update({ status: newStatus }).eq('id', id);
    fetchCouriers();
  };

  const filteredCouriers = couriers.filter(c => 
    c.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.patient_phone && c.patient_phone.includes(searchQuery)) ||
    (c.sent_from && c.sent_from.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const pendingCouriers = filteredCouriers.filter(c => c.status === 'In Transit');
  const completedCouriers = filteredCouriers.filter(c => c.status === 'Delivered' || c.status === 'Returned');

  const renderTable = (title: string, data: any[], icon: string) => (
    <div className="mb-10">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        {icon} {title} ({data.length})
      </h3>
      <div className="overflow-x-auto shadow-sm border border-gray-200 rounded-lg">
        <table className="w-full text-left border-collapse bg-white">
          <thead>
            <tr className="bg-gray-800 text-white text-sm uppercase">
              <th className="p-4 border-b">Date</th>
              <th className="p-4 border-b">To (Patient)</th>
              <th className="p-4 border-b">Phone</th>
              <th className="p-4 border-b">Sent From</th>
              <th className="p-4 border-b">Courier</th>
              <th className="p-4 border-b">Tracking #</th>
              <th className="p-4 border-b">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-600 font-semibold bg-gray-50">
                  No shipments found in this category.
                </td>
              </tr>
            ) : (
              data.map((c) => (
                <tr key={c.id} className="hover:bg-gray-100 transition-colors">
                  <td className="p-4 border-b text-gray-900 font-medium">{c.dispatch_date}</td>
                  <td className="p-4 border-b text-gray-900 font-bold">{c.patient_name}</td>
                  <td className="p-4 border-b text-gray-700 font-medium">{c.patient_phone || 'N/A'}</td>
                  <td className="p-4 border-b text-gray-700 font-medium">{c.sent_from || 'N/A'}</td>
                  <td className="p-4 border-b text-gray-600 font-medium">{c.courier_company}</td>
                  <td className="p-4 border-b">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">{c.tracking_number}</span>
                      <button 
                        onClick={() => navigator.clipboard.writeText(c.tracking_number)}
                        className="text-gray-400 hover:text-gray-800" title="Copy Tracking Number"
                      >
                        📋
                      </button>
                    </div>
                  </td>
                  <td className="p-4 border-b">
                    <select 
                      value={c.status} 
                      onChange={(e) => updateStatus(c.id, e.target.value)}
                      className={`font-bold p-2 rounded border cursor-pointer ${
                        c.status === 'Delivered' ? 'bg-green-100 text-green-800 border-green-200' : 
                        c.status === 'Returned' ? 'bg-red-100 text-red-800 border-red-200' : 
                        'bg-yellow-100 text-yellow-800 border-yellow-200'
                      }`}
                    >
                      <option value="In Transit">In Transit 🚚</option>
                      <option value="Delivered">Delivered ✅</option>
                      <option value="Returned">Returned ❌</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <main className="p-10 bg-gray-50 min-h-screen">
      <Link href="/" className="text-blue-600 hover:underline mb-6 inline-block font-semibold">
        &larr; Back to Dashboard
      </Link>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Courier Tracking</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        <div className="col-span-1 bg-white p-6 rounded-lg shadow-md border border-gray-200 h-fit sticky top-10">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Log New Shipment</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            <div>
              <input 
                list="patient-list" type="text" required placeholder="To (Patient Name)" 
                value={patientName} onChange={handlePatientNameChange} 
                className="w-full border rounded p-2 text-black" 
              />
              <datalist id="patient-list">
                {existingPatients.map(p => <option key={p.id} value={p.name} />)}
              </datalist>
            </div>

            <input 
              type="text" required placeholder="Patient Phone Number" 
              value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} 
              className="border rounded p-2 text-black" 
            />

            <input 
              type="text" required placeholder="Sent From (e.g. Clinic, Vendor)" 
              value={sentFrom} onChange={(e) => setSentFrom(e.target.value)} 
              className="border rounded p-2 text-black bg-blue-50" 
            />

            <input 
              type="text" required placeholder="Tracking Number" 
              value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} 
              className="border rounded p-2 text-black font-mono uppercase" 
            />
            
            <input 
              list="companies" type="text" required placeholder="Courier Company (e.g. DTDC)" 
              value={courierCompany} onChange={(e) => setCourierCompany(e.target.value)} 
              className="border rounded p-2 text-black" 
            />
            <datalist id="companies">
              <option value="DTDC" />
              <option value="BlueDart" />
              <option value="Delhivery" />
              <option value="Speed Post" />
            </datalist>
            
            <input 
              type="date" required 
              value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} 
              className="border rounded p-2 text-black" 
            />
            
            <button type="submit" className="bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors">
              Save Shipment
            </button>
            {statusMessage && <p className={`text-sm font-bold mt-2 ${statusMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{statusMessage}</p>}
          </form>
        </div>

        <div className="col-span-1 lg:col-span-2">
          <div className="flex justify-end mb-6">
            <input 
              type="text" 
              placeholder="Search by Name, Phone, or Tracking ID..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="border rounded-lg p-2 text-black border-gray-300 w-80 shadow-sm" 
            />
          </div>

          {renderTable('Pending Shipments', pendingCouriers, '🚚')}
          {renderTable('Completed & Returned', completedCouriers, '✅')}
        </div>

      </div>
    </main>
  );
}