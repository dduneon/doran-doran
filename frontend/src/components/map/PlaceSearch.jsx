import { useEffect, useRef, useState } from "react";

export default function PlaceSearch({ onSelect, countryCode }) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);
  const ghostDiv = useRef(null);
  const debounceTimer = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!window.google) return;
    autocompleteService.current = new window.google.maps.places.AutocompleteService();
    ghostDiv.current = document.createElement("div");
    placesService.current = new window.google.maps.places.PlacesService(ghostDiv.current);
  }, []);

  // 국가 필터 변경 시 결과 초기화
  useEffect(() => { setPredictions([]); }, [countryCode]);

  // 외부 클릭 시 드롭다운 닫기
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
    if (!input.trim() || !autocompleteService.current) {
      setPredictions([]);
      return;
    }
    setLoading(true);
    const params = { input, language: "ko" };
    if (countryCode) params.componentRestrictions = { country: countryCode };
    autocompleteService.current.getPlacePredictions(
      params,
      (results, status) => {
        setLoading(false);
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results);
        } else {
          setPredictions([]);
        }
      }
    );
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => search(val), 300);
  };

  const handleAdd = (prediction) => {
    if (!placesService.current) return;
    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["place_id", "name", "formatted_address", "geometry"],
      },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          onSelect(place);
          setQuery("");
          setPredictions([]);
        }
      }
    );
  };

  return (
    <div style={styles.wrapper} ref={wrapperRef}>
      <input
        style={styles.input}
        type="text"
        placeholder="장소 검색..."
        value={query}
        onChange={handleChange}
      />
      {loading && <p style={styles.hint}>검색 중...</p>}
      {!loading && query && predictions.length === 0 && (
        <p style={styles.hint}>결과 없음</p>
      )}
      {predictions.length > 0 && (
        <div style={styles.dropdown}>
          {predictions.map((p) => (
            <div key={p.place_id} style={styles.item}>
              <div style={styles.itemText}>
                <span style={styles.main}>{p.structured_formatting.main_text}</span>
                <span style={styles.sub}>{p.structured_formatting.secondary_text}</span>
              </div>
              <button style={styles.addBtn} onClick={() => handleAdd(p)}>
                + 추가
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: { padding: 10, position: "relative" },
  input: {
    width: "100%",
    padding: "9px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
  },
  hint: { fontSize: 12, color: "#9ca3af", padding: "4px 4px 0", margin: 0 },
  dropdown: {
    position: "absolute",
    left: 10,
    right: 10,
    top: "calc(100% - 6px)",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
    zIndex: 200,
    overflow: "hidden",
  },
  item: {
    display: "flex",
    alignItems: "center",
    padding: "10px 12px",
    borderBottom: "1px solid #f3f4f6",
    gap: 8,
  },
  itemText: { flex: 1, overflow: "hidden" },
  main: { display: "block", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  sub: { display: "block", fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  addBtn: {
    flexShrink: 0,
    padding: "5px 10px",
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
};
