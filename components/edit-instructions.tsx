"use client"

import { Card } from "@/components/ui/card"

export function EditInstructions() {
  return (
    <Card className="p-3 max-w-md">
      <p className="text-xs text-foreground font-semibold mb-2">Edit Mode Active</p>
      <ul className="text-xs text-muted-foreground space-y-1">
        <li>• Click and drag vertices to move them</li>
        <li>• Drag intersection points to reposition</li>
        <li>• Right-click on roads to delete</li>
        <li>• Click Save to apply changes</li>
      </ul>
    </Card>
  )
}
