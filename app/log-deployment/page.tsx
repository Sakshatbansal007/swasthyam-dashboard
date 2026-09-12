'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Activity, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function LogDeployment() {
  const [category, setCategory] = useState('sensor'); 
  const [products, setProducts] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [existingPatients, setExistingPatients] = useState<any[]>([]);
  
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [area, setArea] = useState('');
  
  const [selectedProduct, setSelectedProduct] = useState(''); 
  const [doctorName, setDoctorName] = useState(''); 
  const [deploymentDate, setDeploymentDate] = useState('');
  const [quantity, setQuantity] = useState('1'); 
  const [weeklyDose, setWeeklyDose] = useState(''); 
  const [needles, setNeedles] = useState<number | ''>('');
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

  // EXACT MATCH LOGIC: PFIZER 60MG
  useEffect(() => {
    if (category === 'injection' && selectedProduct && quantity && weeklyDose) {
      const productObj = products.find(p => String(p.id) === selectedProduct);
      if (productObj) {
        const qty = parseInt(quantity) || 1;
        const totalMgBought = productObj.total_dose * qty;
        const daysToAdd = Math.floor((totalMgBought / parseFloat(weeklyDose)) * 7);
        
        let calculatedNeedles = daysToAdd;
        
        // Converts to lowercase and checks for the exact database string
        const productName = (productObj.name || '').toLowerCase().trim();
        if (productName.includes('pfizer 60mg') || productName.includes('60mg')) {
          calculatedNeedles = Math.floor(calculatedNeedles / 7);
        }
        
        setNeedles(calculatedNeedles);
      }
    } else {
      setNeedles('');
    }
  }, [category, selectedProduct, quantity, weeklyDose, products]);

  const handlePatientNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const typedName = e.target.value;
    setPatientName(typedName);

    const foundPatient = existingPatients.find(p => p.name.toLowerCase() === typedName.toLowerCase());
    
    if (foundPatient) {
      setPatientPhone(foundPatient.phone || '');
      setPatientEmail(foundPatient.email || ''); 
      setArea(foundPatient.area || '');
      
      const { data: pastDeploys } = await supabase
        .from('injection_deployments')
        .select('doctors(name), weekly_dose')
        .eq('patient_id', foundPatient.id)
        .order('deployment_date', { ascending: false })
        .limit(1);

      if (pastDeploys && pastDeploys.length > 0) {
        if ((pastDeploys[0] as any).doctors) {
          setDoctorName((pastDeploys[0] as any).doctors.name);
        }
        if ((pastDeploys[0] as any).weekly_dose) {
          setWeeklyDose(String((pastDeploys[0] as any).weekly_dose));
        }
      }
    } else {
      setPatientPhone(''); setPatientEmail(''); setArea(''); setWeeklyDose(''); setDoctorName('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage('CALCULATING AND SAVING...');

    const productObj = products.find(p => String(p.id) === selectedProduct);
    if (!productObj) return setStatusMessage('ERROR: PLEASE SELECT A PRODUCT.');

    const qty = parseInt(quantity) || 1; 
    let daysToAdd = 0;
    let finalDoctorId = null;

    if (category === 'injection') {
      if (!weeklyDose) return setStatusMessage('ERROR: WEEKLY DOSE REQUIRED.');
      if (!doctorName) return setStatusMessage('ERROR: REFERRING DOCTOR REQUIRED FOR INJECTIONS.');
      
      const existingDoc = doctors.find(d => d.name.toLowerCase() === doctorName.toLowerCase());
      
      if (existingDoc) {
        finalDoctorId = existingDoc.id;
      } else {
        const { data: newDoc, error: docError } = await supabase.from('doctors').insert([{ name: doctorName }]).select().single();
        if (docError) return setStatusMessage('ERROR SAVING NEW DOCTOR.');
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
      if (existingPatient.phone !== patientPhone || existingPatient.email !== patientEmail || existingPatient.area !== area) {
        await supabase.from('patients').update({ phone: patientPhone, email: patientEmail, area }).eq('id', patientId);
      }
    } else {
      const { data: newPatient, error: patientError } = await supabase.from('patients').insert([{ name: patientName, phone: patientPhone, email: patientEmail, area }]).select().single();
      if (patientError) return setStatusMessage('ERROR SAVING PATIENT.');
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
      insertData.needles = needles;
    }
    if (category === 'medtronic') insertData.medtronic_id = selectedProduct;

    const { error } = await supabase.from(tableToUse).insert([insertData]);

    if (error) {
      setStatusMessage('ERROR: ' + error.message);
    } else {
      setStatusMessage(`PERFECT! SUCCESS: NEW DEPLOYMENT RECORDED SUCCESSFULLY.`);
      setPatientName(''); setPatientPhone(''); setPatientEmail(''); setArea(''); setWeeklyDose(''); setQuantity('1'); setDoctorName(''); setNeedles('');
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f7f9] p-8 md:p-12 font-sans flex flex-col items-center uppercase text-base">
      <div className="w-full max-w-3xl">
        <header className="mb-8 flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg"><Activity className="text-white w-6 h-6" /></div>
            <span className="font-black text-gray-900 text-xl tracking-tight">Healthcare Dashboard</span>
          </div>
          <Link href="/" className="flex items-center gap-2 text-base font-black text-blue-600 hover:text-blue-800 transition-colors">
            <ArrowLeft className="w-5 h-5" /> Back to Dashboard
          </Link>
        </header>

        <div className="mb-8 w-full">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tighter">Log New Deployment</h1>
          <p className="text-gray-500 text-base font-bold">Record medical device usage, referring physician and patient details.</p>
        </div>
        
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full">
          
          <div className="mb-6">
            <label className="block text-sm font-black text-gray-700 mb-2">Deployment Category</label>
            <div className="flex bg-gray-100 p-1.5 rounded-xl">
              <button type="button" onClick={() => setCategory('sensor')} className={`flex-1 py-3 text-sm font-black rounded-lg transition-all uppercase ${category === 'sensor' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Sensor Deployment</button>
              <button type="button" onClick={() => setCategory('injection')} className={`flex-1 py-3 text-sm font-black rounded-lg transition-all uppercase ${category === 'injection' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Injection</button>
              <button type="button" onClick={() => setCategory('medtronic')} className={`flex-1 py-3 text-sm font-black rounded-lg transition-all uppercase ${category === 'medtronic' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Medtronic Pump</button>
            </div>
          </div>

          {statusMessage && (
            <div className={`p-4 rounded-xl mb-6 flex items-center gap-2 text-sm font-black ${statusMessage.includes('ERROR') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              <CheckCircle2 className="w-6 h-6"/> {statusMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6 text-sm font-bold">
            <div className="flex flex-col gap-2">
              <label className="font-black text-gray-700 text-sm">Patient Name</label>
              <input list="patient-list" required placeholder="E.G. ELEANOR VANCE" value={patientName} onChange={handlePatientNameChange} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
              <datalist id="patient-list">{existingPatients.map(p => <option key={p.id} value={p.name} />)}</datalist>
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-2 w-1/2">
                <label className="font-black text-gray-700 text-sm">Patient Phone</label>
                <input type="text" required placeholder="+1 (555) 234-5678" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
              </div>
              <div className="flex flex-col gap-2 w-1/2">
                <label className="font-black text-gray-700 text-sm">Patient Area</label>
                <input type="text" required placeholder="E.G. DOWNTOWN" value={area} onChange={(e) => setArea(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-black text-gray-700 text-sm">Patient Email <span className="text-gray-400 font-bold">(Optional)</span></label>
              <input type="email" placeholder="PATIENT@EXAMPLE.COM" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
            </div>
            
            {category === 'injection' && (
              <div className="flex flex-col gap-2">
                <label className="font-black text-gray-700 text-sm">Referring Doctor</label>
                <input list="doctor-list" required placeholder="DR. SARAH JENKINS" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
                <datalist id="doctor-list">{doctors.map(d => <option key={d.id} value={d.name} />)}</datalist>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="font-black text-gray-700 text-sm">Product Dropdown</label>
              <select required value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all bg-white uppercase font-bold">
                <option value="" disabled className="uppercase font-bold">SELECT A {category.toUpperCase()} PRODUCT...</option>
                {products.map(p => <option key={p.id} value={p.id} className="uppercase font-bold">{p.name?.toUpperCase() || p.name}</option>)}
              </select>
            </div>

            <div className="flex gap-4">
              <div className={`flex flex-col gap-2 ${category === 'injection' ? 'w-1/3' : 'w-full'}`}>
                <label className="font-black text-gray-700 text-sm">Quantity</label>
                <input type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
              </div>
              {category === 'injection' && (
                <>
                  <div className="flex flex-col gap-2 w-1/3">
                    <label className="font-black text-gray-700 text-sm">Weekly Dose</label>
                    <input type="number" step="any" required placeholder="E.G. 1.5" value={weeklyDose} onChange={(e) => setWeeklyDose(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all uppercase" />
                  </div>
                  <div className="flex flex-col gap-2 w-1/3">
                    <label className="font-black text-gray-700 text-sm">Needles <span className="text-gray-400 font-bold">(Auto)</span></label>
                    <input type="number" readOnly value={needles} className="border border-gray-200 rounded-lg p-3 font-black text-gray-700 bg-gray-50 outline-none cursor-not-allowed uppercase" />
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-2 relative">
              <label className="font-black text-gray-700 text-sm">Deployment Date</label>
              <input type="date" required value={deploymentDate} onChange={(e) => setDeploymentDate(e.target.value)} className="border border-gray-200 rounded-lg p-3 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all w-full uppercase" />
            </div>
            
            <button type="submit" className="bg-[#0077b6] text-white font-black text-base py-4 mt-4 rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
              SAVE DEPLOYMENT
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}