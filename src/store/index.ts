export { useSessionStore } from "./session.store";
export type { Session } from "./session.store";

export { useEntryStore } from "./entry.store";
export type { Entry } from "./entry.store";

// Shim — useTrainStore points at useEntryStore for backwards compat
export { useTrainStore } from "./train.store";

// UI-only station autocomplete store (not persisted to DB directly)
export { useStationStore } from "./station.store";
export type { Station } from "./station.store";
