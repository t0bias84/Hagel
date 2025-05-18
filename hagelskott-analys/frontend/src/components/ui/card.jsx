// src/components/ui/card.jsx
import * as React from "react";
import { cn } from "../../lib/utils";

/**
 * Card
 * ----
 * Du kan styla kortet med olika utseenden (variant="default"/"military")
 * och även välja hover-effect (hoverable={true}).
 *
 * Usage:
 *  <Card variant="military" hoverable>
 *    <CardHeader>...</CardHeader>
 *    <CardContent>...</CardContent>
 *  </Card>
 */
export const Card = React.forwardRef(
  ({ className, variant = "default", hoverable = false, ...props }, ref) => {
    // Varianter: Du kan lägga in fler om du vill
    const variants = {
      default: [
        "bg-white",
        "border border-gray-200",
        "shadow-sm",
        "dark:bg-dark",
        "dark:border-dark-secondary",
        "dark:text-dark-highlight"
      ].join(" "),
      military: [
        "bg-dark",
        "border border-dark-secondary",
        "text-dark-highlight",
        "shadow",
        "dark:bg-dark",
        "dark:border-dark-accent",
        "dark:text-dark-highlight"
      ].join(" ")
    };

    // Om hoverable => addera en mild hover-shadow
    const hoverClasses = hoverable
      ? "transition-shadow hover:shadow-md dark:hover:shadow-dark-accent/20"
      : "";

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg",          // basrundning
          variants[variant],     // apply chosen variant
          hoverClasses,          // om hoverable
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

/**
 * CardHeader
 * ----------
 * Header-sektionen (ex. rubrik, actions).
 */
export const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "p-4 border-b border-gray-200 dark:border-dark-secondary",
      className
    )}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

/**
 * CardTitle
 * ---------
 * Större rubrik.
 */
export const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold text-gray-900 dark:text-gray-100",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

/**
 * CardDescription
 * ---------------
 * En mindre, sekundär text (t.ex. under en rubrik).
 */
export const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm text-gray-600 dark:text-gray-300", 
      className
    )}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

/**
 * CardContent
 * -----------
 * Själva innehållssektionen, ex. text, listor, bilder.
 */
export const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "p-4 text-gray-700 dark:text-gray-200",
      className
    )}
    {...props}
  />
));
CardContent.displayName = "CardContent";

/**
 * CardFooter
 * ----------
 * Sektion längst ned i kortet (ex. knappar, extra info).
 */
export const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "p-4 border-t border-gray-200 dark:border-gray-700",
      className
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
