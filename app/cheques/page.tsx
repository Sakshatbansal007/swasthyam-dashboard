'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Activity, ArrowLeft, Search, Landmark, CheckCircle2, Clock } from 'lucide-react';

export default function Cheques() {
  const [cheques, setCheques] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [existingPatients, setExistingPatients] = useState<any[]>([]);
  
  // Form States
  const [date, setDate] = useState('');
  const [chqNo, setChqNo] = useState('');
  const [bankName, setBankName] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dr, setDr] = useState('');
  const [cr, setCr] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('PENDING');
  
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: cData } = await supabase.from('cheques').select('*').order('created_at', { ascending: false });
    if (cData) setCheques(cData);

    const { data: pData } = await supabase.from('patients').select('*');
    if (pData) setExistingPatients(pData);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage('SAVING CHEQUE INFO...');

    const isDuplicate = cheques.some((c) => c.chq_no.toLowerCase() === chqNo.toLowerCase());
    if (isDuplicate) {
      return setStatusMessage('ERROR: CHEQUE NUMBER ALREADY EXISTS.');
    }

    const { error } = await supabase.from('cheques').insert([{ 
      date: date,
      chq_no: chqNo,
      bank_name: bankName.trim(),
      name: name,
      amount: amount,
      dr: dr,
      cr: cr,
      due_date: dueDate,
      status: status
    }]);

    if (error) {
      setStatusMessage('ERROR: ' + error.message);
    } else {
      setStatusMessage('SUCCESS: CHEQUE RECORDED.');
      setDate(''); setChqNo(''); setBankName(''); setName(''); setAmount(''); setDr(''); setCr(''); setDueDate(''); setStatus('PENDING');
      fetchData(); 
    }
  };

  const updateStatus = async (id: number, newStatus: string) => {
    await supabase.from('cheques').update({ status: newStatus }).eq('id', id);
    fetchData();
  };

  const filteredCheques = cheques.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.chq_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.bank_name && c.bank_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Split tables based on logic
  const pendingOrBankCheques = filteredCheques.filter(c => c.status === 'PENDING' || c.status === 'BANK');
  const swasthyamCheques = filteredCheques.filter(c => c.status === 'SWASTHYAM');

  const getStatusBadge = (currentStatus: string) => {
    if (currentStatus === 'SWASTHYAM') return "text-emerald-700 bg-emerald-100 border-emerald-300";
    if (currentStatus === 'BANK') return "text-blue-700 bg-blue-100 border-blue-300";
    return "text-amber-700 bg-amber-100 border-amber-300"; // PENDING
  };

  const renderTable = (title: string, data: any[], icon: any, colorClass: string, bgClass: string) => (
    <div className="mb-10">
      <div className={`flex items-center gap-2 p-5 rounded-t-xl border-b border-gray-100 ${bgClass}`}>
        {icon}
        <h3 className={`font-black text-base ${colorClass} uppercase`}>{title} ({data.length})</h3>
      </div>
      <div className="bg-white rounded-b-xl shadow-sm border border-t-0 border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="p-4 text-sm font-black text-gray-800 uppercase">Date</th>
              <th className="p-4 text-sm font-black text-gray-800 uppercase">CHQ No</th>
              <th className="p-4 text-sm font-black text-gray-800 uppercase">Bank Name</th>
              <th className="p-4 text-sm font-black text-gray-800 uppercase">Name</th>
              <th className="p-4 text-sm font-black text-gray-800 uppercase">Amount</th>
              <th className="p-4 text-sm font-black text-gray-800 uppercase">DR</th>
              <th className="p-4 text-sm font-black text-gray-800 uppercase">CR</th>
              <th className="p-4 text-sm font-black text-gray-800 uppercase">Due Date</th>
              <th className="p-4 text-sm font-black text-gray-800 uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={9} className="p-6 text-center text-gray-400 font-bold uppercase">NO CHEQUES FOUND.</td></tr>
            ) : (
              data.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 odd:bg-white even:bg-gray-200 hover:bg-violet-50/50 transition-colors">
                  <td className="p-4 font-bold text-gray-900">{c.date}</td>
                  <td className="p-4 font-black text-gray-900">{c.chq_no}</td>
                  <td className="p-4 font-bold text-gray-700 uppercase">{c.bank_name || '-'}</td>
                  <td className="p-4 font-black text-gray-900">{c.name}</td>
                  <td className="p-4 font-black text-gray-900">₹ {c.amount}</td>
                  <td className="p-4 font-bold text-gray-600">{c.dr || '-'}</td>
                  <td className="p-4 font-bold text-gray-600">{c.cr || '-'}</td>
                  <td className="p-4 font-bold text-red-600">{c.due_date}</td>
                  <td className="p-4">
                    <select 
                      value={c.status} 
                      onChange={(e) => updateStatus(c.id, e.target.value)}
                      className={`font-black uppercase text-xs py-2 px-3 rounded-lg border outline-none cursor-pointer ${getStatusBadge(c.status)}`}
                    >
                      <option value="PENDING" className="uppercase font-bold">PENDING</option>
                      <option value="BANK" className="uppercase font-bold">BANK</option>
                      <option value="SWASTHYAM" className="uppercase font-bold">SWASTHYAM</option>
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
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tighter">CHQ Information</h1>
        <p className="text-gray-500 text-base font-bold">Log cheques, manage bank deposits, and track Swasthyam clearance.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Input Form */}
        <div className="col-span-1 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-violet-600" /> Log New Cheque
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-sm font-bold">
            
            <div className="flex flex-col gap-2">
              <label className="font-black text-gray-700 text-sm uppercase">Date</label>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-2 w-1/2">
                <label className="font-black text-gray-700 text-sm uppercase">CHQ No</label>
                <input type="text" required placeholder="000123456" value={chqNo} onChange={(e) => setChqNo(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase font-black" />
              </div>
              <div className="flex flex-col gap-2 w-1/2">
                <label className="font-black text-gray-700 text-sm uppercase">Bank Name</label>
                <input type="text" placeholder="E.G. HDFC / SBI" value={bankName} onChange={(e) => setBankName(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase font-bold" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-black text-gray-700 text-sm uppercase">Name</label>
              <input list="patient-list" required placeholder="E.G. JANE DOE" value={name} onChange={(e) => setName(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
              <datalist id="patient-list">{existingPatients.map(p => <option key={p.id} value={p.name} />)}</datalist>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-black text-gray-700 text-sm uppercase">Amount</label>
              <input type="number" required placeholder="5000" value={amount} onChange={(e) => setAmount(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-2 w-1/2">
                <label className="font-black text-gray-700 text-sm uppercase">DR</label>
                <input type="text" placeholder="DEBIT INFO" value={dr} onChange={(e) => setDr(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
              </div>
              <div className="flex flex-col gap-2 w-1/2">
                <label className="font-black text-gray-700 text-sm uppercase">CR</label>
                <input type="text" placeholder="CREDIT INFO" value={cr} onChange={(e) => setCr(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-2 w-1/2">
                <label className="font-black text-gray-700 text-sm uppercase">Due Date</label>
                <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
              </div>
              <div className="flex flex-col gap-2 w-1/2">
                <label className="font-black text-gray-700 text-sm uppercase">Status</label>
                <select required value={status} onChange={(e) => setStatus(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white uppercase font-black">
                  <option value="PENDING" className="uppercase font-bold">PENDING</option>
                  <option value="BANK" className="uppercase font-bold">BANK</option>
                  <option value="SWASTHYAM" className="uppercase font-bold">SWASTHYAM</option>
                </select>
              </div>
            </div>
            
            <button type="submit" className="bg-[#0077b6] text-white font-black text-base py-4 mt-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm uppercase">
              SAVE CHEQUE
            </button>
            {statusMessage && <div className={`p-4 rounded-lg flex items-center gap-2 text-sm font-black ${statusMessage.includes('ERROR') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}><CheckCircle2 className="w-5 h-5"/> {statusMessage}</div>}
          </form>
        </div>

        {/* Status Tables */}
        <div className="col-span-1 xl:col-span-2">
          
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-600" />
            <input 
              type="text" placeholder="SEARCH CHEQUES BY NAME, BANK OR CHQ NO..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-14 pr-4 py-4 rounded-xl border border-gray-300 text-gray-900 placeholder-gray-600 text-sm font-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm transition-all bg-white uppercase" 
            />
          </div>

          {/* Table 1: PENDING & BANK */}
          {renderTable('PENDING & BANK CHEQUES', pendingOrBankCheques, <Clock className="w-5 h-5 text-amber-600" />, 'text-amber-800', 'bg-amber-50/50')}
          
          {/* Table 2: SWASTHYAM */}
          {renderTable('SWASTHYAM (CLEARED)', swasthyamCheques, <CheckCircle2 className="w-5 h-5 text-emerald-600" />, 'text-emerald-800', 'bg-emerald-50/50')}
          
        </div>

      </div>
    </main>
  );
}