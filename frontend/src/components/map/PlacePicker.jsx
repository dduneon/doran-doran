import { useEffect, useRef, useState } from "react";

/**
 * 장소 하나를 검색·선택하는 인라인 컴포넌트.
 * 선택 후 onSelect({ name, formatted_address, lat, lng, place_id }) 호출.
 * selected prop으로 현재 선택값(이름 문자열)을 표시할 수 있음.
 */
export default function PlacePicker({ placeholder = "장소 검색...", onSelect, selected, onClear }) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState([]);
  const autocompleteRef = useRef(null);
  const placesRef = useRef(null);
  const ghostRef = useRef(null);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!window.google) return;
    autocompleteRef.current = new window.google.maps.places.AutocompleteService();
    ghostRef.current = document.createElement("div");
    placesRef.current = new window.google.maps.places.PlacesService(ghostRef.current);
  }, []);

  useEffect(() => {
    const handleOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setPredictions([]);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const search = (input) => {
    if (!input.trim() || !autocompleteRef.current) { setPredictions([]); return; }
    autocompleteRef.current.getPlacePredictions(
      { input, language: "ko" },
      (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results.slice(0, 5));
        } else {
          setPredictions([]);
        }
      }
    );
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handlePick = (prediction) => {
    if (!placesRef.current) return;
    placesRef.current.getDetails(
      { placeId: prediction.place_id, fields: ["place_id", "name", "formatted_address", "geometry"] },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          onSelect({
            name: place.name,
            formatted_address: place.formatted_address,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            place_id: place.place_id,
          });
          setQuery("");
          setPredictions([]);
        }
      }
    );
  };

  // 이미 선택된 값이 있으면 배지로 표시
  if (selected) {
    return (
      <div style={styles.selected}>
        <span style={styles.selectedText}>{selected}</span>
        <button type="button" style={styles.clearBtn} onClick={onClear}>✕</button>
      </div>
    );
  }

  return (
    <div style={styles.wrapper} ref={wrapperRef}>
      <input
        style={styles.input}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
      />
      {predictions.length > 0 && (
        <div style={styles.dropdown}>
          {predictions.map((p) => (
            <div key={p.place_id} style={styles.item} onMouseDown={() => handlePick(p)}>
              <span style={styles.main}>{p.structured_formatting.main_text}</span>
              <span style={styles.sub}>{p.structured_formatting.secondary_text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: { position: "relative", width: "100%" },
  input: { width: "100%", padding: "5px 8px", border: "1px solid #e5e7eb", borderRadius: 5, fontSize: 12, boxSizing: "border-box", outline: "none" },
  dropdown: { position: "absolute", left: 0, right: 0, top: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 300, overflow: "hidden" },
  item: { padding: "7px 10px", cursor: "pointer", borderBottom: "1px solid #f3f4f6" },
  main: { display: "block", fontSize: 12, fontWeight: 500 },
  sub: { display: "block", fontSize: 11, color: "#9ca3af" },
  selected: { display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", background: "#eef2ff", borderRadius: 5, border: "1px solid #c7d2fe" },
  selectedText: { flex: 1, fontSize: 12, color: "#3730a3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  clearBtn: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 11, padding: 0, flexShrink: 0 },
};
