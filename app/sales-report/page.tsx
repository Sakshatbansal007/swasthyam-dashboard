'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

export default function SalesReport() {
  const [sales, setSales] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    async function fetchSales() {
      const [sensors, injections, medtronic] = await Promise.all([
        supabase.from('sensor_deployments').select(`deployment_date, due_date, quantity, patients(name, phone), sensors(name)`),
        supabase.from('injection_deployments').select(`deployment_date, due_date, quantity, patients(name, phone), injections(name), doctors(name)`),
        supabase.from('medtronic_deployments').select(`deployment_date, due_date, quantity, patients(name, phone), medtronic(name)`)
      ]);

      const allSales = [];
      
      if (sensors.data) allSales.push(...sensors.data.map((i: any) => ({ date: i.deployment_date, dueDate: i.due_date, patient: i.patients?.name, phone: i.patients?.phone, product: i.sensors?.name, qty: i.quantity, type: 'Sensor' })));
      if (injections.data) allSales.push(...injections.data.map((i: any) => ({ date: i.deployment_date, dueDate: i.due_date, patient: i.patients?.name, phone: i.patients?.phone, product: i.injections?.name, doctor: i.doctors?.name, qty: i.quantity, type: 'Injection' })));
      if (medtronic.data) allSales.push(...medtronic.data.map((i: any) => ({ date: i.deployment_date, dueDate: i.due_date, patient: i.patients?.name, phone: i.patients?.phone, product: i.medtronic?.name, qty: i.quantity, type: 'Medtronic' })));

      allSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSales(allSales);
    }
    fetchSales();
  }, []);

  const downloadExcel = () => {
    // Filter the sales based on the selected date range
    let filteredSales = sales;
    
    if (startDate) {
      filteredSales = filteredSales.filter(s => new Date(s.date) >= new Date(startDate));
    }
    if (endDate) {
      filteredSales = filteredSales.filter(s => new Date(s.date) <= new Date(endDate));
    }

    if (filteredSales.length === 0) {
      alert("No sales found in this date range.");
      return;
    }

    const headers = "Deployment Date,Due Date,Patient,Phone,Product,Type,Quantity,Doctor\n";
    const rows = filteredSales.map(s => `${s.date},${s.dueDate},"${s.patient}","${s.phone || ''}","${s.product}",${s.type},${s.qty},"${s.doctor || 'N/A'}"`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Name the file based on the date range if selected
    const fileNameDate = (startDate || endDate) ? `${startDate || 'Start'}_to_${endDate || 'End'}` : new Date().toISOString().split('T')[0];
    a.download = `Sales_Report_${fileNameDate}.csv`;
    
    a.click();
  };

  const sensorSales = sales.filter(s => s.type === 'Sensor');
  const injectionSales = sales.filter(s => s.type === 'Injection');
  const medtronicSales = sales.filter(s => s.type === 'Medtronic');

  const renderTable = (title: string, data: any[], colorClass: string, showDoctor: boolean = false) => (
    <div className="mb-10">
      <h2 className={`text-2xl font-bold mb-4 ${colorClass}`}>{title}</h2>
      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-gray-800 text-white text-base">
              <th className="p-4 border-b">Deployed</th>
              <th className="p-4 border-b">Patient Name</th>
              <th className="p-4 border-b">Mobile Number</th>
              <th className="p-4 border-b">Product</th>
              <th className="p-4 border-b">Qty</th>
              {showDoctor && <th className="p-4 border-b">Doctor</th>}
              <th className="p-4 border-b">Due Date</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={showDoctor ? 7 : 6} className="p-6 text-center text-gray-600 font-semibold bg-gray-50 text-base">
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
                  {showDoctor && (
                    <td className="p-4 border-b text-base font-semibold text-gray-900">
                      {sale.doctor || 'N/A'}
                    </td>
                  )}
                  <td className="p-4 border-b text-base font-bold text-red-700">{sale.dueDate}</td>
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 border-b pb-6 gap-6">
        <div>
          <Link href="/" className="text-blue-600 hover:underline block mb-2 font-semibold">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Sales Reports</h1>
        </div>
        
        {/* New Date Range Selector and Export Button */}
        <div className="flex flex-wrap items-end gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Start Date (Optional)</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="border rounded-lg p-2 text-black border-gray-300 w-40" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">End Date (Optional)</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="border rounded-lg p-2 text-black border-gray-300 w-40" 
            />
          </div>
          <button 
            onClick={downloadExcel} 
            className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 shadow-sm transition-colors h-[42px]"
          >
            📥 Export Range
          </button>
        </div>
      </div>
      
      {renderTable('🟢 Sensor Sales', sensorSales, 'text-green-700')}
      {renderTable('🟠 Injection Sales', injectionSales, 'text-orange-700', true)} 
      {renderTable('🔵 Medtronic Sales', medtronicSales, 'text-blue-700')}
    </main>
  );
}