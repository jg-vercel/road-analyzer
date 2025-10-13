"use client"

import { MapView } from "@/components/map-view"
import { ControlPanel, type AnalysisMethod, type ImageAnalysisOptions } from "@/components/control-panel"
import { DataPanel } from "@/components/data-panel"
import { useState } from "react"
import type { FeatureCollection } from "geojson"
import { analyzeRoadNetwork, detectIntersections } from "@/lib/road-analyzer"
import { analyzeRoadNetworkFromImage } from "@/lib/image-road-analyzer"
import { useToast } from "@/hooks/use-toast"
import { useLocalStorage } from "@/hooks/use-local-storage"

// 전역 변수로 현재 선택된 Feature ID 추적
let currentSelectedFeatureId: string | null = null

export default function Home() {
  const [tileUrl, setTileUrl] = useLocalStorage("road-analyzer-tile-url", "https://tile.openstreetmap.org/{z}/{x}/{y}.png")
  const [roadNetwork, setRoadNetwork] = useLocalStorage<FeatureCollection | null>("road-analyzer-road-network", null)
  const [inputGeoJson, setInputGeoJson] = useLocalStorage<FeatureCollection | null>("road-analyzer-input-geojson", null)
  const [intersections, setIntersections] = useState<FeatureCollection | null>(null) // 교차점은 별도 관리 (저장하지 않음)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [highlightedFeature, setHighlightedFeature] = useState<any>(null)
  const { toast } = useToast()

  const handleAnalyze = async (
    method: AnalysisMethod, 
    imageOptions?: ImageAnalysisOptions, 
    clipToBoundary: boolean = false
  ) => {
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
    
    // 분석 방식에 따른 토스트 메시지
    const methodName = method === 'api' ? 'Overpass API' : '이미지 분석'
    const methodDescription = method === 'api' 
      ? 'OpenStreetMap Overpass API에서 도로 네트워크 데이터를 가져오는 중입니다'
      : '위성 이미지를 분석하여 도로를 자동 감지하는 중입니다'
    
    toast({
      title: `분석 중... (${methodName})`,
      description: methodDescription,
    })

    try {
      let roadResult: FeatureCollection
      let intersectionResult: FeatureCollection | null = null
      
      if (method === 'api') {
        // API 기반 분석 (원본 데이터만 사용, 교차점 알고리즘 무시)
        console.log('[도로분석기] API 기반 분석 시작 (원본 데이터만 사용)')
        roadResult = await analyzeRoadNetwork(inputGeoJson, clipToBoundary)
        
        // 교차점 처리 완전히 무시 - Overpass API 원본 데이터만 사용
        intersectionResult = null
        
        console.log(`[도로분석기] API 분석 완료: ${roadResult.features.length}개 도로 (교차점 알고리즘 무시)`)
      } else {
        // 이미지 기반 분석 (새로운 방식)
        console.log('[도로분석기] 이미지 기반 분석 시작', imageOptions)
        const fullResult = await analyzeRoadNetworkFromImage(inputGeoJson, imageOptions, clipToBoundary)
        
        // 도로와 교차점 분리
        const roadFeatures = fullResult.features.filter(f => !f.properties?.isIntersection)
        const intersectionFeatures = fullResult.features.filter(f => f.properties?.isIntersection)
        
        roadResult = {
          type: 'FeatureCollection',
          features: roadFeatures
        }
        
        if (intersectionFeatures.length > 0) {
          intersectionResult = {
            type: 'FeatureCollection',
            features: intersectionFeatures
          }
        }
        
        console.log(`[도로분석기] 이미지 분석 완료: ${roadFeatures.length}개 도로, ${intersectionFeatures.length}개 교차점`)
      }
      
      // 도로 네트워크만 저장 (교차점은 제외)
      setRoadNetwork(roadResult)
      
      // 교차점은 별도 상태로 관리 (저장하지 않음)
      setIntersections(intersectionResult)
      
      const intersectionCount = intersectionResult?.features.length || 0
      
      toast({
        title: `분석 완료 (${methodName})`,
        description: method === 'api' 
          ? `${methodName}를 통해 ${roadResult.features.length}개의 도로 구간을 발견했습니다 (원본 데이터)`
          : `${methodName}를 통해 ${roadResult.features.length}개의 도로 구간과 ${intersectionCount}개의 교차점을 발견했습니다`,
      })
      
      console.log(`[도로분석기] 최종 결과: ${roadResult.features.length}개 도로, ${intersectionCount}개 교차점 (방식: ${methodName})`)
      
    } catch (error) {
      console.error(`[도로분석기] ${methodName} 분석 실패:`, error)
      
      // 에러 타입에 따른 구체적인 메시지 제공
      let errorTitle = `${methodName} 분석 실패`
      let errorDescription = "알 수 없는 오류가 발생했습니다."
      
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase()
        
        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
          errorTitle = "네트워크 연결 오류"
          errorDescription = "인터넷 연결을 확인하고 다시 시도해주세요. VPN을 사용 중이라면 비활성화해보세요."
        } else if (errorMessage.includes('timeout') || errorMessage.includes('abort')) {
          errorTitle = "요청 시간 초과"
          errorDescription = "분석 영역이 너무 크거나 서버가 응답하지 않습니다. 더 작은 영역으로 다시 시도해주세요."
        } else if (errorMessage.includes('overpass') || errorMessage.includes('api')) {
          errorTitle = "Overpass API 오류"
          errorDescription = "OpenStreetMap 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도하거나 이미지 분석을 사용해보세요."
        } else if (errorMessage.includes('cors')) {
          errorTitle = "CORS 오류"
          errorDescription = "브라우저 보안 정책으로 인한 오류입니다. 페이지를 새로고침하고 다시 시도해주세요."
        } else if (errorMessage.includes('json')) {
          errorTitle = "데이터 파싱 오류"
          errorDescription = "서버에서 받은 데이터를 처리할 수 없습니다. 다른 분석 방식을 시도해보세요."
        } else {
          errorDescription = error.message
        }
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      })
      
      // 대안 제시
      if (method === 'api') {
        setTimeout(() => {
          toast({
            title: "💡 대안 제안",
            description: "API 분석이 실패했습니다. 이미지 분석 방식을 시도해보세요.",
          })
        }, 3000)
      }
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
    setIntersections(null) // 교차점도 초기화
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
          intersections={intersections}
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
