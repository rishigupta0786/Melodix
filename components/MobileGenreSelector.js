"use client";

import React, { useEffect, useRef, useState } from "react";

export default function MobileGenreSelector({ 
  sections, 
  activeSection, 
  activeGenre, 
  onSelectSection,
  onSelectGenre,
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  
  const activeSectionData = sections.find((s) => s.id === activeSection);
  const activeItem = activeSectionData?.items.find((item) => item.id === activeGenre);
  const displayLabel = activeItem?.label ?? activeSectionData?.label ?? "";

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="focus-ring glass-panel flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm text-text-primary"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-text-secondary">{activeSectionData?.label ?? "Browse"}</span>
          <span className="truncate font-medium">{displayLabel}</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 text-text-secondary transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          <polyline
            points="6,9 12,15 18,9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label="Music sources"
          className="glass-panel no-scrollbar absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-72 overflow-y-auto rounded-xl p-2"
        >
          {sections.map((section) => (
            <React.Fragment key={section.id}>
              <li
                role="separator"
                className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-text-secondary"
                aria-hidden="true"
              >
                {section.label}
              </li>
              {section.items.map((item) => {
                const isActive = activeSection === section.id && activeGenre === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        onSelectSection(section.id);
                        onSelectGenre(item.id, section.id);
                        setIsOpen(false);
                      }}
                      className={`focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${
                        isActive
                          ? "bg-white/10 text-text-primary"
                          : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          isActive ? "bg-accent" : "bg-transparent"
                        }`}
                        aria-hidden="true"
                      />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </React.Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}