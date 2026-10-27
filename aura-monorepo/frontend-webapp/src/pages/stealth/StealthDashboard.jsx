import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Plus, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  RefreshCw, 
  FileText, 
  Search, 
  CheckCircle2, 
  Circle,
  AlertTriangle,
  Shield,
  X,
  MapPin,
  EyeOff,
  Radio,
  Lock,
  ArrowLeft,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Cloud,
  ChevronDown,
  Volume2
} from 'lucide-react';
import { useAuthAndSafety } from '../../context/AuthAndSafetyContext';
import { useSafety } from '../../context/SafetyContext';
import { startTask } from '../../services/dispatchService.js';
import QuickExitZone from '../../components/QuickExitZone.jsx';

export default function StealthDashboard() {
  const { activeEmergency, triggerEmergency, clearEmergency, setIsStealthMode, addresses = [] } = useAuthAndSafety();
  const { sosActive, triggerSos, cancelSos } = useSafety();

  const isEmergencyActive = !!activeEmergency || sosActive;

  // Master Modal State: 'form' | 'checklist' | null
  const [modalStep, setModalStep] = useState(null); // 'form' | 'checklist' | null
  const [selectedDay, setSelectedDay] = useState(9);
  const [selectedMonth, setSelectedMonth] = useState('November 2026');

  // Disguised Intake Form State (Task 1 & Task 4)
  const [helpNeeded, setHelpNeeded] = useState('Physical Abuse Intervention');
  const [contextLocation, setContextLocation] = useState(() => {
    if (addresses.length > 0) {
      return `Incident at ${addresses[0].street}, ${addresses[0].city}`;
    }
    return 'Incident at Current GPS Location';
  });
  const [severityLevel, setSeverityLevel] = useState('Critical: Immediate danger / Weapons present');

  // Environment Checklist State (Task 2)
  const [premisesStatus, setPremisesStatus] = useState('Yes'); // 'Yes' | 'No' | 'Unsure'
  const [vulnerablePresent, setVulnerablePresent] = useState('Yes'); // 'Yes' | 'No'
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Active Blackout / Syncing State (Task 3)
  const [isBlackoutScreen, setIsBlackoutScreen] = useState(false);
  const [isTrueOledBlackout, setIsTrueOledBlackout] = useState(false);
  const [syncPercentage, setSyncPercentage] = useState(14);
  const [etaRemainingSec, setEtaRemainingSec] = useState(195); // ~3m 15s

  // Normal mundane task list for the innocent calendar view
  const [taskInput, setTaskInput] = useState('');
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Dentist Appointment (Dr. Meyer - Annual Clean)', time: '09:30 AM', category: 'Health', completed: true },
    { id: 2, title: 'Grocery Run - Fresh produce & pantry items', time: '12:00 PM', category: 'Personal', completed: false },
    { id: 3, title: 'Submit quarterly budget spreadsheet', time: '02:30 PM', category: 'Work', completed: false },
    { id: 4, title: 'Collect dry cleaning before 17:00', time: '04:45 PM', category: 'Errands', completed: false },
  ]);

  // Load saved primary and work address if available in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('aura_addresses');
        if (stored) {
          const parsed = JSON.parse(stored);
          const primary = parsed.find((a) => a.isPrimary);
          const work = parsed.find((a) => !a.isPrimary);
          if (primary) {
            setContextLocation(`Domestic violence at ${primary.street}, ${primary.city}`);
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (!isEmergencyActive) { setIsBlackoutScreen(false); setSyncPercentage(0); return; }
    const status = activeEmergency?.status || 'active';
    setSyncPercentage(status === 'resolved' ? 100 : status === 'dispatched' ? 85 : status === 'acknowledged' ? 50 : 15);
    const eta = Number(activeEmergency?.etaMinutes);
    if (Number.isFinite(eta) && eta >= 0) setEtaRemainingSec(eta * 60);
  }, [isEmergencyActive, activeEmergency?.status, activeEmergency?.etaMinutes]);

  // Task 1: Tapping November 9 opens the "Create New Calendar Task" modal
  const handleDateClick = (dayNumber) => {
    setSelectedDay(dayNumber);
    if (dayNumber === 9) {
      setModalStep('form');
    }
  };

  // Submit Step 1 -> Transitions to Environment Checklist (Task 2)
  const handleStep1Save = (e) => {
    e.preventDefault();
    setModalStep('checklist');
  };

  // Submit Step 2 -> Saves a planner task (Task 3)
  const handleConfirmAndSync = async (e) => {
    e.preventDefault();
    const kind = /medical|wellness|health/i.test(helpNeeded) ? 4 : /routine|follow/i.test(helpNeeded) ? 3 : /urgent|critical|immediate/i.test(severityLevel) ? 2 : 1;
    const priority = /critical|immediate/i.test(severityLevel) ? 1 : /high/i.test(severityLevel) ? 2 : 3;
    try {
      const task = await startTask({ title: `${helpNeeded}${additionalNotes ? ` - ${additionalNotes}` : ''}`.slice(0,120), kind, priority, tags: [premisesStatus, vulnerablePresent].filter(Boolean), callbacks: { onStatus: setActiveEmergency, onClosed: () => { clearEmergency(); cancelSos(); setIsBlackoutScreen(false); } } });
      setActiveEmergency({ id: task.id, status: 'active', etaMinutes: task.eta ?? null, stealth: true });
      setModalStep(null);
      setIsBlackoutScreen(true);
    } catch (error) {
      window.alert(error?.message || 'Unable to save task. Location and network access are required.');
    }
  };

  // Normal mundane task addition
  const handleAddTaskSubmit = (e) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    if (taskInput.trim() === '911') {
      setModalStep('form');
      setTaskInput('');
      return;
    }

    setTasks((prev) => [
      ...prev,
      {
        id: Date.now(),
        title: taskInput.trim(),
        time: 'Today',
        category: 'General',
        completed: false,
      },
    ]);
    setTaskInput('');
  };

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleCancelEmergency = () => {
    clearEmergency();
    cancelSos();
    setIsBlackoutScreen(false);
  };

  const calendarDays = Array.from({ length: 30 }, (_, i) => i + 1);

  const etaMinutes = Math.floor(etaRemainingSec / 60);
  const etaSeconds = (etaRemainingSec % 60).toString().padStart(2, '0');

  return (
    <div className="flex-1 flex flex-col font-sans text-slate-800 selection:bg-blue-100 bg-[#fafafa] relative min-h-full">
      {/* ======================================================== */}
      {/* 1. ACTIVE BLACKOUT / SYNCING TRACKING OVERLAY (TASK 3)    */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isBlackoutScreen && (
          <motion.div
            key="active-blackout-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            
            className={`fixed inset-0 z-50 flex flex-col justify-between transition-colors duration-500 cursor-pointer select-none ${
              isTrueOledBlackout ? 'bg-black text-transparent' : 'bg-black text-white p-5 pt-8 pb-10'
            }`}
            title=""
          >
            {isTrueOledBlackout ? (
              /* True OLED Pure Blackout Mode (looks like phone is locked / off) */
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <span className="text-[10px] text-zinc-900/60 font-mono">
                  TAP TWICE TO EXIT &bull; TAP ONCE TO REVEAL
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTrueOledBlackout(false);
                  }}
                  className="mt-6 px-4 py-2 rounded-full border border-white/5 text-[11px] text-zinc-700 hover:text-zinc-400 cursor-pointer"
                >
                  Show Disguise Screen
                </button>
              </div>
            ) : (
              /* Disguised High-Tech Cloud Sync & Blackout Telemetry */
              <>
                {/* Top Subtle Disguised Status Bar */}
                <QuickExitZone className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-xs font-mono font-medium text-zinc-400">
                      BACKGROUND CLOUD MIRROR
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-600 uppercase">
                    Daily Planner
                  </span>
                </QuickExitZone>

                {/* Center Tactical ETA Disguised as Progress */}
                <div className="my-auto space-y-6 max-w-sm mx-auto w-full text-center">
                  {/* Subtle pulsing cloud ring */}
                  <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-blue-600/10 blur-xl animate-pulse" />
                    <div className="w-20 h-20 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-center text-blue-400 shadow-xl relative z-10">
                      <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" style={{ animationDuration: '4s' }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-bold tracking-tight text-white leading-snug">
                      Syncing Workspace Database
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono">
                      Workspace: {contextLocation.split('at ')[1] || 'Current location'}
                    </p>
                  </div>

                  {/* Progress Line */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono text-zinc-400 px-1">
                      <span>Sync Progress</span>
                      <span className="text-blue-400 font-bold">{syncPercentage}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${syncPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Planner status */}
                  <div className="p-4 rounded-2xl bg-[#0d0d10] border border-zinc-800 text-left space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-mono">Estimated Mirror Time:</span>
                      <span className="text-emerald-400 font-mono font-bold text-sm">
                        {activeEmergency?.etaMinutes == null ? '—' : `${activeEmergency.etaMinutes} min`}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
                      Status updates appear here when available. No responder is assigned until the server confirms it.
                    </p>
                  </div>

                  {/* Quick Exit Reminder */}
                  <p className="text-[11px] text-zinc-500 font-mono pt-2">
                    &bull; Double-tap the top status area to leave the app &bull;
                  </p>
                </div>

                {/* Bottom Disguise Actions */}
                <div className="space-y-3 pt-4 border-t border-zinc-900">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsTrueOledBlackout(true);
                      }}
                      className="flex-1 py-3 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                    >
                      <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Pitch Black Screen</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="flex-1 py-3 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer shadow-lg"
                    >
                      Instant Quick Exit
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelEmergency();
                    }}
                    className="w-full py-2 text-zinc-600 hover:text-zinc-400 text-[11px] font-mono cursor-pointer transition"
                  >
                    Stand Down &bull; Return to Calendar
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 2. THE CALENDAR INTAKE & CHECKLIST MODAL (TASKS 1, 2, 4)  */}
      {/* ======================================================== */}
      <AnimatePresence>
        {modalStep && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
            <motion.div
              key="stealth-modal-card"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-zinc-200 text-zinc-900 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* iOS / Google Calendar Disguised Header */}
              <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/50">
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 text-sm tracking-tight leading-snug">
                      {modalStep === 'form' ? 'Create New Calendar Task' : 'Task Details & Environment'}
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      {modalStep === 'form' ? 'Personal workspace & schedule entry' : 'Verify context before cloud sync'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalStep(null)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body Container with Framer Motion Step Transitions */}
              <div className="p-5 overflow-y-auto flex-1">
                <AnimatePresence mode="wait">
                  {modalStep === 'form' ? (
                    /* STEP 1: DISGUISED INTAKE FORM (TASK 1) */
                    <motion.form
                      key="step-1-form"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      onSubmit={handleStep1Save}
                      className="space-y-4"
                    >
                      {/* Field 1 (Replaces Task Title): What help do you need? */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                          What help do you need?
                        </label>
                        <div className="relative">
                          <select
                            value={helpNeeded}
                            onChange={(e) => setHelpNeeded(e.target.value)}
                            className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3 text-xs text-zinc-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition shadow-xs appearance-none cursor-pointer pr-10"
                            required
                          >
                            <option value="Physical Abuse Intervention">Physical Abuse Intervention</option>
                            <option value="Health appointment">Health appointment</option>
                            <option value="Personal Schedule">Personal Schedule</option>
                            <option value="Counseling Support">Counseling Support</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Field 2 (Replaces Category): Incident Context & Location */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                          Incident Context & Location
                        </label>
                        <div className="relative">
                          <select
                            value={contextLocation}
                            onChange={(e) => setContextLocation(e.target.value)}
                            className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3 text-xs text-zinc-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition shadow-xs appearance-none cursor-pointer pr-10"
                            required
                          >
                            {addresses.length > 0 ? (
                              addresses.map((addr) => (
                                <option key={addr.id} value={`Incident at ${addr.street}, ${addr.city}`}>
                                  {addr.street}, {addr.city} ({addr.isPrimary ? 'Primary Home' : 'Saved Address'})
                                </option>
                              ))
                            ) : (
                              <>
                                <option value="Incident at Residential Location">
                                  Primary Residential Location (Set in Profile)
                                </option>
                                <option value="Incident at Workplace">
                                  Workplace Location (Set in Profile)
                                </option>
                              </>
                            )}
                            <option value="Incident at Current GPS Coordinates">
                              Incident at Current GPS Location (Live Coordinates)
                            </option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Field 3 (Replaces Reminder Schedule): Situation Severity */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                          Situation Severity
                        </label>
                        <div className="relative">
                          <select
                            value={severityLevel}
                            onChange={(e) => setSeverityLevel(e.target.value)}
                            className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3 text-xs text-zinc-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition shadow-xs appearance-none cursor-pointer pr-10"
                            required
                          >
                            <option value="Critical: Immediate danger / Weapons present">
                              Critical: Immediate danger / Weapons present
                            </option>
                            <option value="High: Escalating situation">
                              High: Escalating situation
                            </option>
                            <option value="Within 24 hours">
                              Within 24 hours
                            </option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      {/* Disguised reminder info tag */}
                      <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-900/80 flex items-center space-x-2">
                        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Scheduled to sync when a connection is available.</span>
                      </div>

                      {/* Save Button (Transitions to Step 2 Environment Checklist) */}
                      <div className="pt-2">
                        <button
                          type="submit"
                          className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs tracking-tight shadow-sm flex items-center justify-center space-x-2 transition cursor-pointer active:scale-[0.98]"
                        >
                          <span>Save Task</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.form>
                  ) : (
                    /* STEP 2: ENVIRONMENT CHECKLIST (TASK 2) */
                    <motion.form
                      key="step-2-checklist"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      onSubmit={handleConfirmAndSync}
                      className="space-y-4"
                    >
                      {/* Question 1: Are the premises locked or barricaded? */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-800 mb-2">
                          Are the premises locked or barricaded?
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {['Yes', 'No', 'Unsure'].map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setPremisesStatus(option)}
                              className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                                premisesStatus === option
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Question 2: Are there children or other vulnerable individuals present? */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-800 mb-2">
                          Are there children or other vulnerable individuals present?
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {['Yes', 'No'].map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setVulnerablePresent(option)}
                              className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                                vulnerablePresent === option
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Question 3: Additional Notes */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
                          Additional Notes
                        </label>
                        <textarea
                          rows={3}
                          value={additionalNotes}
                          onChange={(e) => setAdditionalNotes(e.target.value)}
                          placeholder="Specific details (e.g., physical injuries, abuser description, access gates or weapons)..."
                          className="w-full rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition shadow-xs resize-none"
                        />
                      </div>

                      {/* Action Buttons: Back to Step 1 & Confirm & Sync Task */}
                      <div className="flex items-center space-x-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setModalStep('form')}
                          className="py-3.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs transition cursor-pointer flex items-center justify-center"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>

                        <button
                          type="submit"
                          className="flex-1 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs tracking-tight shadow-sm flex items-center justify-center space-x-2 transition cursor-pointer active:scale-[0.98]"
                        >
                          <Check className="w-4 h-4" />
                          <span>Confirm &amp; Sync Task</span>
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 3. INNOCENT DISGUISE CALENDAR & PLANNER MAIN VIEW        */}
      {/* ======================================================== */}
      <div className="p-3 sm:p-4 space-y-3.5 flex-1 flex flex-col">
        {/* Disguised Calendar View */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-1.5">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 tracking-tight">{selectedMonth}</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Personal Schedule</span>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400 mb-1">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Calendar Grid (Task 1: November 9th trigger) */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {calendarDays.map((day) => {
              const isSelected = selectedDay === day;
              const isSecretTriggerDay = day === 9;
              return (
                <button
                  key={day}
                  onClick={() => handleDateClick(day)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition cursor-pointer relative ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : isSecretTriggerDay
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {day}
                  {isSecretTriggerDay && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600"></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Disguised Mundane Task List */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs space-y-3 flex-1 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center space-x-1.5">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 tracking-tight">Daily Tasks &amp; Checklist</h3>
            </div>
            <button
              onClick={() => setModalStep('form')}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>

          {/* Task Input Field (Typing 911 opens modal) */}
          <form onSubmit={handleAddTaskSubmit} className="relative">
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="Add new task (e.g. 'Meeting with David')..."
              className="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
              title="Add task"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Tasks List */}
          <div className="space-y-2 overflow-y-auto max-h-[36vh] flex-1">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition cursor-pointer ${
                  task.completed
                    ? 'bg-slate-50/70 border-slate-200 text-slate-400'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  {task.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-300 hover:text-blue-500 shrink-0" />
                  )}
                  <div>
                    <span className={`block font-medium ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {task.title}
                    </span>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                      <span>{task.time}</span>
                      <span>&bull;</span>
                      <span className="font-medium text-slate-500">{task.category}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
