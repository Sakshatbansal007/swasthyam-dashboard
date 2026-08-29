'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';

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
    if (!file) return setMessage('Please select a file first.');
    
    setUploading(true);
    setMessage('Uploading...');

    try {
      // 1. Auto-save patient to central table if not already present
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

      // 2. Upload photo and save to archive
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

      setMessage('Document uploaded successfully!');
      setPatientName('');
      setPhoneNumber('');
      setFile(null);
      fetchPhotos(); 
      (document.getElementById('file-upload') as HTMLInputElement).value = '';
    } catch (error: any) {
      setMessage(`Upload failed: ${error.message}`);
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
      a.download = `Address_${name.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      alert("Failed to download image.");
    }
  };

  const filteredPhotos = photos.filter(p => 
    p.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.phone_number.includes(searchQuery)
  );

  return (
    <main className="p-10 bg-gray-50 min-h-screen">
      <Link href="/" className="text-blue-600 hover:underline mb-6 inline-block font-semibold">
        &larr; Back to Dashboard
      </Link>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Patient Address Archive</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="col-span-1 bg-white p-6 rounded-lg shadow-md border border-gray-200 h-fit">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Upload New Document</h2>
          <form onSubmit={handleUpload} className="flex flex-col gap-4">
            
            <div>
              <input 
                list="patient-list" type="text" required placeholder="Patient Name" 
                value={patientName} onChange={handlePatientNameChange} 
                className="w-full border rounded p-2 text-black" 
              />
              <datalist id="patient-list">
                {existingPatients.map(p => <option key={p.id} value={p.name} />)}
              </datalist>
            </div>

            <input 
              type="text" required placeholder="Phone Number" 
              value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} 
              className="border rounded p-2 text-black" 
            />
            <input 
              id="file-upload" type="file" accept="image/*" required 
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} 
              className="border rounded p-2 text-black bg-gray-50 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
            />
            <button 
              type="submit" disabled={uploading}
              className="bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {uploading ? 'Uploading...' : 'Save to Archive'}
            </button>
            {message && <p className={`text-sm font-bold mt-2 ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
          </form>
        </div>

        <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Archive Search</h2>
            <input 
              type="text" placeholder="Search by Name or Phone..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
              className="border rounded-lg p-2 text-black border-gray-300 w-72 bg-gray-50" 
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {filteredPhotos.length === 0 ? (
              <p className="text-gray-500 font-semibold col-span-2">No documents found.</p>
            ) : (
              filteredPhotos.map((photo) => (
                <div key={photo.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-gray-50">
                  <img src={photo.image_url} alt={photo.patient_name} className="w-full h-48 object-cover border-b" />
                  <div className="p-4">
                    <h3 className="font-bold text-lg text-gray-900">{photo.patient_name}</h3>
                    <p className="text-gray-600 text-sm mb-4">📞 {photo.phone_number}</p>
                    <button 
                      onClick={() => forceDownload(photo.image_url, photo.patient_name)}
                      className="w-full bg-gray-800 hover:bg-black text-white font-semibold py-2 rounded transition-colors"
                    >
                      🖨️ Download for Print
                    </button>
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