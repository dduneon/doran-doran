import { useRef, useState } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { getCountry } from "../../utils/countries";
import PlaceSearch from "./PlaceSearch";

const MAP_LIBRARIES = ["places"];
const MAP_CENTER = { lat: 37.5665, lng: 126.978 };

export default function MapView({ workspaceId }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: MAP_LIBRARIES,
  });

  const { destinations, addDestination, removeDestination, current } = useWorkspaceStore();
  const [selected, setSelected] = useState(null);
  const [clickedPOI, setClickedPOI] = useState(null);
  const [restrictCountry, setRestrictCountry] = useState(true);
  const placesServiceRef = useRef(null);

  // destination_country는 ISO 코드("jp" 등)로 저장됨
  const countryCode = current?.destination_country || null;
  const countryInfo = getCountry(countryCode);

  if (!isLoaded) return <div style={styles.loading}>지도 로딩 중...</div>;

  const handleMapLoad = (map) => {
    const ghost = document.createElement("div");
    placesServiceRef.current = new window.google.maps.places.PlacesService(ghost);
  };

  const handlePlaceSelect = async (place) => {
    await addDestination(workspaceId, {
      name: place.name,
      address: place.formatted_address,
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
      place_id: place.place_id,
    });
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
              name: place.name,
              address: place.formatted_address,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              place_id: place.place_id,
            });
          }
        }
      );
    } else {
      setClickedPOI({
        name: `${e.latLng.lat().toFixed(5)}, ${e.latLng.lng().toFixed(5)}`,
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      });
    }
  };

  const handleAddClickedPOI = async () => {
    if (!clickedPOI) return;
    await addDestination(workspaceId, clickedPOI);
    setClickedPOI(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        {/* 국가 필터 표시 */}
        {countryCode && countryInfo && (
          <div style={styles.countryBar}>
            <span style={styles.countryLabel}>
              {restrictCountry
                ? `${countryInfo.flag} ${countryInfo.name} 내 검색 중`
                : "🌍 전 세계 검색 중"}
            </span>
            <button style={styles.countryToggle} onClick={() => setRestrictCountry((v) => !v)}>
              {restrictCountry ? "전 세계 보기" : `${countryInfo.name}만 보기`}
            </button>
          </div>
        )}

        <PlaceSearch
          onSelect={handlePlaceSelect}
          countryCode={restrictCountry ? countryCode : null}
        />

        <div style={styles.savedHeader}>
          저장된 목적지{destinations.length > 0 && <span style={styles.badge}>{destinations.length}</span>}
        </div>
        <div style={styles.pinList}>
          {destinations.map((d) => (
            <div key={d.id} style={styles.pinItem} onClick={() => { setClickedPOI(null); setSelected(d); }}>
              <div style={{ overflow: "hidden" }}>
                <p style={styles.pinName}>{d.name}</p>
                {d.address && <p style={styles.pinAddr}>{d.address}</p>}
              </div>
              <button
                style={styles.removeBtn}
                title="목적지 삭제"
                onClick={(e) => { e.stopPropagation(); removeDestination(d.id); }}
              >
                ✕
              </button>
            </div>
          ))}
          {destinations.length === 0 && (
            <p style={styles.empty}>장소를 검색하거나 지도를 클릭해 핀을 추가하세요.</p>
          )}
        </div>
      </div>

      <div style={styles.map}>
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={destinations[0] ? { lat: destinations[0].lat, lng: destinations[0].lng } : MAP_CENTER}
          zoom={12}
          onLoad={handleMapLoad}
          onClick={handleMapClick}
        >
          {destinations.map((d) =>
            d.lat && d.lng ? (
              <Marker
                key={d.id}
                position={{ lat: d.lat, lng: d.lng }}
                onClick={() => { setClickedPOI(null); setSelected(d); }}
              />
            ) : null
          )}

          {selected && (
            <InfoWindow
              position={{ lat: selected.lat, lng: selected.lng }}
              onCloseClick={() => setSelected(null)}
            >
              <div style={{ maxWidth: 200 }}>
                <strong style={{ fontSize: 14 }}>{selected.name}</strong>
                {selected.address && <p style={{ margin: "4px 0 0", fontSize: 12 }}>{selected.address}</p>}
                {selected.note && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>{selected.note}</p>}
              </div>
            </InfoWindow>
          )}

          {clickedPOI && (
            <>
              <Marker
                position={{ lat: clickedPOI.lat, lng: clickedPOI.lng }}
                icon={{ url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" }}
              />
              <InfoWindow
                position={{ lat: clickedPOI.lat, lng: clickedPOI.lng }}
                onCloseClick={() => setClickedPOI(null)}
              >
                <div style={{ maxWidth: 220 }}>
                  <strong style={{ fontSize: 14 }}>{clickedPOI.name}</strong>
                  {clickedPOI.address && <p style={{ margin: "4px 0 0", fontSize: 12 }}>{clickedPOI.address}</p>}
                  <button style={styles.infoAddBtn} onClick={handleAddClickedPOI}>
                    + 목적지에 추가
                  </button>
                </div>
              </InfoWindow>
            </>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", height: "100%" },
  sidebar: { width: 290, borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", background: "#fff" },
  map: { flex: 1 },
  loading: { display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#6b7280" },
  countryBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 12px", background: "#eef2ff", borderBottom: "1px solid #c7d2fe", gap: 8 },
  countryLabel: { fontSize: 12, color: "#4f46e5", fontWeight: 500 },
  countryToggle: { fontSize: 11, background: "none", border: "1px solid #a5b4fc", borderRadius: 5, color: "#4f46e5", padding: "3px 8px", cursor: "pointer", whiteSpace: "nowrap" },
  savedHeader: { display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid #e5e7eb", background: "#f9fafb" },
  badge: { background: "#4f46e5", color: "#fff", borderRadius: 10, fontSize: 11, padding: "1px 6px" },
  pinList: { flex: 1, overflowY: "auto", padding: "0 8px 8px" },
  pinItem: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 8px", borderBottom: "1px solid #f3f4f6", cursor: "pointer" },
  pinName: { margin: 0, fontSize: 14, fontWeight: 500 },
  pinAddr: { margin: "2px 0 0", fontSize: 12, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  removeBtn: { background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, padding: 4, flexShrink: 0 },
  empty: { color: "#9ca3af", fontSize: 13, padding: "16px 8px", textAlign: "center" },
  infoAddBtn: { marginTop: 8, width: "100%", padding: "6px 0", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer" },
};
