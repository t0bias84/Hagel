import React from "react";

const Button = React.forwardRef(({ 
  className = "",
  variant = "default",
  size = "default",
  children,
  ...props 
}, ref) => {
  const variants = {
    default: "bg-dark-accent text-dark-highlight hover:bg-dark-secondary",
    destructive: "bg-red-500 text-white hover:bg-red-600",
    outline: "border border-dark-accent bg-transparent hover:bg-dark-secondary hover:text-dark-highlight",
    secondary: "bg-dark-secondary text-dark-highlight hover:bg-dark-accent",
    ghost: "hover:bg-dark hover:text-dark-highlight",
    link: "text-dark-accent underline-offset-4 hover:underline hover:text-dark-highlight",
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center rounded-md text-sm font-medium 
        transition-colors focus-visible:outline-none focus-visible:ring-2 
        focus-visible:ring-dark-accent focus-visible:ring-offset-2 
        disabled:opacity-50 disabled:pointer-events-none ring-offset-background
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = "Button";

export { Button }; 