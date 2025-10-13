import type { FeatureCollection, Feature, LineString, Point, Position } from "geojson"

/**
 * Analyzes road network from OpenStreetMap Overpass API
 */
export async function analyzeRoadNetwork(bounds: FeatureCollection, clipToBoundary: boolean = false): Promise<FeatureCollection> {
  // Extract bounding box from input GeoJSON
  const bbox = getBoundingBox(bounds)

  // Fetch road data from Overpass API
  const overpassQuery = `
    [out:json][timeout:25];
    (
      way["highway"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      way["aeroway"~"^(runway|taxiway)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      way["railway"~"^(rail|light_rail|subway|tram)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      way["waterway"~"^(river|stream|canal)$"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
    );
    out geom;
  `

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: overpassQuery,
    })

    if (!response.ok) {
      throw new Error("Failed to fetch road data")
    }

    const data = await response.json()

    // Convert Overpass data to GeoJSON
    console.log("[도로분석기] Overpass data elements:", data.elements?.length || 0)
    
    const rawFeatures: Feature[] = data.elements
      .filter((element: any) => element.type === "way" && element.geometry)
      .map((way: any) => {
        const coordinates: Position[] = way.geometry.map((node: any) => [node.lon, node.lat])

        return {
          type: "Feature",
          id: way.id,
          geometry: {
            type: "LineString",
            coordinates,
          },
          properties: {
            highway: way.tags?.highway || way.tags?.aeroway || way.tags?.railway || way.tags?.waterway || "unknown",
            name: way.tags?.name || "Unnamed",
            osmId: way.id,
            type: way.tags?.highway ? "highway" : 
                  way.tags?.aeroway ? "aeroway" : 
                  way.tags?.railway ? "railway" : 
                  way.tags?.waterway ? "waterway" : "unknown",
          },
        } as Feature<LineString>
      })

    console.log("[도로분석기] Processed features:", rawFeatures.length)

    // Optionally clip roads to boundary
    if (clipToBoundary) {
      console.log("[도로분석기] Clipping roads to boundary...")
      const clippedFeatures = clipRoadsToBoundary(rawFeatures, bounds)
      console.log("[도로분석기] Clipped features:", clippedFeatures.length)
      return {
        type: "FeatureCollection",
        features: clippedFeatures,
      }
    }

    return {
      type: "FeatureCollection",
      features: rawFeatures,
    }
  } catch (error) {
    console.error("[도로분석기] Road analysis error:", error)
    throw error
  }
}

/**
 * Clip roads to boundary polygon using simple point-in-polygon test
 */
function clipRoadsToBoundary(roads: Feature[], boundary: FeatureCollection): Feature[] {
  const clippedFeatures: Feature[] = []

  // Get boundary polygon(s)
  const boundaryPolygons = boundary.features.filter((f: Feature) => f.geometry.type === "Polygon")
  
  if (boundaryPolygons.length === 0) {
    return roads // No boundary to clip against
  }

  roads.forEach((road) => {
    if (road.geometry.type !== "LineString") return

    const coordinates = road.geometry.coordinates
    
    // Check if any part of the road is inside any boundary polygon
    let hasIntersection = false
    
    for (const boundaryFeature of boundaryPolygons) {
      if (boundaryFeature.geometry.type !== "Polygon") continue
      if (!boundaryFeature.geometry.coordinates || !boundaryFeature.geometry.coordinates[0]) continue
      
      const polygon = boundaryFeature.geometry.coordinates[0]
      if (!polygon || polygon.length < 3) continue
      
      // Check if any point of the road is inside the polygon
      for (const coord of coordinates) {
        if (isPointInPolygon(coord, polygon)) {
          hasIntersection = true
          break
        }
      }
      
      if (hasIntersection) break
    }

    // If road intersects with boundary, include it (simplified approach)
    if (hasIntersection) {
      clippedFeatures.push({
        type: "Feature",
        id: road.id,
        geometry: {
          type: "LineString",
          coordinates: coordinates,
        },
        properties: {
          ...road.properties,
        },
      } as Feature<LineString>)
    }
  })

  return clippedFeatures
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
function isPointInPolygon(point: Position, polygon: Position[]): boolean {
  const [x, y] = point
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }

  return inside
}


/**
 * Calculate bounding box from GeoJSON FeatureCollection
 */
function getBoundingBox(geojson: FeatureCollection): {
  north: number
  south: number
  east: number
  west: number
} {
  // 안전성 검사 추가
  if (!geojson || !geojson.features || geojson.features.length === 0) {
    throw new Error("유효하지 않은 GeoJSON 데이터입니다. features 배열이 비어있거나 존재하지 않습니다.")
  }

  let minLat = Number.POSITIVE_INFINITY
  let maxLat = Number.NEGATIVE_INFINITY
  let minLon = Number.POSITIVE_INFINITY
  let maxLon = Number.NEGATIVE_INFINITY

  geojson.features.forEach((feature: Feature) => {
    // feature와 geometry 존재 확인
    if (!feature || !feature.geometry) {
      return // 유효하지 않은 feature는 건너뛰기
    }

    if (feature.geometry.type === "Polygon") {
      // coordinates 배열 존재 확인
      if (feature.geometry.coordinates && feature.geometry.coordinates[0]) {
        feature.geometry.coordinates[0].forEach((coord: Position) => {
          const [lon, lat] = coord
          minLon = Math.min(minLon, lon)
          maxLon = Math.max(maxLon, lon)
          minLat = Math.min(minLat, lat)
          maxLat = Math.max(maxLat, lat)
        })
      }
    } else if (feature.geometry.type === "Point") {
      if (feature.geometry.coordinates) {
        const [lon, lat] = feature.geometry.coordinates
        minLon = Math.min(minLon, lon)
        maxLon = Math.max(maxLon, lon)
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
      }
    }
  })

  // 유효한 좌표가 발견되지 않은 경우
  if (minLat === Number.POSITIVE_INFINITY) {
    throw new Error("GeoJSON에서 유효한 좌표를 찾을 수 없습니다.")
  }

  return {
    north: maxLat,
    south: minLat,
    east: maxLon,
    west: minLon,
  }
}

/**
 * Detect intersections between road segments
 */
export function detectIntersections(roadNetwork: FeatureCollection): FeatureCollection {
  const features = [...roadNetwork.features]
  const intersectionPoints: Map<string, Feature<Point>> = new Map()

  // Compare each pair of road segments
  for (let i = 0; i < features.length; i++) {
    for (let j = i + 1; j < features.length; j++) {
      const road1 = features[i]
      const road2 = features[j]

      if (road1.geometry.type !== "LineString" || road2.geometry.type !== "LineString") {
        continue
      }

      const intersections = findLineIntersections(road1.geometry.coordinates, road2.geometry.coordinates)

      intersections.forEach((point) => {
        const key = `${point[0].toFixed(6)},${point[1].toFixed(6)}`

        if (!intersectionPoints.has(key)) {
          intersectionPoints.set(key, {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: point,
            },
            properties: {
              isIntersection: true,
              connectedRoads: [road1.id, road2.id],
            },
          })
        } else {
          // Add to connected roads
          const existing = intersectionPoints.get(key)!
          if (!existing.properties.connectedRoads.includes(road1.id)) {
            existing.properties.connectedRoads.push(road1.id)
          }
          if (!existing.properties.connectedRoads.includes(road2.id)) {
            existing.properties.connectedRoads.push(road2.id)
          }
        }

        // Update road features to include intersection point
        updateRoadWithIntersection(road1, point)
        updateRoadWithIntersection(road2, point)
      })
    }
  }

  // Add intersection points as features
  const allFeatures = [...features, ...Array.from(intersectionPoints.values())]

  return {
    type: "FeatureCollection",
    features: allFeatures,
  }
}

/**
 * Find intersection points between two line strings
 */
function findLineIntersections(line1: Position[], line2: Position[]): Position[] {
  const intersections: Position[] = []

  for (let i = 0; i < line1.length - 1; i++) {
    for (let j = 0; j < line2.length - 1; j++) {
      const intersection = lineSegmentIntersection(line1[i], line1[i + 1], line2[j], line2[j + 1])

      if (intersection) {
        intersections.push(intersection)
      }
    }
  }

  return intersections
}

/**
 * Calculate intersection point between two line segments
 */
function lineSegmentIntersection(p1: Position, p2: Position, p3: Position, p4: Position): Position | null {
  const x1 = p1[0],
    y1 = p1[1]
  const x2 = p2[0],
    y2 = p2[1]
  const x3 = p3[0],
    y3 = p3[1]
  const x4 = p4[0],
    y4 = p4[1]

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)

  if (Math.abs(denom) < 1e-10) {
    return null // Lines are parallel
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    const x = x1 + t * (x2 - x1)
    const y = y1 + t * (y2 - y1)
    return [x, y]
  }

  return null
}

/**
 * Update road feature to include intersection point in its coordinates
 */
function updateRoadWithIntersection(road: Feature<LineString>, intersection: Position): void {
  const coords = road.geometry.coordinates
  const tolerance = 0.00001

  // Find the segment where the intersection occurs
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i]
    const p2 = coords[i + 1]

    // Check if intersection is on this segment
    if (isPointOnSegment(intersection, p1, p2, tolerance)) {
      // Check if intersection point already exists
      const alreadyExists = coords.some(
        (coord: Position) => Math.abs(coord[0] - intersection[0]) < tolerance && Math.abs(coord[1] - intersection[1]) < tolerance,
      )

      if (!alreadyExists) {
        // Insert intersection point
        coords.splice(i + 1, 0, intersection)
      }
      break
    }
  }
}

/**
 * Check if a point lies on a line segment
 */
function isPointOnSegment(point: Position, segStart: Position, segEnd: Position, tolerance: number): boolean {
  const [px, py] = point
  const [x1, y1] = segStart
  const [x2, y2] = segEnd

  const crossProduct = Math.abs((py - y1) * (x2 - x1) - (px - x1) * (y2 - y1))

  if (crossProduct > tolerance) {
    return false
  }

  const dotProduct = (px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)
  const squaredLength = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)

  if (dotProduct < -tolerance || dotProduct > squaredLength + tolerance) {
    return false
  }

  return true
}
