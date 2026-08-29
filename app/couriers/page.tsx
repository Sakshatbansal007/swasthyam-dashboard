'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Activity, ArrowLeft, Search, Package, CheckCircle2 } from 'lucide-react';

export default function CourierTracker() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [existingPatients, setExistingPatients] = useState<any[]>([]);
  
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState(''); 
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
    if (foundPatient) setPatientPhone(foundPatient.phone || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage('Saving...');

    let patientExists = existingPatients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
    if (!patientExists) {
      const { data: newP, error: pErr } = await supabase.from('patients').insert([{ name: patientName, phone: patientPhone }]).select().single();
      if (!pErr && newP) setExistingPatients([...existingPatients, newP]);
    } else if (patientExists.phone !== patientPhone) {
      await supabase.from('patients').update({ phone: patientPhone }).eq('id', patientExists.id);
    }

    const { error } = await supabase.from('couriers').insert([{ 
      patient_name: patientName, patient_phone: patientPhone, sent_from: sentFrom, tracking_number: trackingNumber, courier_company: courierCompany, dispatch_date: dispatchDate, status: 'In Transit'
    }]);

    if (error) {
      setStatusMessage('Error: ' + error.message);
    } else {
      setStatusMessage('Success: Shipment recorded.');
      setPatientName(''); setPatientPhone(''); setSentFrom(''); setTrackingNumber(''); setCourierCompany(''); setDispatchDate('');
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

  const getStatusBadge = (status: string) => {
    if (status === 'Delivered') return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (status === 'Returned') return "text-rose-700 bg-rose-50 border-rose-200";
    return "text-amber-700 bg-amber-50 border-amber-200";
  };

  const renderTable = (title: string, data: any[], icon: any, colorClass: string, bgClass: string) => (
    <div className="mb-8">
      <div className={`flex items-center gap-2 p-4 rounded-t-xl border-b border-gray-100 ${bgClass}`}>
        {icon}
        <h3 className={`font-bold text-sm ${colorClass}`}>{title}</h3>
      </div>
      <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="p-4 text-xs font-bold text-gray-800">Patient</th>
              <th className="p-4 text-xs font-bold text-gray-800">Tracking Number</th>
              <th className="p-4 text-xs font-bold text-gray-800">Courier</th>
              <th className="p-4 text-xs font-bold text-gray-800">Date</th>
              <th className="p-4 text-xs font-bold text-gray-800">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-gray-400 font-medium">No shipments found.</td></tr>
            ) : (
              data.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-bold text-gray-900">{c.patient_name}</td>
                  <td className="p-4 font-medium text-gray-600">{c.tracking_number}</td>
                  <td className="p-4 font-medium text-gray-600">{c.courier_company}</td>
                  <td className="p-4 font-medium text-gray-600">{c.dispatch_date}</td>
                  <td className="p-4">
                    <select 
                      value={c.status} 
                      onChange={(e) => updateStatus(c.id, e.target.value)}
                      className={`font-semibold text-xs py-1.5 px-3 rounded-full border cursor-pointer outline-none ${getStatusBadge(c.status)}`}
                    >
                      <option value="In Transit">In Transit</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Returned">Returned</option>
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
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Courier Tracking</h1>
        <p className="text-gray-500 text-sm font-medium">Log new consignments and view ongoing logistics and deliveries.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Modern Form */}
        <div className="col-span-1 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Log New Shipment</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-sm">
            
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-gray-700 text-xs">Patient Name</label>
              <input list="patient-list" required placeholder="e.g. Hassan Miller" value={patientName} onChange={handlePatientNameChange} className="border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
              <datalist id="patient-list">{existingPatients.map(p => <option key={p.id} value={p.name} />)}</datalist>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-gray-700 text-xs">Patient Phone</label>
              <input type="text" required placeholder="+1 (555) 000-0000" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} className="border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-gray-700 text-xs">Sent From (Depot)</label>
              <input type="text" required placeholder="e.g. Main Chicago Depot" value={sentFrom} onChange={(e) => setSentFrom(e.target.value)} className="border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-gray-700 text-xs">Tracking Number</label>
              <input type="text" required placeholder="TRK-0000-0000" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="border border-gray-200 rounded-lg p-2.5 text-gray-900 font-mono focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-gray-700 text-xs">Courier Company</label>
              <input list="companies" required placeholder="e.g. DHL Express" value={courierCompany} onChange={(e) => setCourierCompany(e.target.value)} className="border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
              <datalist id="companies"><option value="FedEx" /><option value="UPS" /><option value="DHL" /><option value="Speed Post" /></datalist>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-gray-700 text-xs">Dispatch Date</label>
              <input type="date" required value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} className="border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
            </div>
            
            <button type="submit" className="bg-[#0077b6] text-white font-bold py-3 mt-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              Save Shipment
            </button>
            {statusMessage && <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2 text-green-700 text-xs font-bold"><CheckCircle2 className="w-4 h-4"/> {statusMessage}</div>}
          </form>
        </div>

        {/* Right Side Tables */}
        <div className="col-span-1 lg:col-span-2">
          
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" placeholder="Search active courier lists, patients or tracking codes..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 shadow-sm transition-all" 
            />
          </div>

          {renderTable('Pending Shipments', pendingCouriers, <Package className="w-4 h-4 text-blue-600" />, 'text-blue-800', 'bg-blue-50/50')}
          {renderTable('Completed & Returned', completedCouriers, <CheckCircle2 className="w-4 h-4 text-emerald-600" />, 'text-emerald-800', 'bg-emerald-50/50')}
        </div>

      </div>
    </main>
  );
}