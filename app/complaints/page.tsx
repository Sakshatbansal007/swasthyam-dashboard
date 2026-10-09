'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Activity, ArrowLeft, Search, AlertTriangle, CheckCircle2, Download, Upload, X, FileSpreadsheet, Check } from 'lucide-react';

export default function Complaints() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [existingPatients, setExistingPatients] = useState<any[]>([]);
  const [sensors, setSensors] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  
  // Separate date ranges for each table
  const [activeStartDate, setActiveStartDate] = useState('');
  const [activeEndDate, setActiveEndDate] = useState('');
  const [resolvedStartDate, setResolvedStartDate] = useState('');
  const [resolvedEndDate, setResolvedEndDate] = useState('');
  
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

  // Excel Range Import Modal States
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importTarget, setImportTarget] = useState<'active' | 'resolved'>('active');
  const [importRawText, setImportRawText] = useState('');
  const [parsedImportRows, setParsedImportRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

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
    const typedName = e.target.value.toUpperCase();
    setPatientName(typedName);

    const foundPatient = existingPatients.find(p => p.name.toUpperCase() === typedName);
    if (foundPatient) {
      setPatientPhone((foundPatient.phone || '').toUpperCase());
      setPatientEmail((foundPatient.email || '').toUpperCase());
      setArea((foundPatient.area || '').toUpperCase());
    } else {
      setPatientPhone('');
      setPatientEmail('');
      setArea('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage('SAVING COMPLAINT...');

    const upperName = patientName.trim().toUpperCase();
    const upperPhone = patientPhone.trim().toUpperCase();
    const upperEmail = patientEmail.trim().toUpperCase();
    const upperArea = area.trim().toUpperCase();
    const upperSensor = sensorName.trim().toUpperCase();
    const upperSerial = serialNo.trim().toUpperCase();
    const upperError = errorCode.trim().toUpperCase();
    const upperPic = sensorPic.trim().toUpperCase();

    // Auto-save new patient if they don't exist
    let patientExists = existingPatients.find(p => p.name.toUpperCase() === upperName);
    if (!patientExists) {
      const { data: newP, error: pErr } = await supabase.from('patients').insert([{ name: upperName, phone: upperPhone, email: upperEmail, area: upperArea }]).select().single();
      if (!pErr && newP) setExistingPatients([...existingPatients, newP]);
    } else if (patientExists.phone !== upperPhone || patientExists.email !== upperEmail || patientExists.area !== upperArea) {
      await supabase.from('patients').update({ phone: upperPhone, email: upperEmail, area: upperArea }).eq('id', patientExists.id);
    }

    const { error } = await supabase.from('complaints').insert([{ 
      patient_name: upperName, 
      phone: upperPhone, 
      email: upperEmail,
      area: upperArea,
      sensor_name: upperSensor,
      serial_no: upperSerial,
      working_days: workingDays,
      error_code: upperError,
      qty: qty,
      sensor_pic: upperPic,
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

  const downloadTableExcel = (type: 'active' | 'resolved') => {
    const isResolved = type === 'resolved';
    let data = isResolved ? resolvedComplaints : activeComplaints;
    const sDate = isResolved ? resolvedStartDate : activeStartDate;
    const eDate = isResolved ? resolvedEndDate : activeEndDate;

    if (sDate) data = data.filter(c => new Date(c.created_at) >= new Date(sDate));
    if (eDate) data = data.filter(c => new Date(c.created_at) <= new Date(eDate));

    if (data.length === 0) {
      return alert(`NO ${isResolved ? 'RESOLVED (ALL 4 YES)' : 'ACTIVE / PENDING'} COMPLAINTS FOUND IN THIS DATE RANGE.`);
    }

    const headers = "Date,Patient,Phone,Area,Sensor,Serial No,Error Code,Days,Qty,Pic,Step 1,Step 2,Step 3,Step 4\n";
    const rows = data.map(c => `"${new Date(c.created_at).toLocaleDateString()}","${c.patient_name}","${c.phone || ''}","${c.area || ''}","${c.sensor_name}","${c.serial_no || ''}","${c.error_code}","${c.working_days}","${c.qty}","${c.sensor_pic}","${c.step_1}","${c.step_2}","${c.step_3}","${c.step_4}"`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${isResolved ? 'Resolved_All_4_YES' : 'Pending'}_Complaints_${sDate || 'Start'}_to_${eDate || 'End'}.csv`;
    a.click();
  };

  // Excel Range Parser Function
  const parseRangeData = (text: string) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const results: any[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Split by tab (standard for Excel copy-paste) or comma
      const cols = line.includes('\t') 
        ? line.split('\t').map(c => c.trim()) 
        : line.split(',').map(c => c.replace(/^["']|["']$/g, '').trim());

      const firstColLower = cols[0]?.toLowerCase() || '';
      // Skip header row if present
      if (i === 0 && (firstColLower.includes('patient') || firstColLower.includes('date') || firstColLower.includes('name') || firstColLower.includes('sensor'))) {
        continue;
      }

      const looksLikeDate = /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(cols[0]);

      let pName = '';
      let pPhone = '';
      let pArea = '';
      let sName = '';
      let sSerial = '';
      let sError = '';
      let sDays = '0';
      let sQty = '1';
      let sPic = 'NO';
      let pEmail = '';

      if (looksLikeDate) {
        pName = cols[1] || '';
        pPhone = cols[2] || '';
        pArea = cols[3] || '';
        sName = cols[4] || '';
        sSerial = cols[5] || '';
        sError = cols[6] || '';
        sDays = cols[7] || '0';
        sQty = cols[8] || '1';
        sPic = (cols[9] || 'NO').toUpperCase();
        pEmail = cols[10] || '';
      } else {
        pName = cols[0] || '';
        pPhone = cols[1] || '';
        pArea = cols[2] || '';
        sName = cols[3] || '';
        sSerial = cols[4] || '';
        sError = cols[5] || '';
        sDays = cols[6] || '0';
        sQty = cols[7] || '1';
        sPic = (cols[8] || 'NO').toUpperCase();
        pEmail = cols[9] || '';
      }

      if (pName || sName || sSerial) {
        results.push({
          patient_name: pName.toUpperCase(),
          phone: pPhone.toUpperCase(),
          area: pArea.toUpperCase(),
          sensor_name: sName.toUpperCase(),
          serial_no: sSerial.toUpperCase(),
          error_code: sError.toUpperCase(),
          working_days: sDays,
          qty: sQty || '1',
          sensor_pic: sPic === 'YES' ? 'YES' : 'NO',
          email: pEmail.toUpperCase()
        });
      }
    }

    return results;
  };

  const handleRawTextChange = (text: string) => {
    setImportRawText(text);
    const parsed = parseRangeData(text);
    setParsedImportRows(parsed);
    setImportError('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleRawTextChange(content);
      }
    };
    reader.readAsText(file);
  };

  const openImportModal = (target: 'active' | 'resolved') => {
    setImportTarget(target);
    setImportRawText('');
    setParsedImportRows([]);
    setImportError('');
    setImportSuccess('');
    setImportModalOpen(true);
  };

  const handleExecuteImport = async () => {
    if (parsedImportRows.length === 0) {
      return setImportError('ERROR: NO VALID ROWS FOUND TO IMPORT.');
    }

    setImporting(true);
    setImportError('');
    
    try {
      const stepVal = importTarget === 'resolved' ? 'YES' : 'NO';
      const payload = parsedImportRows.map(row => ({
        patient_name: row.patient_name,
        phone: row.phone,
        email: row.email,
        area: row.area,
        sensor_name: row.sensor_name,
        serial_no: row.serial_no,
        error_code: row.error_code,
        working_days: row.working_days,
        qty: row.qty,
        sensor_pic: row.sensor_pic,
        step_1: stepVal,
        step_2: stepVal,
        step_3: stepVal,
        step_4: stepVal
      }));

      const { error: insertErr } = await supabase.from('complaints').insert(payload);
      if (insertErr) throw insertErr;

      // Auto-save patients to patients table in background
      for (const r of parsedImportRows) {
        if (r.patient_name) {
          const found = existingPatients.find(p => p.name.toUpperCase() === r.patient_name);
          if (!found) {
            await supabase.from('patients').insert([{
              name: r.patient_name,
              phone: r.phone,
              area: r.area,
              email: r.email
            }]);
          }
        }
      }

      setImportSuccess(`SUCCESS: IMPORTED ${payload.length} RECORDS INTO ${importTarget === 'resolved' ? 'ALL 4 YES (RESOLVED)' : 'PENDING COMPLAINTS'}!`);
      fetchData();
      
      setTimeout(() => {
        setImportModalOpen(false);
        setParsedImportRows([]);
        setImportRawText('');
        setImportSuccess('');
      }, 1500);
    } catch (err: any) {
      setImportError(`ERROR: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = (c.patient_name || '').toUpperCase().includes(searchQuery.toUpperCase()) || ((c.serial_no || '').toUpperCase().includes(searchQuery.toUpperCase()));
    const matchesMonth = selectedMonth ? c.created_at?.startsWith(selectedMonth) : true;
    return matchesSearch && matchesMonth;
  });

  // LOGIC: If all steps are YES, it goes to Resolved Sheet
  const activeComplaints = filteredComplaints.filter(c => !(c.step_1 === 'YES' && c.step_2 === 'YES' && c.step_3 === 'YES' && c.step_4 === 'YES'));
  const resolvedComplaints = filteredComplaints.filter(c => c.step_1 === 'YES' && c.step_2 === 'YES' && c.step_3 === 'YES' && c.step_4 === 'YES');

  const renderTable = (title: string, data: any[], icon: any, colorClass: string, bgClass: string, type: 'active' | 'resolved') => {
    const isResolved = type === 'resolved';
    const sDate = isResolved ? resolvedStartDate : activeStartDate;
    const setSDate = isResolved ? setResolvedStartDate : setActiveStartDate;
    const eDate = isResolved ? resolvedEndDate : activeEndDate;
    const setEDate = isResolved ? setResolvedEndDate : setActiveEndDate;

    return (
      <div className="mb-10">
        <div className={`flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 p-5 rounded-t-xl border-b border-gray-100 ${bgClass}`}>
          <div className="flex items-center gap-2">
            {icon}
            <h3 className={`font-black text-base ${colorClass}`}>{title} ({data.length})</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 shadow-xs">
              <span className="text-xs font-black text-gray-500 uppercase">START:</span>
              <input 
                type="date" 
                value={sDate} 
                onChange={(e) => setSDate(e.target.value)} 
                className="text-xs font-bold text-gray-900 outline-none bg-transparent uppercase" 
              />
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 shadow-xs">
              <span className="text-xs font-black text-gray-500 uppercase">END:</span>
              <input 
                type="date" 
                value={eDate} 
                onChange={(e) => setEDate(e.target.value)} 
                className="text-xs font-bold text-gray-900 outline-none bg-transparent uppercase" 
              />
            </div>

            <button 
              type="button" 
              onClick={() => downloadTableExcel(type)} 
              title={`Export ${title} to Excel`}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2 px-3 rounded-lg transition-colors shadow-sm uppercase cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> EXPORT EXCEL
            </button>

            <button 
              type="button" 
              onClick={() => openImportModal(type)} 
              title={`Import Excel range into ${title}`}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2 px-3 rounded-lg transition-colors shadow-sm uppercase cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> IMPORT EXCEL RANGE
            </button>
          </div>
        </div>

        <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-100 overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="p-4 text-sm font-black text-gray-800">Date</th>
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
                <tr><td colSpan={7} className="p-6 text-center text-gray-400 font-bold">NO COMPLAINTS FOUND.</td></tr>
              ) : (
                data.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 odd:bg-white even:bg-gray-200 hover:bg-orange-50/50 transition-colors">
                    <td className="p-4 font-bold text-gray-600">{new Date(c.created_at).toLocaleDateString()}</td>
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
                      <select value={c.step_1} onChange={(e) => updateStep(c.id, 'step_1', e.target.value)} className={`font-black text-xs py-2 px-3 rounded-lg border outline-none cursor-pointer uppercase ${c.step_1 === 'YES' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-white text-gray-600 border-gray-300'}`}>
                        <option value="NO" className="uppercase font-bold">NO</option><option value="YES" className="uppercase font-bold">YES</option>
                      </select>
                    </td>
                    <td className="p-4 text-center">
                      <select value={c.step_2} onChange={(e) => updateStep(c.id, 'step_2', e.target.value)} className={`font-black text-xs py-2 px-3 rounded-lg border outline-none cursor-pointer uppercase ${c.step_2 === 'YES' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-white text-gray-600 border-gray-300'}`}>
                        <option value="NO" className="uppercase font-bold">NO</option><option value="YES" className="uppercase font-bold">YES</option>
                      </select>
                    </td>
                    <td className="p-4 text-center">
                      <select value={c.step_3} onChange={(e) => updateStep(c.id, 'step_3', e.target.value)} className={`font-black text-xs py-2 px-3 rounded-lg border outline-none cursor-pointer uppercase ${c.step_3 === 'YES' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-white text-gray-600 border-gray-300'}`}>
                        <option value="NO" className="uppercase font-bold">NO</option><option value="YES" className="uppercase font-bold">YES</option>
                      </select>
                    </td>
                    <td className="p-4 text-center">
                      <select value={c.step_4} onChange={(e) => updateStep(c.id, 'step_4', e.target.value)} className={`font-black text-xs py-2 px-3 rounded-lg border outline-none cursor-pointer uppercase ${c.step_4 === 'YES' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-white text-gray-600 border-gray-300'}`}>
                        <option value="NO" className="uppercase font-bold">NO</option><option value="YES" className="uppercase font-bold">YES</option>
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
  };

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
        <p className="text-gray-500 text-base font-bold">Log sensor failures, track 4-step replacements, and import/export Excel ranges per table.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Input Form */}
        <div className="col-span-1 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-2xl font-black text-gray-900 mb-6">Log New Complaint</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-sm font-bold">
            
            <div className="flex flex-col gap-2">
              <label className="font-black text-gray-700 text-sm">Patient Name</label>
              <input 
                list="patient-list" required placeholder="E.G. JANE DOE" 
                value={patientName} onChange={handlePatientNameChange} 
                className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" 
              />
              <datalist id="patient-list">{existingPatients.map(p => <option key={p.id} value={p.name} />)}</datalist>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-2 w-1/2">
                <label className="font-black text-gray-700 text-sm">Phone No</label>
                <input 
                  type="text" required placeholder="+1 555-0000" 
                  value={patientPhone} onChange={(e) => setPatientPhone(e.target.value.toUpperCase())} 
                  className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" 
                />
              </div>
              <div className="flex flex-col gap-2 w-1/2">
                <label className="font-black text-gray-700 text-sm">Area</label>
                <input 
                  type="text" required placeholder="CITY/AREA" 
                  value={area} onChange={(e) => setArea(e.target.value.toUpperCase())} 
                  className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" 
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-black text-gray-700 text-sm">Email ID <span className="text-gray-400 font-bold">(Optional)</span></label>
              <input 
                type="email" placeholder="EMAIL@EXAMPLE.COM" 
                value={patientEmail} onChange={(e) => setPatientEmail(e.target.value.toUpperCase())} 
                className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-black text-gray-700 text-sm">Sensor Company / Name</label>
              <select required value={sensorName} onChange={(e) => setSensorName(e.target.value.toUpperCase())} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white uppercase font-bold">
                <option value="" disabled className="uppercase font-bold">SELECT A SENSOR...</option>
                {sensors.map(s => <option key={s.id} value={(s.name || '').toUpperCase()} className="uppercase font-bold">{(s.name || '').toUpperCase()}</option>)}
              </select>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-2 w-1/2">
                <label className="font-black text-gray-700 text-sm">Serial No <span className="text-gray-400 font-bold">(Optional)</span></label>
                <input 
                  type="text" placeholder="SN-12345" 
                  value={serialNo} onChange={(e) => setSerialNo(e.target.value.toUpperCase())} 
                  className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" 
                />
              </div>
              <div className="flex flex-col gap-2 w-1/2">
                <label className="font-black text-gray-700 text-sm">Error Code</label>
                <input 
                  type="text" required placeholder="E.G. ER-99" 
                  value={errorCode} onChange={(e) => setErrorCode(e.target.value.toUpperCase())} 
                  className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" 
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-2 w-1/3">
                <label className="font-black text-gray-700 text-sm">Days</label>
                <input 
                  type="number" required placeholder="0" 
                  value={workingDays} onChange={(e) => setWorkingDays(e.target.value)} 
                  className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" 
                />
              </div>
              <div className="flex flex-col gap-2 w-1/3">
                <label className="font-black text-gray-700 text-sm">Qty</label>
                <input 
                  type="number" min="1" required 
                  value={qty} onChange={(e) => setQty(e.target.value)} 
                  className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" 
                />
              </div>
              <div className="flex flex-col gap-2 w-1/3">
                <label className="font-black text-gray-700 text-sm">Pic?</label>
                <select value={sensorPic} onChange={(e) => setSensorPic(e.target.value.toUpperCase())} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white uppercase font-bold">
                  <option value="NO" className="uppercase font-bold">NO</option>
                  <option value="YES" className="uppercase font-bold">YES</option>
                </select>
              </div>
            </div>
            
            <button type="submit" className="bg-[#0077b6] text-white font-black text-base py-4 mt-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm uppercase cursor-pointer">
              SAVE COMPLAINT
            </button>
            {statusMessage && <div className={`p-4 rounded-lg flex items-center gap-2 text-sm font-black ${statusMessage.includes('ERROR') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}><CheckCircle2 className="w-5 h-5"/> {statusMessage}</div>}
          </form>
        </div>

        {/* Status Tables */}
        <div className="col-span-1 xl:col-span-2">
          
          <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="text-sm font-black text-gray-600 whitespace-nowrap">VIEW MONTH:</label>
              <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border border-gray-200 rounded-lg p-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-50 uppercase w-full md:w-auto" />
              <button type="button" onClick={() => setSelectedMonth('')} className="text-xs font-bold text-blue-600 hover:underline whitespace-nowrap uppercase cursor-pointer">CLEAR</button>
            </div>
            <div className="text-xs font-black text-gray-500 uppercase">
              TOTAL: {filteredComplaints.length} ({activeComplaints.length} PENDING, {resolvedComplaints.length} RESOLVED)
            </div>
          </div>

          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-600" />
            <input 
              type="text" placeholder="SEARCH COMPLAINTS BY PATIENT NAME OR SERIAL NO..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value.toUpperCase())} 
              className="w-full pl-14 pr-4 py-4 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-600 text-sm font-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm transition-all bg-white uppercase" 
            />
          </div>

          {renderTable('ACTIVE / PENDING COMPLAINTS', activeComplaints, <AlertTriangle className="w-5 h-5 text-orange-600" />, 'text-orange-800', 'bg-orange-50/50', 'active')}
          {renderTable('RESOLVED (ALL 4 YES TABLE)', resolvedComplaints, <CheckCircle2 className="w-5 h-5 text-emerald-600" />, 'text-emerald-800', 'bg-emerald-50/50', 'resolved')}
          
        </div>

      </div>

      {/* Excel Range Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-blue-50/40">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white p-2 rounded-xl">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase">
                    Import Excel Range
                  </h3>
                  <p className="text-xs font-bold text-gray-500 uppercase mt-0.5">
                    Target: <span className="font-black text-blue-700">{importTarget === 'resolved' ? 'ALL 4 YES TABLE (ALL 4 STEPS = YES)' : 'ACTIVE PENDING TABLE (ALL 4 STEPS = NO)'}</span>
                  </p>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => setImportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-grow flex flex-col gap-5">
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs font-bold text-amber-900 leading-relaxed uppercase">
                <span className="font-black">💡 How to import:</span> Select and copy rows directly from your Excel spreadsheet (or CSV) and paste below.
                <div className="mt-1 font-mono text-[11px] text-amber-800">
                  Expected Column Order: PATIENT NAME | PHONE | AREA | SENSOR | SERIAL NO | ERROR CODE | DAYS | QTY | PIC (YES/NO) | EMAIL
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-gray-700 uppercase">Paste Excel Range (Tab or Comma Separated)</label>
                  <label className="text-xs font-black text-blue-600 hover:text-blue-800 cursor-pointer flex items-center gap-1 uppercase">
                    <Upload className="w-3.5 h-3.5" /> Or Upload CSV / TSV File
                    <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                <textarea
                  rows={5}
                  value={importRawText}
                  onChange={(e) => handleRawTextChange(e.target.value)}
                  placeholder={`PASTE ROWS FROM EXCEL HERE...\nE.G:\nARIA MONTGOMERY\t9876543210\tMUMBAI\tFREESTYLE LIBRE\tSN-1029\tER-01\t14\t1\tYES`}
                  className="w-full border border-gray-300 rounded-xl p-3 font-mono text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 uppercase leading-relaxed resize-none"
                />
              </div>

              {/* Parsed Preview Table */}
              {parsedImportRows.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-gray-700 uppercase">
                      Detected Rows ({parsedImportRows.length}):
                    </span>
                    <span className="text-xs font-black text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ✓ Ready to import (ALL TEXT IN CAPITAL)
                    </span>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-x-auto max-h-56">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-gray-100 border-b border-gray-200 sticky top-0 font-black text-gray-700 uppercase">
                        <tr>
                          <th className="p-2.5">#</th>
                          <th className="p-2.5">Patient</th>
                          <th className="p-2.5">Phone</th>
                          <th className="p-2.5">Area</th>
                          <th className="p-2.5">Sensor</th>
                          <th className="p-2.5">Serial</th>
                          <th className="p-2.5">Error</th>
                          <th className="p-2.5">Days</th>
                          <th className="p-2.5">Qty</th>
                          <th className="p-2.5">Pic</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-bold uppercase text-gray-800">
                        {parsedImportRows.map((r, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/50">
                            <td className="p-2.5 text-gray-400">{idx + 1}</td>
                            <td className="p-2.5 font-black text-gray-900">{r.patient_name || '-'}</td>
                            <td className="p-2.5">{r.phone || '-'}</td>
                            <td className="p-2.5">{r.area || '-'}</td>
                            <td className="p-2.5">{r.sensor_name || '-'}</td>
                            <td className="p-2.5">{r.serial_no || '-'}</td>
                            <td className="p-2.5">{r.error_code || '-'}</td>
                            <td className="p-2.5">{r.working_days || '0'}</td>
                            <td className="p-2.5">{r.qty || '1'}</td>
                            <td className="p-2.5">{r.sensor_pic}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-black text-red-700 uppercase">
                  {importError}
                </div>
              )}

              {importSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs font-black text-green-700 flex items-center gap-2 uppercase">
                  <Check className="w-4 h-4" /> {importSuccess}
                </div>
              )}

            </div>

            <div className="p-5 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-300 font-black text-xs text-gray-700 hover:bg-gray-100 transition-colors uppercase cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={parsedImportRows.length === 0 || importing}
                onClick={handleExecuteImport}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-black text-xs transition-colors shadow-sm uppercase flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {importing ? 'IMPORTING...' : `CONFIRM & IMPORT ${parsedImportRows.length} ROWS`}
              </button>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}