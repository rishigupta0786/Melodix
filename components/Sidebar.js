"use client";

export default function Sidebar({
  sections,
  activeSection,
  activeGenre,
  onSelectSection,
  onSelectGenre,
  className = "flex",
}) {
  return (
    <aside className={`glass-panel w-72 shrink-0 flex-col gap-8 px-6 py-8 ${className}`}>
      <div>
        <p className="text-lg font-semibold tracking-tight text-text-primary">
          Vibe Coding
        </p>
        <p className="mt-1 text-sm text-text-secondary">Find your flow</p>
      </div>

      <nav aria-label="Music sources" className="flex flex-col gap-6">
        {sections.map((section) => (
          <div key={section.id}>
            <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-text-secondary">
              {section.label}
            </p>
            <ul className="flex flex-col gap-1">
              {section.items.map((item) => {
                const isActiveSection = activeSection === section.id;
                const isActiveGenre = activeGenre === item.id;
                const isActive = isActiveSection && (section.id === "online" ? isActiveGenre : true);
                
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSection(section.id);
                        if (item.id !== section.id) {
                          onSelectGenre(item.id, section.id);
                        }
                      }}
                      aria-current={isActive ? "true" : undefined}
                      className={`focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        isActive
                          ? "bg-white/10 text-text-primary"
                          : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                          isActive ? "bg-accent" : "bg-transparent"
                        }`}
                        aria-hidden="true"
                      />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}