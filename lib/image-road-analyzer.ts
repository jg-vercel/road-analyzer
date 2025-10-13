import { Feature, FeatureCollection, LineString, Point } from 'geojson'

export interface ImageAnalysisOptions {
  // 이미지 분석 관련 옵션들
  sensitivity: number // 도로 감지 민감도 (0.1 - 1.0)
  minRoadWidth: number // 최소 도로 폭 (픽셀)
  maxRoadWidth: number // 최대 도로 폭 (픽셀)
  noiseReduction: boolean // 노이즈 제거 여부
  edgeDetection: 'canny' | 'sobel' | 'laplacian' // 엣지 감지 알고리즘
}

export interface BoundingBox {
  north: number
  south: number
  east: number
  west: number
}

// 기본 이미지 분석 옵션
const DEFAULT_IMAGE_OPTIONS: ImageAnalysisOptions = {
  sensitivity: 0.7,
  minRoadWidth: 3,
  maxRoadWidth: 50,
  noiseReduction: true,
  edgeDetection: 'canny'
}

/**
 * 이미지 기반 도로 네트워크 분석
 * 위성 이미지나 항공 사진에서 도로를 감지하고 벡터화합니다.
 */
export async function analyzeRoadNetworkFromImage(
  geojson: FeatureCollection,
  options: Partial<ImageAnalysisOptions> = {},
  clipToBoundary: boolean = false
): Promise<FeatureCollection> {
  console.log('[도로분석기] 이미지 분석 시작:', { 
    boundaryFeatures: geojson.features?.length || 0,
    options: { ...DEFAULT_IMAGE_OPTIONS, ...options },
    clipToBoundary 
  })

  if (!geojson?.features || geojson.features.length === 0) {
    throw new Error('분석할 영역이 지정되지 않았습니다.')
  }

  const analysisOptions = { ...DEFAULT_IMAGE_OPTIONS, ...options }
  const boundingBox = getBoundingBoxFromGeoJSON(geojson)
  
  try {
    // 1. 위성 이미지 타일 가져오기
    console.log('[도로분석기] 위성 이미지 타일 다운로드 중...')
    const imageData = await fetchSatelliteImageTiles(boundingBox)
    
    // 2. 이미지 전처리
    console.log('[도로분석기] 이미지 전처리 중...')
    const preprocessedImage = await preprocessImage(imageData, analysisOptions)
    
    // 3. 도로 감지 및 벡터화
    console.log('[도로분석기] 도로 감지 및 벡터화 중...')
    const roadFeatures = await detectAndVectorizeRoads(preprocessedImage, boundingBox, analysisOptions)
    
    // 4. 교차점 감지
    console.log('[도로분석기] 교차점 감지 중...')
    const intersectionFeatures = detectIntersections(roadFeatures)
    
    // 5. 바운더리 클리핑 (옵션)
    let finalFeatures = [...roadFeatures, ...intersectionFeatures]
    if (clipToBoundary && geojson.features.length > 0) {
      console.log('[도로분석기] 바운더리 내부 도로만 추출 중...')
      finalFeatures = clipRoadsToBoundary(finalFeatures, geojson.features[0])
    }

    const result: FeatureCollection = {
      type: 'FeatureCollection',
      features: finalFeatures
    }

    console.log('[도로분석기] 이미지 분석 완료:', {
      totalFeatures: result.features.length,
      roads: roadFeatures.length,
      intersections: intersectionFeatures.length,
      analysisMethod: '이미지 분석'
    })

    return result
  } catch (error) {
    console.error('[도로분석기] 이미지 분석 실패:', error)
    throw new Error(`이미지 분석 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
  }
}

/**
 * 위성 이미지 타일 가져오기
 */
async function fetchSatelliteImageTiles(boundingBox: BoundingBox): Promise<ImageData> {
  // 실제 구현에서는 Google Maps, Bing Maps, 또는 다른 위성 이미지 서비스 API를 사용
  // 여기서는 시뮬레이션된 이미지 데이터를 생성
  
  const width = 1024
  const height = 1024
  
  // Canvas를 사용하여 시뮬레이션된 위성 이미지 생성
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  
  // 배경 (지면) - 녹색/갈색 톤
  ctx.fillStyle = '#4a5d3a'
  ctx.fillRect(0, 0, width, height)
  
  // 시뮬레이션된 도로 패턴 생성
  ctx.strokeStyle = '#666666'
  ctx.lineWidth = 8
  
  // 메인 도로들
  const roads = [
    { start: [100, 200], end: [900, 250] }, // 수평 도로
    { start: [200, 100], end: [180, 900] }, // 수직 도로
    { start: [500, 150], end: [600, 800] }, // 대각선 도로
    { start: [300, 400], end: [800, 450] }, // 또 다른 수평 도로
    { start: [700, 200], end: [750, 700] }, // 수직 도로
  ]
  
  roads.forEach(road => {
    ctx.beginPath()
    ctx.moveTo(road.start[0], road.start[1])
    ctx.lineTo(road.end[0], road.end[1])
    ctx.stroke()
  })
  
  // 작은 도로들 (더 얇게)
  ctx.lineWidth = 4
  ctx.strokeStyle = '#555555'
  
  const smallRoads = [
    { start: [150, 300], end: [350, 320] },
    { start: [400, 500], end: [450, 650] },
    { start: [600, 300], end: [750, 280] },
  ]
  
  smallRoads.forEach(road => {
    ctx.beginPath()
    ctx.moveTo(road.start[0], road.start[1])
    ctx.lineTo(road.end[0], road.end[1])
    ctx.stroke()
  })
  
  // 노이즈 추가 (건물, 나무 등)
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    const size = Math.random() * 20 + 5
    
    ctx.fillStyle = Math.random() > 0.5 ? '#2d3d2d' : '#1a2a1a'
    ctx.fillRect(x, y, size, size)
  }
  
  return ctx.getImageData(0, 0, width, height)
}

/**
 * 이미지 전처리
 */
async function preprocessImage(imageData: ImageData, options: ImageAnalysisOptions): Promise<ImageData> {
  const { width, height, data } = imageData
  const processedData = new Uint8ClampedArray(data)
  
  // 1. 그레이스케일 변환
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
    processedData[i] = gray     // R
    processedData[i + 1] = gray // G
    processedData[i + 2] = gray // B
    processedData[i + 3] = data[i + 3] // A
  }
  
  // 2. 노이즈 제거 (가우시안 블러)
  if (options.noiseReduction) {
    applyGaussianBlur(processedData, width, height)
  }
  
  // 3. 엣지 감지
  const edgeData = applyEdgeDetection(processedData, width, height, options.edgeDetection)
  
  return new ImageData(edgeData, width, height)
}

/**
 * 가우시안 블러 적용
 */
function applyGaussianBlur(data: Uint8ClampedArray, width: number, height: number): void {
  // 간단한 3x3 가우시안 커널
  const kernel = [
    [1, 2, 1],
    [2, 4, 2],
    [1, 2, 1]
  ]
  const kernelSum = 16
  
  const original = new Uint8ClampedArray(data)
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelIndex = ((y + ky) * width + (x + kx)) * 4
          sum += original[pixelIndex] * kernel[ky + 1][kx + 1]
        }
      }
      
      const resultIndex = (y * width + x) * 4
      const blurredValue = Math.round(sum / kernelSum)
      
      data[resultIndex] = blurredValue
      data[resultIndex + 1] = blurredValue
      data[resultIndex + 2] = blurredValue
    }
  }
}

/**
 * 엣지 감지 적용
 */
function applyEdgeDetection(
  data: Uint8ClampedArray, 
  width: number, 
  height: number, 
  method: 'canny' | 'sobel' | 'laplacian'
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(data.length)
  
  if (method === 'sobel') {
    // Sobel 연산자
    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]]
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIndex = ((y + ky) * width + (x + kx)) * 4
            const pixelValue = data[pixelIndex]
            
            gx += pixelValue * sobelX[ky + 1][kx + 1]
            gy += pixelValue * sobelY[ky + 1][kx + 1]
          }
        }
        
        const magnitude = Math.sqrt(gx * gx + gy * gy)
        const resultIndex = (y * width + x) * 4
        
        result[resultIndex] = Math.min(255, magnitude)
        result[resultIndex + 1] = Math.min(255, magnitude)
        result[resultIndex + 2] = Math.min(255, magnitude)
        result[resultIndex + 3] = 255
      }
    }
  } else {
    // 기본적으로 Sobel 사용
    return applyEdgeDetection(data, width, height, 'sobel')
  }
  
  return result
}

/**
 * 도로 감지 및 벡터화
 */
async function detectAndVectorizeRoads(
  imageData: ImageData, 
  boundingBox: BoundingBox, 
  options: ImageAnalysisOptions
): Promise<Feature<LineString>[]> {
  const { width, height, data } = imageData
  const roads: Feature<LineString>[] = []
  
  // 1. 이진화 (임계값 적용)
  const threshold = 255 * (1 - options.sensitivity)
  const binaryData = new Uint8ClampedArray(width * height)
  
  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4
    binaryData[pixelIndex] = data[i] > threshold ? 255 : 0
  }
  
  // 2. 도로 중심선 추출 (스켈레톤화)
  const skeleton = skeletonize(binaryData, width, height)
  
  // 3. 연결된 구성 요소 찾기
  const components = findConnectedComponents(skeleton, width, height)
  
  // 4. 각 구성 요소를 LineString으로 변환
  components.forEach((component, index) => {
    if (component.length < options.minRoadWidth) return // 너무 짧은 선분 제외
    
    const coordinates = component.map(point => 
      pixelToLatLng(point, boundingBox, width, height)
    )
    
    // 도로 유형 결정 (길이와 위치 기반)
    const roadLength = calculateRoadLength(coordinates)
    let roadType = 'residential'
    
    if (roadLength > 1000) roadType = 'primary'
    else if (roadLength > 500) roadType = 'secondary'
    else if (roadLength > 200) roadType = 'tertiary'
    
    const road: Feature<LineString> = {
      type: 'Feature',
      properties: {
        index: index
      },
      geometry: {
        coordinates,
        type: 'LineString'
      }
    }
    
    roads.push(road)
  })
  
  console.log(`[도로분석기] 이미지에서 ${roads.length}개의 도로 감지됨`)
  return roads
}

/**
 * 스켈레톤화 (Zhang-Suen 알고리즘 간소화 버전)
 */
function skeletonize(binaryData: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const result = new Uint8ClampedArray(binaryData)
  
  // 간단한 중심선 추출 (실제로는 더 복잡한 알고리즘 필요)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x
      
      if (binaryData[index] === 255) {
        // 주변 8개 픽셀 확인
        const neighbors = [
          binaryData[(y-1) * width + (x-1)], binaryData[(y-1) * width + x], binaryData[(y-1) * width + (x+1)],
          binaryData[y * width + (x-1)],                                      binaryData[y * width + (x+1)],
          binaryData[(y+1) * width + (x-1)], binaryData[(y+1) * width + x], binaryData[(y+1) * width + (x+1)]
        ]
        
        const whiteNeighbors = neighbors.filter(n => n === 255).length
        
        // 중심선이 될 가능성이 있는 픽셀만 유지
        if (whiteNeighbors >= 2 && whiteNeighbors <= 6) {
          result[index] = 255
        } else {
          result[index] = 0
        }
      }
    }
  }
  
  return result
}

/**
 * 연결된 구성 요소 찾기
 */
function findConnectedComponents(
  binaryData: Uint8ClampedArray, 
  width: number, 
  height: number
): Array<Array<{x: number, y: number}>> {
  const visited = new Set<number>()
  const components: Array<Array<{x: number, y: number}>> = []
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      
      if (binaryData[index] === 255 && !visited.has(index)) {
        const component = floodFill(binaryData, width, height, x, y, visited)
        if (component.length > 5) { // 최소 길이 필터
          components.push(component)
        }
      }
    }
  }
  
  return components
}

/**
 * Flood Fill 알고리즘
 */
function floodFill(
  binaryData: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  visited: Set<number>
): Array<{x: number, y: number}> {
  const component: Array<{x: number, y: number}> = []
  const stack = [{x: startX, y: startY}]
  
  while (stack.length > 0) {
    const {x, y} = stack.pop()!
    const index = y * width + x
    
    if (x < 0 || x >= width || y < 0 || y >= height || 
        visited.has(index) || binaryData[index] !== 255) {
      continue
    }
    
    visited.add(index)
    component.push({x, y})
    
    // 8방향 탐색
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        stack.push({x: x + dx, y: y + dy})
      }
    }
  }
  
  return component
}

/**
 * 픽셀 좌표를 위경도로 변환
 */
function pixelToLatLng(
  pixel: {x: number, y: number}, 
  boundingBox: BoundingBox, 
  imageWidth: number, 
  imageHeight: number
): [number, number] {
  const lng = boundingBox.west + (pixel.x / imageWidth) * (boundingBox.east - boundingBox.west)
  const lat = boundingBox.north - (pixel.y / imageHeight) * (boundingBox.north - boundingBox.south)
  
  return [lng, lat]
}

/**
 * 도로 길이 계산
 */
function calculateRoadLength(coordinates: Array<[number, number]>): number {
  let length = 0
  
  for (let i = 1; i < coordinates.length; i++) {
    const [lng1, lat1] = coordinates[i - 1]
    const [lng2, lat2] = coordinates[i]
    
    // 간단한 유클리드 거리 (실제로는 Haversine 공식 사용 권장)
    const dx = lng2 - lng1
    const dy = lat2 - lat1
    length += Math.sqrt(dx * dx + dy * dy) * 111000 // 대략적인 미터 변환
  }
  
  return length
}

/**
 * 신뢰도 계산
 */
function calculateConfidence(
  component: Array<{x: number, y: number}>, 
  options: ImageAnalysisOptions
): number {
  // 길이, 연속성, 직선성 등을 고려한 신뢰도
  const length = component.length
  let confidence = Math.min(1.0, length / 100) // 길이 기반 기본 신뢰도
  
  // 연속성 검사
  let continuity = 0
  for (let i = 1; i < component.length; i++) {
    const dx = Math.abs(component[i].x - component[i-1].x)
    const dy = Math.abs(component[i].y - component[i-1].y)
    if (dx <= 1 && dy <= 1) continuity++
  }
  
  confidence *= (continuity / (component.length - 1))
  
  return Math.max(0.1, Math.min(1.0, confidence))
}

/**
 * 교차점 감지
 */
function detectIntersections(roads: Feature<LineString>[]): Feature<Point>[] {
  const intersections: Feature<Point>[] = []
  const intersectionMap = new Map<string, {lat: number, lng: number, roads: string[]}>()
  
  // 모든 도로 쌍에 대해 교차점 검사
  for (let i = 0; i < roads.length; i++) {
    for (let j = i + 1; j < roads.length; j++) {
      const road1 = roads[i]
      const road2 = roads[j]
      
      const intersection = findLineIntersection(
        road1.geometry.coordinates,
        road2.geometry.coordinates
      )
      
      if (intersection) {
        const key = `${intersection.lng.toFixed(6)},${intersection.lat.toFixed(6)}`
        
        if (intersectionMap.has(key)) {
          intersectionMap.get(key)!.roads.push(road1.id as string, road2.id as string)
        } else {
          intersectionMap.set(key, {
            lat: intersection.lat,
            lng: intersection.lng,
            roads: [road1.id as string, road2.id as string]
          })
        }
      }
    }
  }
  
  // 교차점 Feature 생성
  intersectionMap.forEach((intersection, key) => {
    const feature: Feature<Point> = {
      type: 'Feature',
      properties: {
        index: intersections.length
      },
      geometry: {
        coordinates: [intersection.lng, intersection.lat],
        type: 'Point'
      }
    }
    
    intersections.push(feature)
  })
  
  console.log(`[도로분석기] 이미지에서 ${intersections.length}개의 교차점 감지됨`)
  return intersections
}

/**
 * 두 선분의 교차점 찾기
 */
function findLineIntersection(
  line1: Array<[number, number]>,
  line2: Array<[number, number]>
): {lat: number, lng: number} | null {
  // 간단한 구현: 각 선분의 시작점과 끝점만 비교
  for (let i = 0; i < line1.length - 1; i++) {
    for (let j = 0; j < line2.length - 1; j++) {
      const intersection = getLineSegmentIntersection(
        line1[i], line1[i + 1],
        line2[j], line2[j + 1]
      )
      
      if (intersection) {
        return { lat: intersection[1], lng: intersection[0] }
      }
    }
  }
  
  return null
}

/**
 * 두 선분의 교차점 계산
 */
function getLineSegmentIntersection(
  p1: [number, number], p2: [number, number],
  p3: [number, number], p4: [number, number]
): [number, number] | null {
  const [x1, y1] = p1
  const [x2, y2] = p2
  const [x3, y3] = p3
  const [x4, y4] = p4
  
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  
  if (Math.abs(denom) < 1e-10) return null // 평행선
  
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
 * GeoJSON에서 바운딩 박스 추출
 */
function getBoundingBoxFromGeoJSON(geojson: FeatureCollection): BoundingBox {
  let minLat = Infinity, maxLat = -Infinity
  let minLng = Infinity, maxLng = -Infinity
  
  geojson.features.forEach(feature => {
    if (feature.geometry?.type === 'Polygon') {
      feature.geometry.coordinates[0].forEach(coord => {
        const [lng, lat] = coord
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
        minLng = Math.min(minLng, lng)
        maxLng = Math.max(maxLng, lng)
      })
    }
  })
  
  return {
    north: maxLat,
    south: minLat,
    east: maxLng,
    west: minLng
  }
}

/**
 * 바운더리 내부 도로만 추출 (기존 함수 재사용)
 */
function clipRoadsToBoundary(features: Feature[], boundaryFeature: Feature): Feature[] {
  if (!boundaryFeature?.geometry || boundaryFeature.geometry.type !== 'Polygon') {
    console.warn('[도로분석기] 유효하지 않은 바운더리 피처')
    return features
  }

  const boundaryCoords = boundaryFeature.geometry.coordinates[0]
  
  return features.filter(feature => {
    if (!feature?.geometry) return false
    
    if (feature.geometry.type === 'LineString') {
      // 도로의 어떤 점이라도 바운더리 내부에 있으면 포함
      return feature.geometry.coordinates.some(coord => 
        isPointInPolygon([coord[0], coord[1]], boundaryCoords)
      )
    } else if (feature.geometry.type === 'Point') {
      // 교차점이 바운더리 내부에 있으면 포함
      const coord = feature.geometry.coordinates
      return isPointInPolygon([coord[0], coord[1]], boundaryCoords)
    }
    
    return false
  })
}

/**
 * 점이 다각형 내부에 있는지 확인 (Ray Casting 알고리즘)
 */
function isPointInPolygon(point: [number, number], polygon: Array<[number, number]>): boolean {
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
