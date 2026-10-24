import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthAndSafetyProvider, useAuthAndSafety } from './context/AuthAndSafetyContext.jsx';
import { SafetyProvider } from './context/SafetyContext.jsx';
import OfficialLayout from './components/OfficialLayout.jsx';
// Sprint 1: Enable stealth routing once the stealth screens are implemented.
// import StealthLayout from './components/StealthLayout.jsx';
import SafetyDrawer from './components/SafetyDrawer.jsx';
// Sprint 1: Re-enable each screen import when its page has a default export.
// import HomeDashboard from './pages/official/HomeDashboard.jsx';
// import EmergencyGrid from './pages/official/EmergencyGrid.jsx';
// import ActiveTracker from './pages/official/ActiveTracker.jsx';
// import OfficialHome from './pages/official/OfficialHome.jsx';
import Profile from './pages/official/Profile.jsx';
import HomeAddresses from './pages/official/HomeAddresses.jsx';
import EmergencyContacts from './pages/official/EmergencyContacts.jsx';
import SafetySettings from './pages/official/SafetySettings.jsx';
// import StealthDashboard from './pages/stealth/StealthDashboard.jsx';
// import PlannerDashboard from './pages/stealth/PlannerDashboard.jsx';
// import DiscreetJournal from './pages/stealth/DiscreetJournal.jsx';
import LoginRegistration from './pages/LoginRegistration.jsx';
import { SplashScreen, OnboardingCarousel } from './pages/SplashAndOnboarding.jsx';

// Snappy cross-fade transition wrapper
function AnimatedPageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="w-full flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  );
}

// Master Conditional Routing Engine with Tab Disguise
function AppContentRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isStealthMode } = useAuthAndSafety();

  // Tab Disguise (Dynamic Document Title and Favicon Swapping)
  useEffect(() => {
    const CALENDAR_FAVICON = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%232563EB'><rect width='18' height='18' x='3' y='4' rx='2' ry='2' fill='%232563EB'/><line x1='16' x2='16' y1='2' y2='6' stroke='white' stroke-width='2'/><line x1='8' x2='8' y1='2' y2='6' stroke='white' stroke-width='2'/><line x1='3' x2='21' y1='10' stroke='white' stroke-width='2'/></svg>";
    const AURA_FAVICON = '/favicon.ico';

    let favicon = document.getElementById('app-favicon');
    if (!favicon) {
      favicon = document.querySelector("link[rel*='icon']");
    }
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.id = 'app-favicon';
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }

    if (isStealthMode) {
      document.title = "Daily Focus & Planner";
      favicon.type = "image/svg+xml";
      favicon.href = CALENDAR_FAVICON;
    } else {
      document.title = "AURA | Tactical Rapid Response";
      favicon.type = "image/x-icon";
      favicon.href = AURA_FAVICON;
    }
  }, [isStealthMode]);

  // 1. Unauthenticated State: Route strictly to /auth or /onboarding
  if (!isAuthenticated) {
    return (
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/auth"
            element={
              <AnimatedPageWrapper>
                <LoginRegistration />
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/onboarding"
            element={
              <AnimatedPageWrapper>
                <OnboardingCarousel onComplete={() => navigate('/auth')} />
              </AnimatedPageWrapper>
            }
          />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </AnimatePresence>
    );
  }

  /* Sprint 1: Temporarily keep unavailable stealth routes disabled.
  // 2. Authenticated in Stealth Mode: Wrap in <StealthLayout>
  if (isStealthMode) {
    return (
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route element={<StealthLayout />}>
            <Route
              path="/"
              element={
                <AnimatedPageWrapper>
                  <StealthDashboard />
                </AnimatedPageWrapper>
              }
            />
            <Route
              path="/calendar"
              element={
                <AnimatedPageWrapper>
                  <StealthDashboard />
                </AnimatedPageWrapper>
              }
            />
            <Route
              path="/planner"
              element={
                <AnimatedPageWrapper>
                  <StealthDashboard />
                </AnimatedPageWrapper>
              }
            />
            <Route
              path="/stealth"
              element={
                <AnimatedPageWrapper>
                  <StealthDashboard />
                </AnimatedPageWrapper>
              }
            />
            <Route
              path="/journal"
              element={
                <AnimatedPageWrapper>
                  <DiscreetJournal />
                </AnimatedPageWrapper>
              }
            />
            <Route path="*" element={<Navigate to="/calendar" replace />} />
          </Route>
        </Routes>
      </AnimatePresence>
    );
  }
  */

  // 3. Authenticated in Official Mode: Wrap in <OfficialLayout>
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<OfficialLayout />}>
          {/* Sprint 1 dashboard is still empty; use the implemented Profile page temporarily. */}
          <Route
            path="/"
            element={
              <AnimatedPageWrapper>
                <Profile />
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/beacon"
            element={
              <AnimatedPageWrapper>
                <Profile />
              </AnimatedPageWrapper>
            }
          />
          {/* Sprint 1: Re-enable these routes after their page components are implemented.
          <Route
            path="/emergency-grid"
            element={
              <AnimatedPageWrapper>
                <EmergencyGrid />
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/active-tracker"
            element={
              <AnimatedPageWrapper>
                <ActiveTracker />
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/report"
            element={
              <AnimatedPageWrapper>
                <OfficialHome />
              </AnimatedPageWrapper>
            }
          />
          */}
          <Route
            path="/profile"
            element={
              <AnimatedPageWrapper>
                <Profile />
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/profile/addresses"
            element={
              <AnimatedPageWrapper>
                <HomeAddresses />
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/profile/contacts"
            element={
              <AnimatedPageWrapper>
                <EmergencyContacts />
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/profile/settings"
            element={
              <AnimatedPageWrapper>
                <SafetySettings />
              </AnimatedPageWrapper>
            }
          />
          <Route
            path="/onboarding"
            element={
              <AnimatedPageWrapper>
                <OnboardingCarousel onComplete={() => navigate('/')} />
              </AnimatedPageWrapper>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthAndSafetyProvider>
      <SafetyProvider>
        <BrowserRouter>
          {/* Desktop Outer Canvas Wrapper */}
          <div className="min-h-[100dvh] h-[100dvh] bg-[#050505] flex flex-col items-center justify-center p-0 sm:py-6 sm:px-4 selection:bg-rose-500/30 selection:text-white relative overflow-hidden">
            {/* Ambient Background Glows on Desktop */}
            <div className="hidden sm:block absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-rose-600/[0.04] rounded-full blur-[140px] pointer-events-none" />
            <div className="hidden sm:block absolute -bottom-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-600/[0.03] rounded-full blur-[120px] pointer-events-none" />

            {/* Desktop Header Badge */}
            <header className="hidden sm:flex items-center justify-between w-full max-w-md mb-3 px-2 text-[11px] text-zinc-500 font-mono tracking-wider uppercase">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                <span className="text-zinc-300 font-bold">AURA // TACTICAL DISPATCH</span>
              </div>
              <span className="text-zinc-500">MOBILE VIEWPORT</span>
            </header>

            {/* Centered Mobile Device Frame with Smooth Theme Inheritance */}
            <AppFrameContainer />

            {/* Desktop Footer Quick Safety Notice */}
            <footer className="hidden sm:flex items-center justify-center space-x-4 mt-3 text-[11px] text-zinc-500 font-sans">
              <span>Quick Exit: Rapid double-tap or shake redirects instantly to Google</span>
              <span>&bull;</span>
              <span>SAPS Direct: 10111</span>
            </footer>
          </div>
        </BrowserRouter>
      </SafetyProvider>
    </AuthAndSafetyProvider>
  );
}

function AppFrameContainer() {
  const { 
    isStealthMode, 
    hasSeenOnboarding, 
    setHasSeenOnboarding, 
    isBooting, 
    setIsBooting 
  } = useAuthAndSafety();

  useEffect(() => {
    const handleReplay = () => {
      try {
        localStorage.removeItem('hasSeenOnboarding');
      } catch {
        // ignore
      }
      if (typeof setHasSeenOnboarding === 'function') {
        setHasSeenOnboarding(false);
      }
    };
    window.addEventListener('aura:replay-onboarding', handleReplay);
    return () => window.removeEventListener('aura:replay-onboarding', handleReplay);
  }, [setHasSeenOnboarding]);

  const handleSplashComplete = () => {
    if (typeof setIsBooting === 'function') {
      setIsBooting(false);
    }
  };

  const handleOnboardingComplete = () => {
    try {
      localStorage.setItem('hasSeenOnboarding', 'true');
    } catch {
      // ignore
    }
    if (typeof setHasSeenOnboarding === 'function') {
      setHasSeenOnboarding(true);
    }
  };

  return (
    <div className={`w-full max-w-md h-[100dvh] min-h-[100dvh] sm:h-[852px] sm:max-h-[890px] text-white sm:rounded-[44px] sm:border-[6px] shadow-[0_25px_80px_rgba(0,0,0,0.9)] flex flex-col relative overflow-hidden sm:ring-1 transition-colors duration-200 select-none ${
      isStealthMode 
        ? 'bg-[#fafafa] sm:border-slate-300 sm:ring-black/10' 
        : 'bg-black sm:border-zinc-800/80 sm:ring-white/10'
    }`}>
      {/* Top-Level Animated Views Container with mode="wait" to eradicate route flash */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-black">
        <AnimatePresence mode="wait">
          {isBooting ? (
            <motion.div
              key="splash-view"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="w-full h-full flex-1 flex flex-col bg-black"
            >
              <SplashScreen onComplete={handleSplashComplete} />
            </motion.div>
          ) : !hasSeenOnboarding ? (
            <motion.div
              key="onboarding-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="w-full h-full flex-1 flex flex-col bg-black"
            >
              <OnboardingCarousel onComplete={handleOnboardingComplete} />
            </motion.div>
          ) : (
            <motion.div
              key="main-app-content-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="w-full h-full flex-1 flex flex-col overflow-y-auto bg-black"
            >
              <AppContentRoutes />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Home Bar Pill Indicator */}
      <div className="h-4 w-full bg-transparent flex items-center justify-center shrink-0 z-40 pointer-events-none">
        <div className={`w-32 h-1 rounded-full transition-colors ${
          isStealthMode ? 'bg-slate-300' : 'bg-white/20'
        }`}></div>
      </div>

      {/* Global Safety Drawer mounted inside viewport */}
      <SafetyDrawer />
    </div>
  );
}
