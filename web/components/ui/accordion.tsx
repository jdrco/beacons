"use client";
import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown, CalendarArrowDown, CalendarArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(
      "border-[#2b5f5a] [&:not(:last-child)]:border-b-[1px]",
      className
    )}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> & {
    rightElement?: React.ReactNode;
    usePlusMinusToggle?: boolean;
    additionalControls?: React.ReactNode;
  }
>(
  (
    {
      className,
      children,
      rightElement,
      usePlusMinusToggle = false,
      additionalControls,
      ...props
    },
    ref
  ) => {
    // Use React's context to access the open state directly
    const [open, setOpen] = React.useState(false);

    // Get the value from the Accordion context if available
    // Use a ref to track the element and its state
    const triggerRef = React.useRef<HTMLButtonElement>(null);

    // This function will be called when the element is rendered
    const handleRef = React.useCallback(
      (element: HTMLButtonElement | null) => {
        // Handle the forwarded ref properly
        if (typeof ref === "function") {
          ref(element);
        } else if (ref) {
          ref.current = element;
        }

        // Store our own ref for state tracking
        triggerRef.current = element;

        // Check the initial state
        if (element) {
          setOpen(element.getAttribute("data-state") === "open");
        }
      },
      [ref]
    );

    // Handle clicks manually
    const handleClick = React.useCallback(() => {
      // We just toggle our local state - the actual toggle happens
      // through Radix UI's built-in behavior
      setOpen((prev) => !prev);
    }, []);

    return (
      <AccordionPrimitive.Header className="flex">
        <AccordionPrimitive.Trigger
          ref={handleRef}
          className={cn(
            "flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline text-left [&[data-state=open]_.chevron-icon]:rotate-180",
            className
          )}
          onClick={handleClick}
          {...props}
        >
          {children}
          <div className="flex items-center gap-6">
            {additionalControls}

            {usePlusMinusToggle ? (
              // Calendar toggle icons
              <div className="relative w-6 h-6 transition-opacity duration-200">
                <CalendarArrowUp
                  className={cn(
                    "absolute inset-0 transition-opacity duration-200",
                    open ? "opacity-100" : "opacity-0"
                  )}
                />
                <CalendarArrowDown
                  className={cn(
                    "absolute inset-0 transition-opacity duration-200",
                    open ? "opacity-0" : "opacity-100"
                  )}
                />
              </div>
            ) : rightElement ? (
              // Use provided rightElement
              rightElement
            ) : (
              // Default to ChevronDown if no rightElement provided
              <ChevronDown className="shrink-0 transition-transform duration-200 chevron-icon" />
            )}
          </div>
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
    );
  }
);
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
