import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Här definierar vi två varianter:
 *  - default => Militärgrön bakgrund, ljus text
 *  - destructive => Röd bakgrund, vit text
 *
 * Du kan utöka detta med fler varianter (success, warning, info, etc.)
 * anpassade efter ditt färgschema i tailwind.config.js.
 */
const Alert = React.forwardRef(
  ({ className, variant = "default", ...props }, ref) => {
    // Variant-klasser för bakgrund, text och ev. border.
    const variants = {
      default: [
        // T.ex. lite ljusare militärgrön bakgrund.
        "bg-military-600",
        "text-white",
        // Vill du ha en tunnare border i samma ton kan du lägga till:
        "border border-military-400"
      ].join(" "),
      destructive: [
        "bg-red-700",
        "text-white",
        "border border-red-800"
      ].join(" ")
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          // Grundklasser som gäller alla alert-varianter
          "relative w-full rounded-lg p-4",
          // Lägg ihop med variant-klasser
          variants[variant],
          // Om man skickar in egna klasser via className
          className
        )}
        {...props}
      />
    );
  }
);
Alert.displayName = "Alert";

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      "mb-1 text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

export { Alert, AlertDescription, AlertTitle };
