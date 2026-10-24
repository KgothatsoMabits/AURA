import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Phone, 
  ArrowRight,
  CreditCard,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuthAndSafety } from '../context/AuthAndSafetyContext';
import { validateSouthAfricanId } from '../utils/saIdValidator.js';

export default function LoginRegistration() {
  const navigate = useNavigate();
  const { setIsAuthenticated, setUser } = useAuthAndSafety();

  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    idNumber: '',
  });

  const idValidation = useMemo(() => {
    return validateSouthAfricanId(formData.idNumber);
  }, [formData.idNumber]);
  const [touched, setTouched] = useState({});

  // Phone number basic validation (SA format: 10 digits starting with 0, or with +27)
  const isPhoneValid = useMemo(() => {
    const cleaned = formData.phoneNumber.replace(/[\s-]/g, '');
    return /^(?:(?:\+27)|0)[6-8][0-9]{8}$/.test(cleaned);
  }, [formData.phoneNumber]);

  const isNameValid = formData.fullName.trim().length >= 3;

  const isFormValid = isNameValid && isPhoneValid && idValidation.isValid;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({ fullName: true, phoneNumber: true, idNumber: true });
    if (!isFormValid) return;
    handleRegistrationComplete();
  };

  const handleRegistrationComplete = () => {
    const registeredUser = {
      id: `usr_${Date.now()}`,
      fullName: formData.fullName.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      idNumber: formData.idNumber,
      dob: idValidation.details.dob,
      gender: idValidation.details.gender,
      citizen: idValidation.details.citizen,
      isVerified: false,
    };
    if (typeof setUser === 'function') {
      setUser(registeredUser);
    }
    setIsAuthenticated(true);
    navigate('/');
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-5 bg-black text-white font-sans selection:bg-rose-500/30 selection:text-white">
      {/* Brand Header with Official AURA Logo */}
      <div className="text-center pt-3">
        <img
          src="/AURA_Logo.png"
          alt="AURA"
          className="w-40 h-auto object-contain mx-auto mb-6"
        />
      </div>

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5 my-auto max-w-sm w-full mx-auto">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1">
            Full Name
          </label>
          <div className="relative">
            <User className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. Naledi Dlamini"
              className="w-full pl-10 pr-3 py-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition"
              required
            />
          </div>
        </div>

        <div>
          <div className="mb-1">
            <label htmlFor="id-number" className="block text-xs font-medium text-zinc-300">
              South African ID Number
            </label>
          </div>
          <div className="relative">
            <CreditCard className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
            <input
              id="id-number"
              type="text"
              name="idNumber"
              inputMode="numeric"
              maxLength={13}
              value={formData.idNumber}
              onChange={handleChange}
              onBlur={() => handleBlur('idNumber')}
              placeholder="Enter your 13-digit ID number"
              aria-invalid={touched.idNumber && !idValidation.isValid}
              aria-describedby="id-number-feedback"
              className={`w-full pl-10 pr-10 py-3 bg-zinc-900/90 border rounded-2xl text-xs font-mono text-white placeholder-zinc-500 focus:outline-none transition ${
                touched.idNumber && formData.idNumber
                  ? idValidation.isValid
                    ? 'border-emerald-500/80 focus:border-emerald-400'
                    : 'border-rose-500/80 focus:border-rose-400'
                  : 'border-zinc-800 focus:border-rose-500'
              }`}
              required
            />
            {formData.idNumber && (
              <div className="absolute right-3.5 top-3.5">
                {idValidation.isValid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>
            )}
          </div>

          <div id="id-number-feedback" className="mt-1" aria-live="polite">
            {touched.idNumber ? (
              idValidation.isValid ? (
                <div className="text-[10px] text-emerald-400 font-mono flex items-center space-x-1">
                  <span>Valid ID format &bull; DOB: {idValidation.details.dob} ({idValidation.details.gender}, {idValidation.details.citizen ? 'Citizen' : 'Permanent Resident'})</span>
                </div>
              ) : (
                <p className="text-[10px] text-rose-400 font-mono">
                  {idValidation.error}
                </p>
              )
            ) : (
              <p className="text-[10px] text-zinc-500 font-mono">
                Enter a valid 13-digit South African ID number.
              </p>
            )}
          </div>
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-xs font-medium text-zinc-300 mb-1">
            Mobile Number (SMS Alerts)
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="e.g. 082 123 4567"
              className="w-full pl-10 pr-3 py-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition"
              required
            />
          </div>
        </div>

        {/* Submit Verification Button */}
        <button
          type="submit"
          disabled={!isFormValid}
          className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs tracking-wider flex items-center justify-center space-x-2 transition cursor-pointer min-h-[50px] shadow-lg ${
            isFormValid
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-800'
          }`}
        >
          <span>CONTINUE</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-[10px] text-zinc-500 text-center font-mono">
          Your ID number is checked locally for format and checksum; this does not verify your identity with an official source.
        </p>
      </form>

      {/* Sprint 1: Restore the stealth choice modal when stealth screens are available.
      Discretion / Stealth Choice Modal
      {showStealthModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="max-w-xs w-full bg-[#121214] border border-zinc-800 rounded-3xl p-5 shadow-2xl text-white space-y-4 font-sans text-center">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-blue-400 mx-auto">
              <EyeOff className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Discreet Access Setup</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Do you require discreet access to this application? You can toggle Stealth Mode on or off at any time.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleSelectDisguise(true)}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer min-h-[48px]"
              >
                <Calendar className="w-4 h-4" />
                <span>Enable Stealth Mode (Daily Planner)</span>
              </button>

              <button
                onClick={() => handleSelectDisguise(false)}
                className="w-full py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs flex items-center justify-center space-x-2 transition cursor-pointer min-h-[48px]"
              >
                <Shield className="w-4 h-4 text-rose-500" />
                <span>Continue to Official Tactical Hub</span>
              </button>
            </div>
          </div>
        </div>
      )}
      */}

      {/* Footer Info */}
      <div className="text-center text-[10px] text-zinc-500 font-mono py-1">
        AURA &bull; FNB Hackathon Community Safety &bull; 10111
      </div>
    </div>
  );
}
