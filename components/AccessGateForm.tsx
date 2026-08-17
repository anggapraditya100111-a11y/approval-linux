"use client";

import { FormEvent, useState } from "react";

function safeReturnTo(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default function AccessGateForm({ returnTo }: { returnTo: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: form.get("password") }),
    });
    const body = await response.json().catch(() => ({ error: "Akses belum dapat diproses." }));
    if (response.ok) {
      window.location.replace(safeReturnTo(returnTo));
      return;
    }
    setError(body.error || "Password akses tidak sesuai.");
    setBusy(false);
  }

  return (
    <main className="login-page access-gate-page">
      <section>
        <div className="brand">
          <span className="brand-mark">A</span>
          <span><strong>AINET</strong><small>Approval</small></span>
        </div>
        <span className="eyebrow">Portal internal</span>
        <h1>Masukkan password akses</h1>
        <p>Aplikasi ini hanya dapat dibuka oleh pihak internal yang memiliki password akses awal.</p>
        <form onSubmit={submit}>
          <label>
            Password akses
            <input
              type="password"
              name="password"
              required
              autoFocus
              autoComplete="current-password"
              placeholder="Masukkan password"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button disabled={busy} className="button primary">
            {busy ? "Memeriksa..." : "Buka aplikasi"}
          </button>
        </form>
        <small className="access-gate-note">Sesi akses berlaku selama 30 hari pada perangkat ini.</small>
      </section>
    </main>
  );
}
