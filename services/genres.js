// Provider-agnostic catalogue definitions, safe to import from both client and
// server. Each "genre" is really a curated search query against the music API.
export const GENRES = [
  { id: "bollywood", label: "Bollywood Hits", query: "bollywood hits" },
  { id: "arijit", label: "Arijit Singh", query: "arijit singh" },
  { id: "romantic", label: "Romantic", query: "romantic hindi songs" },
  { id: "nineties", label: "90s Hindi", query: "90s hindi songs" },
  { id: "punjabi", label: "Punjabi", query: "punjabi hits" },
  { id: "lofi", label: "Hindi Lo-fi", query: "hindi lofi" },
  { id: "party", label: "Party", query: "bollywood party songs" },
  { id: "sad", label: "Sad", query: "sad hindi songs" },
  { id: "indie", label: "Indie", query: "hindi indie" },
];

export class MusicServiceError extends Error {
  constructor(message, options) {
    super(message);
    this.name = "MusicServiceError";
    if (options?.cause) this.cause = options.cause;
  }
}
