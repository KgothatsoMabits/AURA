import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Navigation,
  VolumeX,
  Shield,
  Fingerprint,
  CheckCircle2,
  Sliders,
  Radio
} from 'lucide-react';

function SleekToggle({ active, onToggle, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`relative flex items-center w-12 h-7 rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out shrink-0 ${
        active ? 'bg-rose-500' : 'bg-zinc-700'
      }`}
    >
      <span
        className={`bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-300 ease-in-out ${
          active ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function SafetySettings({ onBack = null }) {
  const navigate = useNavigate();

  // Settings state defaults
  const [settings, setSettings] = useState({
    highAccuracyGps: true,
    silentDispatch: false,
    shareDataWithCpf: true,
    biometricLock: true,
  });

  const [toastMessage, setToastMessage] = useState('');

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/profile');
    }
  };

  const handleToggle = (key, name) => {
    setSettings((prev) => {
      const nextVal = !prev[key];
      setToastMessage(`${name} ${nextVal ? 'enabled' : 'disabled'}`);
      setTimeout(() => setToastMessage(''), 2500);
      return { ...prev, [key]: nextVal };
    });
  };

  return (
    <div className="flex-1 min-h-full min-h-[100dvh] bg-black text-white px-4 py-5 pb-28 font-sans selection:bg-rose-500/30">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Header with Back Navigation */}
        <div className="flex items-center space-x-3 pt-1">
          <button
            type="button"
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Back to Profile"
          >
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white leading-snug">
              Safety Settings
            </h1>
            <p className="text-xs text-zinc-400 tracking-tight">
              Hardware sensors and escalation preferences
            </p>
          </div>
        </div>

        {/* Temporary Feedback Toast */}
        {toastMessage && (
          <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-zinc-900 border border-white/10 text-zinc-200 text-xs animate-in fade-in">
            <CheckCircle2 size={15} className="text-rose-500 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Settings Group Container */}
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wider uppercase text-zinc-500 px-1">
            Tactical Sensor Controls
          </p>

          <div className="bg-[#111111] rounded-2xl border border-white/5 overflow-hidden">
            {/* 1. High-Accuracy GPS */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5 hover:bg-white/[0.01] transition-colors">
              <div className="flex items-center space-x-3.5 min-w-0 pr-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center text-rose-500 shrink-0">
                  <Navigation size={18} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white tracking-tight leading-snug">
                    High-Accuracy GPS
                  </p>
                  <p className="text-xs text-zinc-400 tracking-tight">
                    Uses more battery, forces continuous background location tracking.
                  </p>
                </div>
              </div>
              <SleekToggle
                active={settings.highAccuracyGps}
                onToggle={() => handleToggle('highAccuracyGps', 'High-Accuracy GPS')}
                label="Toggle High-Accuracy GPS"
              />
            </div>

            {/* 2. Silent Dispatch */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5 hover:bg-white/[0.01] transition-colors">
              <div className="flex items-center space-x-3.5 min-w-0 pr-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center text-rose-500 shrink-0">
                  <VolumeX size={18} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white tracking-tight leading-snug">
                    Silent Dispatch
                  </p>
                  <p className="text-xs text-zinc-400 tracking-tight">
                    Disables all device vibrations and sounds when SOS is active.
                  </p>
                </div>
              </div>
              <SleekToggle
                active={settings.silentDispatch}
                onToggle={() => handleToggle('silentDispatch', 'Silent Dispatch')}
                label="Toggle Silent Dispatch"
              />
            </div>

            {/* 3. Share Data with CPF */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5 hover:bg-white/[0.01] transition-colors">
              <div className="flex items-center space-x-3.5 min-w-0 pr-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center text-rose-500 shrink-0">
                  <Shield size={18} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white tracking-tight leading-snug">
                    Share Data with CPF
                  </p>
                  <p className="text-xs text-zinc-400 tracking-tight">
                    Allows local neighborhood watch to view anonymous incident beacons.
                  </p>
                </div>
              </div>
              <SleekToggle
                active={settings.shareDataWithCpf}
                onToggle={() => handleToggle('shareDataWithCpf', 'Share Data with CPF')}
                label="Toggle Share Data with CPF"
              />
            </div>

            {/* 4. Biometric Lock */}
            <div className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.01] transition-colors">
              <div className="flex items-center space-x-3.5 min-w-0 pr-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 flex items-center justify-center text-rose-500 shrink-0">
                  <Fingerprint size={18} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white tracking-tight leading-snug">
                    Biometric Lock
                  </p>
                  <p className="text-xs text-zinc-400 tracking-tight">
                    Require FaceID/Fingerprint to open the Aura app.
                  </p>
                </div>
              </div>
              <SleekToggle
                active={settings.biometricLock}
                onToggle={() => handleToggle('biometricLock', 'Biometric Lock')}
                label="Toggle Biometric Lock"
              />
            </div>
          </div>
        </div>

        {/* Security & Audit Info Note */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900 space-y-1.5 text-xs text-zinc-500">
          <div className="flex items-center space-x-1.5 text-zinc-400 font-medium">
            <Radio size={14} className="text-rose-500" />
            <span>End-to-End Encrypted Telemetry</span>
          </div>
          <p>
            Emergency sensor configurations are cached offline on-device to ensure fail-safe execution during network blackouts.
          </p>
        </div>

      </div>
    </div>
  );
}
