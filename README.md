# 🛣️ Road Network Analyzer

OpenStreetMap 데이터를 활용한 실시간 도로 네트워크 분석 도구

![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9-green?style=flat-square&logo=leaflet)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)

## ✨ 주요 기능

### 🗺️ 지도 기반 분석
- **다양한 지도 타일**: OpenStreetMap, CartoDB Dark/Light 등 다양한 지도 스타일 지원
- **실시간 상호작용**: 지도에서 직접 도로를 클릭하여 선택 및 분석
- **동적 시각화**: 도로 네트워크와 교차점을 색상으로 구분하여 표시

### 📊 데이터 분석
- **Overpass API 연동**: OpenStreetMap의 실시간 데이터를 활용한 정확한 분석
- **다양한 도로 유형**: 일반 도로, 공항 활주로, 철도, 수로 등 포괄적 분석
- **교차점 감지**: 도로 간 교차점 자동 감지 및 시각화
- **바운더리 클리핑**: 지정된 영역 내부의 도로만 추출 (선택적)

### 🎛️ 사용자 인터페이스
- **직관적인 패널**: 접기/펼치기 가능한 Feature 목록 및 데이터 관리 패널
- **실시간 동기화**: 지도 ↔ Feature 목록 간 양방향 연동
- **데이터 영속성**: 새로고침 후에도 작업 데이터 자동 보존
- **편집 모드**: 도로 네트워크 실시간 편집 및 수정

## 🚀 시작하기

### 필수 요구사항
- Node.js 18.0 이상
- pnpm (권장) 또는 npm

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/road-network-analyzer/road-network-analyzer.git
cd road-network-analyzer

# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션을 확인하세요.

## 📖 사용 방법

### 1. 분석 영역 설정
1. 좌측 **컨트롤 패널**에서 GeoJSON 데이터 입력
2. **영역 로드** 버튼으로 분석할 영역을 지도에 표시

### 2. 도로 네트워크 분석
1. **도로 네트워크 분석** 버튼 클릭
2. 선택적으로 "바운더리 내부 도로만 추출" 옵션 활용
3. Overpass API를 통한 실시간 데이터 분석 진행

### 3. 결과 탐색
- **지도에서**: 도로를 직접 클릭하여 선택
- **Feature 목록**: 우측 패널에서 개별 Feature 탐색
- **데이터 관리**: 통계 확인, 데이터 내보내기/가져오기

### 4. 편집 및 관리
- **편집 모드**: 도로 네트워크 실시간 수정
- **Feature 삭제**: 불필요한 도로 구간 제거
- **데이터 저장**: GeoJSON 형태로 결과 다운로드

## 🛠️ 기술 스택

### Frontend
- **Next.js 15**: React 기반 풀스택 프레임워크
- **TypeScript**: 타입 안전성을 위한 정적 타입 시스템
- **Tailwind CSS**: 유틸리티 우선 CSS 프레임워크
- **shadcn/ui**: 모던한 UI 컴포넌트 라이브러리

### 지도 및 데이터
- **Leaflet**: 오픈소스 지도 라이브러리
- **OpenStreetMap**: 오픈소스 지도 데이터
- **Overpass API**: OSM 데이터 실시간 쿼리 API

### 상태 관리
- **React Hooks**: 컴포넌트 상태 관리
- **localStorage**: 클라이언트 사이드 데이터 영속성

## 📁 프로젝트 구조

```
road-network-analyzer/
├── app/                    # Next.js App Router
│   ├── globals.css        # 전역 스타일
│   ├── layout.tsx         # 루트 레이아웃
│   └── page.tsx           # 메인 페이지
├── components/            # React 컴포넌트
│   ├── ui/               # 재사용 가능한 UI 컴포넌트
│   ├── control-panel.tsx # 좌측 컨트롤 패널
│   ├── data-panel.tsx    # 우측 데이터 패널
│   ├── map-view.tsx      # 지도 컴포넌트
│   └── collapsible-panel.tsx # 접기/펼치기 패널
├── hooks/                # 커스텀 React Hooks
│   ├── use-local-storage.ts # localStorage 훅
│   └── use-toast.ts      # 토스트 알림 훅
├── lib/                  # 유틸리티 및 라이브러리
│   ├── road-analyzer.ts  # 도로 네트워크 분석 로직
│   └── utils.ts          # 공통 유틸리티
└── public/               # 정적 파일
```

## 🎯 주요 알고리즘

### 도로 네트워크 분석
- **Overpass API 쿼리**: 효율적인 OSM 데이터 추출
- **교차점 감지**: 선분 교차 알고리즘을 통한 정확한 교차점 계산
- **바운더리 클리핑**: Ray Casting 알고리즘 기반 점-폴리곤 내부 검사

### 데이터 처리
- **GeoJSON 표준**: 지리공간 데이터 표준 형식 준수
- **실시간 동기화**: 지도와 UI 간 양방향 데이터 바인딩
- **메모리 최적화**: 대용량 도로 데이터 효율적 처리

## 🔧 개발 도구

### 코드 품질
```bash
# 타입 체크
pnpm type-check

# 린트 검사
pnpm lint

# 코드 포맷팅
pnpm format
```

### 빌드 및 배포
```bash
# 프로덕션 빌드
pnpm build

# 빌드 결과 실행
pnpm start
```

## 🤝 기여하기

1. 이 저장소를 Fork합니다
2. Feature 브랜치를 생성합니다 (`git checkout -b feature/AmazingFeature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 Push합니다 (`git push origin feature/AmazingFeature`)
5. Pull Request를 생성합니다

### 기여 가이드라인

- 코드 스타일: ESLint와 Prettier 설정을 따라주세요
- 커밋 메시지: 명확하고 설명적인 커밋 메시지 작성
- 테스트: 새로운 기능 추가 시 관련 테스트 코드 포함
- 문서화: README나 코드 주석 업데이트

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 감사의 말

- [OpenStreetMap](https://www.openstreetmap.org/) - 오픈소스 지도 데이터 제공
- [Overpass API](https://overpass-api.de/) - 실시간 OSM 데이터 쿼리 서비스
- [Leaflet](https://leafletjs.com/) - 오픈소스 지도 라이브러리
- [Next.js](https://nextjs.org/) - React 기반 웹 프레임워크

## 📞 문의

프로젝트에 대한 질문이나 제안사항이 있으시면 [Issues](https://github.com/road-network-analyzer/road-network-analyzer/issues)를 통해 연락해 주세요.

## 🌐 배포

이 프로젝트는 [Vercel](https://vercel.com)에서 호스팅됩니다:
- **프로덕션**: [https://road-network-analyzer.vercel.app](https://road-network-analyzer.vercel.app)

## 📊 분석 및 모니터링

- **Vercel Analytics**: 사용자 행동 분석 및 성능 모니터링
- **Web Vitals**: Core Web Vitals 지표 추적
- **SEO 최적화**: 검색 엔진 최적화 및 메타데이터 관리

---

<div align="center">
  <strong>🛣️ 더 나은 도로 네트워크 분석을 위해</strong>
</div>
