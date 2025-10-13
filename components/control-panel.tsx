"use client"

import { useState, useEffect } from "react"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Map, Layers, Upload, Loader2, RotateCcw, Satellite, Database, Settings, Wifi, WifiOff, AlertTriangle } from "lucide-react"
import type { FeatureCollection } from "geojson"
import { useToast } from "@/hooks/use-toast"

export type AnalysisMethod = 'api' | 'image'

export interface ImageAnalysisOptions {
  sensitivity: number // 0.1 - 1.0
  minRoadWidth: number // 픽셀
  maxRoadWidth: number // 픽셀
  noiseReduction: boolean
  edgeDetection: 'canny' | 'sobel' | 'laplacian'
}

interface ControlPanelProps {
  tileUrl: string
  onTileUrlChange: (url: string) => void
  onGeoJsonInput: (geojson: FeatureCollection) => void
  onAnalyze: (method: AnalysisMethod, options?: ImageAnalysisOptions, clipToBoundary?: boolean) => void
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
  const [analysisMethod, setAnalysisMethod] = useLocalStorage<AnalysisMethod>("road-analyzer-method", "api")
  const [showImageOptions, setShowImageOptions] = useState(false)
  const [imageOptions, setImageOptions] = useLocalStorage<ImageAnalysisOptions>("road-analyzer-image-options", {
    sensitivity: 0.7,
    minRoadWidth: 3,
    maxRoadWidth: 50,
    noiseReduction: true,
    edgeDetection: 'canny'
  })
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'online' | 'offline' | 'limited'>('checking')
  const { toast } = useToast()

  // 연결 상태 확인
  const checkConnection = async () => {
    setConnectionStatus('checking')
    
    try {
      // 간단한 Overpass API 테스트 쿼리
      const testQuery = '[out:json][timeout:5];(node(0););out;'
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: testQuery,
        signal: AbortSignal.timeout(5000)
      })
      
      if (response.ok) {
        setConnectionStatus('online')
        toast({
          title: "연결 상태 양호",
          description: "Overpass API 서버에 정상적으로 연결되었습니다.",
        })
      } else {
        setConnectionStatus('limited')
        toast({
          title: "제한된 연결",
          description: "일부 서버에 연결 문제가 있을 수 있습니다.",
          variant: "destructive",
        })
      }
    } catch (error) {
      setConnectionStatus('offline')
      toast({
        title: "연결 실패",
        description: "Overpass API 서버에 연결할 수 없습니다. 이미지 분석을 사용해보세요.",
        variant: "destructive",
      })
    }
  }

  // 컴포넌트 마운트 시 연결 상태 확인
  useEffect(() => {
    checkConnection()
  }, [])

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
                도로망 분석
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

        {/* Analysis Method Selection */}
        <Card className="p-4 space-y-4">
          <Label className="text-sm font-semibold text-foreground">도로 네트워크 분석</Label>
          
          {/* Analysis Method Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">분석 방식 선택</Label>
              <div className="flex items-center gap-1">
                {connectionStatus === 'checking' && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                {connectionStatus === 'online' && <Wifi className="w-3 h-3 text-green-500" />}
                {connectionStatus === 'limited' && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
                {connectionStatus === 'offline' && <WifiOff className="w-3 h-3 text-red-500" />}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1 text-xs"
                  onClick={checkConnection}
                  disabled={connectionStatus === 'checking'}
                >
                  확인
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={analysisMethod === 'api' ? "default" : "outline"}
                size="sm"
                className={`flex flex-col items-center gap-1 h-auto py-3 ${
                  connectionStatus === 'offline' ? 'opacity-50' : ''
                }`}
                onClick={() => setAnalysisMethod('api')}
                disabled={connectionStatus === 'offline'}
              >
                <div className="flex items-center gap-1">
                  <Database className="w-4 h-4" />
                  {connectionStatus === 'offline' && <WifiOff className="w-3 h-3 text-red-500" />}
                </div>
                <span className="text-xs">API 기반</span>
              </Button>
              <Button
                variant={analysisMethod === 'image' ? "default" : "outline"}
                size="sm"
                className="flex flex-col items-center gap-1 h-auto py-3"
                onClick={() => setAnalysisMethod('image')}
              >
                <Satellite className="w-4 h-4" />
                <span className="text-xs">이미지 분석</span>
              </Button>
            </div>
          </div>

          {/* Method Description */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              {analysisMethod === 'api' 
                ? connectionStatus === 'offline' 
                  ? "⚠️ API 서버에 연결할 수 없습니다. 네트워크 연결을 확인하거나 이미지 분석을 사용해보세요."
                  : connectionStatus === 'limited'
                  ? "⚠️ 일부 API 서버에 연결 문제가 있습니다. 분석이 느리거나 실패할 수 있습니다."
                  : "✅ OpenStreetMap Overpass API를 사용하여 정확한 도로 데이터를 추출합니다. 교차점 알고리즘 없이 원본 데이터를 그대로 사용합니다."
                : "🛰️ 위성 이미지를 분석하여 도로를 자동 감지합니다. OSM에 없는 도로도 찾을 수 있지만 정확도가 낮을 수 있습니다."
              }
            </p>
          </div>

          {/* Image Analysis Options */}
          {analysisMethod === 'image' && (
            <div className="space-y-3 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">이미지 분석 옵션</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImageOptions(!showImageOptions)}
                  className="text-xs h-6 px-2"
                >
                  <Settings className="w-3 h-3 mr-1" />
                  {showImageOptions ? "숨기기" : "설정"}
                </Button>
              </div>

              {showImageOptions && (
                <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                  {/* Sensitivity */}
                  <div className="space-y-1">
                    <Label className="text-xs">감지 민감도: {imageOptions.sensitivity.toFixed(1)}</Label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={imageOptions.sensitivity}
                      onChange={(e) => setImageOptions({
                        ...imageOptions,
                        sensitivity: parseFloat(e.target.value)
                      })}
                      className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Road Width Range */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">최소 도로폭</Label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={imageOptions.minRoadWidth}
                        onChange={(e) => setImageOptions({
                          ...imageOptions,
                          minRoadWidth: parseInt(e.target.value) || 3
                        })}
                        className="text-xs h-7"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">최대 도로폭</Label>
                      <Input
                        type="number"
                        min="10"
                        max="100"
                        value={imageOptions.maxRoadWidth}
                        onChange={(e) => setImageOptions({
                          ...imageOptions,
                          maxRoadWidth: parseInt(e.target.value) || 50
                        })}
                        className="text-xs h-7"
                      />
                    </div>
                  </div>

                  {/* Edge Detection Method */}
                  <div className="space-y-1">
                    <Label className="text-xs">엣지 감지 알고리즘</Label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['canny', 'sobel', 'laplacian'] as const).map((method) => (
                        <Button
                          key={method}
                          variant={imageOptions.edgeDetection === method ? "default" : "outline"}
                          size="sm"
                          className="text-xs h-6"
                          onClick={() => setImageOptions({
                            ...imageOptions,
                            edgeDetection: method
                          })}
                        >
                          {method.charAt(0).toUpperCase() + method.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Noise Reduction Toggle */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">노이즈 제거</Label>
                    <Button
                      variant={imageOptions.noiseReduction ? "default" : "outline"}
                      size="sm"
                      className="text-xs h-6 px-3"
                      onClick={() => setImageOptions({
                        ...imageOptions,
                        noiseReduction: !imageOptions.noiseReduction
                      })}
                    >
                      {imageOptions.noiseReduction ? "ON" : "OFF"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Analyze Button */}
          <Button 
            onClick={() => onAnalyze(analysisMethod, analysisMethod === 'image' ? imageOptions : undefined, true)} 
            className="w-full" 
            variant="default" 
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {analysisMethod === 'api' ? 'API 분석 중...' : '이미지 분석 중...'}
              </>
            ) : (
              <>
                {analysisMethod === 'api' ? (
                  <Database className="w-4 h-4 mr-2" />
                ) : (
                  <Satellite className="w-4 h-4 mr-2" />
                )}
                {analysisMethod === 'api' ? 'API 기반 분석' : '이미지 기반 분석'}
              </>
            )}
          </Button>
        </Card>
      </div>
    </div>
  )
}
