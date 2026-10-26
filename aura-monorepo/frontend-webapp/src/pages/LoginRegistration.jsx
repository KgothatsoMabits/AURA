import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  User, 
  Phone, 
  CreditCard, 
  Lock, 
  ArrowRight,
  ShieldCheck,
  Calendar,
  Sparkles
} from 'lucide-react';
import { validateSouthAfricanId } from '../utils/saIdValidator.js';
import { useAuthAndSafety } from '../context/AuthAndSafetyContext';
import apiClient from '../services/apiClient.js';
import { setSecret } from '../services/storage.js';

export default function LoginRegistration() {
  const navigate = useNavigate();
  const { setIsAuthenticated, setIsStealthMode, setUser } = useAuthAndSafety();

  const [formData, setFormData] = useState({
    fullName: '',
    idNumber: '',
    phoneNumber: '',
  });

  const [showStealthModal, setShowStealthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showDemoLogin, setShowDemoLogin] = useState(false);
  const [demoRole, setDemoRole] = useState('citizen');
  const [demoAccessKey, setDemoAccessKey] = useState('');
  const [demoLoginEnabled] = useState(import.meta.env.VITE_DEMO_LOGIN_ENABLED === 'true');
  const [touched, setTouched] = useState({
    fullName: false,
    idNumber: false,
    phoneNumber: false,
  });

  // Real-time validation of South African ID number (Luhn Checksum + DOB check)
  const idValidation = useMemo(() => {
    if (!formData.idNumber) {
      return { isValid: false, error: null, details: null };
    }
    return validateSouthAfricanId(formData.idNumber);
  }, [formData.idNumber]);

  // Phone number basic validation (SA format: 10 digits starting with 0, or with +27)
  const isPhoneValid = useMemo(() => {
    const cleaned = formData.phoneNumber.replace(/[\s-]/g, '');
    return /^(?:(?:\+27)|0)[6-8][0-9]{8}$/.test(cleaned);
  }, [formData.phoneNumber]);

  const isNameValid = formData.fullName.trim().length >= 3;

  // Sign up button strictly disabled until ID passes algorithmic Luhn validation
  const isFormValid = isPhoneValid && (isLogin || (isNameValid && idValidation.isValid));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!awaitingOtp) {
      if (!isFormValid) return;
      try {
        if (isLogin) await apiClient.loginRequestOtp({ phoneNumber: formData.phoneNumber });
        else await apiClient.register({ ...formData, idNumber: formData.idNumber.trim(), fullName: formData.fullName.trim() });
        setAwaitingOtp(true);
      } catch (error) {
        setErrorMessage(error?.message || 'Registration is unavailable. Please try again later.');
      }
      return;
    }
    if (!/^\d{6}$/.test(otpCode)) return;
    try {
      const result = isLogin
        ? await apiClient.loginVerifyOtp({ phoneNumber: formData.phoneNumber, code: otpCode })
        : await apiClient.verifyOtp({ phoneNumber: formData.phoneNumber, code: otpCode });
      await setSecret('aura_auth_token', result.token);
      setUser({ ...result.user, phoneNumber: formData.phoneNumber, isVerified: true, citizenStatus: 'Phone verified' });
      setIsAuthenticated(true);
      setShowStealthModal(true);
    } catch (error) {
      setErrorMessage(error?.message || 'The code could not be verified.');
    }
  };

  const handleDemoLogin = async () => {
    setErrorMessage('');
    try {
      const result = await apiClient.demoLogin({ role: demoRole, accessKey: demoAccessKey });
      await setSecret('aura_auth_token', result.token);
      setUser({ ...result.user, isVerified: true, citizenStatus: 'Demo account' });
      setIsAuthenticated(true);
      if (result.user.role === 'responder') {
        navigate('/responder');
      } else {
        setShowStealthModal(true);
      }
    } catch (error) {
      setErrorMessage(error?.message || 'Demo login is unavailable. Check the access key and deployment configuration.');
    }
  };

  const handleSelectDisguise = (enableStealth) => {
    setIsStealthMode(enableStealth);
    setShowStealthModal(false);
    if (enableStealth) navigate('/calendar');
    else navigate('/');
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
        <div className="flex rounded-xl border border-zinc-800 p-1 gap-1">
          <button type="button" onClick={() => { setIsLogin(false); setAwaitingOtp(false); setOtpCode(''); setErrorMessage(''); }} className={`flex-1 rounded-lg py-2 text-xs ${!isLogin ? 'bg-rose-600 text-white' : 'text-zinc-400'}`}>Create account</button>
          <button type="button" onClick={() => { setIsLogin(true); setAwaitingOtp(false); setOtpCode(''); setErrorMessage(''); }} className={`flex-1 rounded-lg py-2 text-xs ${isLogin ? 'bg-rose-600 text-white' : 'text-zinc-400'}`}>Sign in</button>
        </div>
        {/* Full Name */}
        {!isLogin && <div>
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
              onBlur={() => handleBlur('fullName')}
              placeholder="e.g. Naledi Dlamini"
              className="w-full pl-10 pr-3 py-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition"
              required
            />
          </div>
        </div>}
        {/* South African ID Number (Luhn Checksum Validated) */}
        {!isLogin && <div>
          <div className="mb-1">
            <label className="text-xs font-medium text-zinc-300">
              South African ID Number
            </label>
          </div>
          <div className="relative">
            <CreditCard className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
            <input
              type="text"
              name="idNumber"
              maxLength={13}
              value={formData.idNumber}
              onChange={handleChange}
              onBlur={() => handleBlur('idNumber')}
              placeholder="13-Digit SA ID (e.g. 9201015000081)"
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

          {/* Validation Feedback & Extracted DOB */}
          {touched.idNumber && formData.idNumber && (
            <div className="mt-1">
              {idValidation.isValid ? (
                <div className="text-[10px] text-emerald-400 font-mono flex items-center space-x-1">
                  <span>Valid SA ID &bull; DOB: {idValidation.details?.dob} ({idValidation.details?.gender}, {idValidation.details?.citizen ? 'Citizen' : 'Perm Resident'})</span>
                </div>
              ) : (
                <p className="text-[10px] text-rose-400 font-mono">
                  {idValidation.error || 'Invalid 13-digit SA ID number checksum'}
                </p>
              )}
            </div>
          )}
        </div>}
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
              onBlur={() => handleBlur('phoneNumber')}
              placeholder="e.g. 082 123 4567"
              className="w-full pl-10 pr-3 py-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition"
              required
            />
          </div>
        </div>

        {awaitingOtp && (
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Six-digit SMS code</label>
            <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" className="w-full px-3 py-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl text-xs font-mono text-white focus:outline-none focus:border-rose-500 transition" />
          </div>
        )}
        {errorMessage && <p role="alert" className="text-[10px] text-rose-400 text-center">{errorMessage}</p>}

        {/* Submit Verification Button */}
        <button
          type="submit"
          disabled={awaitingOtp ? !/^\d{6}$/.test(otpCode) : !isFormValid}
          className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs tracking-wider flex items-center justify-center space-x-2 transition cursor-pointer min-h-[50px] shadow-lg ${
            isFormValid
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-800'
          }`}
        >
          <span>{awaitingOtp ? 'CONFIRM CODE' : isLogin ? 'REQUEST SIGN-IN CODE' : 'REQUEST SMS CODE'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-[10px] text-zinc-500 text-center font-mono">
          {isLogin ? 'If this number belongs to a verified account, a code will be sent.' : 'Strict verification required to prevent false emergency hoaxes.'}
        </p>
      </form>

      {demoLoginEnabled && (
        <section className="max-w-sm w-full mx-auto mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <button type="button" onClick={() => setShowDemoLogin((value) => !value)} className="w-full text-left text-xs font-semibold text-zinc-300 hover:text-white">
            {showDemoLogin ? '− Hide judge demo access' : '+ Judge demo access'}
          </button>
          {showDemoLogin && (
            <div className="mt-3 space-y-3">
              <p className="text-[10px] text-zinc-500">Use the access key supplied by the event organizer. Demo access is restricted to provisioned test accounts.</p>
              <label className="block text-xs text-zinc-300">Demo account role</label>
              <select value={demoRole} onChange={(event) => setDemoRole(event.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs text-white">
                <option value="citizen">Citizen</option>
                <option value="responder">Responder</option>
              </select>
              <label className="block text-xs text-zinc-300">Judge access key</label>
              <input type="password" autoComplete="current-password" value={demoAccessKey} onChange={(event) => setDemoAccessKey(event.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs text-white" placeholder="Enter event access key" />
              <button type="button" disabled={!demoAccessKey.trim()} onClick={handleDemoLogin} className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">CONTINUE AS DEMO USER</button>
            </div>
          )}
        </section>
      )}

      {/* Discretion / Stealth Choice Modal */}
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

      {/* Footer Info */}
      <div className="text-center text-[10px] text-zinc-500 font-mono py-1">
        AURA &bull; FNB Hackathon Community Safety &bull; 10111
      </div>
    </div>
  );
}
