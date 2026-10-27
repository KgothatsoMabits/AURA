import React, { useState } from 'react';
import { Calendar, Clock, Tag, X, Check } from 'lucide-react';
import { useAuthAndSafety } from '../context/AuthAndSafetyContext';
import { startTask } from '../services/dispatchService.js';

export default function StealthTrigger({ isOpen, onClose, defaultTitle = '' }) {
  const { setActiveEmergency } = useAuthAndSafety();

  const [taskTitle, setTaskTitle] = useState(defaultTitle || 'Follow-up Consultation');
  const [selectedCategory, setSelectedCategory] = useState('urgent');
  const [reminderTime, setReminderTime] = useState('Immediate');

  if (!isOpen) return null;

  const categories = [
    { id: 'personal', label: 'Personal Matter', desc: 'Standard priority private task', kind: 1 },
    { id: 'urgent', label: 'Urgent Consultation', desc: 'Immediate scheduling required', kind: 2 },
    { id: 'routine', label: 'Routine Follow-up', desc: 'Scheduled check-in at home', kind: 3 },
    { id: 'wellness', label: 'Wellness Review', desc: 'Health and recovery check', kind: 4 },
  ];

  const handleSaveTask = async (e) => {
    e.preventDefault();
    const selectedOption = categories.find((c) => c.id === selectedCategory) || categories[1];
    const priority = reminderTime === 'Immediate' ? 1 : reminderTime === '15m' ? 2 : 3;
    try {
      const task = await startTask({ title: taskTitle, kind: selectedOption.kind, priority, tags: [], callbacks: { onStatus: setActiveEmergency, onClosed: () => setActiveEmergency(null) } });
      setActiveEmergency({ id: task.id, status: 'active', etaMinutes: task.eta ?? null, stealth: true });
      onClose();
    } catch (error) {
      window.alert(error?.message || 'Unable to save task. Check your location and connection, then try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
      {/* Mundane Daily Planner Task Modal */}
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Create New Calendar Task</h3>
              <p className="text-[11px] text-slate-400">Add to your personal workspace schedule</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSaveTask} className="space-y-4 text-xs">
          {/* Task Title Field */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Task Title / Description
            </label>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Schedule Follow-up Appointment"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
              required
            />
          </div>

          {/* Disguised Radio Categories */}
          <div>
            <label className="block font-medium text-slate-700 mb-1.5">
              Category
            </label>
            <div className="space-y-2">
              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className={`flex items-start p-2.5 rounded-xl border cursor-pointer transition ${
                    selectedCategory === cat.id
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="taskCategory"
                    value={cat.id}
                    checked={selectedCategory === cat.id}
                    onChange={() => setSelectedCategory(cat.id)}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-2.5">
                    <span className="block font-semibold text-slate-800 text-xs">{cat.label}</span>
                    <span className="block text-[11px] text-slate-500">{cat.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Reminder Time Selector */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Reminder Schedule
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <select
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Immediate">Immediate Priority Alert</option>
                <option value="15m">15 Minutes Before</option>
                <option value="1h">1 Hour Before</option>
                <option value="End of Day">End of Business Day</option>
              </select>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer shadow-sm transition"
            >
              Save Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
