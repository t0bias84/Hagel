import * as React from "react";
import { cn } from "../../lib/utils";

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type || "text"}
      className={cn(
        "flex h-10 w-full rounded-md border border-dark-600 bg-dark-700 px-3 py-2 text-white shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input }; 