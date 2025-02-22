import * as React from "react"
import { cn } from "@/lib/utils"

interface FormLayoutProps extends React.HTMLAttributes<HTMLFormElement> {
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
  className?: string
  children: React.ReactNode
}

const FormLayout = React.forwardRef<HTMLFormElement, FormLayoutProps>(
  ({ className, onSubmit, children, ...props }, ref) => {
    return (
      <form
        ref={ref}
        onSubmit={onSubmit}
        className={cn(
          // Mobile-first form layout styles
          "w-full max-w-[95vw] sm:max-w-md mx-auto",
          "space-y-4 sm:space-y-6",
          "p-4 sm:p-6",
          "bg-background",
          "rounded-lg sm:rounded-xl",
          "border border-border/10",
          "shadow-sm",
          className
        )}
        {...props}
      >
        {children}
      </form>
    )
  }
)
FormLayout.displayName = "FormLayout"

const FormSection = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-3 sm:space-y-4", className)}
    {...props}
  />
))
FormSection.displayName = "FormSection"

const FormGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5",
      // Increase touch target spacing on mobile
      "touch:space-y-2",
      className
    )}
    {...props}
  />
))
FormGroup.displayName = "FormGroup"

// Enhanced touch-friendly input that extends the existing input component
const FormInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2",
      "text-sm",
      // Increased height for better touch targets
      "touch:h-12 touch:text-base",
      "file:border-0 file:bg-transparent file:text-sm file:font-medium",
      "placeholder:text-muted-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
))
FormInput.displayName = "FormInput"

// Form error message component
const FormError = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm font-medium text-destructive",
      "touch:text-base", // Larger text on touch devices
      className
    )}
    {...props}
  />
))
FormError.displayName = "FormError"

// Form description component
const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "text-sm text-muted-foreground",
      "touch:text-base", // Larger text on touch devices
      className
    )}
    {...props}
  />
))
FormDescription.displayName = "FormDescription"

export {
  FormLayout,
  FormSection,
  FormGroup,
  FormInput,
  FormError,
  FormDescription
}
