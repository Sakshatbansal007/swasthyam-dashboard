'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Activity, ArrowLeft, Download } from 'lucide-react';

export default function SalesReport() {
  const [sales, setSales] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState('Sensor');

  useEffect(() => {
    async function fetchSales() {
      const [sensors, injections, medtronic] = await Promise.all([
        supabase.from('sensor_deployments').select(`deployment_date, due_date, quantity, patients(name, phone, area), sensors(name)`),
        supabase.from('injection_deployments').select(`deployment_date, due_date, quantity, needles, patients(name, phone, area), injections(name), doctors(name)`),
        supabase.from('medtronic_deployments').select(`deployment_date, due_date, quantity, patients(name, phone, area), medtronic(name)`)
      ]);

      const allSales = [];
      if (sensors.data) allSales.push(...sensors.data.map((i: any) => ({ date: i.deployment_date, dueDate: i.due_date, patient: i.patients?.name, phone: i.patients?.phone, area: i.patients?.area, product: i.sensors?.name, qty: i.quantity, type: 'Sensor' })));
      if (injections.data) allSales.push(...injections.data.map((i: any) => ({ date: i.deployment_date, dueDate: i.due_date, patient: i.patients?.name, phone: i.patients?.phone, area: i.patients?.area, product: i.injections?.name, doctor: i.doctors?.name, qty: i.quantity, needles: i.needles, type: 'Injection' })));
      if (medtronic.data) allSales.push(...medtronic.data.map((i: any) => ({ date: i.deployment_date, dueDate: i.due_date, patient: i.patients?.name, phone: i.patients?.phone, area: i.patients?.area, product: i.medtronic?.name, qty: i.quantity, type: 'Medtronic' })));

      allSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSales(allSales);
    }
    fetchSales();
  }, []);

  const downloadExcel = () => {
    let filteredSales = sales;
    if (startDate) filteredSales = filteredSales.filter(s => new Date(s.date) >= new Date(startDate));
    if (endDate) filteredSales = filteredSales.filter(s => new Date(s.date) <= new Date(endDate));
    if (filteredSales.length === 0) return alert("No sales found in this date range.");

    const headers = "Deployment Date,Due Date,Patient,Phone,Area,Product,Type,Quantity,Doctor,Needles\n";
    const rows = filteredSales.map(s => `${s.date},${s.dueDate},"${s.patient}","${s.phone || ''}","${s.area || ''}","${s.product}",${s.type},${s.qty},"${s.doctor || 'N/A'}",${s.needles || 'N/A'}`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sales_Report_${startDate || 'Start'}_to_${endDate || 'End'}.csv`;
    a.click();
  };

  const sensorSales = sales.filter(s => s.type === 'Sensor');
  const injectionSales = sales.filter(s => s.type === 'Injection');
  const medtronicSales = sales.filter(s => s.type === 'Medtronic');

  const renderTable = (data: any[], themeColor: 'green' | 'yellow' | 'blue', isInjection: boolean = false) => {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50">
                <th className="p-4 text-xs font-bold text-gray-800">Deployed Date</th>
                <th className="p-4 text-xs font-bold text-gray-800">Patient Name</th>
                <th className="p-4 text-xs font-bold text-gray-800">Phone</th>
                <th className="p-4 text-xs font-bold text-gray-800">Area</th>
                {isInjection && <th className="p-4 text-xs font-bold text-gray-800">Referring Doctor</th>}
                <th className="p-4 text-xs font-bold text-gray-800">Product</th>
                <th className="p-4 text-xs font-bold text-gray-800">Qty</th>
                {isInjection && <th className="p-4 text-xs font-bold text-gray-800">Needles</th>}
                <th className="p-4 text-xs font-bold text-gray-800">Due Date</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={isInjection ? 9 : 7} className="p-6 text-center text-gray-400 font-medium">No sales recorded yet.</td></tr>
              ) : (
                data.map((sale, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-bold text-gray-900">{sale.date}</td>
                    <td className="p-4 font-medium text-gray-900">{sale.patient}</td>
                    <td className="p-4 font-medium text-gray-500">{sale.phone || 'N/A'}</td>
                    <td className="p-4 font-medium text-gray-600">{sale.area || 'N/A'}</td>
                    {isInjection && <td className="p-4 font-medium text-gray-500">{sale.doctor || 'N/A'}</td>}
                    <td className="p-4 font-medium text-gray-600">{sale.product}</td>
                    <td className="p-4 font-bold text-gray-900">{sale.qty}</td>
                    {isInjection && <td className="p-4 font-bold text-gray-900">{sale.needles || 'N/A'}</td>}
                    <td className="p-4 font-medium text-gray-600">{sale.dueDate}</td>
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
    <main className="min-h-screen bg-[#f4f7f9] p-8 md:p-12 font-sans">
      <header className="mb-8 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg"><Activity className="text-white w-5 h-5" /></div>
          <span className="font-bold text-gray-900 text-lg tracking-tight">Healthcare Dashboard</span>
        </div>
        <Link href="/" className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </header>

      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Sales Reports</h1>
          <p className="text-gray-500 text-sm font-medium">Analyze deployment records, device metrics and export spreadsheets.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-600">Start Date:</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-gray-200 rounded-lg p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-50" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-600">End Date:</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-gray-200 rounded-lg p-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-50" />
          </div>
          <button onClick={downloadExcel} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm py-2.5 px-4 rounded-lg transition-colors shadow-sm ml-2">
            <Download className="w-4 h-4" /> Export Range
          </button>
        </div>
      </div>

      {/* Segmented Control for Table Selection */}
      <div className="mb-6">
        <div className="flex bg-gray-200/50 p-1 rounded-xl w-full max-w-md">
          <button type="button" onClick={() => setActiveTab('Sensor')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'Sensor' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}>Sensors</button>
          <button type="button" onClick={() => setActiveTab('Injection')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'Injection' ? 'bg-white shadow-sm text-amber-600' : 'text-gray-500 hover:text-gray-700'}`}>Injections</button>
          <button type="button" onClick={() => setActiveTab('Medtronic')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'Medtronic' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Medtronic Pump</button>
        </div>
      </div>
      
      {/* Conditionally render the selected table */}
      {activeTab === 'Sensor' && renderTable(sensorSales, 'green', false)}
      {activeTab === 'Injection' && renderTable(injectionSales, 'yellow', true)} 
      {activeTab === 'Medtronic' && renderTable(medtronicSales, 'blue', false)}
    </main>
  );
}