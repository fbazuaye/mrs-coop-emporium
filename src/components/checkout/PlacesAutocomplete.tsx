import { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";

export type PlacesAutocompleteProps = {
  value: string;
  onChange: (text: string) => void;
  onSelect?: (place: { description: string; placeId: string }) => void;
  placeholder?: string;
  country?: string; // ISO 3166-1 alpha-2, e.g. "ng"
};

export function PlacesAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  country = "ng",
}: PlacesAutocompleteProps) {
  const listId = useId();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<
    Array<{ description: string; placeId: string }>
  >([]);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(async (g) => {
        await g.maps.importLibrary("places");
        if (cancelled) return;
        sessionTokenRef.current = new g.maps.places.AutocompleteSessionToken();
        setReady(true);
      })
      .catch(() => setReady(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const fetchSuggestions = (input: string) => {
    if (!ready || !input || input.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const places = (await google.maps.importLibrary(
          "places",
        )) as google.maps.PlacesLibrary;
        const { suggestions: results } =
          await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input,
            sessionToken: sessionTokenRef.current ?? undefined,
            includedRegionCodes: [country],
          });
        const mapped = results
          .map((s) => s.placePrediction)
          .filter((p): p is google.maps.places.PlacePrediction => !!p)
          .map((p) => ({
            description: p.text?.toString() ?? "",
            placeId: p.placeId,
          }))
          .filter((s) => s.description);
        setSuggestions(mapped);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          fetchSuggestions(e.target.value);
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        autoComplete="off"
        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-ring/30"
      />
      {loading && (
        <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-popover p-1 shadow-premium"
        >
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => {
                  onChange(s.description);
                  onSelect?.(s);
                  setOpen(false);
                  setSuggestions([]);
                }}
                className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{s.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
