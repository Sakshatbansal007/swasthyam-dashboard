'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Activity, ArrowLeft, Search, UserPlus, Users, CheckCircle2 } from 'lucide-react';

export default function PatientsDirectory() {
  const [patients, setPatients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Inquiry Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [area, setArea] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  async function fetchPatients() {
    // Fetching all patients, including their latest injection deployment to get the referred doctor if they have one
    const { data: patientList } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: doctorLinks } = await supabase
      .from('injection_deployments')
      .select('patient_id, doctors(name)')
      .order('deployment_date', { ascending: false });

    if (patientList) {
      // Remove repeated names (case-insensitive)
      const uniquePatients: any[] = [];
      const seen = new Set();

      for (const p of patientList) {
        const lowerName = p.name.toLowerCase().trim();
        if (!seen.has(lowerName)) {
          
          // Attach doctor name if they bought an injection in the past
          let referredDoc = 'N/A';
          if (doctorLinks) {
            const docMatch = doctorLinks.find((d: any) => d.patient_id === p.id && d.doctors);
            if (docMatch && (docMatch as any).doctors) {
              referredDoc = (docMatch as any).doctors.name;
            }
          }

          seen.add(lowerName);
          uniquePatients.push({ ...p, referred_doctor: referredDoc });
        }
      }
      setPatients(uniquePatients);
    }
  }

  const handleSaveInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage('SAVING INQUIRY...');

    // Check if patient already exists to prevent manual duplicates
    const exists = patients.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      return setStatusMessage('ERROR: A PATIENT WITH THIS NAME ALREADY EXISTS.');
    }

    const { error } = await supabase.from('patients').insert([{ 
      name: name, 
      phone: phone, 
      email: email, 
      area: area 
    }]);

    if (error) {
      setStatusMessage('ERROR: ' + error.message);
    } else {
      setStatusMessage('SUCCESS: INQUIRY SAVED. THEY WILL NOW APPEAR IN AUTO-FILL!');
      setName(''); setPhone(''); setEmail(''); setArea('');
      fetchPatients(); // Refresh list
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.phone && p.phone.includes(searchQuery))
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
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tighter">Patients Directory</h1>
        <p className="text-gray-500 text-base font-bold">Manage existing patients and log new inquiries for future auto-fill.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Inquiry Form */}
        <div className="col-span-1 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-blue-600" /> Log New Inquiry
          </h2>
          <form onSubmit={handleSaveInquiry} className="flex flex-col gap-5 text-sm font-bold">
            
            <div className="flex flex-col gap-2">
              <label className="font-black text-gray-700 text-sm">Patient Name</label>
              <input type="text" required placeholder="E.G. JOHN DOE" value={name} onChange={(e) => setName(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-black text-gray-700 text-sm">Phone Number</label>
              <input type="text" required placeholder="+1 (555) 000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-black text-gray-700 text-sm">Area / City</label>
              <input type="text" required placeholder="E.G. SOUTH SIDE" value={area} onChange={(e) => setArea(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-black text-gray-700 text-sm">Email <span className="text-gray-400 font-bold">(Optional)</span></label>
              <input type="email" placeholder="PATIENT@EXAMPLE.COM" value={email} onChange={(e) => setEmail(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
            </div>
            
            <button type="submit" className="bg-[#0077b6] text-white font-black text-base py-4 mt-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              SAVE TO DATABASE
            </button>
            {statusMessage && <div className={`p-4 rounded-lg flex items-center gap-2 text-sm font-black ${statusMessage.includes('ERROR') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}><CheckCircle2 className="w-5 h-5"/> {statusMessage}</div>}
          </form>
        </div>

        {/* Master Database Table */}
        <div className="col-span-1 lg:col-span-2">
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" placeholder="SEARCH ALL PATIENTS BY NAME OR PHONE..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 text-sm font-bold focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 shadow-sm transition-all uppercase" 
            />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-2 p-5 border-b border-gray-100 bg-blue-50/50">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="font-black text-base text-blue-800">MASTER PATIENT LIST ({filteredPatients.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="p-4 text-sm font-black text-gray-800">Patient Name</th>
                    <th className="p-4 text-sm font-black text-gray-800">Contact Info</th>
                    <th className="p-4 text-sm font-black text-gray-800">Area</th>
                    <th className="p-4 text-sm font-black text-gray-800">Referred By (History)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.length === 0 ? (
                    <tr><td colSpan={4} className="p-6 text-center text-gray-400 font-bold">NO PATIENTS FOUND.</td></tr>
                  ) : (
                    filteredPatients.map((p, i) => (
                      <tr key={i} className="border-b border-gray-100 odd:bg-white even:bg-gray-200 hover:bg-blue-50/50 transition-colors">
                        <td className="p-4 font-black text-gray-900">{p.name}</td>
                        <td className="p-4">
                          <div className="font-bold text-gray-900">{p.phone || 'N/A'}</div>
                          <div className="text-xs font-bold text-gray-500 mt-0.5">{p.email || 'NO EMAIL'}</div>
                        </td>
                        <td className="p-4 font-bold text-gray-600">{p.area || 'N/A'}</td>
                        <td className="p-4 font-bold text-gray-500">{p.referred_doctor}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}