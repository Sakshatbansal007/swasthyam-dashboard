'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Activity, ArrowLeft, Search, Package, CheckCircle2, ExternalLink } from 'lucide-react';

export default function CourierTracker() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [existingPatients, setExistingPatients] = useState<any[]>([]);
  
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState(''); 
  const [patientEmail, setPatientEmail] = useState('');
  const [patientArea, setPatientArea] = useState('');
  
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
      setPatientEmail(foundPatient.email || '');
      setPatientArea(foundPatient.area || '');
    } else {
      setPatientPhone('');
      setPatientEmail('');
      setPatientArea('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage('SAVING...');

    const isDuplicate = couriers.some(
      (c) => c.tracking_number.toLowerCase() === trackingNumber.toLowerCase()
    );
    if (isDuplicate) {
      return setStatusMessage('ERROR: TRACKING NUMBER IS ALREADY THERE.');
    }

    let patientExists = existingPatients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
    if (!patientExists) {
      const { data: newP, error: pErr } = await supabase.from('patients').insert([{ name: patientName, phone: patientPhone, email: patientEmail, area: patientArea }]).select().single();
      if (!pErr && newP) setExistingPatients([...existingPatients, newP]);
    } else if (patientExists.phone !== patientPhone || patientExists.email !== patientEmail || patientExists.area !== patientArea) {
      await supabase.from('patients').update({ phone: patientPhone, email: patientEmail, area: patientArea }).eq('id', patientExists.id);
    }

    const { error } = await supabase.from('couriers').insert([{ 
      patient_name: patientName, 
      patient_phone: patientPhone, 
      patient_email: patientEmail,
      patient_area: patientArea,
      sent_from: sentFrom, 
      tracking_number: trackingNumber, 
      courier_company: courierCompany, 
      dispatch_date: dispatchDate, 
      status: 'In Transit'
    }]);

    if (error) {
      setStatusMessage('ERROR: ' + error.message);
    } else {
      setStatusMessage('SUCCESS: SHIPMENT RECORDED.');
      setPatientName(''); setPatientPhone(''); setPatientEmail(''); setPatientArea(''); setSentFrom(''); setTrackingNumber(''); setCourierCompany(''); setDispatchDate('');
      fetchCouriers(); 
    }
  };

  const updateStatus = async (id: number, newStatus: string) => {
    let updatePayload: any = { status: newStatus };
    
    if (newStatus === 'Delivered' || newStatus === 'Returned') {
      updatePayload.delivered_date = new Date().toISOString().split('T')[0];
    } else {
      updatePayload.delivered_date = null; 
    }

    await supabase.from('couriers').update(updatePayload).eq('id', id);
    fetchCouriers();
  };

  const filteredCouriers = couriers.filter(c => 
    c.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.patient_phone && c.patient_phone.includes(searchQuery)) ||
    (c.sent_from && c.sent_from.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const pendingCouriers = filteredCouriers.filter(c => c.status === 'In Transit' || c.status === 'Complaint');
  const completedCouriers = filteredCouriers.filter(c => c.status === 'Delivered' || c.status === 'Returned');

  const getStatusBadge = (status: string) => {
    if (status === 'Delivered') return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (status === 'Returned') return "text-rose-700 bg-rose-50 border-rose-200";
    if (status === 'Complaint') return "text-purple-700 bg-purple-50 border-purple-200";
    return "text-amber-700 bg-amber-50 border-amber-200"; 
  };

  const renderTable = (title: string, data: any[], icon: any, colorClass: string, bgClass: string) => (
    <div className="mb-8">
      <div className={`flex items-center gap-2 p-4 rounded-t-xl border-b border-gray-100 ${bgClass}`}>
        {icon}
        <h3 className={`font-black text-base ${colorClass}`}>{title}</h3>
      </div>
      <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              <th className="p-4 text-sm font-black text-gray-800">Patient Details</th>
              <th className="p-4 text-sm font-black text-gray-800">Area</th>
              <th className="p-4 text-sm font-black text-gray-800">Sent From</th>
              <th className="p-4 text-sm font-black text-gray-800">Tracking Info</th>
              <th className="p-4 text-sm font-black text-gray-800">Dispatch Date</th>
              <th className="p-4 text-sm font-black text-gray-800">Delivered Date</th>
              <th className="p-4 text-sm font-black text-gray-800">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-gray-400 font-bold">No shipments found.</td></tr>
            ) : (
              data.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 odd:bg-white even:bg-gray-200 hover:bg-blue-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-black text-gray-900">{c.patient_name}</div>
                    <div className="text-xs font-bold text-gray-500 mt-0.5">{c.patient_phone}</div>
                    <div className="text-xs font-bold text-gray-400">{c.patient_email || '-'}</div>
                  </td>
                  <td className="p-4 font-bold text-gray-600">{c.patient_area || '-'}</td>
                  <td className="p-4 font-bold text-gray-600">{c.sent_from}</td>
                  <td className="p-4">
                    <div className="font-black text-gray-900">{c.tracking_number}</div>
                    <div className="text-xs font-bold text-gray-500 mt-0.5">{c.courier_company}</div>
                  </td>
                  <td className="p-4 font-bold text-gray-600">{c.dispatch_date}</td>
                  <td className="p-4 font-bold text-gray-600">{c.delivered_date || '-'}</td>
                  <td className="p-4">
                    <select 
                      value={c.status} 
                      onChange={(e) => updateStatus(c.id, e.target.value)}
                      className={`font-black uppercase text-xs py-1.5 px-3 rounded-full border cursor-pointer outline-none ${getStatusBadge(c.status)}`}
                    >
                      <option value="In Transit">In Transit</option>
                      <option value="Complaint">Complaint</option>
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

      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tighter">Courier Tracking</h1>
          <p className="text-gray-500 text-base font-bold">Log new consignments and view ongoing logistics and deliveries.</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
          <span className="text-sm font-black text-gray-500 uppercase tracking-wider ml-2">Quick Track:</span>
          <a href="https://trackon.in/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-black text-white bg-[#e3000f] hover:bg-red-700 py-2 px-4 rounded-lg transition-colors">
            Trackon <ExternalLink className="w-4 h-4" />
          </a>
          <a href="https://www.indiapost.gov.in/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-black text-white bg-[#004b87] hover:bg-blue-800 py-2 px-4 rounded-lg transition-colors">
            India Post <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="col-span-1 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-2xl font-black text-gray-900 mb-6">Log New Shipment</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-sm font-bold">
            
            <div className="flex flex-col gap-1.5">
              <label className="font-black text-gray-700 text-sm">Patient Name</label>
              <input list="patient-list" required placeholder="E.G. HASSAN MILLER" value={patientName} onChange={handlePatientNameChange} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
              <datalist id="patient-list">{existingPatients.map(p => <option key={p.id} value={p.name} />)}</datalist>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-1.5 w-1/2">
                <label className="font-black text-gray-700 text-sm">Phone</label>
                <input type="text" required placeholder="+1 (555) 000-0000" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
              </div>
              <div className="flex flex-col gap-1.5 w-1/2">
                <label className="font-black text-gray-700 text-sm">Area</label>
                <input type="text" required placeholder="E.G. SOUTH SIDE" value={patientArea} onChange={(e) => setPatientArea(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-black text-gray-700 text-sm">Email <span className="text-gray-400 font-bold">(Optional)</span></label>
              <input type="email" placeholder="PATIENT@EXAMPLE.COM" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-black text-gray-700 text-sm">Sent From</label>
              <select required value={sentFrom} onChange={(e) => setSentFrom(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white uppercase">
                <option value="" disabled>SELECT ORIGIN...</option>
                <option value="Swasthyam">SWASTHYAM</option>
                <option value="endo">ENDO</option>
                <option value="Samyak">SAMYAK</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-black text-gray-700 text-sm">Tracking Number</label>
              <input type="text" required placeholder="TRK-0000-0000" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 font-black focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="font-black text-gray-700 text-sm">Courier Company</label>
              <input list="companies" required placeholder="E.G. TRACKON" value={courierCompany} onChange={(e) => setCourierCompany(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
              <datalist id="companies"><option value="Trackon" /><option value="India Post" /><option value="FedEx" /><option value="DTDC" /></datalist>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="font-black text-gray-700 text-sm">Dispatch Date</label>
              <input type="date" required value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
            </div>
            
            <button type="submit" className="bg-[#0077b6] text-white font-black text-base py-4 mt-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              SAVE SHIPMENT
            </button>
            {statusMessage && <div className={`p-4 rounded-lg flex items-center gap-2 text-sm font-black ${statusMessage.includes('ERROR') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}><CheckCircle2 className="w-5 h-5"/> {statusMessage}</div>}
          </form>
        </div>

        <div className="col-span-1 lg:col-span-2">
          
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-600" />
            <input 
              type="text" placeholder="SEARCH ACTIVE COURIER LISTS, PATIENTS OR TRACKING CODES..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-14 pr-4 py-4 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-600 text-sm font-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm transition-all uppercase" 
            />
          </div>

          {renderTable('IN TRANSIT & COMPLAINTS', pendingCouriers, <Package className="w-5 h-5 text-blue-600" />, 'text-blue-800', 'bg-blue-50/50')}
          {renderTable('COMPLETED & RETURNED', completedCouriers, <CheckCircle2 className="w-5 h-5 text-emerald-600" />, 'text-emerald-800', 'bg-emerald-50/50')}
        </div>

      </div>
    </main>
  );
}