import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function PlacePicker({ placeholder = "장소 검색…", onSelect, selected, onClear }) {
  const [query,       setQuery]       = useState("");
  const [predictions, setPredictions] = useState([]);
  const autocompleteRef = useRef(null);
  const placesRef       = useRef(null);
  const ghostRef        = useRef(null);
  const debounceRef     = useRef(null);
  const wrapperRef      = useRef(null);

  useEffect(() => {
    if (!window.google) return;
    autocompleteRef.current = new window.google.maps.places.AutocompleteService();
    ghostRef.current = document.createElement("div");
    placesRef.current = new window.google.maps.places.PlacesService(ghostRef.current);
  }, []);

  useEffect(() => {
    const fn = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setPredictions([]); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const search = (input) => {
    if (!input.trim() || !autocompleteRef.current) { setPredictions([]); return; }
    autocompleteRef.current.getPlacePredictions({ input, language: "ko" }, (results, status) => {
      setPredictions(status === window.google.maps.places.PlacesServiceStatus.OK && results ? results.slice(0, 5) : []);
    });
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(e.target.value), 300);
  };

  const handlePick = (prediction) => {
    if (!placesRef.current) return;
    placesRef.current.getDetails(
      { placeId: prediction.place_id, fields: ["place_id", "name", "formatted_address", "geometry"] },
      (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          onSelect({ name: place.name, formatted_address: place.formatted_address,
            lat: place.geometry.location.lat(), lng: place.geometry.location.lng(), place_id: place.place_id });
          setQuery(""); setPredictions([]);
        }
      }
    );
  };

  /* 선택된 상태 */
  if (selected) return (
    <div className="flex items-center gap-2 bg-coral-50 border border-coral-200 rounded-xl px-3 py-2">
      <svg className="w-3.5 h-3.5 text-coral-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span className="flex-1 text-xs font-semibold text-coral-700 truncate">{selected}</span>
      <button type="button" onClick={onClear}
        className="text-coral-400 hover:text-coral-600 text-xs font-bold transition-colors">
        ✕
      </button>
    </div>
  );

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        className="w-full bg-white border-[1.5px] border-gray-200 rounded-xl px-3 py-2
                   text-sm text-gray-800 placeholder-gray-400 outline-none
                   focus:border-coral-400 focus:ring-2 focus:ring-coral-400/20 transition-all"
      />
      <AnimatePresence>
        {predictions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-[400]
                       bg-white rounded-xl overflow-hidden border border-gray-100 shadow-glass"
          >
            {predictions.map((p) => (
              <div key={p.place_id}
                className="px-3 py-2.5 cursor-pointer hover:bg-coral-50 border-b border-gray-50 last:border-0 transition-colors"
                onMouseDown={() => handlePick(p)}
              >
                <p className="text-xs font-semibold text-gray-800">{p.structured_formatting.main_text}</p>
                <p className="text-[11px] text-gray-400 truncate">{p.structured_formatting.secondary_text}</p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
