import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone,
  Trash2,
  ArrowLeft,
  Plus,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuthAndSafety } from '../../context/AuthAndSafetyContext';

export default function EmergencyContacts({ onBack = null }) {
  const navigate = useNavigate();
  const { contacts, setContacts } = useAuthAndSafety();

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    relationship: 'Parent',
    otherRelationship: '',
  });

  const [validationError, setValidationError] = useState('');
  const [successToast, setSuccessToast] = useState(false);
  const phoneNumberIsValid = /^\d{1,19}$/.test(formData.phoneNumber);
  const relationshipIsValid = formData.relationship !== 'Other' || formData.otherRelationship.trim().length > 0;
  const canAddContact = formData.fullName.trim().length > 0
    && phoneNumberIsValid
    && relationshipIsValid;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/profile');
    }
  };

  const handleAddContact = (e) => {
    e.preventDefault();
    if (!canAddContact) {
      setValidationError('Enter a full name, a contact number containing digits only (maximum 19 digits), and a relationship. Specify the relationship if you select Other.');
      return;
    }

    const newContact = {
      id: `contact-${Date.now()}`,
      fullName: formData.fullName.trim(),
      phoneNumber: formData.phoneNumber,
      relationship: formData.relationship === 'Other'
        ? formData.otherRelationship.trim()
        : formData.relationship,
      isPrimary: contacts.length === 0,
    };

    setContacts((prev) => [...prev, newContact]);
    setFormData({ fullName: '', phoneNumber: '', relationship: 'Parent', otherRelationship: '' });
    setValidationError('');
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3000);
  };

  const handleDeleteContact = (id) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
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
              Emergency Contacts
            </h1>
            <p className="text-xs text-zinc-400 tracking-tight">
              Automated SOS alert escalation circle
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {successToast && (
          <div className="flex items-center space-x-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium animate-in fade-in">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>Emergency contact added to active responder circle.</span>
          </div>
        )}

        {/* Current Contacts List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-medium tracking-wider uppercase text-zinc-500">
              Current Contacts ({contacts.length})
            </p>
            <span className="text-[11px] text-zinc-500 font-mono">Instant SMS / WhatsApp Sync</span>
          </div>

          {contacts.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#111111] border border-white/5 text-center space-y-2">
              <Phone size={28} className="mx-auto text-zinc-600" />
              <p className="text-sm font-medium text-zinc-300">No emergency contacts</p>
              <p className="text-xs text-zinc-500">Add trusted contacts below to ensure swift dispatch notification.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="bg-[#111111] border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-rose-500 shrink-0">
                      <User size={18} strokeWidth={2} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-white tracking-tight leading-snug truncate">
                          {contact.fullName}
                        </p>
                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-medium text-zinc-300">
                          {contact.relationship}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 tracking-tight flex items-center gap-1 mt-0.5">
                        <Phone size={11} className="text-zinc-500" />
                        {contact.phoneNumber}
                      </p>
                    </div>
                  </div>

                  {/* Subtle red Trash2 icon button to remove contact */}
                  <button
                    type="button"
                    onClick={() => handleDeleteContact(contact.id)}
                    className="p-2 rounded-xl text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0 ml-2"
                    title={`Remove ${contact.fullName}`}
                    aria-label={`Remove ${contact.fullName}`}
                  >
                    <Trash2 size={16} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Contact Form */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center space-x-1.5 px-1">
            <Plus size={14} className="text-rose-500" />
            <p className="text-xs font-medium tracking-wider uppercase text-zinc-500">
              Add Emergency Contact
            </p>
          </div>

          <form onSubmit={handleAddContact} className="space-y-3.5 bg-[#111111] border border-white/5 rounded-2xl p-4">
            {validationError && (
              <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                <AlertCircle size={14} className="shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="contact-name" className="block text-xs font-medium text-zinc-400 tracking-tight">
                Full Name
              </label>
              <input
                id="contact-name"
                type="text"
                placeholder="e.g. Sipho Sithole"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>

            {/* Contact Number */}
            <div className="space-y-1.5">
              <label htmlFor="contact-phone" className="block text-xs font-medium text-zinc-400 tracking-tight">
                Contact Number
              </label>
              <input
                id="contact-phone"
                type="text"
                inputMode="numeric"
                placeholder="Digits only, up to 19 digits"
                value={formData.phoneNumber}
                onChange={(e) => {
                  setFormData({ ...formData, phoneNumber: e.target.value });
                  setValidationError('');
                }}
                aria-invalid={formData.phoneNumber.length > 0 && !phoneNumberIsValid}
                aria-describedby="contact-phone-guidance"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-rose-500 transition-colors ${
                  formData.phoneNumber.length > 0 && !phoneNumberIsValid ? 'border-rose-500' : 'border-white/10'
                }`}
              />
              {formData.phoneNumber.length > 0 && !phoneNumberIsValid ? (
                <p id="contact-phone-guidance" className="text-xs text-rose-400" role="alert">
                  Enter numbers only and use no more than 19 digits. Remove any letters, spaces, or symbols.
                </p>
              ) : (
                <p id="contact-phone-guidance" className="text-xs text-zinc-500">
                  Use digits only, with a maximum of 19 digits.
                </p>
              )}
            </div>

            {/* Styled <select> dropdown for Relationship */}
            <div className="space-y-1.5">
              <label htmlFor="contact-rel" className="block text-xs font-medium text-zinc-400 tracking-tight">
                Relationship
              </label>
              <div className="relative">
                <select
                  id="contact-rel"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500 transition-colors cursor-pointer appearance-none pr-8"
                >
                  <option value="Parent" className="bg-zinc-900 text-white">Parent</option>
                  <option value="Sibling" className="bg-zinc-900 text-white">Sibling</option>
                  <option value="Partner" className="bg-zinc-900 text-white">Partner</option>
                  <option value="Friend" className="bg-zinc-900 text-white">Friend</option>
                  <option value="Colleague" className="bg-zinc-900 text-white">Colleague</option>
                  <option value="Other" className="bg-zinc-900 text-white">Other</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>

            {formData.relationship === 'Other' && (
              <div className="space-y-1.5">
                <label htmlFor="contact-relationship-other" className="block text-xs font-medium text-zinc-400 tracking-tight">
                  Specify Relationship
                </label>
                <input
                  id="contact-relationship-other"
                  type="text"
                  value={formData.otherRelationship}
                  onChange={(e) => {
                    setFormData({ ...formData, otherRelationship: e.target.value });
                    setValidationError('');
                  }}
                  placeholder="Enter the relationship"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!canAddContact}
              className={`w-full mt-2 py-3 px-4 rounded-xl text-white text-sm font-semibold tracking-tight transition-all ${
                canAddContact
                  ? 'bg-rose-500 hover:bg-rose-600 active:scale-[0.99] cursor-pointer shadow-lg shadow-rose-500/20'
                  : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              }`}
            >
              Add Contact
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
