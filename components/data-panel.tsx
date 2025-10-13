"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Download, Database, Upload, MapPin, Eye, Trash2, BarChart3 } from "lucide-react"
import type { FeatureCollection, Feature } from "geojson"
import { useState, useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { CollapsiblePanel } from "./collapsible-panel"

interface DataPanelProps {
  roadNetwork: FeatureCollection | null
  onRoadNetworkChange?: (network: FeatureCollection) => void
  onFeatureHighlight?: (feature: Feature | null, shouldZoom?: boolean) => void
  highlightedFeature?: any
}

export function DataPanel({ roadNetwork, onRoadNetworkChange, onFeatureHighlight, highlightedFeature }: DataPanelProps) {
  const [importText, setImportText] = useState("")
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null)
  const { toast } = useToast()
  const featureListRef = useRef<HTMLDivElement>(null)
  const featureItemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // 고유한 식별자 생성 함수 (app/page.tsx와 동일한 로직)
  const getFeatureIdentifier = (feature: any, index?: number) => {
    if (!feature) return null
    
    // ID가 있으면 ID 사용
    if (feature.id !== undefined) {
      return `id-${feature.id}`
    }
    
    // ID가 없으면 좌표 기반 해시 생성
    if (feature.geometry?.coordinates) {
      const coords = feature.geometry.coordinates
      const firstCoord = coords[0]
      const lastCoord = coords[coords.length - 1]
      const coordHash = `${firstCoord[0]}-${firstCoord[1]}-${lastCoord[0]}-${lastCoord[1]}-${coords.length}`
      return `coords-${coordHash}`
    }
    
    // 마지막 수단으로 index 사용
    if (index !== undefined) {
      return `index-${index}`
    }
    
    return null
  }

  // Update selectedFeatureId when highlightedFeature changes (from map click)
  useEffect(() => {
    if (highlightedFeature) {
      const highlightedId = getFeatureIdentifier(highlightedFeature)
      console.log("[도로분석기] DataPanel: highlightedFeature changed:", {
        highlightedId,
        feature: highlightedFeature
      })
      
      setSelectedFeatureId(highlightedId)
      
      // Scroll to the selected feature in the list
      if (highlightedId) {
        setTimeout(() => {
          const featureElement = featureItemRefs.current[highlightedId]
          if (featureElement && featureListRef.current) {
            featureElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            })
          }
        }, 100)
      }
    } else {
      console.log("[도로분석기] DataPanel: highlightedFeature cleared")
      setSelectedFeatureId(null)
    }
  }, [highlightedFeature])

  const handleDownload = () => {
    if (!roadNetwork) return

    const dataStr = JSON.stringify(roadNetwork, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = "road-network.geojson"
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importText)
      if (parsed.type === "FeatureCollection") {
        onRoadNetworkChange?.(parsed)
        setImportText("")
        toast({
          title: "네트워크 가져오기 완료",
          description: `${parsed.features?.length || 0}개의 feature가 가져와졌습니다`,
        })
      } else {
        toast({
          title: "잘못된 GeoJSON",
          description: "FeatureCollection이어야 합니다",
          variant: "destructive",
        })
      }
    } catch (e) {
      toast({
        title: "JSON 파싱 오류",
        description: "잘못된 JSON 형식입니다",
        variant: "destructive",
      })
    }
  }

  const handleFeatureClick = (feature: Feature, index: number) => {
    const featureId = getFeatureIdentifier(feature, index)
    console.log("[도로분석기] DataPanel: Feature clicked in list:", {
      featureId,
      selectedFeatureId,
      feature
    })
    
    if (selectedFeatureId === featureId) {
      // 이미 선택된 feature를 다시 클릭하면 선택 해제
      console.log("[도로분석기] DataPanel: Deactivating feature from list")
      setSelectedFeatureId(null)
      onFeatureHighlight?.(null, false)
    } else {
      // 새로운 feature 선택 (줌 없이)
      console.log("[도로분석기] DataPanel: Activating feature from list")
      setSelectedFeatureId(featureId)
      onFeatureHighlight?.(feature, false)
    }
  }

  const handleFeatureDelete = (feature: Feature, event: React.MouseEvent, index: number) => {
    event.stopPropagation() // 클릭 이벤트 전파 방지
    
    if (!roadNetwork || !onRoadNetworkChange) return

    const featureId = getFeatureIdentifier(feature, index)
    console.log("[도로분석기] DataPanel: Deleting feature:", {
      featureId,
      selectedFeatureId
    })
    
    const updatedNetwork = {
      ...roadNetwork,
      features: roadNetwork.features.filter((f, i) => getFeatureIdentifier(f, i) !== featureId)
    }

    onRoadNetworkChange(updatedNetwork)
    
    // 삭제된 feature가 선택되어 있었다면 선택 해제
    if (selectedFeatureId === featureId) {
      console.log("[도로분석기] DataPanel: Clearing selection after delete")
      setSelectedFeatureId(null)
      onFeatureHighlight?.(null, false)
    }

    toast({
      title: "Feature 삭제됨",
      description: `Feature ${index + 1}이 삭제되었습니다`,
    })
  }

  return (
    <div className="w-80 bg-background border-l border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          데이터 출력
        </h2>
        <p className="text-xs text-muted-foreground">도로 네트워크 데이터 보기 및 내보내기</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Road List Panel */}
        {roadNetwork && (
          <CollapsiblePanel
            title="도로 목록"
            icon={<MapPin className="w-4 h-4 text-primary" />}
            defaultExpanded={true}
          >
            <div ref={featureListRef} className="h-96 overflow-y-auto space-y-1">
              {roadNetwork.features
                .map((feature, index) => ({ feature, index }))
                .filter(({ feature }) => !feature.properties?.isIntersection)
                .map(({ feature, index }) => {
                  const featureId = getFeatureIdentifier(feature, index)
                  const isSelected = selectedFeatureId === featureId
                  const name = feature.properties?.name || `${feature.properties?.type || '도로'} ${index + 1}`
                  
                  return (
                    <div
                      key={featureId}
                      ref={(el) => {
                        featureItemRefs.current[featureId] = el
                      }}
                      className={`p-2 rounded text-xs cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-secondary hover:bg-secondary/80'
                      }`}
                      onClick={() => handleFeatureClick(feature, index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                          <span className="font-medium truncate">{name}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Eye className="w-3 h-3 opacity-60" />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                            onClick={(e) => handleFeatureDelete(feature, e, index)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs opacity-60 mt-1">
                        {feature.properties?.highway || feature.properties?.type || '도로'}
                      </div>
                    </div>
                  )
                })}
            </div>
          </CollapsiblePanel>
        )}

        {/* Intersection List Panel */}
        {roadNetwork && roadNetwork.features.some(f => f.properties?.isIntersection) && (
          <CollapsiblePanel
            title="교차점 목록"
            icon={<div className="w-4 h-4 rounded-full bg-amber-500" />}
            defaultExpanded={false}
          >
            <div className="h-60 overflow-y-auto space-y-1">
              {roadNetwork.features
                .map((feature, index) => ({ feature, index }))
                .filter(({ feature }) => feature.properties?.isIntersection)
                .map(({ feature, index }) => {
                  const featureId = getFeatureIdentifier(feature, index)
                  const isSelected = selectedFeatureId === featureId
                  const name = `교차점 ${index + 1}`
                  
                  return (
                    <div
                      key={featureId}
                      ref={(el) => {
                        featureItemRefs.current[featureId] = el
                      }}
                      className={`p-2 rounded text-xs cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-secondary hover:bg-secondary/80'
                      }`}
                      onClick={() => handleFeatureClick(feature, index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                          <span className="font-medium truncate">{name}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Eye className="w-3 h-3 opacity-60" />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                            onClick={(e) => handleFeatureDelete(feature, e, index)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs opacity-60 mt-1">
                        교차점
                      </div>
                    </div>
                  )
                })}
            </div>
          </CollapsiblePanel>
        )}

        {/* Data Management Panel */}
        <CollapsiblePanel
          title="데이터 관리"
          icon={<BarChart3 className="w-4 h-4 text-primary" />}
          defaultExpanded={false}
        >
          {/* Statistics */}
          {roadNetwork && (
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">통계</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">전체 피처:</span>
                    <span className="font-mono text-foreground">{roadNetwork.features.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">도로 구간:</span>
                    <span className="font-mono text-foreground">
                      {roadNetwork.features.filter((f) => f.geometry.type === "LineString").length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">교차점:</span>
                    <span className="font-mono text-foreground">
                      {roadNetwork.features.filter((f) => f.properties?.isIntersection).length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Export */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">내보내기</h4>
                <Button onClick={handleDownload} className="w-full" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  GeoJSON 다운로드
                </Button>
              </div>
            </div>
          )}

          {/* Import */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">가져오기</h4>
            <textarea
              placeholder='{"type": "FeatureCollection", ...}'
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full h-24 px-3 py-2 text-xs font-mono bg-secondary text-secondary-foreground rounded border border-border resize-none"
            />
            <Button onClick={handleImport} className="w-full mt-2" size="sm" variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              GeoJSON 가져오기
            </Button>
          </div>

          {/* Preview */}
          {roadNetwork && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">미리보기</h4>
              <pre className="text-xs font-mono bg-secondary p-3 rounded overflow-auto max-h-64 text-secondary-foreground">
                {JSON.stringify(roadNetwork, null, 2)}
              </pre>
            </div>
          )}
        </CollapsiblePanel>

        {!roadNetwork && (
          <Card className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              아직 도로 네트워크 데이터가 없습니다. GeoJSON 영역을 로드하고 분석을 실행하세요.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
