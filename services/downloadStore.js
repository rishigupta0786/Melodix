// Tiny client-side store tracking active song downloads, shared by every card and the top progress bar.
// Shape: { [trackId]: { title, percent, status: "downloading" | "error", error? } }

const EMPTY_DOWNLOADS = {};
let downloads = EMPTY_DOWNLOADS;
const listeners = new Set();

function set(next) {
  downloads = next;
  listeners.forEach((listener) => listener());
}

export const downloadStore = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: () => downloads,
  // Must return the same reference every call, or useSyncExternalStore loops.
  getServerSnapshot: () => EMPTY_DOWNLOADS,
  update(id, patch) {
    set({ ...downloads, [id]: { ...downloads[id], ...patch } });
  },
  remove(id) {
    const { [id]: _removed, ...rest } = downloads;
    set(rest);
  },
};
