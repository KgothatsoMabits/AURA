import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  AlertCircle, 
  ChevronUp, 
  X, 
  Crosshair, 
  UserX, 
  HeartPulse, 
  Car, 
  Eye, 
  MapPin, 
  Phone, 
  Radio, 
  Navigation,
  Clock,
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Compass,
  ArrowLeft,
  ChevronLeft,
  ShieldAlert,
  Users
} from 'lucide-react';
import { useAuthAndSafety } from '../../context/AuthAndSafetyContext';
import { useSafety } from '../../context/SafetyContext';
import apiClient from '../../services/apiClient.js';
import { startIncident } from '../../services/dispatchService.js';

// Exact custom sleek iOS toggle matching established design
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
      className={`w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ease-in-out ${
        active ? 'bg-rose-500' : 'bg-zinc-700'
      }`}
    >
      <span
        className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
          active ? 'translate-x-7' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function HomeDashboard() {
  const navigate = useNavigate();
  const { 
    activeEmergency, 
    setActiveEmergency,
    clearEmergency, 
    initiateSensors,
    setIsStealthMode 
  } = useAuthAndSafety();
  const { sosActive, cancelSos } = useSafety();

  const isEmergencyActive = !!activeEmergency || sosActive;

  // Task 1: Bottom Sheet Nested Multi-View Architecture State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [sheetView, setSheetView] = useState('primary'); // 'primary' | 'robbery_intake' | 'suspicion_nested'
  const [slideDirection, setSlideDirection] = useState(1); // 1 = forward, -1 = back

  const goToView = (view, direction = 1) => {
    setSlideDirection(direction);
    setSheetView(view);
  };

  // Task 4: Armed Robbery Quick-Fire Intake State
  const [robberyIntake, setRobberyIntake] = useState({
    weaponsVisible: false,
    intrudersInside: false,
    injuriesPresent: false,
  });

  const toggleRobberyOption = (key) => {
    setRobberyIntake((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Countdown Modal State
  const [pendingIncident, setPendingIncident] = useState(null);
  const [countdown, setCountdown] = useState(5);

  // Active Dispatch Telemetry Simulation (dynamic countdown)
  const [etaSecondsTotal, setEtaSecondsTotal] = useState(0);
  const [distanceKm, setDistanceKm] = useState(null);
  const [speedKmh, setSpeedKmh] = useState(null);
  const [isMicBroadcasting, setIsMicBroadcasting] = useState(false);
  const [showStandDownModal, setShowStandDownModal] = useState(false);

  // Countdown timer when incident is selected
  useEffect(() => {
    if (!pendingIncident) return;
    if (countdown <= 0) {
      handleFinalizeDispatch(pendingIncident);
      setPendingIncident(null);
      return;
    }
    const timer = setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [pendingIncident, countdown]);

  // Main Panic Button Click Handler with Native Device Haptics
  const handleSosClick = async () => {
    if (isEmergencyActive) { setShowStandDownModal(true); return; }
    try {
      await startIncident({ category: 'general assistance', threatLevel: 'critical', callbacks: { onStatus: setActiveEmergency, onClosed: () => { clearEmergency(); cancelSos(); } } });
    } catch (error) {
      if (error?.name === 'LocationError') {
        window.alert('Your current location could not be obtained. No incident was created. Call 10111 if you need immediate help.');
        return;
      }
      window.alert(error?.message || 'Unable to create an incident. Please try again.');
    }
  };

  const handleStartIncidentSelection = (incident) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(60); } catch (e) {}
    }
    initiateSensors();
    setIsDrawerOpen(false);
    setPendingIncident(incident);
    setCountdown(5);
  };

  const handleFinalizeDispatch = async (incident) => {
    try {
      const threatLevel = /priority 1|critical/i.test(incident.badge || '') ? 'critical' : /priority 2|high/i.test(incident.badge || '') ? 'high' : 'medium';
      await startIncident({ category: incident.title, threatLevel, note: incident.neighborhood || '', callbacks: { onStatus: setActiveEmergency, onClosed: () => { clearEmergency(); cancelSos(); } } });
    } catch (error) {
      if (error?.name === 'LocationError') window.alert('Your current location could not be obtained. No incident was created. Call 10111 if you need immediate help.');
      else window.alert(error?.message || 'Unable to create an incident. Please try again.');
    }
  };

  const handleConfirmStandDown = () => {
    if (activeEmergency?.id) {
      apiClient.cancelEmergency(activeEmergency.id, 'Citizen marked safe from Home Dashboard').catch(() => {});
    }
    clearEmergency();
    cancelSos();
    setShowStandDownModal(false);
    setEtaSecondsTotal(0);
    setDistanceKm(null);
  };

  // Task 3: Assault / GBV Flow (Discretion Priority)
  const handleAssaultGbvClick = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([100, 50, 100]); } catch (e) {}
    }
    // Zero questions in Official UI; immediate switch to Stealth Planner
    setIsDrawerOpen(false);
    setSheetView('primary');
    setIsStealthMode(true);
    navigate('/calendar');
  };

  // Task 4: Armed Robbery Flow
  const handleArmedRobberyClick = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(50); } catch (e) {}
    }
    goToView('robbery_intake', 1);
  };

  const handleDispatchRobberyTactical = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([200, 80, 200]); } catch (e) {}
    }
    initiateSensors();
    setIsDrawerOpen(false);
    goToView('primary', -1);

    const robberyPayload = {
      id: 'armed-robbery',
      title: 'Armed Robbery / Intruder',
      badge: 'Priority 1 - Armed Unit',
      neighborhood: 'Sandton CBD - West St Sector',
      intakeData: { ...robberyIntake },
      weaponsReported: robberyIntake.weaponsVisible,
      intrudersBreached: robberyIntake.intrudersInside,
      injuriesPresent: robberyIntake.injuriesPresent,
    };

    setPendingIncident(robberyPayload);
    setCountdown(5);
  };

  // Task 5: Suspicion Nested Flow
  const handleSuspiciousThreatClick = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(50); } catch (e) {}
    }
    goToView('suspicion_nested', 1);
  };

  // Stubs for the 3 suspicion tactical categories as requested in Task 5
  const handleSuspicionCategorySelect = (categoryKey) => {
    // Empty stub for now; progressive next step will build this out
  };

  // High-priority tactical emergency incident definitions
  const tacticalIncidents = [
    {
      id: 'armed-robbery',
      title: 'Armed Robbery / Intruder',
      desc: 'Immediate tactical armed intervention',
      badge: 'Priority 1 - Armed Unit',
      neighborhood: 'Sandton CBD - West St Sector',
      icon: Crosshair,
    },
    {
      id: 'assault-gbv',
      title: 'Assault / GBV Threat',
      desc: 'Physical threat in progress, immediate rescue',
      badge: 'Priority 1 - Crisis Unit',
      neighborhood: 'Sandton - Rivonia Corridor',
      icon: UserX,
    },
    {
      id: 'medical-trauma',
      title: 'Medical Trauma / EMS',
      desc: 'Severe trauma, cardiac, or paramedic escort',
      badge: 'Priority 1 - Paramedic EMS',
      neighborhood: 'Morningside - Outspan Rd',
      icon: HeartPulse,
    },
    {
      id: 'hijacking',
      title: 'Vehicle Hijacking / Theft',
      desc: 'High-speed ANPR tracking & perimeter intercept',
      badge: 'Priority 1 - Intercept Patrol',
      neighborhood: 'Grayston Interchange - M1 North',
      icon: Car,
    },
    {
      id: 'prowler',
      title: 'Suspicious Prowler / Threat',
      desc: 'Perimeter check, covert spotlight pass',
      badge: 'Sector Patrol Sweep',
      neighborhood: 'Sandton Central Sector',
      icon: Eye,
    },
  ];

  // Format ETA into mm:ss
  const etaMinutes = Math.floor(etaSecondsTotal / 60);
  const etaSeconds = etaSecondsTotal % 60;

  return (
    <div className="relative flex-1 flex flex-col justify-between select-none overflow-hidden font-sans bg-black text-white">
      {/* 1. Tactical Live Vector Map Background */}
      <div className="absolute inset-0 z-0 bg-[#000000] tactical-grid-streets overflow-hidden pointer-events-none">
        {/* Subtle Map Ambient Radial Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-zinc-950/60 blur-3xl pointer-events-none"></div>

        {/* Live Concentric Radar Waves from User Location */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 pointer-events-none">
          <div className="absolute inset-0 rounded-full border border-white/[0.04] animate-ping" style={{ animationDuration: '4s' }}></div>
          <div className="absolute inset-12 rounded-full border border-white/[0.06] animate-ping" style={{ animationDuration: '3s' }}></div>
          <div className="absolute inset-24 rounded-full border border-white/[0.08]"></div>
          
          {/* Animated Radar Sweep Line */}
          <div className="absolute inset-0 rounded-full animate-radar-sweep pointer-events-none">
            <div className="w-1/2 h-0.5 bg-gradient-to-r from-transparent to-rose-500/30 origin-right"></div>
          </div>
        </div>

        {/* Tactical SVG Route Trail (Visible when emergency is active) */}
        {isEmergencyActive && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line
              x1="28%"
              y1="22%"
              x2="50%"
              y2="50%"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              className="animate-pulse"
            />
          </svg>
        )}

        {/* Nearby Patrol Unit Markers on Map */}
        <div className="absolute top-[22%] left-[28%] -translate-x-1/2 -translate-y-1/2 flex items-center space-x-1.5 z-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-lg border ${isEmergencyActive ? 'bg-rose-600 border-rose-400 text-white animate-bounce' : 'bg-zinc-900 border-zinc-700 text-zinc-300'}`}>
            <Car className="w-3.5 h-3.5" />
          </div>
          <span className="text-[9px] font-mono font-bold tracking-tight bg-black/90 px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-300 whitespace-nowrap">
            {activeEmergency?.unit || 'Awaiting responder assignment'}
          </span>
        </div>

        {/* User GPS Pin Center Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none">
          <div className="w-4 h-4 rounded-full bg-rose-500 ring-4 ring-rose-500/30 animate-pulse"></div>
        </div>
      </div>

      {/* 2. Top Floating Telemetry Pill */}
      <div className="relative z-10 px-4 pt-3 flex justify-between items-center">
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-zinc-950/90 backdrop-blur-md border border-zinc-800 text-[11px] shadow-lg">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          <span className="font-semibold text-zinc-200 tracking-tight">
            {activeEmergency?.status ? activeEmergency.status.toUpperCase() : 'LOCATION NOT YET SHARED'}
          </span>
          <span className="text-zinc-600">&bull;</span>
          <span className="text-zinc-400 font-mono text-[10px]">
            {isEmergencyActive ? 'PRIORITY 1' : 'SANDTON CBD'}
          </span>
        </div>

        {isEmergencyActive && (
          <button
            onClick={() => setShowStandDownModal(true)}
            className="px-2.5 py-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-[10px] font-semibold text-zinc-300 hover:text-white transition cursor-pointer"
          >
            Stand Down
          </button>
        )}
      </div>

      {/* 3. Center Stage: Either Idle Beacon OR Active Live Uber-Style Tracking HUD */}
      {!isEmergencyActive ? (
        /* IDLE STATE: Massive Minimalist Tactile Beacon with Ambient Neon Glow */
        <div className="relative z-10 flex-1 my-auto flex flex-col items-center justify-center px-4 py-6">
          <div className="relative flex items-center justify-center">
            {/* Ambient Radial Breathing Aura */}
            <motion.div
              animate={{
                scale: [1, 1.22, 1.4],
                opacity: [0.35, 0.15, 0],
              }}
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: 'easeOut',
              }}
              className="absolute w-64 h-64 rounded-full bg-gradient-to-tr from-rose-500/30 via-red-600/20 to-transparent blur-2xl pointer-events-none"
            />

            {/* Core Halo Breathing Transform */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.6, 0.9, 0.6],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute w-52 h-52 rounded-full bg-gradient-to-tr from-rose-600/30 to-red-500/20 blur-xl pointer-events-none"
            />

            {/* The Massive Tactile SOS Beacon with Exact Requested Neon Glow & Breathing Pulse */}
            <motion.button
              onClick={handleSosClick}
              whileTap={{ scale: 0.94 }}
              animate={{
                scale: [1, 1.025, 1],
              }}
              transition={{
                duration: 2.6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              aria-label="Dispatch Emergency Distress Beacon"
              className="relative z-10 w-48 h-48 rounded-full flex flex-col items-center justify-center text-white cursor-pointer select-none transition-all shadow-[0_0_80px_-15px_rgba(225,29,72,0.6)] animate-pulse backdrop-blur-2xl border border-white/20 bg-gradient-to-tr from-rose-600 via-red-600 to-rose-700 hover:brightness-105 active:brightness-95"
            >
              {/* Inner Gloss Ring */}
              <div className="absolute inset-2 rounded-full bg-gradient-to-b from-white/25 via-transparent to-black/20 pointer-events-none" />

              <AlertCircle className="w-12 h-12 mb-1.5 drop-shadow-md text-white" />

              <span className="text-4xl font-black tracking-tightest drop-shadow-md">
                SOS
              </span>

              <span className="text-[10px] font-mono tracking-widest uppercase mt-1 text-white/90">
                TAP TO BROADCAST
              </span>
            </motion.button>
          </div>

          <h2 className="text-base font-bold text-white tracking-tight leading-snug mt-6 text-center">
            Tap SOS for Emergency Dispatch
          </h2>
          <p className="text-[11px] text-zinc-400 tracking-tight mt-1 text-center max-w-xs leading-relaxed font-mono">
            INSTANT TACTICAL POLICE & CITIZEN BROADCAST
          </p>
        </div>
      ) : (
        /* ACTIVE DISPATCH STATE: Live Uber-Style Tracking HUD */
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 flex-1 my-auto flex flex-col justify-center px-4 w-full max-w-sm mx-auto space-y-3"
        >
          {/* Real-time Dynamic ETA Banner */}
          <div className="bg-zinc-950/95 border border-zinc-800 rounded-3xl p-4 shadow-2xl backdrop-blur-xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-rose-600 animate-pulse" />
            
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1">
              <span className="flex items-center space-x-1 text-rose-400 font-bold tracking-tight">
                <Clock className="w-3 h-3" />
                <span>ESTIMATED ARRIVAL</span>
              </span>
              <span className="text-zinc-500">SPEED: {speedKmh} KM/H</span>
            </div>

            <div className="text-4xl font-black text-white tracking-tight leading-snug flex items-baseline justify-center space-x-1.5 my-1">
              <span>{activeEmergency?.etaMinutes == null ? '—' : `${activeEmergency.etaMinutes} min`}</span>
              <span className="text-sm font-semibold text-zinc-400">MIN</span>
            </div>

            <div className="flex items-center justify-center space-x-3 text-xs text-zinc-300 font-mono mt-1">
              <span>{distanceKm} km away</span>
              <span>&bull;</span>
              <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                <Volume2 className="w-3.5 h-3.5" />
                <span>SIREN ENGAGED</span>
              </span>
            </div>
          </div>

          {/* Assigned Unit & Officer Card */}
          <div className="bg-zinc-950/90 border border-zinc-800 rounded-3xl p-3.5 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-2.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-rose-500">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white tracking-tight leading-snug">
                    {activeEmergency?.unit || activeEmergency?.unitCallsign || 'Awaiting responder assignment'}
                  </h4>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    {activeEmergency?.vehicleDetails || 'Toyota Hilux 4x4 • BCF 942 GP'}
                  </p>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 uppercase">
                {activeEmergency?.status || 'DISPATCHED'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-zinc-500 block">OFFICER IN COMMAND</span>
                <span className="font-semibold text-zinc-200">
                  {activeEmergency?.responderName || 'Not assigned yet'}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-zinc-500 block">BADGE SERIAL</span>
                <span className="font-semibold text-zinc-200">
                  {activeEmergency?.badgeNumber || 'SAPS-7049-GP'}
                </span>
              </div>
            </div>
          </div>

          {/* Tactical Live Actions: 10111 Direct Call & Silent Mic Broadcast */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href="tel:10111"
              className="py-3 px-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-rose-600/30 transition cursor-pointer min-h-[48px] tracking-tight leading-snug"
            >
              <Phone className="w-4 h-4 animate-pulse" />
              <span>10111 CALL</span>
            </a>

            <button
              onClick={() => setIsMicBroadcasting(!isMicBroadcasting)}
              className={`py-3 px-3 rounded-2xl border font-bold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer min-h-[48px] tracking-tight leading-snug ${
                isMicBroadcasting
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                  : 'bg-zinc-950 hover:bg-zinc-900 border-zinc-800 text-zinc-300'
              }`}
            >
              {isMicBroadcasting ? <Mic className="w-4 h-4 text-emerald-400 animate-pulse" /> : <MicOff className="w-4 h-4 text-zinc-400" />}
              <span>{isMicBroadcasting ? 'LIVE AUDIO ON' : 'SILENT MIC'}</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* 4. Bottom Drawer Action Bar: Pull-up / Tap to Reveal Tactical Categories */}
      <div className="relative z-10 px-4 pb-3">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            setIsDrawerOpen(true);
            setSheetView('primary');
          }}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-zinc-950/90 hover:bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 text-zinc-200 text-xs font-semibold tracking-tight leading-snug shadow-2xl transition cursor-pointer min-h-[48px]"
        >
          <div className="flex items-center space-x-2">
            <Radio className="w-3.5 h-3.5 text-rose-500" />
            <span>Emergency Options</span>
          </div>
          <div className="flex items-center space-x-1 text-zinc-400 text-[11px] font-mono">
            <span>TACTICAL PROTOCOLS</span>
            <ChevronUp className="w-4 h-4" />
          </div>
        </motion.button>
      </div>

      {/* 5. Draggable Uber-Style Bottom Sheet Drawer (Nested Multi-View Architecture) */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsDrawerOpen(false);
                setSheetView('primary');
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-xs z-40 cursor-pointer"
            />

            {/* Bottom Sheet Container */}
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 300 }}
              dragElastic={0.2}
              onDragEnd={(event, info) => {
                if (info.offset.y > 100 || info.velocity.y > 200) {
                  setIsDrawerOpen(false);
                  setSheetView('primary');
                }
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="absolute bottom-0 left-0 right-0 bg-[#0c0c0e] border-t border-zinc-800 rounded-t-[32px] p-4 z-50 shadow-2xl space-y-3 cursor-grab active:cursor-grabbing max-h-[85vh] overflow-y-auto"
            >
              {/* Sheet Drag Handle */}
              <div className="w-12 h-1.5 bg-zinc-700/80 rounded-full mx-auto mb-1 hover:bg-zinc-600 transition-colors" />

              {/* Task 1: Framer Motion AnimatePresence mode="wait" for Nested Views with Spring Physics */}
              <AnimatePresence mode="wait" custom={slideDirection}>
                {/* Task 2: The Primary View (sheetView === 'primary') */}
                {sheetView === 'primary' && (
                  <motion.div
                    key="primary"
                    custom={slideDirection}
                    variants={{
                      enter: (dir) => ({
                        x: dir > 0 ? 40 : -40,
                        opacity: 0,
                      }),
                      center: {
                        x: 0,
                        opacity: 1,
                        transition: {
                          type: 'spring',
                          stiffness: 380,
                          damping: 32,
                          mass: 0.8,
                        },
                      },
                      exit: (dir) => ({
                        x: dir > 0 ? -40 : 40,
                        opacity: 0,
                        transition: {
                          duration: 0.14,
                          ease: 'easeIn',
                        },
                      }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                      <div>
                        <h3 className="text-sm font-bold text-white tracking-tight leading-snug">Emergency Options</h3>
                        <p className="text-[11px] text-zinc-400 font-mono">Select incident category for immediate response</p>
                      </div>
                      <button
                        onClick={() => {
                          setIsDrawerOpen(false);
                          goToView('primary', -1);
                        }}
                        className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 3 Massive, highly tactile full-width buttons stacked vertically (Styled matching /emergency-grid) */}
                    <div className="space-y-2.5">
                      {/* Button 1: Assault / GBV Threat */}
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleAssaultGbvClick}
                        className="w-full p-3.5 rounded-2xl bg-zinc-950/90 hover:bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between text-left transition cursor-pointer min-h-[58px] group"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-rose-500 shrink-0 group-hover:scale-105 transition-transform">
                            <ShieldAlert className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm text-white tracking-tight leading-snug">Assault / GBV Threat</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">Immediate stealth switch & discreet crisis response</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0 ml-2" />
                      </motion.button>

                      {/* Button 2: Armed Robbery / Intruder */}
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleArmedRobberyClick}
                        className="w-full p-3.5 rounded-2xl bg-zinc-950/90 hover:bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between text-left transition cursor-pointer min-h-[58px] group"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-rose-500 shrink-0 group-hover:scale-105 transition-transform">
                            <Crosshair className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm text-white tracking-tight leading-snug">Armed Robbery / Intruder</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">Active perimeter breach, weapons reported</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0 ml-2" />
                      </motion.button>

                      {/* Button 3: Suspicious Prowler / Threat */}
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSuspiciousThreatClick}
                        className="w-full p-3.5 rounded-2xl bg-zinc-950/90 hover:bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between text-left transition cursor-pointer min-h-[58px] group"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-rose-500 shrink-0 group-hover:scale-105 transition-transform">
                            <Eye className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm text-white tracking-tight leading-snug">Suspicious Prowler / Threat</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">Perimeter recon, narcotics & syndicate patrol</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0 ml-2" />
                      </motion.button>
                    </div>

                    <div className="pt-1">
                      <a
                        href="tel:10111"
                        className="w-full py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer tracking-tight leading-snug min-h-[44px]"
                      >
                        <Phone className="w-3.5 h-3.5 text-rose-500" />
                        <span>Call 10111 Direct Police Dispatch</span>
                      </a>
                    </div>
                  </motion.div>
                )}

                {/* Task 4: Armed Robbery Flow (Quick-Fire Intake) */}
                {sheetView === 'robbery_intake' && (
                  <motion.div
                    key="robbery_intake"
                    custom={slideDirection}
                    variants={{
                      enter: (dir) => ({
                        x: dir > 0 ? 40 : -40,
                        opacity: 0,
                      }),
                      center: {
                        x: 0,
                        opacity: 1,
                        transition: {
                          type: 'spring',
                          stiffness: 380,
                          damping: 32,
                          mass: 0.8,
                        },
                      },
                      exit: (dir) => ({
                        x: dir > 0 ? -40 : 40,
                        opacity: 0,
                        transition: {
                          duration: 0.14,
                          ease: 'easeIn',
                        },
                      }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => goToView('primary', -1)}
                          className="p-1.5 -ml-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer transition-colors"
                          title="Back to Emergency Options"
                          aria-label="Back to Emergency Options"
                        >
                          <ChevronLeft className="w-5 h-5 text-zinc-300" />
                        </button>
                        <div>
                          <h3 className="text-sm font-bold text-white tracking-tight leading-snug">Armed Robbery Intake</h3>
                          <p className="text-[11px] text-zinc-400 font-mono">Quick-Fire Tactical Feed</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setIsDrawerOpen(false);
                          goToView('primary', -1);
                        }}
                        className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 3 Fast Toggle Questions with Custom Sleek iOS Toggles */}
                    <div className="space-y-2 py-0.5">
                      {/* Toggle 1: Weapons Visible */}
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/90 border border-zinc-800 hover:border-zinc-700">
                        <div className="pr-3">
                          <span className="font-bold text-xs text-white block">Are weapons visible?</span>
                          <p className="text-[11px] text-zinc-400 font-mono mt-0.5">Firearms, blades, or armed aggression</p>
                        </div>
                        <SleekToggle
                          active={robberyIntake.weaponsVisible}
                          onToggle={() => toggleRobberyOption('weaponsVisible')}
                          label="Are weapons visible?"
                        />
                      </div>

                      {/* Toggle 2: Intruders inside */}
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/90 border border-zinc-800 hover:border-zinc-700">
                        <div className="pr-3">
                          <span className="font-bold text-xs text-white block">Are intruders inside the building?</span>
                          <p className="text-[11px] text-zinc-400 font-mono mt-0.5">Breached doors, windows, or actively inside</p>
                        </div>
                        <SleekToggle
                          active={robberyIntake.intrudersInside}
                          onToggle={() => toggleRobberyOption('intrudersInside')}
                          label="Are intruders inside the building?"
                        />
                      </div>

                      {/* Toggle 3: Injuries */}
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-950/90 border border-zinc-800 hover:border-zinc-700">
                        <div className="pr-3">
                          <span className="font-bold text-xs text-white block">Are there injuries?</span>
                          <p className="text-[11px] text-zinc-400 font-mono mt-0.5">Casualties or urgent paramedic escort needed</p>
                        </div>
                        <SleekToggle
                          active={robberyIntake.injuriesPresent}
                          onToggle={() => toggleRobberyOption('injuriesPresent')}
                          label="Are there injuries?"
                        />
                      </div>
                    </div>

                    {/* Tactical Unit Dispatch Button (Muted non-vibrant palette) */}
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={handleDispatchRobberyTactical}
                      className="w-full py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition cursor-pointer min-h-[48px]"
                    >
                      <Crosshair className="w-4 h-4 text-rose-500" />
                      <span>Dispatch Tactical Unit</span>
                    </motion.button>
                  </motion.div>
                )}

                {/* Task 5: Suspicion Nested Flow (Styled matching /emergency-grid) */}
                {sheetView === 'suspicion_nested' && (
                  <motion.div
                    key="suspicion_nested"
                    custom={slideDirection}
                    variants={{
                      enter: (dir) => ({
                        x: dir > 0 ? 40 : -40,
                        opacity: 0,
                      }),
                      center: {
                        x: 0,
                        opacity: 1,
                        transition: {
                          type: 'spring',
                          stiffness: 380,
                          damping: 32,
                          mass: 0.8,
                        },
                      },
                      exit: (dir) => ({
                        x: dir > 0 ? -40 : 40,
                        opacity: 0,
                        transition: {
                          duration: 0.14,
                          ease: 'easeIn',
                        },
                      }),
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => goToView('primary', -1)}
                          className="p-1.5 -ml-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer transition-colors"
                          title="Back to Emergency Options"
                          aria-label="Back to Emergency Options"
                        >
                          <ChevronLeft className="w-5 h-5 text-zinc-300" />
                        </button>
                        <div>
                          <h3 className="text-sm font-bold text-white tracking-tight leading-snug">Suspicious Threat Categories</h3>
                          <p className="text-[11px] text-zinc-400 font-mono">Select specific tactical category</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setIsDrawerOpen(false);
                          goToView('primary', -1);
                        }}
                        className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 3 Specific Tactical Categories (Styled matching /emergency-grid) */}
                    <div className="space-y-2.5">
                      {/* Option 1: Narcotics / Contraband Distribution */}
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSuspicionCategorySelect('narcotics')}
                        className="w-full p-3.5 rounded-2xl bg-zinc-950/90 hover:bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between text-left transition cursor-pointer min-h-[58px] group"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-rose-500 shrink-0 group-hover:scale-105 transition-transform">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm text-white tracking-tight leading-snug">Narcotics / Contraband Distribution</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">Active distribution point or illicit substance drop-off</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0 ml-2" />
                      </motion.button>

                      {/* Option 2: Organized Syndicate / Gang Activity */}
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSuspicionCategorySelect('syndicate')}
                        className="w-full p-3.5 rounded-2xl bg-zinc-950/90 hover:bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between text-left transition cursor-pointer min-h-[58px] group"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-rose-500 shrink-0 group-hover:scale-105 transition-transform">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm text-white tracking-tight leading-snug">Organized Syndicate / Gang Activity</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">Coordinated gang presence, intimidation or scouting</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0 ml-2" />
                      </motion.button>

                      {/* Option 3: Unidentified Prowler or Vehicle */}
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSuspicionCategorySelect('prowler_vehicle')}
                        className="w-full p-3.5 rounded-2xl bg-zinc-950/90 hover:bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between text-left transition cursor-pointer min-h-[58px] group"
                      >
                        <div className="flex items-center space-x-3.5">
                          <div className="w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-rose-500 shrink-0 group-hover:scale-105 transition-transform">
                            <Eye className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm text-white tracking-tight leading-snug">Unidentified Prowler or Vehicle</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">Suspicious vehicle or individual loitering perimeter</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors shrink-0 ml-2" />
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 6. Cancelable 5-Second Dispatch Countdown Modal */}
      <AnimatePresence>
        {pendingIncident && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 font-sans"
          >
            <div className="max-w-xs w-full bg-[#0e0e10] border border-zinc-800 rounded-3xl p-5 shadow-2xl text-center space-y-4">
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
                <h4 className="font-bold text-sm text-white tracking-tight leading-snug">Dispatching {pendingIncident.title}</h4>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Broadcasting live coordinates to Gauteng Flying Squad. Tap cancel if triggered by mistake.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  onClick={() => setPendingIncident(null)}
                  className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold cursor-pointer min-h-[44px]"
                >
                  Cancel Dispatch
                </button>
                <button
                  onClick={() => {
                    handleFinalizeDispatch(pendingIncident);
                    setPendingIncident(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer min-h-[44px] tracking-tight leading-snug"
                >
                  Dispatch Now
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. Stand Down / Cancel Confirmation Modal */}
      <AnimatePresence>
        {showStandDownModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 font-sans"
          >
            <div className="max-w-xs w-full bg-[#0e0e10] border border-zinc-800 rounded-3xl p-5 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-amber-400 flex items-center justify-center mx-auto border border-zinc-800">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h4 className="font-bold text-sm text-white tracking-tight leading-snug">Confirm Stand Down?</h4>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Only cancel if you are safely out of danger. This prototype does not notify live responders.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  onClick={handleConfirmStandDown}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer min-h-[44px] tracking-tight leading-snug"
                >
                  Confirm: I Am Safe
                </button>
                <button
                  onClick={() => setShowStandDownModal(false)}
                  className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer min-h-[44px]"
                >
                  Keep Responder En Route
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
