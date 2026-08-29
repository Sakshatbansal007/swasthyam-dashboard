'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Activity, ArrowLeft, CheckCircle2, Zap, Syringe, ActivitySquare } from 'lucide-react';

export default function PendingWork() {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    fetchPendingWork();
  }, []);

  async function fetchPendingWork() {
    const today = new Date().toISOString().split('T')[0];
    
    const [sensors, injections, medtronic] = await Promise.all([
      supabase.from('sensor_deployments').select(`id, due_date, patients(name, phone), sensors(name)`).eq('is_completed', false).lte('due_date', today),
      supabase.from('injection_deployments').select(`id, due_date, patients(name, phone), injections(name)`).eq('is_completed', false).lte('due_date', today),
      supabase.from('medtronic_deployments').select(`id, due_date, patients(name, phone), medtronic(name)`).eq('is_completed', false).lte('due_date', today)
    ]);

    const allTasks = [];
    if (sensors.data) allTasks.push(...sensors.data.map((i: any) => ({ ...i, type: 'sensor', product: i.sensors?.name })));
    if (injections.data) allTasks.push(...injections.data.map((i: any) => ({ ...i, type: 'injection', product: i.injections?.name })));
    if (medtronic.data) allTasks.push(...medtronic.data.map((i: any) => ({ ...i, type: 'medtronic', product: i.medtronic?.name })));

    allTasks.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    setTasks(allTasks);
  }

  const markCompleted = async (id: string, type: string) => {
    let tableName = type === 'sensor' ? 'sensor_deployments' : type === 'injection' ? 'injection_deployments' : 'medtronic_deployments';
    await supabase.from(tableName).update({ is_completed: true }).eq('id', id);
    fetchPendingWork();
  };

  const getIcon = (type: string) => {
    if (type === 'sensor') return <ActivitySquare className="w-4 h-4 text-gray-400 inline mr-1" />;
    if (type === 'injection') return <Syringe className="w-4 h-4 text-gray-400 inline mr-1" />;
    return <Zap className="w-4 h-4 text-gray-400 inline mr-1" />;
  };

  return (
    <main className="min-h-screen bg-[#f4f7f9] p-8 md:p-12 font-sans flex flex-col items-center">
      <div className="w-full max-w-4xl">
        
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
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Daily Notifications</h1>
          <p className="text-gray-500 text-sm font-medium">View and check off pending patient tasks and deployments.</p>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-green-50 border border-green-200 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500 mb-3" />
            <h2 className="text-green-800 font-bold text-lg mb-1">All caught up!</h2>
            <p className="text-green-600 text-sm font-medium">No tasks due right now. Enjoy your day!</p>
          </div>
        ) : (
          <div>
            <h2 className="text-sm font-bold text-gray-700 mb-4 tracking-wide">Pending Notifications ({tasks.length})</h2>
            <div className="flex flex-col gap-4">
              {tasks.map((task) => {
                const isOverdue = new Date(task.due_date) < new Date(new Date().toISOString().split('T')[0]);
                
                return (
                  <div key={`${task.type}-${task.id}`} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow">
                    
                    <div className="flex flex-col">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">{task.patients?.name}</h3>
                        {isOverdue && <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-md border border-red-100 uppercase tracking-wider">Critical</span>}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                        <span>📞 {task.patients?.phone || 'N/A'}</span>
                        <span>{getIcon(task.type)} {task.product}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right flex flex-col justify-center">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Due Date</span>
                        <span className={`font-bold text-sm ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                          {isOverdue ? 'Today (Overdue)' : task.due_date}
                        </span>
                      </div>
                      <button 
                        onClick={() => markCompleted(task.id, task.type)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm py-2 px-5 rounded-lg transition-colors shadow-sm"
                      >
                        Cross Off
                      </button>
                    </div>

                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}