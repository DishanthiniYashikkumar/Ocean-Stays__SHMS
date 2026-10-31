import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AvailabilitySearch from "../../components/public/AvailabilitySearch";
import RoomFilters from "../../components/public/RoomFilters";
import RoomCard from "../../components/common/RoomCard";
import RoomCardSkeleton from "../../components/common/RoomCardSkeleton";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import { useAsync } from "../../hooks/useAsync";
import { AMENITIES, getRoomTypeCounts, getRoomTypes } from "../../services/roomService";
import { formatCurrency } from "../../utils/format";
import "../../styles/rooms.css";

/**
 * Rooms listing.
 *
 * All filter state lives in the URL, so a filtered search is shareable,
 * survives a refresh, and carries through a login redirect on the way to
 * booking. `useAsync` refetches whenever the query changes.
 */

const SORT_OPTIONS = [
  { value: "", label: "Recommended" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Guest rating" },
  { value: "name", label: "Name (A–Z)" },
];

/** Counts per room type from the full catalogue, shown beside each filter. */
const TYPE_COUNTS = getRoomTypeCounts();

/** Typing pause before a search term is committed to the URL and refetched. */
const SEARCH_DEBOUNCE_MS = 350;

function Rooms() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // The input is uncontrolled by the URL so typing stays instant; the URL (and
  // therefore the fetch) catches up once the user pauses.
  const [searchInput, setSearchInput] = useState(() => searchParams.get("search") ?? "");
  const searchTimer = useRef(null);

  useEffect(() => () => clearTimeout(searchTimer.current), []);

  // A stable query object, so the fetch callback only changes when a filter does.
  const query = useMemo(
    () => ({
      search: searchParams.get("search") ?? "",
      type: searchParams.get("type") ?? "",
      guests: searchParams.get("guests") ?? "",
      minPrice: searchParams.get("minPrice") || undefined,
      maxPrice: searchParams.get("maxPrice") || undefined,
      amenities: searchParams.getAll("amenity"),
      checkIn: searchParams.get("checkIn") ?? "",
      checkOut: searchParams.get("checkOut") ?? "",
      sort: searchParams.get("sort") ?? "",
    }),
    [searchParams],
  );

  const load = useCallback(() => getRoomTypes(query), [query]);
  const { data: rooms, isLoading, error, isEmpty, reload } = useAsync(load);

  /** Writes one filter into the URL, dropping empty values so links stay tidy. */
  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams);

    if (key === "amenity") {
      next.delete("amenity");
      value.forEach((item) => next.append("amenity", item));
    } else if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }

    setSearchParams(next, { replace: true });
  }

  /** Updates the visible input immediately, the URL after a pause. */
  function handleSearchInput(value) {
    setSearchInput(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => updateParam("search", value), SEARCH_DEBOUNCE_MS);
  }

  /** Clearing is immediate — nobody wants to wait to undo a search. */
  function clearSearch() {
    clearTimeout(searchTimer.current);
    setSearchInput("");
    updateParam("search", "");
  }

  function clearFilters() {
    clearTimeout(searchTimer.current);
    setSearchInput("");

    const next = new URLSearchParams();
    // Dates are a search context, not a filter — they survive "clear all".
    ["checkIn", "checkOut"].forEach((key) => {
      const value = searchParams.get(key);
      if (value) next.set(key, value);
    });
    setSearchParams(next, { replace: true });
  }

  /* ---- Chips describing what's currently applied ------------------------ */
  const activeChips = useMemo(() => {
    const chips = [];
    if (query.search) chips.push({ key: "search", label: `“${query.search}”` });
    if (query.type) chips.push({ key: "type", label: query.type });
    if (query.guests) chips.push({ key: "guests", label: `${query.guests}+ guests` });
    if (query.minPrice) {
      chips.push({ key: "minPrice", label: `From ${formatCurrency(Number(query.minPrice))}` });
    }
    if (query.maxPrice) {
      chips.push({ key: "maxPrice", label: `Up to ${formatCurrency(Number(query.maxPrice))}` });
    }
    query.amenities.forEach((id) => {
      chips.push({ key: "amenity", value: id, label: AMENITIES[id]?.label ?? id });
    });
    return chips;
  }, [query]);

  function removeChip(chip) {
    if (chip.key === "amenity") {
      updateParam(
        "amenity",
        query.amenities.filter((id) => id !== chip.value),
      );
    } else if (chip.key === "search") {
      clearSearch();
    } else {
      updateParam(chip.key, "");
    }
  }

  // Preserve the search context when linking through to a room or booking.
  const contextParams = useMemo(() => {
    const context = new URLSearchParams();
    ["checkIn", "checkOut", "guests"].forEach((key) => {
      const value = searchParams.get(key);
      if (value) context.set(key, value);
    });
    const asString = context.toString();
    return asString ? `?${asString}` : "";
  }, [searchParams]);

  return (
    <>
      <header className="shms-page-head">
        <div className="shms-container">
          <ul className="shms-breadcrumb">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">Rooms</li>
          </ul>

          <h1>Rooms, Suites &amp; Villas</h1>
          <span className="shms-rule-gold" />
          <p>
            Every room at Ocean Stays faces water. Choose your view, your space and the level of
            privacy that suits how you travel.
          </p>
        </div>
      </header>

      <AvailabilitySearch
        inline
        initialValues={{
          checkIn: query.checkIn || undefined,
          checkOut: query.checkOut || undefined,
          guests: query.guests || 2,
        }}
      />

      <section className="shms-section shms-section-tight" aria-label="Available rooms">
        <div className="shms-container">
          <div className="shms-rooms-layout">
            <RoomFilters
              values={query}
              counts={TYPE_COUNTS}
              isOpen={isFilterOpen}
              onChange={updateParam}
              onClear={clearFilters}
            />

            <div>
              {/* ------------------------------------------- Results bar */}
              <div className="shms-results-bar">
                <p className="shms-results-count">
                  {isLoading ? (
                    "Checking availability…"
                  ) : (
                    <>
                      <strong>{rooms?.length ?? 0}</strong>{" "}
                      {rooms?.length === 1 ? "room type" : "room types"} available
                    </>
                  )}
                </p>

                <div className="shms-results-tools">
                  <button
                    type="button"
                    className="shms-btn shms-btn-outline shms-btn-sm shms-filters-toggle"
                    onClick={() => setIsFilterOpen((open) => !open)}
                    aria-expanded={isFilterOpen}
                  >
                    <i className="bi bi-sliders" aria-hidden="true" />
                    Filters
                  </button>

                  <div className="shms-room-search">
                    <i className="bi bi-search shms-input-icon" aria-hidden="true" />
                    <input
                      type="search"
                      className="shms-input"
                      placeholder="Search rooms"
                      value={searchInput}
                      onChange={(event) => handleSearchInput(event.target.value)}
                      aria-label="Search rooms by name or description"
                    />
                    {searchInput && (
                      <button
                        type="button"
                        className="shms-room-search-clear"
                        onClick={clearSearch}
                        aria-label="Clear search"
                      >
                        <i className="bi bi-x-lg" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  <div className="shms-results-sort">
                    <label htmlFor="room-sort">Sort</label>
                    <select
                      id="room-sort"
                      className="shms-input shms-input-bare"
                      value={query.sort}
                      onChange={(event) => updateParam("sort", event.target.value)}
                    >
                      {SORT_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ---------------------------------------- Active filters */}
              {activeChips.length > 0 && (
                <ul className="shms-active-filters">
                  {activeChips.map((chip) => (
                    <li key={`${chip.key}-${chip.value ?? ""}`} className="shms-active-chip">
                      {chip.label}
                      <button
                        type="button"
                        onClick={() => removeChip(chip)}
                        aria-label={`Remove filter: ${chip.label}`}
                      >
                        <i className="bi bi-x-lg" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* ----------------------------------------------- Results */}
              {error ? (
                <ErrorState
                  title="We couldn't load our rooms"
                  message={error.message}
                  onRetry={reload}
                />
              ) : isEmpty ? (
                <EmptyState
                  title="No rooms match those filters"
                  message="Try widening your price range, reducing the guest count, or clearing a filter or two."
                  icon="bi-search"
                >
                  <button type="button" className="shms-btn shms-btn-primary" onClick={clearFilters}>
                    Clear all filters
                  </button>
                </EmptyState>
              ) : (
                <div className="shms-grid shms-grid-3">
                  {isLoading ? (
                    <RoomCardSkeleton count={6} />
                  ) : (
                    rooms.map((room) => (
                      <RoomCard key={room.id} room={room} searchParams={contextParams} />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Rooms;
