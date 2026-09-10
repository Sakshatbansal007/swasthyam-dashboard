'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Activity, ArrowLeft, Search, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function Complaints() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [existingPatients, setExistingPatients] = useState<any[]>([]);
  const [sensors, setSensors] = useState<any[]>([]);
  
  // Form States
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [area, setArea] = useState('');
  const [sensorName, setSensorName] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [workingDays, setWorkingDays] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [qty, setQty] = useState('1');
  const [sensorPic, setSensorPic] = useState('NO');
  
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // Fetch Complaints
    const { data: cData } = await supabase.from('complaints').select('*').order('created_at', { ascending: false });
    if (cData) setComplaints(cData);

    // Fetch Patients for Auto-fill
    const { data: pData } = await supabase.from('patients').select('*');
    if (pData) setExistingPatients(pData);

    // Fetch Sensors for Dropdown
    const { data: sData } = await supabase.from('sensors').select('*');
    if (sData) setSensors(sData);
  }

  const handlePatientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const typedName = e.target.value;
    setPatientName(typedName);

    const foundPatient = existingPatients.find(p => p.name.toLowerCase() === typedName.toLowerCase());
    if (foundPatient) {
      setPatientPhone(foundPatient.phone || '');
      setPatientEmail(foundPatient.email || '');
      setArea(foundPatient.area || '');
    } else {
      setPatientPhone('');
      setPatientEmail('');
      setArea('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage('SAVING COMPLAINT...');

    // Auto-save new patient if they don't exist
    let patientExists = existingPatients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
    if (!patientExists) {
      const { data: newP, error: pErr } = await supabase.from('patients').insert([{ name: patientName, phone: patientPhone, email: patientEmail, area }]).select().single();
      if (!pErr && newP) setExistingPatients([...existingPatients, newP]);
    } else if (patientExists.phone !== patientPhone || patientExists.email !== patientEmail || patientExists.area !== area) {
      await supabase.from('patients').update({ phone: patientPhone, email: patientEmail, area }).eq('id', patientExists.id);
    }

    const { error } = await supabase.from('complaints').insert([{ 
      patient_name: patientName, 
      phone: patientPhone, 
      email: patientEmail,
      area: area,
      sensor_name: sensorName,
      serial_no: serialNo,
      working_days: workingDays,
      error_code: errorCode,
      qty: qty,
      sensor_pic: sensorPic,
      step_1: 'NO',
      step_2: 'NO',
      step_3: 'NO',
      step_4: 'NO'
    }]);

    if (error) {
      setStatusMessage('ERROR: ' + error.message);
    } else {
      setStatusMessage('SUCCESS: COMPLAINT LOGGED.');
      setPatientName(''); setPatientPhone(''); setPatientEmail(''); setArea(''); 
      setSensorName(''); setSerialNo(''); setWorkingDays(''); setErrorCode(''); setQty('1'); setSensorPic('NO');
      fetchData(); 
    }
  };

  const updateStep = async (id: number, stepColumn: string, value: string) => {
    await supabase.from('complaints').update({ [stepColumn]: value }).eq('id', id);
    fetchData();
  };

  const filteredComplaints = complaints.filter(c => 
    c.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.serial_no && c.serial_no.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // LOGIC: If all steps are YES, it goes to Resolved Sheet
  const activeComplaints = filteredComplaints.filter(c => !(c.step_1 === 'YES' && c.step_2 === 'YES' && c.step_3 === 'YES' && c.step_4 === 'YES'));
  const resolvedComplaints = filteredComplaints.filter(c => c.step_1 === 'YES' && c.step_2 === 'YES' && c.step_3 === 'YES' && c.step_4 === 'YES');

  const renderTable = (title: string, data: any[], icon: any, colorClass: string, bgClass: string) => (
    <div className="mb-10">
      <div className={`flex items-center gap-2 p-5 rounded-t-xl border-b border-gray-100 ${bgClass}`}>
        {icon}
        <h3 className={`font-black text-base ${colorClass}`}>{title} ({data.length})</h3>
      </div>
      <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="p-4 text-sm font-black text-gray-800">Patient Details</th>
              <th className="p-4 text-sm font-black text-gray-800">Sensor Info</th>
              <th className="p-4 text-sm font-black text-gray-800 text-center">1: PT➔SWA</th>
              <th className="p-4 text-sm font-black text-gray-800 text-center">2: SWA➔CO</th>
              <th className="p-4 text-sm font-black text-gray-800 text-center">3: CO➔SWA</th>
              <th className="p-4 text-sm font-black text-gray-800 text-center">4: SWA➔PT</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-gray-400 font-bold">NO COMPLAINTS FOUND.</td></tr>
            ) : (
              data.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 odd:bg-white even:bg-gray-200 hover:bg-orange-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-black text-gray-900">{c.patient_name}</div>
                    <div className="text-xs font-bold text-gray-500 mt-0.5">{c.phone}</div>
                    <div className="text-xs font-bold text-gray-600 mt-0.5">{c.area || 'N/A'}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-black text-gray-900">{c.sensor_name} (QTY: {c.qty})</div>
                    <div className="text-xs font-bold text-gray-600 mt-0.5">SN: {c.serial_no} | ERR: {c.error_code}</div>
                    <div className="text-xs font-bold text-gray-500 mt-0.5">DAYS: {c.working_days} | PIC: <span className={c.sensor_pic === 'YES' ? 'text-green-600' : 'text-red-600'}>{c.sensor_pic}</span></div>
                  </td>
                  <td className="p-4 text-center">
                    <select value={c.step_1} onChange={(e) => updateStep(c.id, 'step_1', e.target.value)} className={`font-black text-xs py-2 px-3 rounded-lg border outline-none cursor-pointer ${c.step_1 === 'YES' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-white text-gray-600 border-gray-300'}`}>
                      <option value="NO">NO</option><option value="YES">YES</option>
                    </select>
                  </td>
                  <td className="p-4 text-center">
                    <select value={c.step_2} onChange={(e) => updateStep(c.id, 'step_2', e.target.value)} className={`font-black text-xs py-2 px-3 rounded-lg border outline-none cursor-pointer ${c.step_2 === 'YES' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-white text-gray-600 border-gray-300'}`}>
                      <option value="NO">NO</option><option value="YES">YES</option>
                    </select>
                  </td>
                  <td className="p-4 text-center">
                    <select value={c.step_3} onChange={(e) => updateStep(c.id, 'step_3', e.target.value)} className={`font-black text-xs py-2 px-3 rounded-lg border outline-none cursor-pointer ${c.step_3 === 'YES' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-white text-gray-600 border-gray-300'}`}>
                      <option value="NO">NO</option><option value="YES">YES</option>
                    </select>
                  </td>
                  <td className="p-4 text-center">
                    <select value={c.step_4} onChange={(e) => updateStep(c.id, 'step_4', e.target.value)} className={`font-black text-xs py-2 px-3 rounded-lg border outline-none cursor-pointer ${c.step_4 === 'YES' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-white text-gray-600 border-gray-300'}`}>
                      <option value="NO">NO</option><option value="YES">YES</option>
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

      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tighter">Sensor Complaints</h1>
        <p className="text-gray-500 text-base font-bold">Log sensor failures and track the 4-step replacement process.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Input Form */}
        <div className="col-span-1 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-2xl font-black text-gray-900 mb-6">Log New Complaint</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-sm font-bold">
            
            <div className="flex flex-col gap-2">
              <label className="font-black text-gray-700 text-sm">Patient Name</label>
              <input list="patient-list" required placeholder="E.G. JANE DOE" value={patientName} onChange={handlePatientNameChange} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
              <datalist id="patient-list">{existingPatients.map(p => <option key={p.id} value={p.name} />)}</datalist>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-2 w-1/2">
                <label className="font-black text-gray-700 text-sm">Phone No</label>
                <input type="text" required placeholder="+1 555-0000" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
              </div>
              <div className="flex flex-col gap-2 w-1/2">
                <label className="font-black text-gray-700 text-sm">Area</label>
                <input type="text" required placeholder="CITY/AREA" value={area} onChange={(e) => setArea(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-black text-gray-700 text-sm">Email ID <span className="text-gray-400 font-bold">(Optional)</span></label>
              <input type="email" placeholder="EMAIL@EXAMPLE.COM" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-black text-gray-700 text-sm">Sensor Company / Name</label>
              <select required value={sensorName} onChange={(e) => setSensorName(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white uppercase">
                <option value="" disabled>SELECT A SENSOR...</option>
                {sensors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-2 w-1/2">
                <label className="font-black text-gray-700 text-sm">Serial No</label>
                <input type="text" required placeholder="SN-12345" value={serialNo} onChange={(e) => setSerialNo(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
              </div>
              <div className="flex flex-col gap-2 w-1/2">
                <label className="font-black text-gray-700 text-sm">Error Code</label>
                <input type="text" required placeholder="E.G. ER-99" value={errorCode} onChange={(e) => setErrorCode(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-2 w-1/3">
                <label className="font-black text-gray-700 text-sm">Days</label>
                <input type="number" required placeholder="0" value={workingDays} onChange={(e) => setWorkingDays(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
              </div>
              <div className="flex flex-col gap-2 w-1/3">
                <label className="font-black text-gray-700 text-sm">Qty</label>
                <input type="number" min="1" required value={qty} onChange={(e) => setQty(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
              </div>
              <div className="flex flex-col gap-2 w-1/3">
                <label className="font-black text-gray-700 text-sm">Pic?</label>
                <select value={sensorPic} onChange={(e) => setSensorPic(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white uppercase">
                  <option value="NO">NO</option><option value="YES">YES</option>
                </select>
              </div>
            </div>
            
            <button type="submit" className="bg-[#0077b6] text-white font-black text-base py-4 mt-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm uppercase">
              SAVE COMPLAINT
            </button>
            {statusMessage && <div className={`p-4 rounded-lg flex items-center gap-2 text-sm font-black ${statusMessage.includes('ERROR') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}><CheckCircle2 className="w-5 h-5"/> {statusMessage}</div>}
          </form>
        </div>

        {/* Status Tables */}
        <div className="col-span-1 xl:col-span-2">
          
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-600" />
            <input 
              type="text" placeholder="SEARCH COMPLAINTS BY PATIENT NAME OR SERIAL NO..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-14 pr-4 py-4 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-600 text-sm font-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm transition-all bg-white uppercase" 
            />
          </div>

          {renderTable('ACTIVE COMPLAINTS', activeComplaints, <AlertTriangle className="w-5 h-5 text-orange-600" />, 'text-orange-800', 'bg-orange-50/50')}
          {renderTable('RESOLVED (ALL STEPS COMPLETED)', resolvedComplaints, <CheckCircle2 className="w-5 h-5 text-emerald-600" />, 'text-emerald-800', 'bg-emerald-50/50')}
          
        </div>

      </div>
    </main>
  );
}