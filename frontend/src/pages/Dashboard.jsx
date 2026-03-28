import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  Shield, 
  Activity, 
  Loader2, 
  Play,
  FileVideo,
  Info,
  Server,
  RefreshCw,
  Zap
} from "lucide-react";

// --- CONFIGURATION ---
// IMPORTANT: If hosting on Render, change this to your actual Render URL (e.g., https://your-app.onrender.com)
const API_BASE_URL = "http://localhost:4000";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [video, setVideo] = useState(null);
  const [error, setError] = useState(null);
  const [isBackendOnline, setIsBackendOnline] = useState(null); // null = checking, true = online, false = offline
  const [checkingBackend, setCheckingBackend] = useState(true);
  const fileInputRef = useRef(null);

  // Function to check backend health
  const checkHealth = async () => {
    try {
      // Use validateStatus to ensure that even a 404 (if the root path isn't defined) 
      // counts as the server being "awake" and responsive.
      await axios.get(`${API_BASE_URL}/`, { 
        timeout: 8000,
        validateStatus: (status) => status < 500 // Any response under 500 means the server is alive
      });
      setIsBackendOnline(true);
      // Clear any previous "failed" errors once the link is established
      if (error?.includes("offline")) setError(null);
    } catch (err) {
      console.warn("Gateway handshake failed:", err.message);
      setIsBackendOnline(false);
    } finally {
      setCheckingBackend(false);
    }
  };

  useEffect(() => {
    checkHealth();
    // Poll more frequently when offline to catch the "wake up" immediately
    const interval = setInterval(checkHealth, isBackendOnline ? 20000 : 5000);
    return () => clearInterval(interval);
  }, [isBackendOnline]);

  const analyze = async (file) => {
    if (!isBackendOnline) {
      setError("Analysis unavailable: Neural Gateway is currently offline.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const formData = new FormData();
      formData.append("video", file);

      const res = await axios.post(
        `${API_BASE_URL}/api/process`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setResult(res.data);
      setVideo(
        `${API_BASE_URL}/annotated_videos/${res.data.annotatedVideo}?t=${Date.now()}`
      );
    } catch (err) {
      console.error(err);
      setError(`Neural processing failed. Please check your connection.`);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) analyze(file);
  };

  const getSeverityColor = (severity) => {
    const s = severity?.toLowerCase();
    if (s?.includes("high") || s?.includes("critical")) return "text-red-400 bg-red-400/10 border-red-400/20";
    if (s?.includes("medium") || s?.includes("moderate")) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
    return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Background Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[500px] bg-indigo-600/10 blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 overflow-hidden rounded-xl bg-indigo-600 border border-indigo-400/20 flex items-center justify-center p-1.5 shadow-lg shadow-indigo-500/20">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-[0.2em] text-indigo-400 uppercase block leading-none mb-1">Neural Observer</span>
                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${isBackendOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-bounce'}`} />
                   <span className={`text-[11px] font-bold uppercase tracking-wider ${isBackendOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {checkingBackend ? 'Handshaking...' : isBackendOnline ? 'System Ready to Use' : 'Gateway Standby'}
                   </span>
                </div>
              </div>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-white">
              I <span className="text-indigo-500 underline decoration-indigo-500/30 underline-offset-8">SEE</span>
            </h1>
            <p className="text-slate-400 mt-2 text-lg">AI-Powered Forensic Collision Analysis</p>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden md:block text-right">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Processing Node</p>
                <div className="flex flex-col items-end">
                  <p className={`text-sm flex items-center gap-1.5 font-mono ${isBackendOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
                    <Server className="w-3.5 h-3.5" /> {isBackendOnline ? 'Primary AI Core [ACTIVE]' : 'Core Initializing...'}
                  </p>
                  {!isBackendOnline && !checkingBackend && (
                    <button 
                      onClick={checkHealth}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 mt-1 flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Force Retry Connection
                    </button>
                  )}
                </div>
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Controls & Results */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Connection Warning Prompt - Only shows when definitively OFFLINE */}
            {isBackendOnline === false && !checkingBackend && (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-5 flex gap-4 items-center animate-in fade-in duration-700">
                <div className="relative">
                    <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                    <Zap className="w-3 h-3 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div>
                    <h4 className="text-indigo-100 font-bold text-sm">System Starting</h4>
                    <p className="text-indigo-300/70 text-xs leading-relaxed mt-0.5">
                      The AI gateway is currently waking up from standby. This usually takes 40-60 seconds on Render. <br/>
                      <span className="font-bold">The page will unlock automatically once ready.</span>
                    </p>
                </div>
              </div>
            )}

            {/* Ready Notification - Shows when ONLINE */}
            {isBackendOnline === true && !loading && !result && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex gap-3 items-center animate-in slide-in-from-left-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <p className="text-emerald-200/80 text-sm font-medium">
                  Neural Core established. You can now upload footage for analysis.
                </p>
              </div>
            )}

            {/* Upload Area */}
            <div 
              onClick={() => isBackendOnline && fileInputRef.current?.click()}
              className={`
                group relative overflow-hidden border-2 border-dashed rounded-3xl p-10 transition-all 
                ${!isBackendOnline ? 'opacity-40 cursor-not-allowed grayscale bg-slate-900/20' : 'cursor-pointer'}
                ${loading ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/50'}
              `}
            >
              <input
                type="file"
                accept="video/*"
                onChange={handleFile}
                className="hidden"
                ref={fileInputRef}
                disabled={loading || !isBackendOnline}
              />
              
              <div className="flex flex-col items-center text-center">
                {loading ? (
                  <div className="space-y-4">
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
                    <div>
                      <h3 className="text-xl font-bold text-white">Analyzing Feed...</h3>
                      <p className="text-slate-400 text-sm mt-1">Scanning frames for kinetic anomalies.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={`w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 transition-all ${isBackendOnline ? 'group-hover:scale-110 group-hover:bg-indigo-600 shadow-xl shadow-indigo-500/20' : ''}`}>
                      <Upload className={`w-8 h-8 ${isBackendOnline ? 'text-slate-400 group-hover:text-white' : 'text-slate-600'}`} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {isBackendOnline ? 'Upload Incident Footage' : 'Connecting to Gateway...'}
                    </h3>
                    <p className="text-slate-400 text-sm">
                      {isBackendOnline ? 'Drag and drop or click to browse' : 'Please wait for the server instance to wake up.'}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-red-500 text-sm">System Alert</h4>
                  <p className="text-red-200/70 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Results Card */}
            {result && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-500" />
                    AI Insights
                  </h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setResult(null)}
                      className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border border-slate-700 text-slate-400 hover:bg-slate-800"
                    >
                      Reset
                    </button>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${getSeverityColor(result.aiDecision.severity)}`}>
                      {result.aiDecision.severity}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                      <FileVideo className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-0.5">Event Class</p>
                      <p className="text-white font-medium text-lg capitalize">{result.eventType}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                      <Info className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-0.5">AI Reasoning</p>
                      <p className="text-slate-300 leading-relaxed italic">"{result.aiDecision.reason}"</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Video Playback */}
          <div className="lg:col-span-7">
            <div className="relative aspect-video bg-slate-900 rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl shadow-black/50 group">
              {video ? (
                <video
                  controls
                  key={video}
                  className="w-full h-full object-cover"
                  autoPlay
                >
                  <source src={video} type="video/mp4" />
                </video>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                  <div className="w-20 h-20 rounded-full bg-slate-800/50 border border-slate-700 flex items-center justify-center mb-4">
                    <Play className="w-8 h-8 opacity-20" />
                  </div>
                  <p className="text-sm font-medium">Waiting for video input...</p>
                </div>
              )}
              
              {/* Overlay Tags */}
              {video && (
                <div className="absolute top-4 left-4 pointer-events-none">
                  <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-white tracking-widest uppercase">I SEE Vision Output</span>
                  </div>
                </div>
              )}
            </div>
            
            {video && (
              <div className="mt-4 flex items-center justify-between text-xs font-medium text-slate-500 px-2">
                <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Visualization ready</span>
                <span>ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}