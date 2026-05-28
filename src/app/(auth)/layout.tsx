export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,oklch(0.22_0.06_248),transparent)]" />
      <div className="absolute inset-x-6 bottom-6 top-20 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklch,var(--primary)_24%,transparent),transparent_38%)]" />
      <div className="relative z-10 flex w-full items-center justify-center">
        {children}
      </div>
    </div>
  );
}
