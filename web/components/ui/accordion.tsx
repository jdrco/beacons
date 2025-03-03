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
      "border-[#4AA69D] [&:not(:last-child)]:border-b-[1px]",
      className
    )}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

// Calendar toggle icon component
const CalendarToggleIcon = ({ isOpen }: { isOpen: boolean }) => {
  return (
    <div className="relative w-6 h-6 transition-opacity duration-200">
      <CalendarArrowUp
        className={cn(
          "absolute inset-0 transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0"
        )}
      />
      <CalendarArrowDown
        className={cn(
          "absolute inset-0 transition-opacity duration-200",
          isOpen ? "opacity-0" : "opacity-100"
        )}
      />
    </div>
  );
};

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> & {
    rightElement?: React.ReactNode;
    usePlusMinusToggle?: boolean; // Now controls Calendar toggles
  }
>(
  (
    { className, children, rightElement, usePlusMinusToggle = false, ...props },
    ref
  ) => {
    // Get the open state from data attribute for the icon transition
    const [isOpen, setIsOpen] = React.useState(false);
    return (
      <AccordionPrimitive.Header className="flex">
        <AccordionPrimitive.Trigger
          ref={ref}
          className={cn(
            "flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline text-left [&[data-state=open]_.chevron-icon]:rotate-180",
            className
          )}
          onPointerDown={() => setIsOpen(!isOpen)} // Toggle the state on click
          {...props}
        >
          {children}
          <div className="flex items-center gap-4">
            {rightElement ? (
              // If rightElement contains an icon that should toggle, replace it
              usePlusMinusToggle ? (
                <>
                  {/* Replace only the Plus/Minus with CalendarToggleIcon if present in rightElement */}
                  {React.Children.map(
                    rightElement as React.ReactElement,
                    (child) => {
                      if (React.isValidElement(child)) {
                        return <CalendarToggleIcon isOpen={isOpen} />;
                      }
                      return child;
                    }
                  )}
                </>
              ) : (
                // Use rightElement as is
                rightElement
              )
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