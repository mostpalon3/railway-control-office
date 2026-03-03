"use client";

import { useState } from "react";
import { NewSessionDialog } from "./new-session-dialog";

export function NewSessionButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-black text-white text-xs font-medium px-4 py-2.5 uppercase
                   tracking-[0.1em] hover:bg-neutral-800 transition-colors rounded-none"
      >
        + New Session
      </button>
      <NewSessionDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
