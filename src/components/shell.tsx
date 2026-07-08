/** Phone-width column, centered on desktop so web renders like the mobile app. */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-[26rem] flex-1 flex-col overflow-hidden bg-paper sm:border-x sm:border-line">
      {children}
    </div>
  );
}
