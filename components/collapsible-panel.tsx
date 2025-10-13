"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronDown } from "lucide-react"

interface CollapsiblePanelProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  defaultExpanded?: boolean
  className?: string
}

export function CollapsiblePanel({ 
  title, 
  icon, 
  children, 
  defaultExpanded = true,
  className = ""
}: CollapsiblePanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className={`bg-card border border-border rounded-lg ${className}`}>
      <Button
        variant="ghost"
        className="w-full justify-between p-4 h-auto hover:bg-secondary/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </Button>
      
      {isExpanded && (
        <div className="p-4 pt-0 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}
