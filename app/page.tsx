import Link from 'next/link';
import { Activity, PlusCircle, Bell, FileText, MapPin, Package, ArrowRight, Users, AlertTriangle } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f4f7f9] p-8 md:p-12 font-sans uppercase text-base">
      
      <header className="mb-10 flex items-center gap-2">
        <div className="bg-blue-600 p-1.5 rounded-lg">
          <Activity className="text-white w-6 h-6" />
        </div>
        <span className="font-black text-gray-900 text-xl tracking-tight">Swasthyam Healthcare</span>
      </header>

      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 tracking-tighter">Healthcare Dashboard</h1>
        <p className="text-gray-500 text-base font-bold">Welcome! Choose a task below:</p>
      </div>

      <h2 className="text-lg font-black text-gray-700 mb-4 tracking-wide">Operations & Deployments</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* NEW COMPLAINTS LINK */}
        <Link href="/complaints" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-100 transition-all group relative">
          <div className="bg-orange-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="text-orange-600 w-6 h-6" />
          </div>
          <ArrowRight className="absolute top-6 right-6 text-gray-300 w-5 h-5 group-hover:text-orange-600 transition-colors group-hover:translate-x-1" />
          <h3 className="font-black text-gray-900 mb-1 text-base">Sensor Complaints</h3>
          <p className="text-sm text-gray-500 font-bold">Log issues and track replacement status</p>
        </Link>

        <Link href="/patients" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-cyan-100 transition-all group relative">
          <div className="bg-cyan-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Users className="text-cyan-600 w-6 h-6" />
          </div>
          <ArrowRight className="absolute top-6 right-6 text-gray-300 w-5 h-5 group-hover:text-cyan-600 transition-colors group-hover:translate-x-1" />
          <h3 className="font-black text-gray-900 mb-1 text-base">Patients Directory</h3>
          <p className="text-sm text-gray-500 font-bold">Manage patients & log new inquiries</p>
        </Link>

        <Link href="/log-deployment" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all group relative">
          <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <PlusCircle className="text-blue-600 w-6 h-6" />
          </div>
          <ArrowRight className="absolute top-6 right-6 text-gray-300 w-5 h-5 group-hover:text-blue-600 transition-colors group-hover:translate-x-1" />
          <h3 className="font-black text-gray-900 mb-1 text-base">Log Deployment</h3>
          <p className="text-sm text-gray-500 font-bold">Assign a new sensor or product to a patient</p>
        </Link>

        <Link href="/pending-work" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-red-100 transition-all group relative">
          <div className="bg-red-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Bell className="text-red-500 w-6 h-6" />
          </div>
          <ArrowRight className="absolute top-6 right-6 text-gray-300 w-5 h-5 group-hover:text-red-500 transition-colors group-hover:translate-x-1" />
          <h3 className="font-black text-gray-900 mb-1 text-base">Pending Work</h3>
          <p className="text-sm text-gray-500 font-bold">View and cross off daily notifications</p>
        </Link>

        <Link href="/sales-report" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-green-100 transition-all group relative">
          <div className="bg-green-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <FileText className="text-green-600 w-6 h-6" />
          </div>
          <ArrowRight className="absolute top-6 right-6 text-gray-300 w-5 h-5 group-hover:text-green-600 transition-colors group-hover:translate-x-1" />
          <h3 className="font-black text-gray-900 mb-1 text-base">Sales Report</h3>
          <p className="text-sm text-gray-500 font-bold">View all deployments and export to Excel</p>
        </Link>

        <Link href="/address" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-yellow-100 transition-all group relative">
          <div className="bg-yellow-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <MapPin className="text-yellow-600 w-6 h-6" />
          </div>
          <ArrowRight className="absolute top-6 right-6 text-gray-300 w-5 h-5 group-hover:text-yellow-600 transition-colors group-hover:translate-x-1" />
          <h3 className="font-black text-gray-900 mb-1 text-base">Patient Address Archive</h3>
          <p className="text-sm text-gray-500 font-bold">Upload & search patient documents</p>
        </Link>

        <Link href="/couriers" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all group relative">
          <div className="bg-indigo-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Package className="text-indigo-600 w-6 h-6" />
          </div>
          <ArrowRight className="absolute top-6 right-6 text-gray-300 w-5 h-5 group-hover:text-indigo-600 transition-colors group-hover:translate-x-1" />
          <h3 className="font-black text-gray-900 mb-1 text-base">Courier Tracking</h3>
          <p className="text-sm text-gray-500 font-bold">Log and track shipments and courier status</p>
        </Link>

      </div>
    </main>
  );
}