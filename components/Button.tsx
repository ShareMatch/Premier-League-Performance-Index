import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "white" | "outline" | "ghost";
  fullWidth?: boolean;
};

const variantClasses: Record<string, string> = {
  white: "bg-brand-whiteButtonBg text-brand-whiteButtonText hover:opacity-90",
  outline:
    "border border-brand-emerald500 text-white hover:bg-brand-emerald500/10",
  ghost: "bg-transparent text-white",
};

export default function Button({
  variant = "white",
  fullWidth = true,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const base = `${
    fullWidth ? "w-full" : ""
  } py-1.5 sm:py-2 rounded-full font-medium font-sans text-xs sm:text-sm transition-all duration-300 disabled:cursor-not-allowed`;
  const classes = `${base} ${variantClasses[variant]} ${className}`.trim();
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
