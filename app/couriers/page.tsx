'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Activity, ArrowLeft, Search, Package, CheckCircle2, ExternalLink, Copy, Check } from 'lucide-react';

export default function CourierTracker() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [existingPatients, setExistingPatients] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
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

  const autoFillPatient = async (nameToMatch: string) => {
    const cleanName = nameToMatch.trim().toUpperCase();
    if (!cleanName) {
      setPatientPhone('');
      setPatientEmail('');
      setPatientArea('');
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
      if (foundPatient.phone != null) setPatientPhone(String(foundPatient.phone).toUpperCase());
      if (foundPatient.email != null) setPatientEmail(String(foundPatient.email).toUpperCase());
      if (foundPatient.area != null) setPatientArea(String(foundPatient.area).toUpperCase());
    }

    // Check past courier shipments for origin and company info
    const { data: pastCourier } = await supabase
      .from('couriers')
      .select('sent_from, courier_company, patient_phone, patient_email, patient_area')
      .ilike('patient_name', cleanName)
      .order('dispatch_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pastCourier) {
      if (pastCourier.sent_from != null) setSentFrom(String(pastCourier.sent_from).toUpperCase());
      if (pastCourier.courier_company != null) setCourierCompany(String(pastCourier.courier_company).toUpperCase());
      if (!foundPatient?.phone && pastCourier.patient_phone != null) setPatientPhone(String(pastCourier.patient_phone).toUpperCase());
      if (!foundPatient?.email && pastCourier.patient_email != null) setPatientEmail(String(pastCourier.patient_email).toUpperCase());
      if (!foundPatient?.area && pastCourier.patient_area != null) setPatientArea(String(pastCourier.patient_area).toUpperCase());
    }
  };

  const handlePatientNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const typedName = e.target.value.toUpperCase();
    setPatientName(typedName);
    await autoFillPatient(typedName);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage('SAVING...');

    const upperTracking = trackingNumber.trim().toUpperCase();
    // Strict duplicate check on tracking / serial number
    const isDuplicate = couriers.some(
      (c) => c.tracking_number && c.tracking_number.trim().toUpperCase() === upperTracking
    );
    if (isDuplicate) {
      return setStatusMessage('ERROR: THIS SERIAL / TRACKING NUMBER HAS ALREADY BEEN RECORDED.');
    }

    const upperName = patientName.trim().toUpperCase();
    const upperPhone = patientPhone.trim().toUpperCase();
    const upperEmail = patientEmail.trim().toUpperCase();
    const upperArea = patientArea.trim().toUpperCase();
    const upperSentFrom = sentFrom.trim().toUpperCase();
    const upperCourier = courierCompany.trim().toUpperCase();

    let patientExists = existingPatients.find(p => (p.name || '').toUpperCase() === upperName);
    if (!patientExists) {
      const { data: newP, error: pErr } = await supabase.from('patients').insert([{ name: upperName, phone: upperPhone, email: upperEmail, area: upperArea }]).select().single();
      if (!pErr && newP) setExistingPatients([...existingPatients, newP]);
    } else if (patientExists.phone !== upperPhone || patientExists.email !== upperEmail || patientExists.area !== upperArea) {
      await supabase.from('patients').update({ phone: upperPhone, email: upperEmail, area: upperArea }).eq('id', patientExists.id);
    }

    const { error } = await supabase.from('couriers').insert([{ 
      patient_name: upperName, 
      patient_phone: upperPhone, 
      patient_email: upperEmail,
      patient_area: upperArea,
      sent_from: upperSentFrom, 
      tracking_number: upperTracking, 
      courier_company: upperCourier, 
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

  const copyRowData = async (c: any) => {
    const pName = String(c.patient_name || '').toUpperCase();
    const formatted = [
      `*${pName}*`,
      `PHONE: ${String(c.patient_phone || 'N/A').toUpperCase()}`,
      `EMAIL: ${String(c.patient_email || 'N/A').toUpperCase()}`,
      `AREA: ${String(c.patient_area || 'N/A').toUpperCase()}`,
      `SENT FROM: ${String(c.sent_from || 'N/A').toUpperCase()}`,
      `*TRACKING NO:* ${String(c.tracking_number || 'N/A').toUpperCase()}`,
      `COURIER: ${String(c.courier_company || 'N/A').toUpperCase()}`,
      `DISPATCH DATE: ${String(c.dispatch_date || 'N/A').toUpperCase()}`,
      `DELIVERED DATE: ${String(c.delivered_date || 'N/A').toUpperCase()}`,
      `*STATUS:* ${String(c.status || 'N/A').toUpperCase()}`
    ].join('\n');

    const htmlFormatted = [
      `<b>${pName}</b>`,
      `PHONE: ${String(c.patient_phone || 'N/A').toUpperCase()}`,
      `EMAIL: ${String(c.patient_email || 'N/A').toUpperCase()}`,
      `AREA: ${String(c.patient_area || 'N/A').toUpperCase()}`,
      `SENT FROM: ${String(c.sent_from || 'N/A').toUpperCase()}`,
      `<b>TRACKING NO:</b> ${String(c.tracking_number || 'N/A').toUpperCase()}`,
      `COURIER: ${String(c.courier_company || 'N/A').toUpperCase()}`,
      `DISPATCH DATE: ${String(c.dispatch_date || 'N/A').toUpperCase()}`,
      `DELIVERED DATE: ${String(c.delivered_date || 'N/A').toUpperCase()}`,
      `<b>STATUS:</b> ${String(c.status || 'N/A').toUpperCase()}`
    ].join('<br/>');

    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
        const item = new ClipboardItem({
          'text/plain': new Blob([formatted], { type: 'text/plain' }),
          'text/html': new Blob([htmlFormatted], { type: 'text/html' })
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(formatted);
      }
    } catch {
      await navigator.clipboard.writeText(formatted);
    }

    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const downloadExcel = () => {
    let filtered = couriers;
    if (startDate) filtered = filtered.filter(c => new Date(c.dispatch_date) >= new Date(startDate));
    if (endDate) filtered = filtered.filter(c => new Date(c.dispatch_date) <= new Date(endDate));
    if (filtered.length === 0) return alert("NO SHIPMENTS FOUND IN THIS DATE RANGE.");

    const headers = "Dispatch Date,Patient,Phone,Email,Area,Sent From,Tracking Number,Courier Company,Delivered Date,Status\n";
    const rows = filtered.map(c => `"${c.dispatch_date}","${c.patient_name}","${c.patient_phone || ''}","${c.patient_email || ''}","${c.patient_area || ''}","${c.sent_from}","${c.tracking_number}","${c.courier_company}","${c.delivered_date || ''}","${c.status}"`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Couriers_Report_${startDate || 'Start'}_to_${endDate || 'End'}.csv`;
    a.click();
  };

  const filteredCouriers = couriers.filter(c => {
    const matchesSearch = c.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.patient_phone && c.patient_phone.includes(searchQuery)) ||
      (c.sent_from && c.sent_from.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesMonth = selectedMonth ? c.dispatch_date?.startsWith(selectedMonth) : true;
    
    return matchesSearch && matchesMonth;
  });

  const pendingCouriers = filteredCouriers.filter(c => c.status === 'In Transit' || c.status === 'Complaint');
  const completedCouriers = filteredCouriers.filter(c => c.status === 'Delivered' || c.status === 'Returned');

  const getStatusBadge = (status: string) => {
    if (status === 'Delivered') return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (status === 'Returned') return "text-rose-700 bg-rose-50 border-rose-200";
    if (status === 'Complaint') return "text-purple-700 bg-purple-50 border-purple-200";
    return "text-amber-700 bg-amber-50 border-amber-200"; 
  };

  const renderTable = (title: string, data: any[], icon: any, colorClass: string, bgClass: string) => (
    <div className="mb-8 w-full">
      <div className={`flex items-center gap-2 p-4 rounded-t-xl border-b border-gray-100 ${bgClass}`}>
        {icon}
        <h3 className={`font-black text-base ${colorClass}`}>{title} ({data.length})</h3>
      </div>
      <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="p-4 text-sm font-black text-gray-800 uppercase">Patient Details</th>
              <th className="p-4 text-sm font-black text-gray-800 uppercase">Area</th>
              <th className="p-4 text-sm font-black text-gray-800 uppercase">Sent From</th>
              <th className="p-4 text-sm font-black text-gray-800 uppercase">Tracking / Serial No</th>
              <th className="p-4 text-sm font-black text-gray-800 uppercase">Dispatch Date</th>
              <th className="p-4 text-sm font-black text-gray-800 uppercase">Delivered Date</th>
              <th className="p-4 text-sm font-black text-gray-800 uppercase">Status</th>
              <th className="p-4 text-sm font-black text-gray-800 uppercase text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={8} className="p-6 text-center text-gray-400 font-bold uppercase">No shipments found.</td></tr>
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
                    <div className="text-xs font-bold text-gray-500 mt-0.5 uppercase">{c.courier_company}</div>
                  </td>
                  <td className="p-4 font-bold text-gray-600">{c.dispatch_date}</td>
                  <td className="p-4 font-bold text-gray-600">{c.delivered_date || '-'}</td>
                  <td className="p-4">
                    <select 
                      value={c.status} 
                      onChange={(e) => updateStatus(c.id, e.target.value)}
                      className={`font-black uppercase text-xs py-1.5 px-3 rounded-full border cursor-pointer outline-none ${getStatusBadge(c.status)}`}
                    >
                      <option value="In Transit" className="uppercase font-bold">IN TRANSIT</option>
                      <option value="Complaint" className="uppercase font-bold">COMPLAINT</option>
                      <option value="Delivered" className="uppercase font-bold">DELIVERED</option>
                      <option value="Returned" className="uppercase font-bold">RETURNED</option>
                    </select>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() => copyRowData(c)}
                      title="Copy formatted row details"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all uppercase shadow-sm border ${
                        copiedId === c.id
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                      }`}
                    >
                      {copiedId === c.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>COPIED!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-400" />
                          <span>COPY ROW</span>
                        </>
                      )}
                    </button>
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

        <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex-wrap">
          <span className="text-sm font-black text-gray-500 uppercase tracking-wider ml-2">Quick Track:</span>
          <a href="https://shreeanjani.co.in/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-black text-white bg-[#e65100] hover:bg-orange-700 py-2 px-4 rounded-lg transition-colors uppercase">
            Shree Anjani <ExternalLink className="w-4 h-4" />
          </a>
          <a href="https://trackon.in/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-black text-white bg-[#e3000f] hover:bg-red-700 py-2 px-4 rounded-lg transition-colors uppercase">
            Trackon <ExternalLink className="w-4 h-4" />
          </a>
          <a href="https://www.indiapost.gov.in/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-black text-white bg-[#004b87] hover:bg-blue-800 py-2 px-4 rounded-lg transition-colors uppercase">
            India Post <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Full-width Form Section placed above tables to maximize screen space */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-10 w-full">
        <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-600" /> Log New Shipment
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 text-sm font-bold">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="font-black text-gray-700 text-sm uppercase">Patient Name</label>
              <input list="patient-list" required placeholder="E.G. HASSAN MILLER" value={patientName} onChange={handlePatientNameChange} onBlur={() => autoFillPatient(patientName)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
              <datalist id="patient-list">{existingPatients.map(p => <option key={p.id} value={p.name} />)}</datalist>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-black text-gray-700 text-sm uppercase">Phone</label>
              <input type="text" required placeholder="+91 9876543210" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value.toUpperCase())} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-black text-gray-700 text-sm uppercase">Area</label>
              <input type="text" required placeholder="E.G. SOUTH SIDE" value={patientArea} onChange={(e) => setPatientArea(e.target.value.toUpperCase())} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-black text-gray-700 text-sm uppercase">Email <span className="text-gray-400 font-bold">(Optional)</span></label>
              <input type="email" placeholder="PATIENT@EXAMPLE.COM" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value.toUpperCase())} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-black text-gray-700 text-sm uppercase">Sent From</label>
              <select required value={sentFrom} onChange={(e) => setSentFrom(e.target.value.toUpperCase())} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white uppercase font-bold">
                <option value="" disabled className="uppercase font-bold">SELECT ORIGIN...</option>
                <option value="SWASTHYAM HEALTHCARE" className="uppercase font-bold">SWASTHYAM HEALTHCARE</option>
                <option value="ENDO KIDZ" className="uppercase font-bold">ENDO KIDZ</option>
                <option value="SAMYAK" className="uppercase font-bold">SAMYAK</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-black text-gray-700 text-sm uppercase">TRACKING NUMBER</label>
              <input type="text" required placeholder="TRK-0000-0000" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())} className="border border-gray-200 rounded-lg p-3 text-gray-900 font-black focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="font-black text-gray-700 text-sm uppercase">Courier Company</label>
              <input list="companies" required placeholder="E.G. TRACKON" value={courierCompany} onChange={(e) => setCourierCompany(e.target.value.toUpperCase())} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
              <datalist id="companies">
                <option value="SHREE ANJANI" />
                <option value="TRACKON" />
                <option value="INDIA POST" />
                <option value="FEDEX" />
                <option value="DTDC" />
                <option value="DELHIVERY" />
                <option value="BLUEDART" />
              </datalist>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="font-black text-gray-700 text-sm uppercase">Dispatch Date</label>
              <input type="date" required value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
            <button type="submit" className="bg-[#0077b6] text-white font-black text-sm py-3.5 px-8 rounded-xl hover:bg-blue-700 transition-colors shadow-sm uppercase tracking-wider">
              SAVE SHIPMENT
            </button>
            {statusMessage && (
              <div className={`p-3.5 rounded-xl flex items-center gap-2 text-xs font-black tracking-wide ${statusMessage.includes('ERROR') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Filters & Export */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 w-full">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-sm font-black text-gray-600 whitespace-nowrap">VIEW MONTH:</label>
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border border-gray-200 rounded-lg p-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-50 uppercase w-full md:w-auto" />
          <button type="button" onClick={() => setSelectedMonth('')} className="text-xs font-bold text-blue-600 hover:underline whitespace-nowrap">CLEAR</button>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <label className="text-sm font-black text-gray-600">START:</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-gray-200 rounded-lg p-2 text-sm font-bold text-gray-900 uppercase" />
          <label className="text-sm font-black text-gray-600">END:</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-gray-200 rounded-lg p-2 text-sm font-bold text-gray-900 uppercase" />
          <button type="button" onClick={downloadExcel} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs py-2.5 px-4 rounded-lg transition-colors shadow-sm uppercase ml-auto md:ml-0">
            EXPORT EXCEL
          </button>
        </div>
      </div>

      {/* Full-width Search Bar */}
      <div className="relative mb-8 w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input 
          type="text" 
          placeholder="SEARCH ACTIVE COURIER LISTS, PATIENTS, SERIAL OR TRACKING CODES..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value.toUpperCase())} 
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-300 text-gray-900 placeholder-gray-500 text-sm font-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm transition-all bg-white uppercase" 
        />
      </div>

      {/* Full-width Tables */}
      <div className="w-full">
        {renderTable('IN TRANSIT & COMPLAINTS', pendingCouriers, <Package className="w-5 h-5 text-blue-600" />, 'text-blue-800', 'bg-blue-50/50')}
        {renderTable('COMPLETED & RETURNED', completedCouriers, <CheckCircle2 className="w-5 h-5 text-emerald-600" />, 'text-emerald-800', 'bg-emerald-50/50')}
      </div>

    </main>
  );
}