import { cn } from "@/lib/utils";

type MarianSaveLogoProps = {
  compact?: boolean;
  className?: string;
};

export function MarianSaveLogo({
  compact = false,
  className,
}: MarianSaveLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-primary shadow-sm">
        <img src="/logo.svg" alt="MarianSave" className="h-5 w-5" />
      </div>

      {!compact && (
        <p className="text-sm font-semibold tracking-tight">MarianSave</p>
      )}
    </div>
  );
}
