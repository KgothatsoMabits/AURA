import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const defaultContext = {
  user: null,
  setUser: () => {},
  updateUser: () => {},
  isUserLoading: false,
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  isStealthMode: false,
  setIsStealthMode: () => {},
  toggleStealthMode: () => {},
  isStealthEnabled: true,
  setIsStealthEnabled: () => {},
  toggleStealthEnabled: () => {},
  isBooting: true,
  setIsBooting: () => {},
  hasSeenOnboarding: false,
  setHasSeenOnboarding: () => {},
  activeEmergency: null,
  setActiveEmergency: () => {},
  triggerEmergency: () => {},
  clearEmergency: () => {},
  triggerQuickExit: () => {},
  initiateSensors: async () => false,
  contacts: [],
  setContacts: () => {},
  addresses: [],
  setAddresses: () => {},
};

const AuthAndSafetyContext = createContext(defaultContext);

const DOUBLE_TAP_DELAY_MS = 300;
const SHAKE_THRESHOLD = 25; // Acceleration magnitude delta threshold

export function AuthAndSafetyProvider({ children }) {
  // Global dynamic user identity
  const [user, setUserState] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('aura_user');
        if (stored) {
          const storedUser = JSON.parse(stored);
          if (storedUser?.idNumber) {
            delete storedUser.idNumber;
            localStorage.setItem('aura_user', JSON.stringify(storedUser));
          }
          return storedUser;
        }
      } catch (e) {
        // ignore
      }
    }
    return null;
  });

  const [isUserLoading, setIsUserLoading] = useState(false);

  const setUser = useCallback((val) => {
    setUserState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (typeof window !== 'undefined') {
        try {
          if (next) {
            const persistedUser = { ...next };
            delete persistedUser.idNumber;
            localStorage.setItem('aura_user', JSON.stringify(persistedUser));
          } else {
            localStorage.removeItem('aura_user');
          }
        } catch (e) {}
      }
      return next;
    });
  }, []);

  const updateUser = useCallback((partial) => {
    setUserState((prev) => {
      const next = prev ? { ...prev, ...partial } : partial;
      if (typeof window !== 'undefined') {
        try {
          const persistedUser = { ...next };
          delete persistedUser.idNumber;
          localStorage.setItem('aura_user', JSON.stringify(persistedUser));
        } catch (e) {}
      }
      return next;
    });
  }, []);

  // Global dynamic contacts and addresses state with local cache
  const [contacts, setContactsState] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('aura_contacts');
        if (stored) return JSON.parse(stored);
      } catch (e) {}
    }
    return [];
  });

  const setContacts = useCallback((val) => {
    setContactsState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('aura_contacts', JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });
  }, []);

  const [addresses, setAddressesState] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('aura_addresses');
        if (stored) return JSON.parse(stored);
      } catch (e) {}
    }
    return [];
  });

  const setAddresses = useCallback((val) => {
    setAddressesState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('aura_addresses', JSON.stringify(next));
        } catch (e) {}
      }
      return next;
    });
  }, []);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStealthMode, setIsStealthMode] = useState(false);
  const [isStealthEnabled, setIsStealthEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('aura_stealth_disguise_enabled');
      return stored !== null ? stored === 'true' : true;
    }
    return true;
  });
  const [isBooting, setIsBooting] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboardingState] = useState(false);

  const setHasSeenOnboarding = useCallback((val) => {
    setHasSeenOnboardingState((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('hasSeenOnboarding', String(next));
        } catch {
          // ignore in restricted environments
        }
      }
      return next;
    });
  }, []);

  const [activeEmergency, setActiveEmergency] = useState(null);

  const lastClickTimeRef = useRef(0);
  const lastAccelerationRef = useRef({ x: 0, y: 0, z: 0 });
  const isMotionAttachedRef = useRef(false);

  // Emergency Quick Exit redirect function - synchronously forces browser location to Google
  const triggerQuickExit = useCallback(() => {
    try {
      sessionStorage.clear();
      localStorage.removeItem('aura_session');
    } catch {
      // Ignore storage errors in restrictive environments
    }

    // Force browser location immediately to Google to protect user safety
    window.location.replace('https://www.google.com');
  }, []);

  // Emergency triggering helpers (Aura Rapid Response Branding)
  const triggerEmergency = useCallback((emergencyData = {}) => {
    const timestamp = new Date().toISOString();
    const payload = {
      id: `AURA-${Date.now().toString().slice(-6)}`,
      status: 'active',
      startedAt: timestamp,
      dispatchedResponders: ['Aura Rapid Response Unit 4', 'Aura GBV Tactical Escort'],
      gpsCoordinates: emergencyData.coordinates || { lat: -26.2798, lng: 28.0069 }, // Mondeor / Glenvista Central
      sector: 'Johannesburg South - Mondeor Sector',
      ...emergencyData,
    };
    setActiveEmergency(payload);
  }, []);

  const clearEmergency = useCallback(() => {
    setActiveEmergency(null);
  }, []);

  const toggleStealthMode = useCallback(() => {
    setIsStealthMode((prev) => !prev);
  }, []);

  const toggleStealthEnabled = useCallback(() => {
    setIsStealthEnabled((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('aura_stealth_disguise_enabled', String(next));
      }
      return next;
    });
  }, []);

  // Motion handler for shake detection
  const handleDeviceMotion = useCallback((event) => {
    const currentAcc = event.accelerationIncludingGravity || event.acceleration;
    if (!currentAcc) return;

    const x = currentAcc.x || 0;
    const y = currentAcc.y || 0;
    const z = currentAcc.z || 0;

    const lastAcc = lastAccelerationRef.current;
    const deltaX = Math.abs(x - lastAcc.x);
    const deltaY = Math.abs(y - lastAcc.y);
    const deltaZ = Math.abs(z - lastAcc.z);

    const speed = deltaX + deltaY + deltaZ;

    if (speed > SHAKE_THRESHOLD) {
      triggerQuickExit();
    }

    lastAccelerationRef.current = { x, y, z };
  }, [triggerQuickExit]);

  // Internal helper to attach device motion listener
  const attachDeviceMotion = useCallback(() => {
    if (isMotionAttachedRef.current) return;
    if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
      window.addEventListener('devicemotion', handleDeviceMotion, false);
      isMotionAttachedRef.current = true;
    }
  }, [handleDeviceMotion]);

  // Safari Shake Bug fix with DeviceMotionEvent.requestPermission
  const initiateSensors = useCallback(async () => {
    try {
      const devMotionEvent = window.DeviceMotionEvent;
      if (typeof devMotionEvent !== 'undefined' && typeof devMotionEvent.requestPermission === 'function') {
        const permissionState = await devMotionEvent.requestPermission();
        if (permissionState === 'granted') {
          attachDeviceMotion();
          return true;
        }
        return false;
      } else if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
        attachDeviceMotion();
        return true;
      }
    } catch (err) {
      console.warn('Sensors permission error:', err);
    }
    return false;
  }, [attachDeviceMotion]);

  useEffect(() => {
    const devMotionEvent = typeof window !== 'undefined' ? window.DeviceMotionEvent : undefined;
    if (devMotionEvent && typeof devMotionEvent.requestPermission !== 'function') {
      attachDeviceMotion();
    }

    return () => {
      if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window && isMotionAttachedRef.current) {
        window.removeEventListener('devicemotion', handleDeviceMotion, false);
        isMotionAttachedRef.current = false;
      }
    };
  }, [attachDeviceMotion, handleDeviceMotion]);

  // 1. Rapid double-tap on screen (consecutive clicks within 300ms)
  useEffect(() => {
    const handleScreenClick = () => {
      const now = Date.now();
      const timeSinceLastClick = now - lastClickTimeRef.current;

      if (timeSinceLastClick > 0 && timeSinceLastClick <= DOUBLE_TAP_DELAY_MS) {
        triggerQuickExit();
      }

      lastClickTimeRef.current = now;
    };

    window.addEventListener('click', handleScreenClick, true);

    return () => {
      window.removeEventListener('click', handleScreenClick, true);
    };
  }, [triggerQuickExit]);

  // Global Escape key shortcut fallback
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        triggerQuickExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [triggerQuickExit]);

  const value = {
    user,
    setUser,
    updateUser,
    isUserLoading,
    setIsUserLoading,
    contacts,
    setContacts,
    addresses,
    setAddresses,
    isAuthenticated,
    setIsAuthenticated,
    isStealthMode,
    setIsStealthMode,
    toggleStealthMode,
    isStealthEnabled,
    setIsStealthEnabled,
    toggleStealthEnabled,
    isBooting,
    setIsBooting,
    hasSeenOnboarding,
    setHasSeenOnboarding,
    activeEmergency,
    setActiveEmergency,
    triggerEmergency,
    clearEmergency,
    triggerQuickExit,
    initiateSensors,
  };

  return (
    <AuthAndSafetyContext.Provider value={value}>
      {children}
    </AuthAndSafetyContext.Provider>
  );
}

export function useAuthAndSafety() {
  const context = useContext(AuthAndSafetyContext);
  if (!context) {
    throw new Error('useAuthAndSafety must be used within an AuthAndSafetyProvider');
  }
  return context;
}

export default AuthAndSafetyContext;
