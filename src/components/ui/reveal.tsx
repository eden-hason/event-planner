"use client"

import * as React from "react"
import { Collapsible as CollapsiblePrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

interface RevealProps extends React.ComponentProps<"div"> {
  open: boolean
}

/**
 * Animates a block in and out of the flow by height, so whatever sits below it
 * slides instead of jumping. A thin wrapper over Radix Collapsible, which
 * measures the content height and unmounts it once closed, with the keyframes
 * from tw-animate-css. No extra dependency; honours reduced motion.
 */
function Reveal({ open, className, children, ...props }: RevealProps) {
  return (
    <CollapsiblePrimitive.Root open={open}>
      <CollapsiblePrimitive.Content
        data-slot="reveal"
        className={cn(
          "overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down motion-reduce:animate-none",
          className
        )}
        {...props}
      >
        {children}
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  )
}

export { Reveal }
