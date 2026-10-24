import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  UploadCloud,
  CheckCircle2,
  Trash2,
  ArrowLeft,
  Plus,
  FileCheck,
  Building2,
  ShieldAlert
} from 'lucide-react';
import { useAuthAndSafety } from '../../context/AuthAndSafetyContext';

const SOUTH_AFRICAN_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
];

const MAX_PROOF_FILE_SIZE = 10 * 1024 * 1024;

export default function HomeAddresses({ onBack = null }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { addresses, setAddresses } = useAuthAndSafety();

  const [formData, setFormData] = useState({
    street: '',
    city: '',
    province: '',
  });

  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [successToast, setSuccessToast] = useState(false);
  const canSaveAddress = formData.street.trim().length > 0
    && formData.city.trim().length > 0
    && formData.province.length > 0
    && uploadedFile !== null;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/profile');
    }
  };

  const handleProofFile = (file) => {
    if (!file) return;
    const allowedFileType = /\.(pdf|jpe?g|png)$/i.test(file.name);
    if (!allowedFileType) {
      setUploadedFile(null);
      setValidationError('Upload a proof of address as a PDF, JPG, or PNG file.');
      return;
    }
    if (file.size > MAX_PROOF_FILE_SIZE) {
      setUploadedFile(null);
      setValidationError('The proof of address must be 10 MB or smaller. Choose a smaller file.');
      return;
    }
    setUploadedFile(file);
    setValidationError('');
  };

  const handleFileChange = (e) => {
    handleProofFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleProofFile(e.dataTransfer.files?.[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSaveAddress = (e) => {
    e.preventDefault();
    if (!canSaveAddress) {
      setValidationError('Enter the street address and city, select a province, and upload proof of address before saving.');
      return;
    }

    const newAddress = {
      id: `addr-${Date.now()}`,
      street: formData.street.trim(),
      city: formData.city.trim(),
      province: formData.province.trim(),
      isPrimary: addresses.length === 0,
      verified: false,
      proofFileName: uploadedFile ? uploadedFile.name : 'Municipal Document Pending Review',
    };

    setAddresses((prev) => [newAddress, ...prev]);
    setFormData({ street: '', city: '', province: '' });
    setUploadedFile(null);
    setValidationError('');
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3000);
  };

  const handleDeleteAddress = (id) => {
    setAddresses((prev) => prev.filter((addr) => addr.id !== id));
  };

  return (
    <div className="flex-1 min-h-full min-h-[100dvh] bg-black text-white px-4 py-5 pb-28 font-sans selection:bg-rose-500/30">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Top Header with Back Navigation */}
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
              Home Addresses
            </h1>
            <p className="text-xs text-zinc-400 tracking-tight">
              Verified dispatch locations for emergency units
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {successToast && (
          <div className="flex items-center space-x-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium animate-in fade-in">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>New verified address saved successfully.</span>
          </div>
        )}

        {/* Current List of Saved Addresses */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-medium tracking-wider uppercase text-zinc-500">
              Saved Addresses ({addresses.length})
            </p>
            <span className="text-[11px] text-zinc-500 font-mono">SAPS Grid Verified</span>
          </div>

          {addresses.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#111111] border border-white/5 text-center space-y-2">
              <MapPin size={28} className="mx-auto text-zinc-600" />
              <p className="text-sm font-medium text-zinc-300">No addresses saved</p>
              <p className="text-xs text-zinc-500">Add your residential address below to dispatch units accurately.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="bg-[#111111] border border-white/5 rounded-2xl p-4 space-y-2 hover:border-white/10 transition-colors relative"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-rose-500 shrink-0">
                        <Building2 size={16} strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-white tracking-tight leading-snug truncate">
                            {addr.street}
                          </p>
                          {addr.isPrimary && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-semibold text-rose-500">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 tracking-tight">
                          {addr.city}, {addr.province}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0 ml-2"
                      title="Remove address"
                      aria-label="Remove address"
                    >
                      <Trash2 size={16} strokeWidth={2} />
                    </button>
                  </div>

                  <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
                    <span className="flex items-center space-x-1.5 text-emerald-400 truncate max-w-[220px]">
                      <FileCheck size={13} className="shrink-0" />
                      <span className="truncate">{addr.proofFileName}</span>
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {addr.verified ? 'Verified' : 'Reviewing'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Address Form */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center space-x-1.5 px-1">
            <Plus size={14} className="text-rose-500" />
            <p className="text-xs font-medium tracking-wider uppercase text-zinc-500">
              Add New Address
            </p>
          </div>

          <form onSubmit={handleSaveAddress} className="space-y-3.5 bg-[#111111] border border-white/5 rounded-2xl p-4">
            {validationError && (
              <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                <ShieldAlert size={14} className="shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Street Input */}
            <div className="space-y-1.5">
              <label htmlFor="street-input" className="block text-xs font-medium text-zinc-400 tracking-tight">
                Street Address
              </label>
              <input
                id="street-input"
                type="text"
                placeholder="e.g. 42 Crownwood Road"
                value={formData.street}
                onChange={(e) => {
                  setFormData({ ...formData, street: e.target.value });
                  setValidationError('');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>

            {/* City & Province Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="city-input" className="block text-xs font-medium text-zinc-400 tracking-tight">
                  City / Suburb
                </label>
                <input
                  id="city-input"
                  type="text"
                  placeholder="e.g. Mondeor"
                  value={formData.city}
                  onChange={(e) => {
                    setFormData({ ...formData, city: e.target.value });
                    setValidationError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="province-input" className="block text-xs font-medium text-zinc-400 tracking-tight">
                  Province
                </label>
                <select
                  id="province-input"
                  value={formData.province}
                  onChange={(e) => {
                    setFormData({ ...formData, province: e.target.value });
                    setValidationError('');
                  }}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:border-rose-500 transition-colors"
                >
                  <option value="" className="bg-zinc-900 text-zinc-500">Select province</option>
                  {SOUTH_AFRICAN_PROVINCES.map((province) => (
                    <option key={province} value={province} className="bg-zinc-900 text-white">
                      {province}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Proof of Address Upload: exact requirement */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-medium text-zinc-400 tracking-tight">
                Proof of Address Document
              </label>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-dashed border-2 ${
                  isDragging
                    ? 'border-rose-500 bg-rose-500/5'
                    : uploadedFile
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-zinc-700 bg-zinc-900'
                } rounded-xl p-6 text-center cursor-pointer hover:border-zinc-500 transition-colors`}
              >
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-11 h-11 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300">
                    <UploadCloud size={24} strokeWidth={2} className={uploadedFile ? 'text-emerald-400' : 'text-zinc-400'} />
                  </div>
                  {uploadedFile ? (
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-emerald-400 truncate max-w-[260px]">
                        {uploadedFile.name}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • Click to replace
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-zinc-300">
                        Upload Proof of Address (Required for Verification)
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        Municipal bill, bank statement, or lease (PDF/PNG up to 10MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Solid bg-rose-500 "Save Address" button */}
            <button
              type="submit"
              disabled={!canSaveAddress}
              className={`w-full mt-2 py-3 px-4 rounded-xl text-white text-sm font-semibold tracking-tight transition-all ${
                canSaveAddress
                  ? 'bg-rose-500 hover:bg-rose-600 active:scale-[0.99] cursor-pointer shadow-lg shadow-rose-500/20'
                  : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              }`}
            >
              Save Address
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
