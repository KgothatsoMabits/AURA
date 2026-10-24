import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Radio, 
  EyeOff, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft
} from 'lucide-react';

export function SplashScreen({ onComplete }) {
  const [initStage, setInitStage] = useState('Booting Aura Security Kernel...');

  useEffect(() => {
    const stage1 = setTimeout(() => {
      setInitStage('Validating cryptographic enclave...');
    }, 600);

    const stage2 = setTimeout(() => {
      setInitStage('Synchronizing e-SAPS dispatch mesh...');
    }, 1300);

    const stage3 = setTimeout(() => {
      setInitStage('Telemetry core operational.');
    }, 1900);

    // Strictly bounded 2.4s boot sequence
    const completionTimer = setTimeout(() => {
      if (typeof onComplete === 'function') onComplete();
    }, 2400);

    return () => {
      clearTimeout(stage1);
      clearTimeout(stage2);
      clearTimeout(stage3);
      clearTimeout(completionTimer);
    };
  }, [onComplete]);

  return (
    <div className="w-full h-full flex-1 flex flex-col justify-between items-center select-none overflow-hidden bg-black relative">
      {/* Subtle Ambient Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-rose-600/[0.08] rounded-full blur-[100px] pointer-events-none" />

      {/* Top Safe Spacer */}
      <div className="pt-12 text-center relative z-10">
        <span className="text-[10px] font-mono tracking-[0.3em] text-zinc-600 uppercase">
          SECURE PROTOCOL v2.4
        </span>
      </div>

      {/* Minimal Brand Center with Official AURA Logo */}
      <div className="flex flex-col items-center justify-center text-center px-6 relative z-10 space-y-4 my-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="flex flex-col items-center justify-center"
        >
          <img
            src="/AURA_Logo.png"
            alt="AURA"
            className="w-56 md:w-64 h-auto object-contain mx-auto drop-shadow-2xl"
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="text-[10px] font-mono text-zinc-600 tracking-wider pt-2"
        >
          {initStage}
        </motion.p>
      </div>

      <div className="w-full max-w-xs px-6 pb-12 flex flex-col items-center space-y-2 relative z-10">
        <div className="w-full h-[2px] bg-zinc-900 rounded-full overflow-hidden relative">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.4, ease: [0.16, 1, 0.3, 1] }}
            className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-red-400 rounded-full shadow-[0_0_12px_rgba(244,63,94,0.9)]"
          />
        </div>
      </div>
    </div>
  );
}

export function OnboardingCarousel({ onComplete }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  const slides = [
    {
      badge: '01 // TACTICAL DISPATCH',
      icon: Radio,
      iconColor: 'text-rose-500',
      glowColor: 'from-rose-500/20 to-rose-950/30 border-rose-500/30 text-rose-500 shadow-[0_0_50px_-15px_rgba(244,63,94,0.4)]',
      title: 'Rapid SOS Dispatch',
      subtitle: 'One-touch emergency beacon broadcasts encrypted coordinates to the nearest SAPS sector, CPF patrol, and armed private responders in under 3 seconds.',
      features: ['Sub-3s Dispatch Time', 'Real-time GPS Tracking', 'SAPS Flying Squad Link']
    },
    {
      badge: '02 // STEALTH DISGUISE',
      icon: EyeOff,
      iconColor: 'text-blue-400',
      glowColor: 'from-blue-500/20 to-blue-950/30 border-blue-500/30 text-blue-400 shadow-[0_0_50px_-15px_rgba(59,130,246,0.35)]',
      title: 'Dynamic Stealth Disguise',
      subtitle: 'Camouflage your emergency screen in plain sight. A discreet double-tap or shake instantly transforms Aura into an innocent calendar planner or daily journal.',
      features: ['Instant Camouflage', 'Shake & Double-Tap Trigger', 'Zero Data Footprint']
    },
    {
      badge: '03 // VERIFIED CITIZEN',
      icon: ShieldCheck,
      iconColor: 'text-emerald-400',
      glowColor: 'from-emerald-500/20 to-emerald-950/30 border-emerald-500/30 text-emerald-400 shadow-[0_0_50px_-15px_rgba(16,185,129,0.35)]',
      title: 'Citizen Verification',
      subtitle: 'Verified through algorithmic South African National ID validation. Your identity and medical notes are protected on-device and shared exclusively during distress.',
      features: ['Algorithmic Luhn Validation', 'Encrypted Local Storage', 'Verified Citizen Badge']
    }
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleFinish = useCallback(() => {
    try {
      localStorage.setItem('hasSeenOnboarding', 'true');
    } catch (e) {
      // localStorage may fail in restricted sandboxes
    }
    if (typeof onComplete === 'function') {
      onComplete();
    }
  }, [onComplete]);

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="w-full h-full flex-1 flex flex-col justify-between text-white font-sans selection:bg-rose-500/30 selection:text-white bg-black overflow-hidden p-6 pt-10 pb-8 select-none">
      <div className="flex items-center justify-between w-full relative z-20">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-[11px] font-mono tracking-wider text-zinc-500 uppercase">
            AURA // BRIEFING
          </span>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleFinish}
          className="text-xs font-mono text-zinc-400 hover:text-white px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 transition-all cursor-pointer min-h-[36px] flex items-center"
        >
          Skip
        </motion.button>
      </div>

      {/* Center Carousel Slide with Native iOS-style Spring Physics */}
      <div className="flex-1 flex flex-col justify-center items-center my-auto relative z-10 py-6 max-w-sm mx-auto w-full overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 80 : -80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -80 : 80 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex flex-col items-center text-center space-y-6 w-full"
          >
            {/* Visual Icon Halo Box */}
            <div className="relative">
              <div className={`w-24 h-24 rounded-3xl bg-gradient-to-b ${slide.glowColor} border flex items-center justify-center transition-all duration-300`}>
                <Icon className={`w-11 h-11 ${slide.iconColor}`} strokeWidth={2} />
              </div>
            </div>

            {/* Slide Header & Content */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono tracking-[0.25em] text-zinc-500 uppercase">
                {slide.badge}
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-white leading-snug">
                {slide.title}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xs mx-auto">
                {slide.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-1.5 pt-1">
              {slide.features.map((feat, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-full bg-[#111111] border border-white/5 text-[10px] font-mono text-zinc-400"
                >
                  {feat}
                </span>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-full max-w-sm mx-auto space-y-6 relative z-20">
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, index) => (
            index === currentSlide ? (
              <span
                key={index}
                className="h-2 w-6 bg-rose-500 rounded-full transition-all duration-300"
              />
            ) : (
              <span
                key={index}
                onClick={() => {
                  setDirection(index > currentSlide ? 1 : -1);
                  setCurrentSlide(index);
                }}
                className="h-2 w-2 bg-zinc-700 rounded-full transition-all duration-300 cursor-pointer"
              />
            )
          ))}
        </div>

        <div className="flex items-center space-x-3 w-full">
          {currentSlide > 0 ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handlePrev}
              className="px-4 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
              aria-label="Previous slide"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          ) : null}

          {currentSlide < slides.length - 1 ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleNext}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-white hover:bg-zinc-200 text-black font-semibold text-sm tracking-tight leading-snug flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleFinish}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm tracking-tight leading-snug flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-[0_0_40px_-5px_rgba(244,63,94,0.6)]"
            >
              <span>Get Started</span>
              <ShieldCheck className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SplashAndOnboardingFlow({ onFinished }) {
  const [isBooting, setIsBooting] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  const handleSplashDone = () => {
    setIsBooting(false);
  };

  const handleOnboardingDone = () => {
    try {
      localStorage.setItem('hasSeenOnboarding', 'true');
    } catch {
      // ignore
    }
    if (typeof setHasSeenOnboarding === 'function') {
      setHasSeenOnboarding(true);
    }
    if (typeof onFinished === 'function') {
      onFinished();
    }
  };

  return (
    <div className="w-full h-full flex-1 flex flex-col bg-black relative">
      <AnimatePresence mode="wait">
        {isBooting ? (
          <motion.div
            key="splash-flow"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="w-full h-full flex-1 flex flex-col bg-black"
          >
            <SplashScreen onComplete={handleSplashDone} />
          </motion.div>
        ) : !hasSeenOnboarding ? (
          <motion.div
            key="onboarding-flow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="w-full h-full flex-1 flex flex-col bg-black"
          >
            <OnboardingCarousel onComplete={handleOnboardingDone} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
