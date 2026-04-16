import { useRef, useEffect } from "react";

export default function PlaceSearch({ onSelect }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (!window.google || !inputRef.current) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ["place_id", "name", "formatted_address", "geometry"],
    });

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry) {
        onSelect(place);
        inputRef.current.value = "";
      }
    });

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onSelect]);

  return (
    <div style={styles.wrapper}>
      <input
        ref={inputRef}
        style={styles.input}
        type="text"
        placeholder="장소 검색..."
      />
    </div>
  );
}

const styles = {
  wrapper: { padding: 10 },
  input: { width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" },
};
