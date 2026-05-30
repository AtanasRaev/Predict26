export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-3 py-5 sm:p-4">
      <div className="absolute inset-x-0 top-0 h-52 bg-[linear-gradient(180deg,oklch(0.22_0.06_248),transparent)]" />
      <div className="relative z-10 flex w-full items-center justify-center">
        {children}
      </div>
    </div>
  );
}
