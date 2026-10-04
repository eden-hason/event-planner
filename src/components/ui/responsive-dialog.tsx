"use client"

import * as React from "react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

/**
 * A bottom drawer on a phone, a centered dialog on desktop. The parts mirror
 * the Dialog/Drawer API and pick their primitive from the root, so a caller
 * writes one tree and gets the right surface for the viewport.
 */
const ResponsiveDialogContext = React.createContext(false)

function useResponsiveDialogIsMobile() {
  return React.useContext(ResponsiveDialogContext)
}

function ResponsiveDialog({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}) {
  const isMobile = useIsMobile()
  const Root = isMobile ? Drawer : Dialog

  return (
    <ResponsiveDialogContext.Provider value={isMobile}>
      <Root open={open} onOpenChange={onOpenChange}>
        {children}
      </Root>
    </ResponsiveDialogContext.Provider>
  )
}

function ResponsiveDialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<"div"> & { showCloseButton?: boolean }) {
  const isMobile = useResponsiveDialogIsMobile()

  if (isMobile) {
    return (
      <DrawerContent className={cn("max-h-[92vh]", className)} {...props}>
        {children}
      </DrawerContent>
    )
  }

  return (
    <DialogContent
      showCloseButton={showCloseButton}
      className={cn(
        "flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-md",
        className
      )}
      {...props}
    >
      {children}
    </DialogContent>
  )
}

function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const isMobile = useResponsiveDialogIsMobile()
  if (isMobile) return <DrawerHeader className={className} {...props} />
  return (
    <DialogHeader
      className={cn("px-6 pt-6 pb-4 pe-12 text-start", className)}
      {...props}
    />
  )
}

/** The scrollable middle, padded to line up with the header and footer. */
function ResponsiveDialogBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const isMobile = useResponsiveDialogIsMobile()
  return (
    <div
      data-slot="responsive-dialog-body"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto",
        isMobile ? "px-4" : "px-6",
        className
      )}
      {...props}
    />
  )
}

function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const isMobile = useResponsiveDialogIsMobile()
  return (
    <div
      data-slot="responsive-dialog-footer"
      className={cn(
        "mt-auto flex flex-col gap-2",
        isMobile ? "p-4" : "px-6 pt-4 pb-6",
        className
      )}
      {...props}
    />
  )
}

function ResponsiveDialogTitle(
  props: React.ComponentProps<typeof DialogTitle>
) {
  const isMobile = useResponsiveDialogIsMobile()
  return isMobile ? <DrawerTitle {...props} /> : <DialogTitle {...props} />
}

function ResponsiveDialogDescription(
  props: React.ComponentProps<typeof DialogDescription>
) {
  const isMobile = useResponsiveDialogIsMobile()
  return isMobile ? (
    <DrawerDescription {...props} />
  ) : (
    <DialogDescription {...props} />
  )
}

function ResponsiveDialogClose(
  props: React.ComponentProps<typeof DialogClose>
) {
  const isMobile = useResponsiveDialogIsMobile()
  return isMobile ? <DrawerClose {...props} /> : <DialogClose {...props} />
}

export {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
}
