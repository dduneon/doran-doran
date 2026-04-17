import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function PlaceSearch({ onSelect, countryCode }) {
  const [query,       setQuery]       = useState("");
  const [predictions, setPredictions] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const autocompleteRef  = useRef(null);
  const placesRef        = useRef(null);
  const ghostRef         = useRef(null);
  const debounceRef      = useRef(null);
  const wrapperRef       = useRef(null);

  useEffect(() => {
    if (!window.google) return;
    autocompleteRef.current = new window.google.maps.places.AutocompleteService();
    ghostRef.current = document.createElement("div");
    placesRef.current = new window.google.maps.places.PlacesService(ghostRef.current);
  }, []);

  useEffect(() => { setPredictions([]); }, [countryCode]);

  useEffect(() => {
    const fn = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setPredictions([]); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const search = (input) => {
    if (!input.trim() || !autocompleteRef.current) { setPredictions([]); return; }
    setLoading(true);
    const params = { input, language: "ko" };
    if (countryCode) params.componentRestrictions = { country: countryCode };
    autocompleteRef.current.getPlacePredictions(params, (results, status) => {
      setLoading(false);
      setPredictions(status === window.google.maps.places.PlacesServiceStatus.OK && results ? results : []);
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
          onSelect(place);
          setQuery("");
          setPredictions([]);
        }
      }
    );
  };

  return (
    <div className="relative" ref={wrapperRef}>
      {/* 검색 입력 */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="장소 검색…"
          value={query}
          onChange={handleChange}
          className="input-glass pl-9 pr-4"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2
                          w-3.5 h-3.5 rounded-full border-2 border-gray-200 border-t-coral-500 animate-spin" />
        )}
      </div>

      {/* 검색 결과 드롭다운 */}
      <AnimatePresence>
        {predictions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.12 } }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.08 } }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-[300]
                       bg-white/95 backdrop-blur-xl rounded-2xl overflow-hidden
                       border border-gray-100 shadow-glass"
          >
            {predictions.map((p) => (
              <div
                key={p.place_id}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0
                           hover:bg-coral-50 cursor-pointer transition-colors duration-100 group"
                onMouseDown={() => handlePick(p)}
              >
                <div className="w-8 h-8 rounded-xl bg-gray-100 group-hover:bg-coral-100
                                flex items-center justify-center flex-shrink-0 transition-colors">
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-coral-500"
                    fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {p.structured_formatting.main_text}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {p.structured_formatting.secondary_text}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-coral-500 bg-coral-50 px-2 py-0.5 rounded-full
                                 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  추가
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && query && predictions.length === 0 && (
        <p className="absolute left-0 right-0 top-[calc(100%+6px)] text-xs text-gray-400
                      bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 border border-gray-100 shadow-float">
          검색 결과가 없습니다
        </p>
      )}
    </div>
  );
}
