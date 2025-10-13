"use client"

import { useState } from "react"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Map, Layers, Upload, Loader2, RotateCcw } from "lucide-react"
import type { FeatureCollection } from "geojson"
import { useToast } from "@/hooks/use-toast"

interface ControlPanelProps {
  tileUrl: string
  onTileUrlChange: (url: string) => void
  onGeoJsonInput: (geojson: FeatureCollection) => void
  onAnalyze: (clipToBoundary?: boolean) => void
  onReset: () => void
  isAnalyzing?: boolean
}

const TILE_SOURCES = [
  { name: "OpenStreetMap", url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png" },
  { name: "OpenStreetMap HOT", url: "https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png" },
  { name: "CartoDB Dark", url: "https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png" },
  { name: "CartoDB Light", url: "https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png" },
]

export function ControlPanel({
  tileUrl,
  onTileUrlChange,
  onGeoJsonInput,
  onAnalyze,
  onReset,
  isAnalyzing = false,
}: ControlPanelProps) {
  const [geoJsonText, setGeoJsonText] = useLocalStorage("road-analyzer-geojson-text", "")
  const [customUrl, setCustomUrl] = useState("")
  const [clipToBoundary, setClipToBoundary] = useState(false)
  const { toast } = useToast()

  const handleGeoJsonSubmit = () => {
    try {
      if (!geoJsonText.trim()) {
        toast({
          title: "입력 오류",
          description: "GeoJSON 데이터를 입력해주세요",
          variant: "destructive",
        })
        return
      }

      const parsed = JSON.parse(geoJsonText)
      
      if (parsed.type !== "FeatureCollection") {
        toast({
          title: "잘못된 GeoJSON",
          description: "FeatureCollection이어야 합니다",
          variant: "destructive",
        })
        return
      }

      if (!parsed.features || !Array.isArray(parsed.features)) {
        toast({
          title: "잘못된 GeoJSON",
          description: "features 배열이 필요합니다",
          variant: "destructive",
        })
        return
      }

      if (parsed.features.length === 0) {
        toast({
          title: "빈 GeoJSON",
          description: "GeoJSON에 features가 없습니다",
          variant: "destructive",
        })
        return
      }

      // 유효한 geometry가 있는지 확인
      const hasValidGeometry = parsed.features.some((feature: any) => 
        feature && feature.geometry && 
        (feature.geometry.type === "Polygon" || feature.geometry.type === "Point" || feature.geometry.type === "LineString")
      )

      if (!hasValidGeometry) {
        toast({
          title: "유효하지 않은 GeoJSON",
          description: "유효한 geometry를 가진 feature가 없습니다",
          variant: "destructive",
        })
        return
      }

      onGeoJsonInput(parsed)
      toast({
        title: "GeoJSON 로드 완료",
        description: `${parsed.features.length}개의 feature가 로드되었습니다`,
      })
    } catch (e) {
      toast({
        title: "JSON 파싱 오류",
        description: "잘못된 JSON 형식입니다: " + (e instanceof Error ? e.message : "알 수 없는 오류"),
        variant: "destructive",
      })
    }
  }

  const handleCustomUrl = () => {
    if (customUrl.trim()) {
      onTileUrlChange(customUrl)
    }
  }

  return (
    <div className="w-80 bg-card border-r border-border overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Map className="w-5 h-5 text-primary" />
                컨트롤
              </h1>
              <p className="text-xs text-muted-foreground">지도 및 분석 설정 구성</p>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={onReset}
              className="text-xs"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              초기화
            </Button>
          </div>
        </div>

        {/* Tile Source Selection */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <Label className="text-sm font-semibold text-foreground">타일 소스</Label>
          </div>

          <div className="space-y-2">
            {TILE_SOURCES.map((source) => (
              <Button
                key={source.name}
                variant={tileUrl === source.url ? "default" : "outline"}
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => onTileUrlChange(source.url)}
              >
                {source.name}
              </Button>
            ))}
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-xs text-muted-foreground">사용자 정의 타일 URL</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://..."
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="text-xs"
              />
              <Button size="sm" onClick={handleCustomUrl}>
                설정
              </Button>
            </div>
          </div>
        </Card>

        {/* GeoJSON Input */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            <Label className="text-sm font-semibold text-foreground">GeoJSON 입력</Label>
          </div>

          <Textarea
            placeholder='{"type": "FeatureCollection", "features": [...]}'
            value={geoJsonText}
            onChange={(e) => setGeoJsonText(e.target.value)}
            className="font-mono text-xs h-32"
          />

          <Button onClick={handleGeoJsonSubmit} className="w-full" size="sm">
            영역 로드
          </Button>
        </Card>

        {/* Analysis */}
        <Card className="p-4 space-y-3">
          <Label className="text-sm font-semibold text-foreground">도로 네트워크 분석</Label>
          <p className="text-xs text-muted-foreground">
            로드된 영역을 분석하여 OpenStreetMap에서 도로 네트워크 데이터를 추출합니다
          </p>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="clipToBoundary" 
              checked={clipToBoundary}
              onCheckedChange={(checked) => setClipToBoundary(checked as boolean)}
            />
            <Label htmlFor="clipToBoundary" className="text-xs text-muted-foreground">
              바운더리 내부 도로만 추출 (실험적)
            </Label>
          </div>
          
          <Button 
            onClick={() => onAnalyze(clipToBoundary)} 
            className="w-full" 
            variant="default" 
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                분석 중...
              </>
            ) : (
              "도로 네트워크 분석"
            )}
          </Button>
        </Card>
      </div>
    </div>
  )
}
