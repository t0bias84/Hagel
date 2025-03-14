import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Exempel på en knappkomponent anpassad till militärgrönt tema.
 * Byt gärna ut "military-500", "military-400" etc. om dina Tailwind-färger heter annat.
 */
const Button = React.forwardRef(
  ({ 
    className, 
    children, 
    variant = "default", 
    size = "md", 
    ...props 
  }, ref) => {
    /**
     * Definierar de olika varianterna (utseenden) för knappen.
     * "default" => solid militärgrön bakgrund
     * "outline" => genomskinlig bakgrund, militärgrön kant
     * "ghost"   => helt genomskinlig, text militärgrön, highlight på hover
     * "destructive" => röd (för viktiga/kritiska/destruktiva handlingar)
     */
    const variants = {
      default: [
        "bg-military-500", 
        "text-white", 
        "hover:bg-military-400",
      ].join(" "),
      outline: [
        "border", 
        "border-military-500", 
        "text-military-100",
        "hover:bg-military-700"
      ].join(" "),
      ghost: [
        "text-military-100", 
        "hover:bg-military-800"
      ].join(" "),
      destructive: [
        "bg-red-600",
        "text-white", 
        "hover:bg-red-700"
      ].join(" "),
    };

    /**
     * Storleksklasser (padding, font-size, etc.)
     */
    const sizes = {
      sm: "px-2 py-1 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    return (
      <button
        ref={ref}
        className={cn(
          // Grundläggande klasser som gäller alla varianter
          "inline-flex items-center justify-center rounded-md font-medium transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-offset-2",
          // Militärgrön ring vid fokus
          "focus:ring-military-400",
          // Använder variant & size för att komponera slutlig klass
          variants[variant],
          sizes[size],
          // Eventuell extra className som skickas in
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
