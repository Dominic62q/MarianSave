import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SummaryCard = {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "danger";
};

type ShellPageProps = {
  eyebrow?: string;
  cards?: SummaryCard[];
  children?: ReactNode;
  className?: string;
};

export function ShellPage({
  eyebrow,
  cards,
  children,
  className,
}: ShellPageProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {eyebrow && (
        <Badge variant="secondary">{eyebrow}</Badge>
      )}

      {cards && cards.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.label}>
              <CardContent className="p-2">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p
                  className={cn(
                    "mt-0.5 text-xs font-medium tracking-tight",
                    card.tone === "success" && "text-emerald-600",
                    card.tone === "danger" && "text-rose-600",
                    !card.tone && "text-foreground",
                  )}
                >
                  {card.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}
