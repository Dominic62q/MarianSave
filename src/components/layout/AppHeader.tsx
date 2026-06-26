import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type AppHeaderProps = {
  title: string;
  description: string;
};

export function AppHeader({ title, description }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b bg-background px-4 py-3">
      <div>
        <h1 className="text-base font-semibold tracking-tight">{title}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="w-56 pl-9"
            disabled
          />
        </div>
        <Button variant="outline" size="icon" disabled aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
