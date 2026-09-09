"use client";

export default function Sidebar({ genres, selectedGenre, onSelect, className = "flex" }) {
  return (
    <aside
      className={`glass-panel w-72 shrink-0 flex-col gap-8 px-6 py-8 ${className}`}
    >
      <div>
        <p className="text-lg font-semibold tracking-tight text-text-primary">
          Vibe Coding
        </p>
        <p className="mt-1 text-sm text-text-secondary">Find your flow</p>
      </div>

      <nav aria-label="Genres" className="flex flex-col gap-1">
        <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-text-secondary">
          Genres
        </p>
        <ul className="flex flex-col gap-1">
          {genres.map((genre) => {
            const isActive = genre.id === selectedGenre;
            return (
              <li key={genre.id}>
                <button
                  type="button"
                  onClick={() => onSelect(genre.id)}
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
                  {genre.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
