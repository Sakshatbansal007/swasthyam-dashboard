'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

export default function LogDeployment() {
  const [category, setCategory] = useState('sensor'); 
  const [products, setProducts] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [existingPatients, setExistingPatients] = useState<any[]>([]);
  
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(''); 
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [deploymentDate, setDeploymentDate] = useState('');
  const [quantity, setQuantity] = useState('1'); 
  const [weeklyDose, setWeeklyDose] = useState(''); 
  const [statusMessage, setStatusMessage] = useState('');

  // 1. Fetch Existing Patients to power the auto-complete
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

  // 2. The Smart Auto-Fill Function
  const handlePatientNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const typedName = e.target.value;
    setPatientName(typedName);

    // Look for an exact match in our loaded patients
    const foundPatient = existingPatients.find(p => p.name.toLowerCase() === typedName.toLowerCase());
    
    if (foundPatient) {
      setPatientPhone(foundPatient.phone);
      
      // If we found them, let's see who their last referring doctor was!
      const { data: pastDeploys } = await supabase
        .from('injection_deployments')
        .select('doctor_id')
        .eq('patient_id', foundPatient.id)
        .order('deployment_date', { ascending: false })
        .limit(1);

      if (pastDeploys && pastDeploys.length > 0) {
        setSelectedDoctor(pastDeploys[0].doctor_id);
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

    if (category === 'injection') {
      if (!weeklyDose) return setStatusMessage('Error: Weekly dose required.');
      if (!selectedDoctor) return setStatusMessage('Error: Referring doctor required for injections.');
      
      const totalMgBought = productObj.total_dose * qty;
      daysToAdd = Math.floor((totalMgBought / parseInt(weeklyDose)) * 7);
    } else {
      daysToAdd = productObj.lifespan_days * qty;
    }

    const dateObj = new Date(deploymentDate);
    dateObj.setDate(dateObj.getDate() + daysToAdd);
    const dueDate = dateObj.toISOString().split('T')[0];

    // 3. Smart Patient Saving (Prevent Duplicates)
    let patientId;
    const existing = existingPatients.find(p => p.name.toLowerCase() === patientName.toLowerCase());

    if (existing) {
      patientId = existing.id;
      // Update phone number if they changed it on the form
      if (existing.phone !== patientPhone) {
        await supabase.from('patients').update({ phone: patientPhone }).eq('id', patientId);
      }
    } else {
      // Create brand new patient
      const { data: newPatient, error: patientError } = await supabase
        .from('patients')
        .insert([{ name: patientName, phone: patientPhone }]).select().single();
      
      if (patientError) return setStatusMessage('Error saving patient.');
      patientId = newPatient.id;
      
      // Add them to our local list instantly so we can search them next time
      setExistingPatients([...existingPatients, newPatient]);
    }

    let tableToUse = category === 'sensor' ? 'sensor_deployments' : category === 'injection' ? 'injection_deployments' : 'medtronic_deployments';
    let insertData: any = {
      patient_id: patientId,
      deployment_date: deploymentDate,
      due_date: dueDate,
      quantity: qty,
      is_completed: false
    };

    if (category === 'sensor') insertData.sensor_id = selectedProduct;
    if (category === 'injection') {
      insertData.injection_id = selectedProduct;
      insertData.weekly_dose = parseInt(weeklyDose);
      insertData.doctor_id = selectedDoctor;
    }
    if (category === 'medtronic') insertData.medtronic_id = selectedProduct;

    const { error } = await supabase.from(tableToUse).insert([insertData]);

    if (error) {
      setStatusMessage('Error: ' + error.message);
    } else {
      setStatusMessage(`Success! Next replacement due: ${dueDate}`);
      setPatientName(''); setPatientPhone(''); setWeeklyDose(''); setQuantity('1'); setSelectedDoctor('');
    }
  };

  return (
    <main className="p-10 bg-gray-50 min-h-screen">
      <Link href="/" className="text-blue-600 hover:underline mb-6 inline-block font-semibold">&larr; Back to Dashboard</Link>
      <h1 className="text-3xl font-bold text-blue-900 mb-8">Log New Deployment</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="mb-6 block w-full border rounded-md p-2 bg-blue-50 font-bold text-blue-900">
          <option value="sensor">Sensor</option>
          <option value="injection">Injection</option>
          <option value="medtronic">Medtronic Pump</option>
        </select>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Smart Patient Input */}
          <div>
            <input 
              list="patient-list" 
              type="text" 
              required 
              placeholder="Patient Name" 
              value={patientName} 
              onChange={handlePatientNameChange} 
              className="w-full border rounded p-2 text-black" 
            />
            <datalist id="patient-list">
              {existingPatients.map(p => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>

          <input type="text" required placeholder="Patient Phone" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} className="border rounded p-2 text-black" />
          
          {category === 'injection' && (
            <select required value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)} className="border rounded p-2 text-black bg-purple-50">
              <option value="" disabled>Select Referring Doctor...</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}

          <select required value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="border rounded p-2 text-black">
            <option value="" disabled>Select {category}...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <div className="flex gap-4">
            <input type="number" min="1" required placeholder="Qty" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-1/2 border rounded p-2 text-black" />
            {category === 'injection' && (
              <input type="number" required placeholder="Weekly Dose" value={weeklyDose} onChange={(e) => setWeeklyDose(e.target.value)} className="w-1/2 border bg-yellow-50 rounded p-2 text-black" />
            )}
          </div>

          <input type="date" required value={deploymentDate} onChange={(e) => setDeploymentDate(e.target.value)} className="border rounded p-2 text-black" />
          
          <button type="submit" className="bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors">Save Deployment</button>
          {statusMessage && <p className="text-sm font-bold text-blue-600 mt-2">{statusMessage}</p>}
        </form>
      </div>
    </main>
  );
}