import Image from "next/image";

interface TeamCrestProps {
  crestUrl: string;
  teamName: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: 24,
  md: 32,
  lg: 48,
};

export function TeamCrest({ crestUrl, teamName, size = "md" }: TeamCrestProps) {
  const px = sizeMap[size];
  const initials = teamName.slice(0, 3).toUpperCase();

  if (!crestUrl) {
    return (
      <span
        className="inline-flex items-center justify-center rounded bg-muted text-muted-foreground font-mono font-bold text-xs"
        style={{ width: px, height: px }}
      >
        {initials}
      </span>
    );
  }

  return (
    <Image
      src={crestUrl}
      alt={teamName}
      width={px}
      height={px}
      className="object-contain"
      unoptimized
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
