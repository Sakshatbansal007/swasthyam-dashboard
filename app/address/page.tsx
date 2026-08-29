'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Activity, ArrowLeft, Search, UploadCloud, FileText, Download, CheckCircle2 } from 'lucide-react';

export default function AddressArchive() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [existingPatients, setExistingPatients] = useState<any[]>([]);
  
  const [patientName, setPatientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchPhotos();
    fetchPatients();
  }, []);

  async function fetchPhotos() {
    const { data } = await supabase.from('photo_archive').select('*').order('created_at', { ascending: false });
    if (data) setPhotos(data);
  }

  async function fetchPatients() {
    const { data } = await supabase.from('patients').select('*');
    if (data) setExistingPatients(data);
  }

  const handlePatientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const typedName = e.target.value;
    setPatientName(typedName);

    const foundPatient = existingPatients.find(p => p.name.toLowerCase() === typedName.toLowerCase());
    if (foundPatient) {
      setPhoneNumber(foundPatient.phone || '');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setMessage('Error: Please select a file first.');
    
    setUploading(true);
    setMessage('Uploading...');

    try {
      let patientExists = existingPatients.find(p => p.name.toLowerCase() === patientName.toLowerCase());
      if (!patientExists) {
        const { data: newP, error: pErr } = await supabase
          .from('patients')
          .insert([{ name: patientName, phone: phoneNumber }])
          .select()
          .single();
        if (!pErr && newP) {
          setExistingPatients([...existingPatients, newP]);
        }
      } else if (patientExists.phone !== phoneNumber) {
        await supabase.from('patients').update({ phone: phoneNumber }).eq('id', patientExists.id);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('patient_photos').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('patient_photos').getPublicUrl(fileName);
      const imageUrl = publicUrlData.publicUrl;

      const { error: dbError } = await supabase.from('photo_archive').insert([{ 
        patient_name: patientName, 
        phone_number: phoneNumber, 
        image_url: imageUrl 
      }]);
      if (dbError) throw dbError;

      setMessage('Success: Document saved to archive!');
      setPatientName('');
      setPhoneNumber('');
      setFile(null);
      fetchPhotos(); 
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const forceDownload = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Archive_${name.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      alert("Failed to download document.");
    }
  };

  const filteredPhotos = photos.filter(p => 
    p.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.phone_number.includes(searchQuery)
  );

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

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Patient Address Archive</h1>
        <p className="text-gray-500 text-sm font-medium">Secure repository for medical shipping documents, prescription PDFs, and IDs.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upload Form */}
        <div className="col-span-1 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Upload New Document</h2>
          
          <form onSubmit={handleUpload} className="flex flex-col gap-5 text-sm">
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-gray-700 text-xs">Patient Name</label>
              <input 
                list="patient-list" required placeholder="e.g. Aria Montgomery" 
                value={patientName} onChange={handlePatientNameChange} 
                className="border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" 
              />
              <datalist id="patient-list">{existingPatients.map(p => <option key={p.id} value={p.name} />)}</datalist>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-gray-700 text-xs">Patient Phone</label>
              <input 
                type="text" required placeholder="+1 (555) 893-1122" 
                value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} 
                className="border border-gray-200 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all" 
              />
            </div>

            {/* Custom File Upload Box */}
            <div className="mt-2">
              <label htmlFor="file-upload" className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${file ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-300'}`}>
                <UploadCloud className={`w-8 h-8 mb-2 ${file ? 'text-blue-600' : 'text-blue-400'}`} />
                <span className="font-bold text-gray-700 text-sm mb-1">
                  {file ? file.name : 'Drag files to upload'}
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  {file ? 'Click to change file' : 'or browse files from system'}
                </span>
                {!file && <span className="text-[10px] text-gray-400 font-medium mt-2">PDF, PNG, JPG up to 10MB</span>}
                <input 
                  id="file-upload" type="file" accept="image/*,application/pdf" required 
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} 
                  className="hidden" 
                />
              </label>
            </div>

            <button 
              type="submit" disabled={uploading}
              className="bg-[#0077b6] text-white font-bold py-3 mt-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:bg-gray-400"
            >
              {uploading ? 'Uploading...' : 'Save to Archive'}
            </button>
            
            {message && (
              <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${message.includes('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                {message.includes('Success') && <CheckCircle2 className="w-4 h-4"/>}
                {message}
              </div>
            )}
          </form>
        </div>

        {/* Right Side Gallery */}
        <div className="col-span-1 lg:col-span-2">
          
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" placeholder="Search by Patient Name, Phone or Document ID..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 shadow-sm transition-all bg-white" 
            />
          </div>

          <h3 className="text-sm font-bold text-gray-800 mb-4 tracking-wide">Recent Shipping Records ({filteredPhotos.length})</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredPhotos.length === 0 ? (
              <div className="col-span-full p-8 text-center text-gray-400 font-medium bg-white rounded-2xl border border-gray-100 shadow-sm">
                No documents found matching your search.
              </div>
            ) : (
              filteredPhotos.map((photo) => (
                <div key={photo.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
                  
                  {/* Image Preview Area */}
                  <div className="h-40 bg-[#f8ece4] w-full overflow-hidden flex items-center justify-center p-4 border-b border-gray-100">
                    <img src={photo.image_url} alt={photo.patient_name} className="h-full object-contain drop-shadow-sm mix-blend-multiply" />
                  </div>
                  
                  {/* Details Area */}
                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="font-bold text-gray-900 mb-1">{photo.patient_name}</h3>
                    <p className="text-gray-500 text-xs font-medium mb-3">📞 {photo.phone_number}</p>
                    
                    <div className="flex items-center gap-1.5 text-blue-600 mb-4">
                      <FileText className="w-4 h-4" />
                      <span className="text-xs font-bold">Patient Document</span>
                    </div>

                    <div className="mt-auto pt-4 border-t border-gray-50 flex flex-col gap-3">
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                        Uploaded {new Date(photo.created_at).toLocaleDateString()}
                      </span>
                      <button 
                        onClick={() => forceDownload(photo.image_url, photo.patient_name)}
                        className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-bold text-xs py-2 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" /> Download for Print
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </main>
  );
}