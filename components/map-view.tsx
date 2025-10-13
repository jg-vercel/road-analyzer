"use client"

import { useEffect, useRef, useState } from "react"
import type { FeatureCollection } from "geojson"
import { Button } from "@/components/ui/button"
import { Edit3, Save, X, Eye, EyeOff } from "lucide-react"
import dynamic from "next/dynamic"

interface MapViewProps {
  tileUrl: string
  roadNetwork: FeatureCollection | null
  inputGeoJson: FeatureCollection | null
  highlightedFeature?: any
  onRoadNetworkUpdate?: (network: FeatureCollection) => void
  onFeatureClick?: (feature: any) => void
  shouldZoomToFeature?: boolean
}

function MapViewClient({ tileUrl, roadNetwork, inputGeoJson, highlightedFeature, onRoadNetworkUpdate, onFeatureClick, shouldZoomToFeature = true }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const tileLayerRef = useRef<any>(null)
  const roadNetworkLayerRef = useRef<any>(null)
  const inputLayerRef = useRef<any>(null)
  const editableLayerRef = useRef<any>(null)
  const highlightLayerRef = useRef<any>(null)
  const [L, setL] = useState<any>(null)

  const [isEditMode, setIsEditMode] = useState(false)
  const [editableNetwork, setEditableNetwork] = useState<FeatureCollection | null>(null)
  const [isRoadNetworkVisible, setIsRoadNetworkVisible] = useState(true)

  useEffect(() => {
    if (typeof window === "undefined") return

    const loadLeaflet = async () => {
      const leaflet = await import("leaflet")
      await import("leaflet/dist/leaflet.css")
      setL(leaflet.default)
    }

    loadLeaflet()
  }, [])

  // Initialize map
  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current).setView([37.5665, 126.978], 13)
    mapInstanceRef.current = map

    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [L])

  // Update tile layer when URL changes
  useEffect(() => {
    if (!L || !mapInstanceRef.current || !tileLayerRef.current) return

    tileLayerRef.current.remove()
    tileLayerRef.current = L.tileLayer(tileUrl, {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(mapInstanceRef.current)
  }, [L, tileUrl])

  // Render input GeoJSON
  useEffect(() => {
    if (!L || !mapInstanceRef.current) return

    // 기존 레이어 제거
    if (inputLayerRef.current) {
      inputLayerRef.current.remove()
      inputLayerRef.current = null
    }

    // inputGeoJson이 있을 때만 렌더링
    if (inputGeoJson && inputGeoJson.features && inputGeoJson.features.length > 0) {
      try {
        inputLayerRef.current = L.geoJSON(inputGeoJson, {
          style: {
            color: "#60a5fa",
            weight: 3,
            opacity: 0.8,
            fillOpacity: 0.2,
            fillColor: "#60a5fa",
          },
          onEachFeature: (feature: any, layer: any) => {
            if (feature.properties) {
              layer.bindPopup(`
                <div class="text-sm">
                  <strong>입력 영역</strong><br/>
                  ${feature.properties.name ? `<strong>이름:</strong> ${feature.properties.name}<br/>` : ""}
                  <strong>타입:</strong> ${feature.geometry.type}
                </div>
              `)
            }
            
            // 바운더리는 클릭 이벤트 비활성화 (명시적으로)
            layer.off('click')
            
            // 바운더리 클릭 시 이벤트 전파 중단
            layer.on('click', (e: any) => {
              L.DomEvent.stopPropagation(e)
              // 아무 동작하지 않음 (바운더리는 선택 불가)
            })
          },
        }).addTo(mapInstanceRef.current)

        // 영역에 맞게 지도 뷰 조정
        const bounds = inputLayerRef.current.getBounds()
        if (bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [20, 20] })
        }
      } catch (error) {
        console.error("입력 GeoJSON 렌더링 오류:", error)
      }
    }
  }, [L, inputGeoJson])

  // Render road network (non-edit mode)
  useEffect(() => {
    if (!L || !mapInstanceRef.current || !roadNetwork || isEditMode || !isRoadNetworkVisible) return

    if (roadNetworkLayerRef.current) {
      roadNetworkLayerRef.current.remove()
    }

    roadNetworkLayerRef.current = L.geoJSON(roadNetwork, {
      style: (feature: any) => {
        return {
          color: "#4ade80",
          weight: 3,
          opacity: 0.8,
        }
      },
      pointToLayer: (feature: any, latlng: any) => {
        // Render intersection points
        if (feature.properties?.isIntersection) {
          return L.circleMarker(latlng, {
            radius: 6,
            fillColor: "#f59e0b",
            color: "#fff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
          })
        }
        return L.circleMarker(latlng, {
          radius: 4,
          fillColor: "#4ade80",
          color: "#fff",
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8,
        })
      },
      onEachFeature: (feature: any, layer: any) => {
        if (feature.properties) {
          layer.bindPopup(`
            <div class="text-sm">
              <strong>피처 ID:</strong> ${feature.id || "N/A"}<br/>
              ${feature.properties.isIntersection ? "<strong>교차점</strong>" : ""}
              ${feature.properties.name ? `<strong>이름:</strong> ${feature.properties.name}<br/>` : ""}
              ${feature.properties.highway ? `<strong>유형:</strong> ${feature.properties.highway}` : ""}
            </div>
          `)
        }
        
        // Add click event to select feature (only for road features, not intersections)
        if (!feature.properties?.isIntersection) {
          layer.on('click', (e: any) => {
            L.DomEvent.stopPropagation(e)
            onFeatureClick?.(feature)
          })
        } else {
          // 교차점은 클릭 이벤트 비활성화 (명시적으로)
          layer.off('click')
          layer.on('click', (e: any) => {
            L.DomEvent.stopPropagation(e)
            // 교차점은 선택 불가 (아무 동작하지 않음)
          })
        }
      },
    }).addTo(mapInstanceRef.current)
  }, [L, roadNetwork, isEditMode, isRoadNetworkVisible])

  // Handle road network visibility toggle
  useEffect(() => {
    if (!L || !mapInstanceRef.current) return

    if (!isRoadNetworkVisible && roadNetworkLayerRef.current) {
      roadNetworkLayerRef.current.remove()
      roadNetworkLayerRef.current = null
    }
  }, [L, isRoadNetworkVisible])

  // Highlight selected feature
  useEffect(() => {
    if (!L || !mapInstanceRef.current) return

    // Remove existing highlight
    if (highlightLayerRef.current) {
      highlightLayerRef.current.remove()
      highlightLayerRef.current = null
    }

    // Add new highlight if feature is selected
    if (highlightedFeature) {
      try {
        highlightLayerRef.current = L.geoJSON(highlightedFeature, {
          style: (feature: any) => {
            if (feature.geometry.type === "LineString") {
              return {
                color: "#ff0000",
                weight: 6,
                opacity: 0.8,
                dashArray: "10, 5",
              }
            }
            return {}
          },
          pointToLayer: (feature: any, latlng: any) => {
            if (feature.properties?.isIntersection) {
              return L.circleMarker(latlng, {
                radius: 10,
                fillColor: "#ff0000",
                color: "#fff",
                weight: 3,
                opacity: 1,
                fillOpacity: 0.8,
              })
            }
            return L.circleMarker(latlng, {
              radius: 8,
              fillColor: "#ff0000",
              color: "#fff",
              weight: 2,
              opacity: 1,
              fillOpacity: 0.8,
            })
          },
        }).addTo(mapInstanceRef.current)

        // Conditionally zoom to feature
        if (shouldZoomToFeature) {
          const bounds = highlightLayerRef.current.getBounds()
          if (bounds.isValid()) {
            // Check if feature is visible in current view
            const mapBounds = mapInstanceRef.current.getBounds()
            const featureBounds = highlightLayerRef.current.getBounds()
            
            // If feature is not visible, move map to show it
            if (!mapBounds.intersects(featureBounds)) {
              mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 })
            }
          }
        }
      } catch (error) {
        console.error("하이라이트 렌더링 오류:", error)
      }
    }
  }, [L, highlightedFeature])

  const enableEditMode = () => {
    if (!roadNetwork || !mapInstanceRef.current) return

    // Remove non-editable layer
    if (roadNetworkLayerRef.current) {
      roadNetworkLayerRef.current.remove()
    }

    // Create editable copy
    setEditableNetwork(JSON.parse(JSON.stringify(roadNetwork)))
    setIsEditMode(true)
  }

  useEffect(() => {
    if (!L || !mapInstanceRef.current || !editableNetwork || !isEditMode) return

    if (editableLayerRef.current) {
      editableLayerRef.current.remove()
    }

    const editableFeatures: any[] = []

    editableNetwork.features.forEach((feature) => {
      if (feature.geometry.type === "LineString") {
        const coords = feature.geometry.coordinates.map((c) => [c[1], c[0]])
        const polyline = L.polyline(coords, {
          color: "#4ade80",
          weight: 3,
          opacity: 0.8,
        }).addTo(mapInstanceRef.current)

        // Make vertices draggable
        polyline.on("click", function (this: any) {
          if (!this.editEnabled || !this.editEnabled()) {
            this.enableEdit?.()
          }
        })
        ;(polyline as any)._featureId = feature.id

        // Add context menu for deletion
        polyline.on("contextmenu", (e: any) => {
          L.DomEvent.stopPropagation(e)
          if (confirm("이 도로 구간을 삭제하시겠습니까?")) {
            polyline.remove()
            setEditableNetwork((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                features: prev.features.filter((f) => f.id !== feature.id),
              }
            })
          }
        })

        editableFeatures.push(polyline)
      } else if (feature.geometry.type === "Point" && feature.properties?.isIntersection) {
        const coords = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]]
        const marker = L.circleMarker(coords as [number, number], {
          radius: 6,
          fillColor: "#f59e0b",
          color: "#fff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
          draggable: true,
        }).addTo(mapInstanceRef.current)
        ;(marker as any)._featureId = feature.id

        marker.on("drag", (e: any) => {
          const newLatLng = e.target.getLatLng()
          setEditableNetwork((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              features: prev.features.map((f) => {
                if (f.id === feature.id) {
                  return {
                    ...f,
                    geometry: {
                      ...f.geometry,
                      coordinates: [newLatLng.lng, newLatLng.lat],
                    },
                  }
                }
                return f
              }),
            }
          })
        })

        editableFeatures.push(marker)
      }
    })

    editableLayerRef.current = L.layerGroup(editableFeatures)
  }, [L, editableNetwork, isEditMode])

  const saveEdits = () => {
    if (!editableNetwork) return

    // Update coordinates from map layers
    const updatedFeatures = editableNetwork.features.map((feature) => {
      if (feature.geometry.type === "LineString") {
        const layer = editableLayerRef.current?.getLayers().find((l: any) => l._featureId === feature.id)
        if (layer) {
          const latLngs = (layer as any).getLatLngs()
          return {
            ...feature,
            geometry: {
              ...feature.geometry,
              coordinates: latLngs.map((ll: any) => [ll.lng, ll.lat]),
            },
          }
        }
      }
      return feature
    })

    const updatedNetwork = {
      ...editableNetwork,
      features: updatedFeatures,
    }

    onRoadNetworkUpdate?.(updatedNetwork)
    setIsEditMode(false)
    setEditableNetwork(null)

    if (editableLayerRef.current) {
      editableLayerRef.current.remove()
    }
  }

  const cancelEdits = () => {
    setIsEditMode(false)
    setEditableNetwork(null)

    if (editableLayerRef.current) {
      editableLayerRef.current.remove()
    }
  }

  if (!L) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-background">
        <div className="text-muted-foreground">지도 로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Road Network Controls */}
      {roadNetwork && (
        <div className="absolute top-4 left-4 bg-card border border-border rounded-lg p-2 shadow-lg z-[1000] flex gap-2">
          <Button 
            size="sm" 
            onClick={() => setIsRoadNetworkVisible(!isRoadNetworkVisible)}
            variant={isRoadNetworkVisible ? "default" : "outline"}
          >
            {isRoadNetworkVisible ? (
              <>
                <Eye className="w-4 h-4 mr-2" />
                도로 표시
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                도로 숨김
              </>
            )}
          </Button>
        </div>
      )}

      {/* Edit Controls */}
      {roadNetwork && (
        <div className="absolute top-4 right-4 bg-card border border-border rounded-lg p-2 shadow-lg z-[1000] flex gap-2">
          {!isEditMode ? (
            <Button size="sm" onClick={enableEditMode} variant="default">
              <Edit3 className="w-4 h-4 mr-2" />
              편집 모드
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={saveEdits} variant="default">
                <Save className="w-4 h-4 mr-2" />
                저장
              </Button>
              <Button size="sm" onClick={cancelEdits} variant="outline">
                <X className="w-4 h-4 mr-2" />
                취소
              </Button>
            </>
          )}
        </div>
      )}

      {/* Edit Mode Instructions */}
      {isEditMode && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg p-3 shadow-lg z-[1000] max-w-md">
          <p className="text-xs text-foreground font-semibold mb-2">편집 모드 활성화됨</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• 도로를 클릭하여 정점 편집 활성화</li>
            <li>• 교차점을 드래그하여 위치 변경</li>
            <li>• 도로를 우클릭하여 삭제</li>
            <li>• 저장을 클릭하여 변경사항 적용</li>
          </ul>
        </div>
      )}
    </div>
  )
}

export const MapView = dynamic(() => Promise.resolve(MapViewClient), {
  ssr: false,
  loading: () => (
    <div className="relative w-full h-full flex items-center justify-center bg-background">
      <div className="text-muted-foreground">지도 초기화 중...</div>
    </div>
  ),
})
