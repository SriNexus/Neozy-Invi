import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { attemptLogin } from "./adminAuth";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (attemptLogin(email, password)) {
      navigate("/admin", { replace: true });
    } else {
      setError("Invalid email or password.");
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-6"
      style={{ background: "var(--ink)" }}
    >
      <div className="w-full max-w-sm">
        <h1
          className="font-display text-center mb-8"
          style={{ color: "var(--ivory)", fontSize: 26, fontStyle: "italic" }}
        >
          NEOZY-INVI Admin
        </h1>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 border border-[color:var(--gold-dim)]/40 rounded-lg p-6"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          <label className="flex flex-col gap-1">
            <span style={{ color: "var(--ivory-dim)", fontSize: 13 }}>Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md px-3 py-2 outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "var(--ivory)",
                border: "1px solid rgba(201,168,105,0.25)",
              }}
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ color: "var(--ivory-dim)", fontSize: 13 }}>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md px-3 py-2 outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "var(--ivory)",
                border: "1px solid rgba(201,168,105,0.25)",
              }}
              required
            />
          </label>
          {error && (
            <p style={{ color: "#e28b8b", fontSize: 13 }} role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="mt-2 rounded-md py-2 font-medium"
            style={{ background: "var(--gold)", color: "#141210" }}
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
