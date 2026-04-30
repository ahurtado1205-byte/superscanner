import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  backTo?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, backTo, action, className }: PageHeaderProps) {
  return (
    <header className={cn("sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-4 md:px-6 md:py-6", className)}>
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {backTo && (
            <Link href={backTo} className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition-all text-foreground">
              <ArrowLeft className="w-6 h-6" />
            </Link>
          )}
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground truncate">
            {title}
          </h1>
        </div>
        {action && (
          <div>{action}</div>
        )}
      </div>
    </header>
  );
}
