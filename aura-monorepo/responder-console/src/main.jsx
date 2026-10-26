
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./style.css";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1"
).replace(/\/$/, "");

function App() {
  const [token, setToken] = useState(
    localStorage.getItem("responder_token") || "",
  );
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [demoAccessKey, setDemoAccessKey] = useState("");
  const [demoLoginEnabled] = useState(
    import.meta.env.VITE_DEMO_LOGIN_ENABLED === "true",
  );
  const [incidents, setIncidents] = useState([]);
  const [unit, setUnit] = useState("Unit 1");
  const [eta, setEta] = useState(10);
  const [error, setError] = useState("");

  async function call(path, method = "GET", body) {
    const r = await fetch(API + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (r.status === 204) return null;

    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(d.error || `HTTP ${r.status}`);
    return d;
  }

  async function requestOtp() {
    try {
      await call("/auth/login/request-otp", "POST", {
        phoneNumber: phone,
      });
      setError(
        "If this number belongs to a verified account, a code will be sent.",
      );
    } catch (e) {
      setError(e.message);
    }
  }

  async function demoLogin() {
    try {
      const d = await call("/auth/demo-login", "POST", {
        role: "responder",
        accessKey: demoAccessKey,
      });

      if (d.user.role !== "responder" && d.user.role !== "admin") {
        throw Error("The configured demo account is not a responder");
      }

      setToken(d.token);
      localStorage.setItem("responder_token", d.token);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }

  async function verify() {
    try {
      const d = await call("/auth/login/verify-otp", "POST", {
        phoneNumber: phone,
        code,
      });

      if (d.user.role !== "responder" && d.user.role !== "admin") {
        throw Error("This account is not a responder");
      }

      setToken(d.token);
      localStorage.setItem("responder_token", d.token);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }

  async function refresh() {
    try {
      const d = await call("/responder/incidents");
      setIncidents(d.incidents || []);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!token) return;

    refresh();
    const id = setInterval(refresh, 3000);

    return () => clearInterval(id);
  }, [token]);

  useEffect(() => {
    if (!token || !incidents.length) return;

    const el = document.getElementById("map");
    if (!el) return;

    const firstLocated = incidents.find(
      (incident) =>
        Number.isFinite(incident.lat) &&
        Number.isFinite(incident.lng),
    );

    if (!firstLocated) return;

    const map = L.map(el).setView(
      [firstLocated.lat, firstLocated.lng],
      10,
    );

    L.tileLayer(
      import.meta.env.VITE_TILE_URL ||
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution: "© OpenStreetMap contributors" },
    ).addTo(map);

    incidents.forEach((i) => {
      if (Number.isFinite(i.lat) && Number.isFinite(i.lng)) {
        L.marker([i.lat, i.lng])
          .addTo(map)
          .bindPopup(`${i.threat_level} · ${i.status}`);
      }
    });

    return () => map.remove();
  }, [token, incidents]);

  async function update(i, status) {
    try {
      await call(`/responder/incidents/${i.id}`, "PATCH", {
        status,
        assignedUnit: unit,
        etaMinutes: Number(eta),
      });

      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  if (!token) {
    return (
      <main>
        <h1>Responder Console</h1>

        <p>
          Sign in using the phone and OTP registered to a responder
          account.
        </p>

        {demoLoginEnabled && (
          <section
            className="demo-login"
            aria-label="Judge demo access"
          >
            <h2>Judge Demo Access</h2>
            <p>
              Use the demo access key supplied by the event organizer.
            </p>

            <input
              type="password"
              autoComplete="current-password"
              placeholder="Judge demo access key"
              value={demoAccessKey}
              onChange={(e) => setDemoAccessKey(e.target.value)}
            />

            <button
              onClick={demoLogin}
              disabled={!demoAccessKey.trim()}
            >
              Sign in as demo responder
            </button>
          </section>
        )}

        <hr />

        <p>Or sign in with a responder phone number and OTP.</p>

        <input
          placeholder="South African mobile"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <button onClick={requestOtp}>Request code</button>

        <input
          placeholder="6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        <button onClick={verify}>Sign in</button>

        <p>{error}</p>
      </main>
    );
  }

  return (
    <main>
      <header>
        <h1>Responder Console</h1>

        <button
          onClick={() => {
            localStorage.removeItem("responder_token");
            setToken("");
          }}
        >
          Sign out
        </button>
      </header>

      {error && <p role="alert">{error}</p>}

      <div id="map" />

      <section>
        <label>
          Unit{" "}
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </label>

        <label>
          ETA minutes{" "}
          <input
            type="number"
            min="0"
            max="1440"
            value={eta}
            onChange={(e) => setEta(e.target.value)}
          />
        </label>
      </section>

      <ul>
        {incidents.map((i) => (
          <li key={i.id}>
            <strong>
              {i.threat_level.toUpperCase()} · {i.status}
            </strong>

            <p>
              {i.full_name} · {i.phone_e164}
            </p>

            <p>
              {i.category} ·{" "}
              {new Date(i.created_at).toLocaleString()}
            </p>

            <p>
              Guardians notified: {Number(i.guardiansNotified || 0)}
            </p>

            <button onClick={() => update(i, "acknowledged")}>
              Acknowledge
            </button>

            <button onClick={() => update(i, "dispatched")}>
              Dispatch
            </button>

            <button onClick={() => update(i, "resolved")}>
              Resolve
            </button>

            <button onClick={() => update(i, "false_alarm")}>
              False alarm
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
