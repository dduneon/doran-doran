import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { getCountry } from "../../utils/countries";
import PlaceSearch from "./PlaceSearch";

const MAP_LIBRARIES = ["places"];
const MAP_CENTER    = { lat: 37.5665, lng: 126.978 };

const MAP_STYLE = [
  { featureType: "poi",             elementType: "labels",       stylers: [{ visibility: "off" }] },
  { featureType: "transit",         elementType: "labels.icon",  stylers: [{ visibility: "off" }] },
  { featureType: "road",            elementType: "geometry",     stylers: [{ color: "#f8f8f8" }] },
  { featureType: "water",           elementType: "geometry",     stylers: [{ color: "#d0e8f0" }] },
  { featureType: "landscape",       elementType: "geometry",     stylers: [{ color: "#f5f5f0" }] },
  { featureType: "road.highway",    elementType: "geometry",     stylers: [{ color: "#ffffff" }] },
  { featureType: "administrative",  elementType: "geometry.stroke", stylers: [{ color: "#c9c9c9" }] },
];

/**
 * fullscreen={true}  → 사이드바 없이 지도만 전체화면 (WorkspacePage 배경으로 사용)
 * sidebarOnly={true} → 지도는 없고 사이드바 패널만 렌더링 (지도탭 패널)
 * 기본 (둘 다 false) → 이전 방식 (사이드바 + 지도)
 */
export default function MapView({ workspaceId, fullscreen = false, sidebarOnly = false, focusedDestination = null, onFocusDestination, panOffset = null }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: MAP_LIBRARIES,
  });

  const { destinations, accommodations, flights, addDestination, removeDestination, current } =
    useWorkspaceStore();

  const [selected,        setSelected]        = useState(null);
  const [clickedPOI,      setClickedPOI]      = useState(null);
  const [pendingPlace,    setPendingPlace]     = useState(null);
  const [restrictCountry, setRestrictCountry] = useState(true);
  const [stableCenter,    setStableCenter]     = useState(MAP_CENTER);
  // map 인스턴스가 준비됐는지 추적 — useEffect 의존성에 사용
  const [mapReady,        setMapReady]         = useState(false);

  const placesServiceRef  = useRef(null);
  const mapRef            = useRef(null);
  // 명령형으로 관리하는 목적지 마커 목록
  const destMarkersRef    = useRef([]);

  const countryCode = current?.destination_country || null;
  const countryInfo = getCountry(countryCode);

  // destinations[0]이 생기면 중심 좌표 고정 — 이후 destinations가 빈 배열이 되어도 Seoul로 리셋되지 않음
  useEffect(() => {
    if (destinations[0]?.lat && destinations[0]?.lng) {
      setStableCenter({ lat: destinations[0].lat, lng: destinations[0].lng });
    }
  }, [destinations[0]?.lat, destinations[0]?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ──── 목적지 마커를 명령형으로 관리 ────
   * <Marker> 컴포넌트(선언형)는 React 조정 타이밍에 따라 간헐적으로 등록에 실패함.
   * useEffect + 직접 API 호출로 교체하면 destinations 변경 시 항상 확실히 렌더링됨.
   */
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    // 기존 목적지 마커 제거
    destMarkersRef.current.forEach((m) => m.setMap(null));
    destMarkersRef.current = [];

    destinations.forEach((d, idx) => {
      if (!d.lat || !d.lng) return;
      const marker = new window.google.maps.Marker({
        position: { lat: d.lat, lng: d.lng },
        map: mapRef.current,
        label: { text: String(idx + 1), color: "#fff", fontWeight: "bold", fontSize: "11px" },
      });
      marker.addListener("click", () => {
        setClickedPOI(null);
        setSelected(d);
        if (placesServiceRef.current && d.place_id) {
          placesServiceRef.current.getDetails(
            { placeId: d.place_id, fields: ["photos"] },
            (place, status) => {
              const photoUrl =
                status === window.google.maps.places.PlacesServiceStatus.OK
                  ? (place.photos?.[0]?.getUrl({ maxWidth: 400, maxHeight: 200 }) ?? null)
                  : null;
              setSelected((prev) => (prev?.id === d.id ? { ...prev, photoUrl } : prev));
            }
          );
        }
      });
      destMarkersRef.current.push(marker);
    });

    return () => {
      destMarkersRef.current.forEach((m) => m.setMap(null));
      destMarkersRef.current = [];
    };
  }, [destinations, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ──── focusedDestination 변경 시 지도 이동 + 사진 로드 ──── */
  useEffect(() => {
    if (!focusedDestination || !mapRef.current) return;
    const map = mapRef.current;

    const panWithOffset = () => {
      const projection = map.getProjection();
      if (!projection) return;

      const target = new window.google.maps.LatLng(focusedDestination.lat, focusedDestination.lng);
      if (panOffset) {
        const scale = Math.pow(2, map.getZoom());
        const worldPoint = projection.fromLatLngToPoint(target);
        const offsetPoint = new window.google.maps.Point(
          worldPoint.x + panOffset.x / scale,
          worldPoint.y + panOffset.y / scale,
        );
        map.panTo(projection.fromPointToLatLng(offsetPoint));
      } else {
        map.panTo(target);
      }
      setSelected(focusedDestination);
      // 사이드바에서 장소 클릭 시 사진도 함께 로드
      if (placesServiceRef.current && focusedDestination.place_id) {
        placesServiceRef.current.getDetails(
          { placeId: focusedDestination.place_id, fields: ["photos"] },
          (place, status) => {
            const photoUrl =
              status === window.google.maps.places.PlacesServiceStatus.OK
                ? (place.photos?.[0]?.getUrl({ maxWidth: 400, maxHeight: 200 }) ?? null)
                : null;
            setSelected((prev) =>
              prev?.id === focusedDestination.id ? { ...prev, photoUrl } : prev
            );
          }
        );
      }
    };

    panWithOffset();
  }, [focusedDestination]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ──── 이벤트 핸들러 ──── */
  const handleMapLoad = (map) => {
    mapRef.current = map;
    placesServiceRef.current = new window.google.maps.places.PlacesService(document.createElement("div"));
    setMapReady(true); // 이 시점부터 명령형 마커 useEffect가 실행 가능
  };

  const handlePlaceSelect = (place) => {
    setPendingPlace({
      name: place.name, customName: place.name,
      address: place.formatted_address,
      lat: place.geometry.location.lat(), lng: place.geometry.location.lng(),
      place_id: place.place_id,
    });
    setClickedPOI(null);
  };

  const handleMapClick = (e) => {
    setSelected(null);
    if (e.placeId) {
      e.stop();
      placesServiceRef.current?.getDetails(
        { placeId: e.placeId, fields: ["place_id", "name", "formatted_address", "geometry", "photos"] },
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            const photoUrl = place.photos?.[0]?.getUrl({ maxWidth: 400, maxHeight: 200 }) || null;
            setClickedPOI({
              name: place.name, address: place.formatted_address,
              lat: place.geometry.location.lat(), lng: place.geometry.location.lng(),
              place_id: place.place_id, photoUrl,
            });
          }
        }
      );
    }
  };

  const handleConfirmAdd = async () => {
    if (!pendingPlace) return;
    await addDestination(workspaceId, {
      name: pendingPlace.customName.trim() || pendingPlace.name,
      address: pendingPlace.address, lat: pendingPlace.lat, lng: pendingPlace.lng, place_id: pendingPlace.place_id,
    });
    setPendingPlace(null);
  };

  /* ──── 로딩 ──── */
  if (!isLoaded) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 bg-gray-100">
      <div className="w-8 h-8 rounded-full border-[3px] border-gray-200 border-t-coral-500 animate-spin" />
      <p className="text-sm text-gray-400">지도를 불러오는 중…</p>
    </div>
  );

  /* ──── 공통: 지도 렌더 ──── */
  const googleMap = (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={stableCenter}
      zoom={12}
      onLoad={handleMapLoad}
      onClick={handleMapClick}
      options={{
        styles: MAP_STYLE,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        clickableIcons: true,
      }}
    >
      {/* 목적지 마커는 useEffect에서 명령형으로 관리 — 선언형 <Marker>는 사용하지 않음 */}

      {accommodations.filter((a) => a.lat && a.lng).map((a) => (
        <Marker key={`acc-${a.id}`} position={{ lat: a.lat, lng: a.lng }}
          icon={{ url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png" }}
          onClick={() => {
            setClickedPOI(null);
            setSelected({ ...a, _type: "accommodation" });
            placesServiceRef.current?.getDetails(
              { placeId: a.place_id, fields: ["photos"] },
              (place, status) => {
                const photoUrl = status === window.google.maps.places.PlacesServiceStatus.OK
                  ? (place.photos?.[0]?.getUrl({ maxWidth: 400, maxHeight: 200 }) ?? null) : null;
                setSelected((prev) => prev?.id === a.id ? { ...prev, photoUrl } : prev);
              }
            );
          }}
        />
      ))}
      {flights.filter((f) => f.departure_lat && f.departure_lng).map((f) => (
        <Marker key={`dep-${f.id}`} position={{ lat: f.departure_lat, lng: f.departure_lng }}
          icon={{ url: "https://maps.google.com/mapfiles/ms/icons/purple-dot.png" }}
          onClick={() => setSelected({ name: `✈️ ${f.departure_airport}`, lat: f.departure_lat, lng: f.departure_lng })}
        />
      ))}
      {selected && (
        <InfoWindow
          position={{ lat: selected.lat, lng: selected.lng }}
          onCloseClick={() => setSelected(null)}
          options={{ maxWidth: 260, disableAutoPan: false }}
        >
          <div style={{ fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif", overflow: "hidden", maxWidth: 240 }}>
            {selected.photoUrl ? (
              <img
                src={selected.photoUrl}
                alt={selected.name}
                style={{ width: "calc(100% + 32px)", marginLeft: -16, marginTop: -12, height: 130, objectFit: "cover", display: "block", marginBottom: 10 }}
              />
            ) : (
              <div style={{ width: "calc(100% + 32px)", marginLeft: -16, marginTop: -12, height: 80, background: "linear-gradient(135deg, #ff6b6b22 0%, #ff6b6b44 100%)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>📍</span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
              <span style={{ display: "inline-block", background: "#ff6b6b", color: "#fff", borderRadius: "50%", width: 18, height: 18, fontSize: 10, fontWeight: 700, textAlign: "center", lineHeight: "18px", flexShrink: 0, marginTop: 1 }}>
                {destinations.findIndex((d) => d.id === selected.id) >= 0 ? destinations.findIndex((d) => d.id === selected.id) + 1 : "★"}
              </span>
              <p style={{ fontWeight: 700, fontSize: 13, color: "#1f2937", lineHeight: 1.4, margin: 0 }}>{selected.name}</p>
            </div>
            {selected.address && (
              <p style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.5, margin: 0, paddingLeft: 24 }}>{selected.address}</p>
            )}
          </div>
        </InfoWindow>
      )}
      {clickedPOI && (
        <>
          <Marker position={{ lat: clickedPOI.lat, lng: clickedPOI.lng }}
            icon={{ url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png" }}
          />
          <InfoWindow
            position={{ lat: clickedPOI.lat, lng: clickedPOI.lng }}
            onCloseClick={() => setClickedPOI(null)}
            options={{ maxWidth: 260, disableAutoPan: false }}
          >
            <div style={{ fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif", overflow: "hidden", maxWidth: 240 }}>
              {clickedPOI.photoUrl ? (
                <img
                  src={clickedPOI.photoUrl}
                  alt={clickedPOI.name}
                  style={{ width: "calc(100% + 32px)", marginLeft: -16, marginTop: -12, height: 130, objectFit: "cover", display: "block", marginBottom: 10 }}
                />
              ) : (
                <div style={{ width: "calc(100% + 32px)", marginLeft: -16, marginTop: -12, height: 80, background: "linear-gradient(135deg, #3b82f622 0%, #3b82f644 100%)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 28 }}>🔍</span>
                </div>
              )}
              <p style={{ fontWeight: 700, fontSize: 13, color: "#1f2937", lineHeight: 1.4, margin: "0 0 4px" }}>{clickedPOI.name}</p>
              {clickedPOI.address && (
                <p style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.5, margin: "0 0 10px" }}>{clickedPOI.address}</p>
              )}
              <button
                onClick={() => { setPendingPlace({ ...clickedPOI, customName: clickedPOI.name }); setClickedPOI(null); }}
                style={{ width: "100%", padding: "7px 0", background: "#ff6b6b", color: "#fff", fontSize: 12, fontWeight: 700, border: "none", borderRadius: 10, cursor: "pointer" }}
              >
                + 목적지에 추가
              </button>
            </div>
          </InfoWindow>
        </>
      )}
    </GoogleMap>
  );

  /* ──── 풀스크린 모드 (배경 지도) ──── */
  if (fullscreen) return <div className="w-full h-full">{googleMap}</div>;

  /* ──── 사이드바 전용 모드 (지도 탭 패널) ──── */
  if (sidebarOnly) return (
    <div className="h-full flex flex-col glass rounded-3xl overflow-hidden">
      {/* 검색 */}
      <div className="p-4 border-b border-white/40">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">장소 검색</p>
        <PlaceSearch onSelect={handlePlaceSelect} countryCode={restrictCountry ? countryCode : null} />
        {countryCode && countryInfo && (
          <button
            onClick={() => setRestrictCountry((v) => !v)}
            className="mt-2 w-full text-xs text-gray-500 bg-white/60 hover:bg-white/90
                       border border-white/50 rounded-xl py-2 font-medium transition-all duration-150"
          >
            {restrictCountry ? `🌍 전 세계로 검색 넓히기` : `${countryInfo.flag} ${countryInfo.name}으로 좁히기`}
          </button>
        )}
      </div>

      {/* 장소 확인 카드 */}
      <AnimatePresence>
        {pendingPlace && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mx-3 my-2 p-3.5 bg-coral-50 border border-coral-200 rounded-2xl"
          >
            <p className="text-[10px] font-bold text-coral-500 uppercase tracking-widest mb-2">📍 장소 이름 확인</p>
            <input
              value={pendingPlace.customName}
              onChange={(e) => setPendingPlace((p) => ({ ...p, customName: e.target.value }))}
              autoFocus
              className="w-full bg-white border border-coral-200 rounded-xl px-3 py-2
                         text-sm font-semibold text-gray-800 outline-none
                         focus:border-coral-400 focus:ring-2 focus:ring-coral-400/20 mb-1.5"
            />
            {pendingPlace.address && <p className="text-[11px] text-gray-400 mb-3 leading-snug">{pendingPlace.address}</p>}
            <div className="flex gap-2">
              <button onClick={() => setPendingPlace(null)}
                className="flex-1 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                취소
              </button>
              <button onClick={handleConfirmAdd}
                className="flex-1 py-2 bg-coral-500 hover:bg-coral-600 rounded-xl text-sm font-bold text-white transition-colors">
                저장
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 목적지 리스트 */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">저장된 장소</span>
          {destinations.length > 0 && (
            <span className="text-[10px] font-bold bg-coral-500 text-white px-2 py-0.5 rounded-full">
              {destinations.length}
            </span>
          )}
        </div>

        {destinations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 px-6 text-center">
            <span className="text-4xl opacity-30">🗺️</span>
            <p className="text-xs text-gray-400 leading-relaxed">지도를 클릭하거나 검색해서<br />장소를 추가해보세요</p>
          </div>
        ) : (
          <ul className="px-2 pb-3 space-y-1">
            {destinations.map((d, idx) => (
              <motion.li
                key={d.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl
                           hover:bg-white/60 transition-colors duration-100 cursor-pointer group"
                onClick={() => {
                  setClickedPOI(null);
                  setSelected(d);
                  onFocusDestination?.(d);
                  if (placesServiceRef.current && d.place_id) {
                    placesServiceRef.current.getDetails(
                      { placeId: d.place_id, fields: ["photos"] },
                      (place, status) => {
                        const photoUrl = status === window.google.maps.places.PlacesServiceStatus.OK
                          ? (place.photos?.[0]?.getUrl({ maxWidth: 400, maxHeight: 200 }) ?? null) : null;
                        setSelected((prev) => prev?.id === d.id ? { ...prev, photoUrl } : prev);
                      }
                    );
                  }
                }}
              >
                <div className="w-6 h-6 rounded-full bg-coral-500 text-white text-[11px] font-bold
                                flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{d.name}</p>
                  {d.address && <p className="text-[11px] text-gray-400 truncate">{d.address}</p>}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeDestination(workspaceId, d.id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-coral-400
                             transition-all duration-150 text-xs px-1"
                >
                  ✕
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  /* ──── 기본 모드 (레거시: 사이드바 + 지도 나란히) ──── */
  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-gray-100 bg-white overflow-y-auto flex-shrink-0">
        <div className="p-4">
          <PlaceSearch onSelect={handlePlaceSelect} countryCode={restrictCountry ? countryCode : null} />
        </div>
      </div>
      <div className="flex-1">{googleMap}</div>
    </div>
  );
}
