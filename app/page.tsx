import Link from 'next/link';
import { Activity, PlusCircle, Bell, FileText, MapPin, Package, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f4f7f9] p-8 md:p-12 font-sans">
      
      {/* Top Brand Header */}
      <header className="mb-10 flex items-center gap-2">
        <div className="bg-blue-600 p-1.5 rounded-lg">
          <Activity className="text-white w-5 h-5" />
        </div>
        <span className="font-bold text-gray-900 text-lg tracking-tight">Swasthyam Healthcare</span>
      </header>

      {/* Page Title */}
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Healthcare Dashboard</h1>
        <p className="text-gray-500 text-sm font-medium">Welcome! Choose a task below:</p>
      </div>

      <h2 className="text-sm font-bold text-gray-700 mb-4 tracking-wide">Operations & Deployments</h2>

      {/* Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        <Link href="/log-deployment" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition-all group relative">
          <div className="bg-blue-50 w-10 h-10 rounded-full flex items-center justify-center mb-4">
            <PlusCircle className="text-blue-600 w-5 h-5" />
          </div>
          <ArrowRight className="absolute top-6 right-6 text-gray-300 w-4 h-4 group-hover:text-blue-600 transition-colors group-hover:translate-x-1" />
          <h3 className="font-bold text-gray-900 mb-1 text-sm">Log Deployment</h3>
          <p className="text-xs text-gray-400 font-medium">Assign a new sensor or product to a patient</p>
        </Link>

        <Link href="/pending-work" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-red-100 transition-all group relative">
          <div className="bg-red-50 w-10 h-10 rounded-full flex items-center justify-center mb-4">
            <Bell className="text-red-500 w-5 h-5" />
          </div>
          <ArrowRight className="absolute top-6 right-6 text-gray-300 w-4 h-4 group-hover:text-red-500 transition-colors group-hover:translate-x-1" />
          <h3 className="font-bold text-gray-900 mb-1 text-sm">Pending Work</h3>
          <p className="text-xs text-gray-400 font-medium">View and cross off daily notifications</p>
        </Link>

        <Link href="/sales-report" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-green-100 transition-all group relative">
          <div className="bg-green-50 w-10 h-10 rounded-full flex items-center justify-center mb-4">
            <FileText className="text-green-600 w-5 h-5" />
          </div>
          <ArrowRight className="absolute top-6 right-6 text-gray-300 w-4 h-4 group-hover:text-green-600 transition-colors group-hover:translate-x-1" />
          <h3 className="font-bold text-gray-900 mb-1 text-sm">Sales Report</h3>
          <p className="text-xs text-gray-400 font-medium">View all deployments and export to Excel</p>
        </Link>

        <Link href="/address" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-yellow-100 transition-all group relative">
          <div className="bg-yellow-50 w-10 h-10 rounded-full flex items-center justify-center mb-4">
            <MapPin className="text-yellow-600 w-5 h-5" />
          </div>
          <ArrowRight className="absolute top-6 right-6 text-gray-300 w-4 h-4 group-hover:text-yellow-600 transition-colors group-hover:translate-x-1" />
          <h3 className="font-bold text-gray-900 mb-1 text-sm">Patient Address Archive</h3>
          <p className="text-xs text-gray-400 font-medium">Upload & search patient documents</p>
        </Link>

        <Link href="/couriers" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all group relative">
          <div className="bg-indigo-50 w-10 h-10 rounded-full flex items-center justify-center mb-4">
            <Package className="text-indigo-600 w-5 h-5" />
          </div>
          <ArrowRight className="absolute top-6 right-6 text-gray-300 w-4 h-4 group-hover:text-indigo-600 transition-colors group-hover:translate-x-1" />
          <h3 className="font-bold text-gray-900 mb-1 text-sm">Courier Tracking</h3>
          <p className="text-xs text-gray-400 font-medium">Log and track shipments and courier status</p>
        </Link>

      </div>
    </main>
  );
}