import * as React from "react"
import { cn } from "@/lib/utils"

const TooltipContext = React.createContext({})

function TooltipProvider({ children, delayDuration = 200 }) {
  return (
    <TooltipContext.Provider value={{ delayDuration }}>
      {children}
    </TooltipContext.Provider>
  )
}

function Tooltip({ children }) {
  const [open, setOpen] = React.useState(false)
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </TooltipContext.Provider>
  )
}

function TooltipTrigger({ children, asChild }) {
  const { setOpen } = React.useContext(TooltipContext)
  const child = asChild ? React.Children.only(children) : children
  
  const handleMouseEnter = () => setOpen(true)
  const handleMouseLeave = () => setOpen(false)
  
  if (asChild && React.isValidElement(child)) {
    return React.cloneElement(child, {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    })
  }
  
  return (
    <span onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
    </span>
  )
}

function TooltipContent({ children, className, side = "top", ...props }) {
  const { open } = React.useContext(TooltipContext)
  
  if (!open) return null
  
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }
  
  return (
    <div
      className={cn(
        "absolute z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        positionClasses[side],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

