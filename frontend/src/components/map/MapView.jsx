import { useRef, useState } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { useWorkspaceStore } from "../../store/workspaceStore";
import PlaceSearch from "./PlaceSearch";

const MAP_LIBRARIES = ["places"];
const MAP_CENTER = { lat: 37.5665, lng: 126.978 };

export default function MapView({ workspaceId }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: MAP_LIBRARIES,
  });

  const { destinations, addDestination, removeDestination } = useWorkspaceStore();
  const [selected, setSelected] = useState(null);       // 저장된 핀 InfoWindow
  const [clickedPOI, setClickedPOI] = useState(null);  // 지도 클릭 임시 핀
  const placesServiceRef = useRef(null);
  const mapRef = useRef(null);

  if (!isLoaded) return <div style={styles.loading}>지도 로딩 중...</div>;

  const handleMapLoad = (map) => {
    mapRef.current = map;
    const ghost = document.createElement("div");
    placesServiceRef.current = new window.google.maps.places.PlacesService(ghost);
  };

  // 검색 결과 선택 시 바로 추가
  const handlePlaceSelect = async (place) => {
    await addDestination(workspaceId, {
      name: place.name,
      address: place.formatted_address,
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
      place_id: place.place_id,
    });
  };

  // 지도 클릭 — POI 클릭 시 place_id로 상세 조회, 빈 공간은 좌표만
  const handleMapClick = (e) => {
    setSelected(null);
    if (e.placeId) {
      e.stop(); // 기본 InfoWindow 억제
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
        <PlaceSearch onSelect={handlePlaceSelect} />
        <div style={styles.pinList}>
          {destinations.map((d) => (
            <div key={d.id} style={styles.pinItem} onClick={() => { setClickedPOI(null); setSelected(d); }}>
              <div style={{ overflow: "hidden" }}>
                <p style={styles.pinName}>{d.name}</p>
                {d.address && <p style={styles.pinAddr}>{d.address}</p>}
              </div>
              <button
                style={styles.removeBtn}
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
          center={
            destinations[0]
              ? { lat: destinations[0].lat, lng: destinations[0].lng }
              : MAP_CENTER
          }
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

          {/* 저장된 핀 InfoWindow */}
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

          {/* 지도 클릭 임시 핀 + 추가 버튼 */}
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
  pinList: { flex: 1, overflowY: "auto", padding: "0 8px 8px" },
  pinItem: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 8px", borderBottom: "1px solid #f3f4f6", cursor: "pointer" },
  pinName: { margin: 0, fontSize: 14, fontWeight: 500 },
  pinAddr: { margin: "2px 0 0", fontSize: 12, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  removeBtn: { background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, padding: 4, flexShrink: 0 },
  empty: { color: "#9ca3af", fontSize: 13, padding: "16px 8px", textAlign: "center" },
  infoAddBtn: { marginTop: 8, width: "100%", padding: "6px 0", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer" },
};
