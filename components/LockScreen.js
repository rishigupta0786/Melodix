"use client";

import { useState, useEffect } from "react";

export default function LockScreen({ children }) {
  const [isLocked, setIsLocked] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = localStorage.getItem("vibe_auth") === "true";
      if (isAuth) {
        setIsLocked(false);
        setIsChecking(false);
        return;
      } 
      
      // Also check if backend has no password set
      try {
         const res = await fetch('/api/auth', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ password: '' })
         });
         if (res.ok) {
           const data = await res.json();
           if (data.success) {
             setIsLocked(false);
           }
         }
      } catch(e) {
         console.error("Auth check failed", e);
      } finally {
         setIsChecking(false);
      }
    };
    checkAuth();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        localStorage.setItem("vibe_auth", "true");
        setIsLocked(false);
      } else {
        setError("Incorrect password");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return <div className="flex min-h-screen items-center justify-center bg-bg text-text-secondary">Loading...</div>;
  }

  if (!isLocked) {
    return children;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg">
      <div className="absolute inset-0 z-0 bg-black/60 backdrop-blur-3xl"></div>
      
      <div className="glass-panel z-10 w-full max-w-sm rounded-3xl p-8 shadow-2xl flex flex-col items-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-white">App Locked</h1>
        <p className="mb-8 text-center text-sm text-text-secondary">Enter the password to access the music player.</p>
        
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-white/40 outline-none ring-accent transition-all focus:ring-2 focus:bg-white/10"
            autoFocus
          />
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <button
            type="submit"
            disabled={isLoading || !password}
            className="mt-2 w-full rounded-xl bg-accent px-4 py-3 font-semibold text-black transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {isLoading ? "Unlocking..." : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}
