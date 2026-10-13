"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list relative inline-flex max-w-full items-center overflow-x-auto text-muted-foreground group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        // Clean underline row: a line slides to the selected tab.
        default: "w-full justify-start gap-1 border-b border-border/70 bg-transparent",
        // Soft container with a raised thumb that slides to the selected tab.
        pill: "w-fit justify-center gap-1 rounded-xl border border-border/60 bg-muted/60 p-1",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  children,
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      <TabsPrimitive.Indicator
        data-slot="tabs-indicator"
        className={cn(
          "pointer-events-none absolute z-0 transition-[left,top,width,height] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
          "left-(--active-tab-left) w-(--active-tab-width)",
          // default: 2px underline on the list's bottom rule
          "group-data-[variant=default]/tabs-list:-bottom-px group-data-[variant=default]/tabs-list:h-0.5 group-data-[variant=default]/tabs-list:rounded-full group-data-[variant=default]/tabs-list:bg-primary dark:group-data-[variant=default]/tabs-list:bg-amber-300",
          // pill: raised thumb behind the tab
          "group-data-[variant=pill]/tabs-list:top-(--active-tab-top) group-data-[variant=pill]/tabs-list:h-(--active-tab-height) group-data-[variant=pill]/tabs-list:rounded-lg group-data-[variant=pill]/tabs-list:bg-background group-data-[variant=pill]/tabs-list:shadow-sm group-data-[variant=pill]/tabs-list:ring-1 group-data-[variant=pill]/tabs-list:ring-border/70 dark:group-data-[variant=pill]/tabs-list:bg-card"
        )}
      />
      {children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative z-10 inline-flex cursor-pointer items-center justify-center gap-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-200 group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // default (underline)
        "group-data-[variant=default]/tabs-list:rounded-t-md group-data-[variant=default]/tabs-list:px-4 group-data-[variant=default]/tabs-list:py-2.5 group-data-[variant=default]/tabs-list:data-active:font-semibold group-data-[variant=default]/tabs-list:data-active:text-primary dark:group-data-[variant=default]/tabs-list:data-active:text-amber-300",
        // pill
        "group-data-[variant=pill]/tabs-list:flex-1 group-data-[variant=pill]/tabs-list:rounded-lg group-data-[variant=pill]/tabs-list:px-3.5 group-data-[variant=pill]/tabs-list:py-1.5 group-data-[variant=pill]/tabs-list:data-active:font-semibold group-data-[variant=pill]/tabs-list:data-active:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
