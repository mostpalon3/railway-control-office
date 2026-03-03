"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sessionSchema, type SessionFormValues } from "@/lib/validations";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface NewSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewSessionDialog({ open, onOpenChange }: NewSessionDialogProps) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: { name: "" },
  });

  async function onSubmit(values: SessionFormValues) {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: values.name.trim() }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body?.error ?? "Failed to create session");
      return;
    }
    toast.success(`Session "${values.name.trim()}" created`);
    reset();
    onOpenChange(false);
    router.refresh();
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-none border border-neutral-200 shadow-none bg-white max-w-sm p-8">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-base font-semibold text-black tracking-tight">
            New Session
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-400 mt-1">
            Give this control session a name to identify it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="session-name"
              className="block text-[10px] font-medium text-neutral-500 uppercase tracking-[0.15em] mb-1.5"
            >
              Session name
            </label>
            <input
              id="session-name"
              type="text"
              autoFocus
              {...register("name")}
              className="w-full border border-neutral-300 bg-white px-3 py-2 text-sm text-black
                         placeholder:text-neutral-300 focus:outline-none focus:border-black
                         transition-colors rounded-none"
              placeholder="e.g. Night shift 03-Mar-26"
            />
            {errors.name && (
              <p className="mt-1 text-[11px] text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="flex-1 border border-neutral-300 bg-white text-sm text-neutral-600
                         py-2 hover:border-black hover:text-black transition-colors rounded-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-black text-white text-sm font-medium py-2
                         hover:bg-neutral-800 transition-colors rounded-none
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

