import * as React from "react"
import { motion, PanInfo, useAnimation } from "framer-motion"
import { cn } from "@/lib/utils"

interface SwipeActionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  leftAction?: React.ReactNode
  rightAction?: React.ReactNode
  threshold?: number
  className?: string
}

export function SwipeAction({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  threshold = 0.4,
  className,
  ...props
}: SwipeActionProps) {
  const controls = useAnimation()
  const [isDragging, setIsDragging] = React.useState(false)
  
  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = window.innerWidth * 0.4
    setIsDragging(false)

    if (Math.abs(info.offset.x) < threshold) {
      await controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 40 } })
      return
    }

    if (info.offset.x > 0 && onSwipeRight) {
      await controls.start({ 
        x: window.innerWidth,
        transition: { duration: 0.2 }
      })
      onSwipeRight()
    } else if (info.offset.x < 0 && onSwipeLeft) {
      await controls.start({ 
        x: -window.innerWidth,
        transition: { duration: 0.2 }
      })
      onSwipeLeft()
    }
  }

  return (
    <div 
      className={cn(
        "relative touch-none overflow-hidden",
        isDragging && "cursor-grabbing z-50",
        className
      )}
      {...props}
    >
      {/* Action backgrounds */}
      <div className="absolute inset-0 flex justify-between items-center">
        {rightAction && (
          <div className="absolute inset-y-0 left-0 flex items-center px-4 bg-primary text-primary-foreground">
            {rightAction}
          </div>
        )}
        {leftAction && (
          <div className="absolute inset-y-0 right-0 flex items-center px-4 bg-destructive text-destructive-foreground">
            {leftAction}
          </div>
        )}
      </div>

      {/* Swipeable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        onDragStart={() => setIsDragging(true)}
        className={cn(
          "relative bg-background touch-none select-none",
          "active:cursor-grabbing will-change-transform"
        )}
      >
        {children}
      </motion.div>
    </div>
  )
}
