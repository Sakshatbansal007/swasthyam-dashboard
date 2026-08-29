import Link from 'next/link';

export default function Home() {
  return (
    <main className="p-10 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold text-blue-900">Healthcare Dashboard</h1>
      <p className="text-gray-600 mt-2 mb-10">Welcome! Choose a task below:</p>
      
      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
        
        {/* Card 1: Log Deployment */}
        <Link href="/log-deployment" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border-t-4 border-blue-600 block">
          <h2 className="text-xl font-semibold text-gray-800">Log Deployment</h2>
          <p className="text-gray-600 mt-2 text-sm">Assign a new sensor or product to a patient.</p>
        </Link>

        {/* Card 2: Pending Work */}
        <Link href="/pending-work" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border-t-4 border-red-500 block">
          <h2 className="text-xl font-semibold text-gray-800">Pending Work</h2>
          <p className="text-gray-600 mt-2 text-sm">View and cross off daily notifications.</p>
        </Link>

        {/* Card 3: Sales Report */}
        <Link href="/sales-report" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border-t-4 border-green-500 block">
          <h2 className="text-xl font-semibold text-gray-800">Sales Report</h2>
          <p className="text-gray-600 mt-2 text-sm">View all deployments and export to Excel.</p>
        </Link>

        <Link href="/address" className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all group flex flex-col items-center justify-center text-center">
          <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📍</div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Address</h2>
          <p className="text-sm text-gray-500 font-medium">Upload & search documents</p>
        </Link>

        <Link href="/couriers" className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all group flex flex-col items-center justify-center text-center">
          <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📦</div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Courier Tracking</h2>
          <p className="text-sm text-gray-500 font-medium">Log and track shipments</p>
        </Link>

      </div>
    </main>
  );
}