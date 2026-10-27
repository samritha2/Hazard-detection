import React, { useState, useRef } from 'react';
import { Camera, UploadCloud, Video, AlertTriangle, CheckCircle2, Loader2, PlayCircle } from 'lucide-react';

export default function MediaUploadPanel({ onUploadComplete, workers, zones }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState(null); // 'idle', 'uploading', 'processing', 'success', 'error'
  const [message, setMessage] = useState('');
  
  const [workerId, setWorkerId] = useState('W-104');
  const [zoneId, setZoneId] = useState('ZONE-D');
  
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setStatus('idle');
      setMessage('');
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      setStatus('idle');
      setMessage('');
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(dropped));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setStatus('uploading');
    setMessage('Uploading media to cloud backend...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('worker_id', workerId);
    
    const workerName = workers.find(w => w.id === workerId)?.name || 'Unknown Worker';
    formData.append('worker_name', workerName);
    formData.append('zone_id', zoneId);

    // Approximate lat/lng from zone (for demo purposes)
    const zoneLat = 12.9724;
    const zoneLng = 77.5949;
    formData.append('latitude', zoneLat);
    formData.append('longitude', zoneLng);

    try {
      setStatus('processing');
      setMessage('Analyzing frames with YOLOv8 Engine...');
      
      const response = await fetch('http://localhost:8000/api/incidents/upload-media', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setStatus('success');
        if (result.status === 'PROCESSING') {
          setMessage('Video uploaded successfully. Background YOLO processing started. Hazards will appear in the live feed.');
        } else if (result.status === 'SAFE') {
          setMessage('Analysis complete. No hazards detected in this image.');
        } else {
          setMessage(`Hazard Detected: ${result.incident.hazard_type} (${result.incident.severity})`);
        }
        if (onUploadComplete) onUploadComplete(result);
      } else {
        setStatus('error');
        setMessage(result.detail || result.message || 'Upload failed.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error or server unavailable.');
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelection = () => {
    setFile(null);
    setPreviewUrl(null);
    setStatus('idle');
    setMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl w-full max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <Camera className="text-blue-400 w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100">Site Media Analysis</h2>
          <p className="text-slate-400 text-sm">Upload video or image for real-time YOLOv8 hazard detection</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Upload Area */}
        <div 
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer min-h-[300px]
            ${!file ? 'border-slate-700 hover:border-blue-500/50 bg-slate-800/50 hover:bg-slate-800' : 'border-slate-700 bg-slate-950'}
          `}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*,video/mp4,video/avi,video/quicktime" 
            onChange={handleFileChange}
          />

          {!file ? (
            <>
              <UploadCloud className="w-16 h-16 text-slate-500 mb-4" />
              <p className="text-slate-300 font-medium mb-1">Click or drag media here</p>
              <p className="text-slate-500 text-sm">Supports .jpg, .png, .mp4, .avi</p>
            </>
          ) : (
            <div className="relative w-full h-full flex flex-col items-center">
              {file.type.startsWith('video/') ? (
                <div className="w-full aspect-video bg-slate-900 rounded-lg flex items-center justify-center border border-slate-700 overflow-hidden relative">
                   <video src={previewUrl} className="w-full h-full object-contain opacity-50" />
                   <PlayCircle className="w-12 h-12 text-blue-400 absolute z-10" />
                </div>
              ) : (
                <img src={previewUrl} alt="Preview" className="w-full max-h-[250px] object-contain rounded-lg shadow-lg border border-slate-700" />
              )}
              <div className="mt-4 flex items-center justify-between w-full">
                <span className="text-sm text-slate-300 truncate max-w-[200px]">{file.name}</span>
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); clearSelection(); }}
                  className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
                  disabled={isUploading}
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Metadata & Submit */}
        <div className="flex flex-col">
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Camera / Worker Source</label>
                <select 
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                  disabled={isUploading}
                >
                  {workers?.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Site Zone</label>
                <select 
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  disabled={isUploading}
                >
                  {zones?.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Display */}
              {status && status !== 'idle' && (
                <div className={`p-4 rounded-lg mt-6 border flex items-start gap-3 ${
                  status === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                  status === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  'bg-blue-500/10 border-blue-500/20 text-blue-400'
                }`}>
                  {status === 'error' && <AlertTriangle className="w-5 h-5 shrink-0" />}
                  {status === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
                  {(status === 'uploading' || status === 'processing') && <Loader2 className="w-5 h-5 shrink-0 animate-spin" />}
                  <span className="text-sm font-medium leading-tight">{message}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!file || isUploading}
              className={`w-full py-3 mt-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                !file || isUploading 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20'
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing Media...
                </>
              ) : (
                <>
                  <Video className="w-5 h-5" />
                  Analyze with YOLOv8
                </>
              )}
            </button>
          </form>
        </div>
      </div>
      
      <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-500 flex justify-between items-center">
         <span>Powered by HALVF YOLOv8 Inference Engine</span>
         <span>Supports MP4 / AVI / JPG / PNG</span>
      </div>
    </div>
  );
}
