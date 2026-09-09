import { useState, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import { Search, Loader2 } from "lucide-react";

export interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  isLoading?: boolean;
}

/**
 * SearchBar
 *
 * A self-contained, accessible search input that only fires
 * onSearch when the user presses Enter or clicks the search
 * button on the right — no live/debounced search-as-you-type.
 */
export default function SearchBar({
  placeholder = "Search...",
  onSearch = () => {},
  isLoading = false,
}: SearchBarProps) {
  const [query, setQuery] = useState<string>("");
  const [focused, setFocused] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const runSearch = () => {
    onSearch(query.trim());
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      runSearch();
    }
  };

  return (
    <div className="w-full max-w-md">
      <div
        className={`flex items-center gap-2 rounded-xl border bg-white pl-3 pr-1.5 py-1.5 shadow-sm transition-all
          ${
            focused
              ? "border-slate-900 ring-2 ring-slate-900/10"
              : "border-slate-200"
          }
        `}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          aria-label="Search"
          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />

        <button
          type="button"
          onClick={runSearch}
          disabled={isLoading}
          aria-label="Search"
          className="flex shrink-0 items-center justify-center rounded-lg bg-slate-900 px-3 py-1.5 text-white transition-colors hover:bg-slate-700 disabled:opacity-60"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
