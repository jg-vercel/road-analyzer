"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Edit3, Save, X } from "lucide-react"

interface EditToolbarProps {
  isEditMode: boolean
  onEnableEdit: () => void
  onSave: () => void
  onCancel: () => void
}

export function EditToolbar({ isEditMode, onEnableEdit, onSave, onCancel }: EditToolbarProps) {
  return (
    <Card className="p-2 flex gap-2">
      {!isEditMode ? (
        <Button size="sm" onClick={onEnableEdit} variant="default">
          <Edit3 className="w-4 h-4 mr-2" />
          Edit Mode
        </Button>
      ) : (
        <>
          <Button size="sm" onClick={onSave} variant="default">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button size="sm" onClick={onCancel} variant="outline">
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </>
      )}
    </Card>
  )
}
