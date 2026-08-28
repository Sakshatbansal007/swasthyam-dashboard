'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

export default function LogDeployment() {
  const [category, setCategory] = useState('sensor'); 
  const [products, setProducts] = useState<any[]>([]);
  
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(''); 
  const [deploymentDate, setDeploymentDate] = useState('');
  const [quantity, setQuantity] = useState('1'); 
  const [weeklyDose, setWeeklyDose] = useState(''); 
  const [statusMessage, setStatusMessage] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage('Calculating and saving...');

    const productObj = products.find(p => String(p.id) === selectedProduct);
    if (!productObj) return setStatusMessage('Error: Please select a product.');

    const qty = parseInt(quantity) || 1; 
    let daysToAdd = 0;

    if (category === 'injection') {
      if (!weeklyDose) return setStatusMessage('Error: Weekly dose required.');
      const totalMgBought = productObj.total_dose * qty;
      daysToAdd = Math.floor((totalMgBought / parseInt(weeklyDose)) * 7);
    } else {
      daysToAdd = productObj.lifespan_days * qty;
    }

    const dateObj = new Date(deploymentDate);
    dateObj.setDate(dateObj.getDate() + daysToAdd);
    const dueDate = dateObj.toISOString().split('T')[0];

    const { data: newPatient, error: patientError } = await supabase
      .from('patients')
      .insert([{ name: patientName, phone: patientPhone }]).select().single();

    if (patientError) return setStatusMessage('Error saving patient.');

    let tableToUse = category === 'sensor' ? 'sensor_deployments' : category === 'injection' ? 'injection_deployments' : 'medtronic_deployments';
    let insertData: any = {
      patient_id: newPatient.id,
      deployment_date: deploymentDate,
      due_date: dueDate,
      quantity: qty,
      is_completed: false
    };

    if (category === 'sensor') insertData.sensor_id = selectedProduct;
    if (category === 'injection') {
      insertData.injection_id = selectedProduct;
      insertData.weekly_dose = parseInt(weeklyDose);
    }
    if (category === 'medtronic') insertData.medtronic_id = selectedProduct;

    const { error } = await supabase.from(tableToUse).insert([insertData]);

    if (error) {
      setStatusMessage('Error: ' + error.message);
    } else {
      setStatusMessage(`Success! Next replacement due: ${dueDate}`);
      setPatientName(''); setPatientPhone(''); setWeeklyDose(''); setQuantity('1');
    }
  };

  return (
    <main className="p-10 bg-gray-50 min-h-screen">
      <Link href="/" className="text-blue-600 hover:underline mb-6 inline-block">&larr; Back to Dashboard</Link>
      <h1 className="text-3xl font-bold text-blue-900 mb-8">Log New Deployment</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="mb-6 block w-full border rounded-md p-2 bg-blue-50 font-bold text-blue-900">
          <option value="sensor">Sensor</option>
          <option value="injection">Injection</option>
          <option value="medtronic">Medtronic Pump</option>
        </select>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="text" required placeholder="Patient Name" value={patientName} onChange={(e) => setPatientName(e.target.value)} className="border rounded p-2 text-black" />
          <input type="text" required placeholder="Patient Phone" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} className="border rounded p-2 text-black" />
          
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
          
          <button type="submit" className="bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700">Save Deployment</button>
          {statusMessage && <p className="text-sm font-bold text-blue-600">{statusMessage}</p>}
        </form>
      </div>
    </main>
  );
}