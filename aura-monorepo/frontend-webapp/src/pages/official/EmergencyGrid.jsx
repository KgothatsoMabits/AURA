import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Crosshair, 
  UserX, 
  HeartPulse, 
  Eye, 
  Car, 
  ArrowRight, 
  EyeOff,
  ShieldCheck
} from 'lucide-react';
import { useAuthAndSafety } from '../../context/AuthAndSafetyContext';
import { startIncident } from '../../services/dispatchService.js';

export default function EmergencyGrid() {
  const navigate = useNavigate();
  const { setIsStealthMode, setActiveEmergency } = useAuthAndSafety();

  const [selectedIncident, setSelectedIncident] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dispatch'); // 'dispatch' or 'activity'

  const incidents = [
    {
      id: 'armed-robbery',
      title: 'Armed Robbery',
      description: 'Weapons drawn, immediate tactical intervention',
      icon: Crosshair,
      badge: 'Priority 1 - Armed Squad',
    },
    {
      id: 'assault',
      title: 'Assault / GBV Threat',
      description: 'Physical violence / imminent danger in progress',
      icon: UserX,
      badge: 'Priority 1 - Crisis Unit',
    },
    {
      id: 'medical',
      title: 'Medical Trauma',
      description: 'Severe cardiac, trauma, or emergency dispatch',
      icon: HeartPulse,
      badge: 'Priority 1 - EMS Paramedic',
    },
    {
      id: 'suspicious-activity',
      title: 'Suspicious Activity',
      description: 'Prowler, casing property, stalking alert',
      icon: Eye,
      badge: 'Sector Patrol Intercept',
    },
    {
      id: 'vehicle-theft',
      title: 'Vehicle Hijacking',
      description: 'Hijacking or vehicle theft underway',
      icon: Car,
      badge: 'ANPR Tracker Patrol',
    },
  ];

  // Handle button tap -> start 5s countdown with haptic feedback
  const handleSelectIncident = (incident) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(60); } catch (e) {}
    }
    setSelectedIncident(incident);
    setCountdown(5);
    setIsModalOpen(true);
  };

  // 5-second countdown timer effect
  useEffect(() => {
    if (!isModalOpen) return;

    if (countdown <= 0) {
      finalizeDispatch();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isModalOpen, countdown]);

  const finalizeDispatch = async () => {
    if (!selectedIncident) return;
    try {
      const threatLevel = /priority 1|critical/i.test(selectedIncident.badge || '') ? 'critical' : /priority 2|high/i.test(selectedIncident.badge || '') ? 'high' : 'medium';
      await startIncident({ category: selectedIncident.title, threatLevel, callbacks: { onStatus: setActiveEmergency, onClosed: () => setActiveEmergency(null) } });
      setIsModalOpen(false);
      navigate('/');
    } catch (error) {
      setIsModalOpen(false);
      window.alert(error?.name === 'LocationError' ? 'Your current location could not be obtained. No incident was created. Call 10111 if you need immediate help.' : (error?.message || 'Unable to create an incident.'));
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-4 pt-10 sm:pt-12 bg-black text-white font-sans selection:bg-rose-500/30 selection:text-white space-y-4">
      {/* Segmented View Toggle & Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight leading-snug">Tactical Incident Grid</h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Select emergency category for immediate 5-second dispatch.
          </p>
        </div>
      </div>

      <div className="flex rounded-xl bg-zinc-900/80 p-1 border border-zinc-800 text-xs">
        <button
          onClick={() => setActiveTab('dispatch')}
          className={`flex-1 py-1.5 rounded-lg font-semibold transition cursor-pointer text-center ${
            activeTab === 'dispatch' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Incident Categories
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex-1 py-1.5 rounded-lg font-semibold transition cursor-pointer text-center ${
            activeTab === 'activity' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Sector Reports (0)
        </button>
      </div>

      {activeTab === 'dispatch' ? (
        /* Tactile Incidents List - Vertically centered in freed space */
        <div className="space-y-2.5 flex-1 flex flex-col justify-center">
          {incidents.map((incident) => {
            const Icon = incident.icon;
            return (
              <button
                key={incident.id}
                onClick={() => handleSelectIncident(incident)}
                className="w-full p-3.5 rounded-2xl bg-zinc-950/90 hover:bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between text-left transition transform active:scale-98 cursor-pointer min-h-[58px] group"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-rose-500 shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-white tracking-tight leading-snug">{incident.title}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{incident.description}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0 ml-2" />
              </button>
            );
          })}
        </div>
      ) : (
        /* Sector Reports Empty State */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3 my-auto">
          <div className="w-16 h-16 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-white/40">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white tracking-tight leading-snug">
              No Incidents Reported
            </h3>
            <p className="text-xs text-white/40 max-w-xs font-mono">
              Your safety perimeter is currently secure.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('dispatch')}
            className="mt-3 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold cursor-pointer"
          >
            Open Dispatch Grid
          </button>
        </div>
      )}

      {/* Task 2: Relocated Disguise (Stealth Mode) Button replacing legacy 10111 dispatch prompt */}
      <div className="pt-2">
        <button
          onClick={() => {
            setIsStealthMode(true);
            navigate('/calendar');
          }}
          className="bg-[#111111] hover:bg-zinc-800 text-white w-full py-4 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer text-xs font-semibold tracking-tight leading-snug"
        >
          <EyeOff size={20} className="text-zinc-400" />
          <span>Disguise</span>
        </button>
      </div>

      {/* 5-Second Countdown Modal */}
      {isModalOpen && selectedIncident && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="max-w-xs w-full bg-[#0e0e10] border border-zinc-800 rounded-3xl p-5 shadow-2xl text-center space-y-4 font-sans">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="#27272a"
                  strokeWidth="4"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="#ef4444"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={213}
                  strokeDashoffset={213 * (1 - countdown / 5)}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <span className="absolute text-2xl font-black text-white">{countdown}</span>
            </div>

            <div>
              <h3 className="text-base font-bold text-white tracking-tight leading-snug">Dispatching {selectedIncident.title}</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Broadcasting GPS coordinates to Gauteng Flying Squad. Tap cancel if triggered accidentally.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold cursor-pointer min-h-[44px]"
              >
                Cancel Dispatch
              </button>
              <button
                onClick={finalizeDispatch}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer min-h-[44px] tracking-tight leading-snug"
              >
                Dispatch Immediately
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
