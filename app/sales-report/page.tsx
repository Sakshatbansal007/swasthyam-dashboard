'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

export default function SalesReport() {
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    async function fetchSales() {
      // 1. Fetch phone numbers along with the patient names
      const [sensors, injections, medtronic] = await Promise.all([
        supabase.from('sensor_deployments').select(`deployment_date, quantity, patients(name, phone), sensors(name)`),
        supabase.from('injection_deployments').select(`deployment_date, quantity, patients(name, phone), injections(name)`),
        supabase.from('medtronic_deployments').select(`deployment_date, quantity, patients(name, phone), medtronic(name)`)
      ]);

      const allSales = [];
      if (sensors.data) allSales.push(...sensors.data.map((i: any) => ({ date: i.deployment_date, patient: i.patients?.name, phone: i.patients?.phone, product: i.sensors?.name, qty: i.quantity, type: 'Sensor' })));
      if (injections.data) allSales.push(...injections.data.map((i: any) => ({ date: i.deployment_date, patient: i.patients?.name, phone: i.patients?.phone, product: i.injections?.name, qty: i.quantity, type: 'Injection' })));
      if (medtronic.data) allSales.push(...medtronic.data.map((i: any) => ({ date: i.deployment_date, patient: i.patients?.name, phone: i.patients?.phone, product: i.medtronic?.name, qty: i.quantity, type: 'Medtronic' })));

      allSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSales(allSales);
    }
    fetchSales();
  }, []);

  const downloadExcel = () => {
    // 2. Add Phone to the Excel export
    const headers = "Date,Patient,Phone,Product,Type,Quantity\n";
    const rows = sales.map(s => `${s.date},"${s.patient}","${s.phone || ''}","${s.product}",${s.type},${s.qty}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sales_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const sensorSales = sales.filter(s => s.type === 'Sensor');
  const injectionSales = sales.filter(s => s.type === 'Injection');
  const medtronicSales = sales.filter(s => s.type === 'Medtronic');

  // 3. Updated Table styling: all <td> elements now use 'text-base font-semibold text-gray-900' for a uniform, dark, thick font
  const renderTable = (title: string, data: any[], colorClass: string) => (
    <div className="mb-10">
      <h2 className={`text-2xl font-bold mb-4 ${colorClass}`}>{title}</h2>
      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-800 text-white text-base">
              <th className="p-4 border-b w-1/6">Date</th>
              <th className="p-4 border-b w-1/4">Patient Name</th>
              <th className="p-4 border-b w-1/5">Mobile Number</th>
              <th className="p-4 border-b w-1/4">Product</th>
              <th className="p-4 border-b">Qty</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-gray-600 font-semibold bg-gray-50 text-base">
                  No sales recorded yet.
                </td>
              </tr>
            ) : (
              data.map((sale, i) => (
                <tr key={i} className="hover:bg-gray-100 transition-colors">
                  <td className="p-4 border-b text-base font-semibold text-gray-900">{sale.date}</td>
                  <td className="p-4 border-b text-base font-semibold text-gray-900">{sale.patient}</td>
                  <td className="p-4 border-b text-base font-semibold text-gray-900">{sale.phone || 'N/A'}</td>
                  <td className="p-4 border-b text-base font-semibold text-gray-900">{sale.product}</td>
                  <td className="p-4 border-b text-base font-semibold text-gray-900">{sale.qty}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <main className="p-10 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-10 border-b pb-6">
        <div>
          <Link href="/" className="text-blue-600 hover:underline block mb-2 font-semibold">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Sales Reports</h1>
        </div>
        <button onClick={downloadExcel} className="bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 shadow-sm transition-colors">
          📥 Export All to Excel
        </button>
      </div>
      
      {renderTable('🟢 Sensor Sales', sensorSales, 'text-green-700')}
      {renderTable('🟠 Injection Sales', injectionSales, 'text-orange-700')}
      {renderTable('🔵 Medtronic Sales', medtronicSales, 'text-blue-700')}

    </main>
  );
}