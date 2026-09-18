import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("rounded-lg border px-4 py-3 text-sm", {
  variants: {
    variant: {
      default: "bg-muted/60 text-foreground",
      info: "border-status-info/25 bg-status-info/8 text-foreground",
      warning: "border-status-warning/30 bg-status-warning/10 text-foreground",
      critical: "border-status-critical/30 bg-status-critical/8 text-foreground",
      success: "border-status-success/25 bg-status-success/8 text-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

function Alert({ className, variant, ...props }: AlertProps) {
  return <div role="status" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mb-1 font-medium", className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-muted-foreground", className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription };
