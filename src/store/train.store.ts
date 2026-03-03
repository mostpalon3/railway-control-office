// train.store.ts is superseded by entry.store.ts which mirrors
// the `entries` table (loco1/loco2/train_no/station/chart_no/sno).
// This file is kept as a re-export shim for backwards compat.
export { useEntryStore as useTrainStore } from "./entry.store";
export type { Entry as Train } from "@/lib/supabase/types";
