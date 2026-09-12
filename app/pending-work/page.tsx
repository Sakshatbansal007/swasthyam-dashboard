'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Activity, ArrowLeft, CheckCircle2, Zap, Syringe, ActivitySquare, Landmark } from 'lucide-react';

export default function PendingWork() {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    fetchPendingWork();
  }, []);

  async function fetchPendingWork() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // One day in advance: tomorrow's work shows starting today
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const [sensors, injections, medtronic, cheques] = await Promise.all([
      supabase.from('sensor_deployments').select(`id, due_date, patients(name, phone), sensors(name)`).eq('is_completed', false).lte('due_date', tomorrowStr),
      supabase.from('injection_deployments').select(`id, due_date, patients(name, phone), injections(name)`).eq('is_completed', false).lte('due_date', tomorrowStr),
      supabase.from('medtronic_deployments').select(`id, due_date, patients(name, phone), medtronic(name)`).eq('is_completed', false).lte('due_date', tomorrowStr),
      supabase.from('cheques').select(`id, due_date, chq_no, name, amount, bank_name, status`).eq('status', 'PENDING').lte('due_date', tomorrowStr)
    ]);

    const allTasks: any[] = [];
    if (sensors.data) allTasks.push(...sensors.data.map((i: any) => ({ ...i, type: 'sensor', patientName: i.patients?.name, phone: i.patients?.phone, product: i.sensors?.name })));
    if (injections.data) allTasks.push(...injections.data.map((i: any) => ({ ...i, type: 'injection', patientName: i.patients?.name, phone: i.patients?.phone, product: i.injections?.name })));
    if (medtronic.data) allTasks.push(...medtronic.data.map((i: any) => ({ ...i, type: 'medtronic', patientName: i.patients?.name, phone: i.patients?.phone, product: i.medtronic?.name })));
    if (cheques.data) allTasks.push(...cheques.data.map((c: any) => ({
      id: c.id,
      type: 'cheque',
      due_date: c.due_date,
      patientName: c.name,
      phone: c.bank_name ? `BANK: ${c.bank_name}` : 'CHEQUE CLEARANCE',
      product: `CHQ #${c.chq_no} - ₹${c.amount}`
    })));

    allTasks.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    setTasks(allTasks);
  }

  const markCompleted = async (id: string | number, type: string) => {
    if (type === 'cheque') {
      await supabase.from('cheques').update({ status: 'SWASTHYAM' }).eq('id', id);
    } else {
      let tableName = type === 'sensor' ? 'sensor_deployments' : type === 'injection' ? 'injection_deployments' : 'medtronic_deployments';
      await supabase.from(tableName).update({ is_completed: true }).eq('id', id);
    }
    fetchPendingWork();
  };

  const getIcon = (type: string) => {
    if (type === 'sensor') return <ActivitySquare className="w-5 h-5 text-gray-400 inline mr-1" />;
    if (type === 'injection') return <Syringe className="w-5 h-5 text-gray-400 inline mr-1" />;
    if (type === 'cheque') return <Landmark className="w-5 h-5 text-violet-500 inline mr-1" />;
    return <Zap className="w-5 h-5 text-gray-400 inline mr-1" />;
  };

  const getDueDateLabel = (dueDateStr: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (dueDateStr < todayStr) {
      return { badge: 'CRITICAL (OVERDUE)', text: `${dueDateStr} (OVERDUE)`, color: 'text-red-600', badgeClass: 'bg-red-50 text-red-600 border-red-100' };
    }
    if (dueDateStr === todayStr) {
      return { badge: 'DUE TODAY', text: 'TODAY', color: 'text-amber-600', badgeClass: 'bg-amber-50 text-amber-600 border-amber-100' };
    }
    if (dueDateStr === tomorrowStr) {
      return { badge: 'DUE TOMORROW', text: 'TOMORROW', color: 'text-blue-600', badgeClass: 'bg-blue-50 text-blue-600 border-blue-100' };
    }
    return { badge: 'UPCOMING', text: dueDateStr, color: 'text-gray-900', badgeClass: 'bg-gray-50 text-gray-700 border-gray-100' };
  };

  return (
    <main className="min-h-screen bg-[#f4f7f9] p-8 md:p-12 font-sans flex flex-col items-center uppercase text-base">
      <div className="w-full max-w-4xl">
        
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
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tighter">Daily Notifications</h1>
          <p className="text-gray-500 text-base font-bold">View and cross off patient tasks, refills, and pending cheques due today and tomorrow.</p>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-green-50 border border-green-200 p-8 rounded-2xl flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
            <h2 className="text-green-800 font-black text-2xl mb-2">ALL CAUGHT UP!</h2>
            <p className="text-green-600 text-base font-bold">NO TASKS OR CHEQUES DUE TODAY OR TOMORROW. ENJOY YOUR DAY!</p>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-black text-gray-700 mb-4 tracking-wide">Pending Notifications ({tasks.length})</h2>
            <div className="flex flex-col gap-4">
              {tasks.map((task) => {
                const dueInfo = getDueDateLabel(task.due_date);
                
                return (
                  <div key={`${task.type}-${task.id}`} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow">
                    
                    <div className="flex flex-col">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-black text-gray-900">{task.patientName}</h3>
                        <span className={`text-xs font-black px-2 py-1 rounded-md border uppercase tracking-wider ${dueInfo.badgeClass}`}>
                          {dueInfo.badge}
                        </span>
                        {task.type === 'cheque' && (
                          <span className="bg-violet-50 text-violet-700 border border-violet-100 text-xs font-black px-2 py-1 rounded-md uppercase tracking-wider">
                            Cheque
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-base text-gray-500 font-bold">
                        <span>📞 {task.phone || 'N/A'}</span>
                        <span>{getIcon(task.type)} {task.product}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-right flex flex-col justify-center">
                        <span className="text-xs text-gray-400 font-black uppercase tracking-wider">Due Date</span>
                        <span className={`font-black text-base ${dueInfo.color}`}>
                          {dueInfo.text}
                        </span>
                      </div>
                      <button 
                        onClick={() => markCompleted(task.id, task.type)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm py-3 px-6 rounded-lg transition-colors shadow-sm uppercase"
                      >
                        CROSS OFF
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}