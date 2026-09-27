"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function YouTubeSearch({ onSearch, placeholder = "Search YouTube...", className = "" }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const handleSearch = useCallback((value) => {
    const trimmed = value.trim();
    setQuery(trimmed);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(trimmed);
    }, 300);
  }, [onSearch]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className={`glass-panel flex items-center gap-3 rounded-xl px-4 py-3 ${className}`}>
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 shrink-0 text-text-secondary"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M21 21l-4.35-4.35" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-text-secondary text-base"
        aria-label="Search YouTube"
        autoComplete="off"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            handleSearch("");
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          className="flex shrink-0 items-center justify-center h-6 w-6 rounded-full text-text-secondary hover:bg-white/10 hover:text-text-primary transition-colors"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}