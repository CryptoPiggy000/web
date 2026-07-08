import type { ReactNode } from "react";
import { Button } from "./button";
import { IconCheck } from "./icons";

/** Shared success state for every sheet — same check, same full-width Done. */
export function SheetSuccess({
  title,
  children,
  onDone,
}: {
  title: string;
  children?: ReactNode;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-good/10 text-good">
        <IconCheck className="h-6 w-6" />
      </span>
      <p className="font-medium">{title}</p>
      {children && <div className="text-sm text-muted">{children}</div>}
      <Button full className="mt-1" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}
