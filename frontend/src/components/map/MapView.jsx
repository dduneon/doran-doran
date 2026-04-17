import { useRef, useState } from "react";
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
export default function MapView({ workspaceId, fullscreen = false, sidebarOnly = false }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: MAP_LIBRARIES,
  });

  const { destinations, accommodations, flights, addDestination, removeDestination, current } =
    useWorkspaceStore();
  const [selected,     setSelected]     = useState(null);
  const [clickedPOI,   setClickedPOI]   = useState(null);
  const [pendingPlace, setPendingPlace] = useState(null);
  const [restrictCountry, setRestrictCountry] = useState(true);
  const placesServiceRef = useRef(null);

  const countryCode = current?.destination_country || null;
  const countryInfo = getCountry(countryCode);

  /* ──── 이벤트 핸들러 ──── */
  const handleMapLoad = (map) => {
    placesServiceRef.current = new window.google.maps.places.PlacesService(document.createElement("div"));
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
        { placeId: e.placeId, fields: ["place_id", "name", "formatted_address", "geometry"] },
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            setClickedPOI({
              name: place.name, address: place.formatted_address,
              lat: place.geometry.location.lat(), lng: place.geometry.location.lng(),
              place_id: place.place_id,
            });
          }
        }
      );
    } else {
      setClickedPOI({ name: `${e.latLng.lat().toFixed(5)}, ${e.latLng.lng().toFixed(5)}`, lat: e.latLng.lat(), lng: e.latLng.lng() });
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
  const mapCenter = destinations[0] ? { lat: destinations[0].lat, lng: destinations[0].lng } : MAP_CENTER;

  const googleMap = (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height: "100%" }}
      center={mapCenter}
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
      {destinations.map((d, idx) => d.lat && d.lng && (
        <Marker key={d.id} position={{ lat: d.lat, lng: d.lng }}
          label={{ text: String(idx + 1), color: "#fff", fontWeight: "bold", fontSize: "11px" }}
          onClick={() => { setClickedPOI(null); setSelected(d); }}
        />
      ))}
      {accommodations.filter((a) => a.lat && a.lng).map((a) => (
        <Marker key={`acc-${a.id}`} position={{ lat: a.lat, lng: a.lng }}
          icon={{ url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png" }}
          onClick={() => { setClickedPOI(null); setSelected({ ...a, _type: "accommodation" }); }}
        />
      ))}
      {flights.filter((f) => f.departure_lat && f.departure_lng).map((f) => (
        <Marker key={`dep-${f.id}`} position={{ lat: f.departure_lat, lng: f.departure_lng }}
          icon={{ url: "http://maps.google.com/mapfiles/ms/icons/purple-dot.png" }}
          onClick={() => setSelected({ name: `✈️ ${f.departure_airport}`, lat: f.departure_lat, lng: f.departure_lng })}
        />
      ))}
      {selected && (
        <InfoWindow position={{ lat: selected.lat, lng: selected.lng }} onCloseClick={() => setSelected(null)}>
          <div className="max-w-[200px] font-sans">
            <p className="font-bold text-gray-800 text-sm">{selected.name}</p>
            {selected.address && <p className="text-xs text-gray-500 mt-1 leading-snug">{selected.address}</p>}
          </div>
        </InfoWindow>
      )}
      {clickedPOI && (
        <>
          <Marker position={{ lat: clickedPOI.lat, lng: clickedPOI.lng }}
            icon={{ url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" }}
          />
          <InfoWindow position={{ lat: clickedPOI.lat, lng: clickedPOI.lng }} onCloseClick={() => setClickedPOI(null)}>
            <div className="max-w-[220px] font-sans">
              <p className="font-bold text-gray-800 text-sm">{clickedPOI.name}</p>
              {clickedPOI.address && <p className="text-xs text-gray-500 mt-1">{clickedPOI.address}</p>}
              <button
                onClick={() => { setPendingPlace({ ...clickedPOI, customName: clickedPOI.name }); setClickedPOI(null); }}
                className="mt-2 w-full py-1.5 bg-coral-500 hover:bg-coral-600 text-white text-xs font-bold rounded-lg transition-colors"
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
                onClick={() => { setClickedPOI(null); setSelected(d); }}
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
