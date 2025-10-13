"use client"

import { MapView } from "@/components/map-view"
import { ControlPanel } from "@/components/control-panel"
import { DataPanel } from "@/components/data-panel"
import { useState } from "react"
import type { FeatureCollection } from "geojson"
import { analyzeRoadNetwork, detectIntersections } from "@/lib/road-analyzer"
import { useToast } from "@/hooks/use-toast"
import { useLocalStorage } from "@/hooks/use-local-storage"

// 전역 변수로 현재 선택된 Feature ID 추적
let currentSelectedFeatureId: string | null = null

export default function Home() {
  const [tileUrl, setTileUrl] = useLocalStorage("road-analyzer-tile-url", "https://tile.openstreetmap.org/{z}/{x}/{y}.png")
  const [roadNetwork, setRoadNetwork] = useLocalStorage<FeatureCollection | null>("road-analyzer-road-network", null)
  const [inputGeoJson, setInputGeoJson] = useLocalStorage<FeatureCollection | null>("road-analyzer-input-geojson", null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [highlightedFeature, setHighlightedFeature] = useState<any>(null)
  const { toast } = useToast()

  const handleAnalyze = async (clipToBoundary: boolean = false) => {
    if (!inputGeoJson) {
      toast({
        title: "입력 영역 없음",
        description: "먼저 GeoJSON 영역을 로드해주세요",
        variant: "destructive",
      })
      return
    }

    // 추가 검증
    if (!inputGeoJson.features || inputGeoJson.features.length === 0) {
      toast({
        title: "유효하지 않은 영역",
        description: "GeoJSON에 유효한 features가 없습니다",
        variant: "destructive",
      })
      return
    }

    setIsAnalyzing(true)
    toast({
      title: "분석 중... (Overpass API)",
      description: "OpenStreetMap Overpass API에서 도로 네트워크 데이터를 가져오는 중입니다",
    })

    try {
      // Fetch road data from Overpass API
      const rawRoadNetwork = await analyzeRoadNetwork(inputGeoJson, clipToBoundary)

      // Detect intersections and normalize coordinates
      const networkWithIntersections = detectIntersections(rawRoadNetwork)

      setRoadNetwork(networkWithIntersections)

      toast({
        title: "분석 완료 (Overpass API)",
        description: `OpenStreetMap Overpass API를 통해 ${rawRoadNetwork.features.length}개의 도로 구간과 ${
          networkWithIntersections.features.length - rawRoadNetwork.features.length
        }개의 교차점을 발견했습니다`,
      })
    } catch (error) {
      console.error("[도로분석기] Analysis failed:", error)
      toast({
        title: "분석 실패",
        description: error instanceof Error ? error.message : "도로 네트워크 데이터를 가져올 수 없습니다. 다시 시도해주세요.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleRoadNetworkUpdate = (updatedNetwork: FeatureCollection) => {
    setRoadNetwork(updatedNetwork)
    toast({
      title: "변경사항 저장됨",
      description: "도로 네트워크가 업데이트되었습니다",
    })
  }

  const handleReset = () => {
    setInputGeoJson(null)
    setRoadNetwork(null)
    setHighlightedFeature(null)
    setTileUrl("https://tile.openstreetmap.org/{z}/{x}/{y}.png")
    
    // Clear localStorage as well
    if (typeof window !== "undefined") {
      localStorage.removeItem("road-analyzer-input-geojson")
      localStorage.removeItem("road-analyzer-road-network")
      localStorage.removeItem("road-analyzer-tile-url")
      localStorage.removeItem("road-analyzer-geojson-text")
    }
    
    toast({
      title: "초기화 완료",
      description: "모든 데이터가 초기화되었습니다",
    })
  }

  // Feature의 고유 식별자를 생성하는 함수
  const getFeatureIdentifier = (feature: any) => {
    if (!feature) {
      console.log("[도로분석기] getFeatureIdentifier: feature is null/undefined")
      return null
    }
    
    // ID가 있으면 ID 사용
    if (feature.id !== undefined) {
      const id = `id-${feature.id}`
      console.log("[도로분석기] getFeatureIdentifier: using ID", id)
      return id
    }
    
    // ID가 없으면 좌표 기반 해시 생성
    if (feature.geometry?.coordinates) {
      const coords = feature.geometry.coordinates
      const firstCoord = coords[0]
      const lastCoord = coords[coords.length - 1]
      const coordHash = `${firstCoord[0]}-${firstCoord[1]}-${lastCoord[0]}-${lastCoord[1]}-${coords.length}`
      const id = `coords-${coordHash}`
      console.log("[도로분석기] getFeatureIdentifier: using coords", id)
      return id
    }
    
    console.log("[도로분석기] getFeatureIdentifier: no valid identifier found")
    return null
  }

  const handleMapFeatureClick = (feature: any) => {
    console.log("=== MAP CLICK DEBUG START ===")
    
    const clickedId = getFeatureIdentifier(feature)
    console.log("[도로분석기] Clicked ID:", clickedId)
    console.log("[도로분석기] Current selected ID (global):", currentSelectedFeatureId)
    console.log("[도로분석기] IDs equal?", clickedId === currentSelectedFeatureId)
    
    // 같은 Feature인지 확인 (전역 변수 사용)
    if (currentSelectedFeatureId && clickedId && clickedId === currentSelectedFeatureId) {
      console.log("[도로분석기] ✅ SAME FEATURE DETECTED - DEACTIVATING")
      currentSelectedFeatureId = null
      setHighlightedFeature(null)
      console.log("=== MAP CLICK DEBUG END (DEACTIVATE) ===")
      return
    }
    
    console.log("[도로분석기] ❌ DIFFERENT FEATURE - ACTIVATING NEW ONE")
    currentSelectedFeatureId = clickedId
    setHighlightedFeature(feature)
    console.log("=== MAP CLICK DEBUG END (ACTIVATE) ===")
  }

  const handleFeatureHighlight = (feature: any, shouldZoom: boolean = true) => {
    console.log("[도로분석기] handleFeatureHighlight called with:", feature)
    if (feature) {
      const featureId = getFeatureIdentifier(feature)
      console.log("[도로분석기] Setting global selected ID to:", featureId)
      currentSelectedFeatureId = featureId
    } else {
      console.log("[도로분석기] Clearing global selected ID")
      currentSelectedFeatureId = null
    }
    setHighlightedFeature(feature)
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Left Control Panel */}
      <ControlPanel
        tileUrl={tileUrl}
        onTileUrlChange={setTileUrl}
        onGeoJsonInput={setInputGeoJson}
        onAnalyze={handleAnalyze}
        onReset={handleReset}
        isAnalyzing={isAnalyzing}
      />

      {/* Main Map View */}
      <div className="flex-1 relative">
        <MapView
          tileUrl={tileUrl}
          roadNetwork={roadNetwork}
          inputGeoJson={inputGeoJson}
          highlightedFeature={highlightedFeature}
          onRoadNetworkUpdate={handleRoadNetworkUpdate}
          onFeatureClick={handleMapFeatureClick}
          shouldZoomToFeature={true}
        />
      </div>

      {/* Right Data Panel */}
      <DataPanel 
        roadNetwork={roadNetwork} 
        onRoadNetworkChange={setRoadNetwork}
        onFeatureHighlight={handleFeatureHighlight}
        highlightedFeature={highlightedFeature}
      />
    </div>
  )
}
