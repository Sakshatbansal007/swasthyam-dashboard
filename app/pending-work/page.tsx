'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

export default function PendingWork() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPending() {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    // Fetching incomplete tasks that are due today (or in the past)
    // We removed the date filter to see if the date math was the culprit!
    const [sensors, injections, medtronic] = await Promise.all([
      supabase.from('sensor_deployments').select(`id, due_date, patients(name, phone), sensors(name)`).eq('is_completed', false),
      supabase.from('injection_deployments').select(`id, due_date, patients(name, phone), injections(name)`).eq('is_completed', false),
      supabase.from('medtronic_deployments').select(`id, due_date, patients(name, phone), medtronic(name)`).eq('is_completed', false)
    ]);

    const allPending = [];
    
    // Explicitly mapping the patientName and patientPhone so the UI can read them easily
    if (sensors.data) allPending.push(...sensors.data.map((i: any) => ({ ...i, patientName: i.patients?.name, patientPhone: i.patients?.phone, productName: i.sensors?.name, table: 'sensor_deployments' })));
    if (injections.data) allPending.push(...injections.data.map((i: any) => ({ ...i, patientName: i.patients?.name, patientPhone: i.patients?.phone, productName: i.injections?.name, table: 'injection_deployments' })));
    if (medtronic.data) allPending.push(...medtronic.data.map((i: any) => ({ ...i, patientName: i.patients?.name, patientPhone: i.patients?.phone, productName: i.medtronic?.name, table: 'medtronic_deployments' })));

    // Sort oldest due dates to the top
    allPending.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    
    setPending(allPending);
    setLoading(false);
  }

  useEffect(() => { 
    fetchPending(); 
  }, []);

  const markCompleted = async (id: number, tableName: string) => {
    await supabase.from(tableName).update({ is_completed: true }).eq('id', id);
    fetchPending(); // Instantly refreshes the list to remove the crossed-off item
  };

  return (
    <main className="p-10 bg-gray-50 min-h-screen">
      <Link href="/" className="text-blue-600 hover:underline mb-6 inline-block font-semibold">
        &larr; Back to Dashboard
      </Link>
      <h1 className="text-3xl font-bold text-red-700 mb-8">Daily Notifications</h1>
      
      {loading ? (
        <p className="text-lg font-semibold text-gray-600 animate-pulse">Checking tasks...</p>
      ) : pending.length === 0 ? (
        <div className="bg-green-100 p-6 rounded-lg text-green-800 font-bold border border-green-200 text-lg shadow-sm">
          🎉 All caught up! No tasks due right now.
        </div>
      ) : (
        <div className="grid gap-6 max-w-3xl">
          {pending.map((item, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500 flex justify-between items-center transition-all hover:shadow-lg">
              
              {/* Patient and Product Details */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{item.patientName || 'Unknown Patient'}</h2>
                <p className="text-base font-semibold text-gray-700 mt-2">
                  📞 {item.patientPhone || 'No Phone Number'}
                </p>
                <div className="mt-3 bg-gray-50 p-3 rounded border border-gray-100 inline-block">
                  <p className="text-sm text-gray-800">
                    <span className="font-bold uppercase text-xs text-gray-500 mr-2">Product:</span> 
                    {item.productName}
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    <span className="font-bold uppercase text-xs text-red-400 mr-2">Due:</span> 
                    <span className="font-bold">{item.due_date}</span>
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <button 
                onClick={() => markCompleted(item.id, item.table)} 
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-sm transition-colors ml-4"
              >
                ✔ Cross Off
              </button>
              
            </div>
          ))}
        </div>
      )}
    </main>
  );
}