import { useState } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { useWorkspaceStore } from "../../store/workspaceStore";
import PlaceSearch from "./PlaceSearch";

const MAP_LIBRARIES = ["places"];
const MAP_CENTER = { lat: 37.5665, lng: 126.9780 }; // Seoul default

export default function MapView({ workspaceId }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: MAP_LIBRARIES,
  });

  const { destinations, addDestination, removeDestination } = useWorkspaceStore();
  const [selected, setSelected] = useState(null);

  if (!isLoaded) return <div style={styles.loading}>지도 로딩 중...</div>;

  const handlePlaceSelect = async (place) => {
    await addDestination(workspaceId, {
      name: place.name,
      address: place.formatted_address,
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
      place_id: place.place_id,
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <PlaceSearch onSelect={handlePlaceSelect} />
        <div style={styles.pinList}>
          {destinations.map((d) => (
            <div key={d.id} style={styles.pinItem} onClick={() => setSelected(d)}>
              <div>
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
          {destinations.length === 0 && <p style={styles.empty}>장소를 검색해 핀을 추가하세요.</p>}
        </div>
      </div>
      <div style={styles.map}>
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={destinations[0] ? { lat: destinations[0].lat, lng: destinations[0].lng } : MAP_CENTER}
          zoom={12}
        >
          {destinations.map((d) =>
            d.lat && d.lng ? (
              <Marker
                key={d.id}
                position={{ lat: d.lat, lng: d.lng }}
                onClick={() => setSelected(d)}
              />
            ) : null
          )}
          {selected && (
            <InfoWindow
              position={{ lat: selected.lat, lng: selected.lng }}
              onCloseClick={() => setSelected(null)}
            >
              <div>
                <strong>{selected.name}</strong>
                {selected.address && <p style={{ margin: "4px 0 0", fontSize: 12 }}>{selected.address}</p>}
                {selected.note && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>{selected.note}</p>}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", height: "100%" },
  sidebar: { width: 280, borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", background: "#fff" },
  map: { flex: 1 },
  loading: { display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#6b7280" },
  pinList: { flex: 1, overflowY: "auto", padding: "0 8px 8px" },
  pinItem: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 8px", borderBottom: "1px solid #f3f4f6", cursor: "pointer" },
  pinName: { margin: 0, fontSize: 14, fontWeight: 500 },
  pinAddr: { margin: "2px 0 0", fontSize: 12, color: "#6b7280" },
  removeBtn: { background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, padding: 4 },
  empty: { color: "#9ca3af", fontSize: 13, padding: "16px 8px", textAlign: "center" },
};
