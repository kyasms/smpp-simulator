import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 cursor-pointer",
  {
    variants: {
      variant: {
        default:     "bg-secondary border border-border text-foreground hover:bg-accent",
        success:     "bg-success/10 border border-success text-success hover:bg-success/20",
        destructive: "bg-destructive/10 border border-destructive text-destructive hover:bg-destructive/20",
        ghost:       "hover:bg-accent hover:text-accent-foreground",
        outline:     "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-7 px-3 py-1",
        sm:      "h-6 px-2 py-0.5 text-[11px]",
        icon:    "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
