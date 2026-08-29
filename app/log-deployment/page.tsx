'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Activity, ArrowLeft, CheckCircle2, Calendar } from 'lucide-react';

export default function LogDeployment() {
  const [category, setCategory] = useState('sensor'); 
  const [products, setProducts] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [existingPatients, setExistingPatients] = useState<any[]>([]);
  
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  
  const [selectedProduct, setSelectedProduct] = useState(''); 
  const [doctorName, setDoctorName] = useState(''); 
  const [deploymentDate, setDeploymentDate] = useState('');
  const [quantity, setQuantity] = useState('1'); 
  const [weeklyDose, setWeeklyDose] = useState(''); 
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    async function fetchPatients() {
      const { data } = await supabase.from('patients').select('*');
      if (data) setExistingPatients(data);
    }
    fetchPatients();
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      let tableName = category === 'sensor' ? 'sensors' : category === 'injection' ? 'injections' : 'medtronic';
      const { data } = await supabase.from(tableName).select('*');
      if (data) {
        setProducts(data);
        setSelectedProduct(''); 
      }
    }
    fetchProducts();
  }, [category]);

  useEffect(() => {
    async function fetchDoctors() {
      const { data } = await supabase.from('doctors').select('*');
      if (data) setDoctors(data);
    }
    fetchDoctors();
  }, []);

  const handlePatientNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const typedName = e.target.value;
    setPatientName(typedName);

    const foundPatient = existingPatients.find(p => p.name.toLowerCase() === typedName.toLowerCase());
    
    if (foundPatient) {
      setPatientPhone(foundPatient.phone || '');
      setPatientEmail(foundPatient.email || ''); 
      
      const { data: pastDeploys } = await supabase
        .from('injection_deployments')
        .select('doctors(name)')
        .eq('patient_id', foundPatient.id)
        .order('deployment_date', { ascending: false })
        .limit(1);

      if (pastDeploys && pastDeploys.length > 0 && (pastDeploys[0] as any).doctors) {
        setDoctorName((pastDeploys[0] as any).doctors.name);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage('Calculating and saving...');

    const productObj = products.find(p => String(p.id) === selectedProduct);
    if (!productObj) return setStatusMessage('Error: Please select a product.');

    const qty = parseInt(quantity) || 1; 
    let daysToAdd = 0;

    let finalDoctorId = null;
    if (category === 'injection') {
      if (!weeklyDose) return setStatusMessage('Error: Weekly dose required.');
      if (!doctorName) return setStatusMessage('Error: Referring doctor required for injections.');
      
      const existingDoc = doctors.find(d => d.name.toLowerCase() === doctorName.toLowerCase());
      
      if (existingDoc) {
        finalDoctorId = existingDoc.id;
      } else {
        const { data: newDoc, error: docError } = await supabase.from('doctors').insert([{ name: doctorName }]).select().single();
        if (docError) return setStatusMessage('Error saving new doctor.');
        finalDoctorId = newDoc.id;
        setDoctors([...doctors, newDoc]); 
      }
      
      const totalMgBought = productObj.total_dose * qty;
      daysToAdd = Math.floor((totalMgBought / parseFloat(weeklyDose)) * 7);
    } else {
      daysToAdd = productObj.lifespan_days * qty;
    }

    const dateObj = new Date(deploymentDate);
    dateObj.setDate(dateObj.getDate() + daysToAdd);
    const dueDate = dateObj.toISOString().split('T')[0];

    let patientId;
    const existingPatient = existingPatients.find(p => p.name.toLowerCase() === patientName.toLowerCase());

    if (existingPatient) {
      patientId = existingPatient.id;
      if (existingPatient.phone !== patientPhone || existingPatient.email !== patientEmail) {
        await supabase.from('patients').update({ phone: patientPhone, email: patientEmail }).eq('id', patientId);
      }
    } else {
      const { data: newPatient, error: patientError } = await supabase.from('patients').insert([{ name: patientName, phone: patientPhone, email: patientEmail }]).select().single();
      if (patientError) return setStatusMessage('Error saving patient.');
      patientId = newPatient.id;
      setExistingPatients([...existingPatients, newPatient]);
    }

    let tableToUse = category === 'sensor' ? 'sensor_deployments' : category === 'injection' ? 'injection_deployments' : 'medtronic_deployments';
    let insertData: any = { patient_id: patientId, deployment_date: deploymentDate, due_date: dueDate, quantity: qty, is_completed: false };

    if (category === 'sensor') insertData.sensor_id = selectedProduct;
    if (category === 'injection') {
      insertData.injection_id = selectedProduct;
      insertData.weekly_dose = parseFloat(weeklyDose);
      insertData.doctor_id = finalDoctorId;
    }
    if (category === 'medtronic') insertData.medtronic_id = selectedProduct;

    const { error } = await supabase.from(tableToUse).insert([insertData]);

    if (error) {
      setStatusMessage('Error: ' + error.message);
    } else {
      setStatusMessage(`Perfect! Success: New deployment recorded successfully.`);
      setPatientName(''); setPatientPhone(''); setPatientEmail(''); setWeeklyDose(''); setQuantity('1'); setDoctorName('');
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f7f9] p-8 md:p-12 font-sans flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <header className="mb-8 flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg"><Activity className="text-white w-5 h-5" /></div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">Healthcare Dashboard</span>
          </div>
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </header>

        <div className="mb-8 w-full">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Log New Deployment</h1>
          <p className="text-gray-500 text-sm font-medium">Record medical device usage, referring physician and patient details.</p>
        </div>
        
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full">
          
          {/* Segmented Control */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-700 mb-2">Deployment Category</label>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button type="button" onClick={() => setCategory('sensor')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${category === 'sensor' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Sensor Deployment</button>
              <button type="button" onClick={() => setCategory('injection')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${category === 'injection' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Injection</button>
              <button type="button" onClick={() => setCategory('medtronic')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${category === 'medtronic' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Medtronic Pump</button>
            </div>
          </div>

          {statusMessage && (
            <div className={`p-4 rounded-xl mb-6 flex items-center gap-2 text-sm font-bold ${statusMessage.includes('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              <CheckCircle2 className="w-5 h-5"/> {statusMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-sm">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-gray-700 text-xs">Patient Name</label>
              <input list="patient-list" required placeholder="e.g. Eleanor Vance" value={patientName} onChange={handlePatientNameChange} className="border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
              <datalist id="patient-list">{existingPatients.map(p => <option key={p.id} value={p.name} />)}</datalist>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-gray-700 text-xs">Patient Phone</label>
              <input type="text" required placeholder="+1 (555) 234-5678" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} className="border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-gray-700 text-xs">Patient Email <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input type="email" placeholder="patient@example.com" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} className="border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
            </div>
            
            {category === 'injection' && (
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-gray-700 text-xs">Referring Doctor</label>
                <input list="doctor-list" required placeholder="Dr. Sarah Jenkins" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} className="border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
                <datalist id="doctor-list">{doctors.map(d => <option key={d.id} value={d.name} />)}</datalist>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-gray-700 text-xs">Product Dropdown</label>
              <select required value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white">
                <option value="" disabled>Select a {category} product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-1.5 w-1/2">
                <label className="font-semibold text-gray-700 text-xs">Quantity Assigned</label>
                <input type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} className="border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
              </div>
              {category === 'injection' && (
                <div className="flex flex-col gap-1.5 w-1/2">
                  <label className="font-semibold text-gray-700 text-xs">Weekly Dose</label>
                  <input type="number" step="any" required placeholder="e.g. 1.5" value={weeklyDose} onChange={(e) => setWeeklyDose(e.target.value)} className="border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5 relative">
              <label className="font-semibold text-gray-700 text-xs">Deployment Date</label>
              <input type="date" required value={deploymentDate} onChange={(e) => setDeploymentDate(e.target.value)} className="border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all w-full" />
            </div>
            
            <button type="submit" className="bg-[#0077b6] text-white font-bold py-3 mt-4 rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
              Save Deployment
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}