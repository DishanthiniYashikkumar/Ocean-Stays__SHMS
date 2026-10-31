import { useId, useMemo, useState } from "react";
import EmptyState from "./EmptyState";
import ErrorState from "./ErrorState";
import "../../styles/table.css";

/**
 * Sortable, searchable, paginated table with a toolbar.
 *
 * Search, sort and pagination all run **client-side** over the `rows` handed
 * in. That is a deliberate choice for this dataset: sorting only the current
 * page of a server-paginated list silently lies to the user, so pages fetch the
 * full set and let this component slice it. When real volumes make that
 * impractical the services already return a `{ items, page, total, totalPages }`
 * envelope from `apiClient.paginate()` — move sort and page into the query and
 * pass `rows` straight through.
 *
 * Search is not debounced, because filtering an in-memory array is immediate;
 * a delay here would only add lag.
 *
 * @param {{
 *   columns: Array<{
 *     key: string,
 *     header: string,
 *     render?: (row) => React.ReactNode,
 *     sortValue?: (row) => string|number,   Defaults to row[key]
 *     align?: "left"|"right"|"center",
 *     sortable?: boolean
 *   }>,
 *   rows: Array<object>,
 *   rowKey: (row) => string,
 *   isLoading?: boolean,
 *   error?: Error|null,
 *   onRetry?: () => void,
 *   emptyState?: { title, message, icon, children },
 *   searchable?: boolean,
 *   searchPlaceholder?: string,
 *   searchKeys?: string[],          Fields matched by the search box
 *   filters?: Array<{ id, label, value, options: Array<{value,label}>, onChange }>,
 *   toolbarEnd?: React.ReactNode,   e.g. a "New reservation" button
 *   pageSize?: number,
 *   caption?: string                Accessible description of the table
 * }} props
 */

const DEFAULT_PAGE_SIZE = 10;

function compare(a, b) {
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

function DataTable({
  columns,
  rows = [],
  rowKey,
  isLoading = false,
  error = null,
  onRetry,
  emptyState,
  searchable = true,
  searchPlaceholder = "Search",
  searchKeys = [],
  filters = [],
  toolbarEnd,
  pageSize = DEFAULT_PAGE_SIZE,
  caption,
}) {
  const uid = useId();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: null, direction: "asc" });
  const [page, setPage] = useState(1);

  /* ---- Filter ----------------------------------------------------------- */
  const searched = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term || searchKeys.length === 0) return rows;

    return rows.filter((row) =>
      searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(term)),
    );
  }, [rows, search, searchKeys]);

  /* ---- Sort ------------------------------------------------------------- */
  const sorted = useMemo(() => {
    if (!sort.key) return searched;

    const column = columns.find((item) => item.key === sort.key);
    const valueOf = column?.sortValue ?? ((row) => row[sort.key]);

    // Copy first: the rows array belongs to the caller.
    return [...searched].sort((a, b) => {
      const result = compare(valueOf(a), valueOf(b));
      return sort.direction === "asc" ? result : -result;
    });
  }, [searched, sort, columns]);

  /* ---- Paginate --------------------------------------------------------- */
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  // A filter that shrinks the list can strand the user past the last page.
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const visible = sorted.slice(start, start + pageSize);

  function toggleSort(key) {
    setPage(1);
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  }

  function handleSearch(value) {
    setSearch(value);
    setPage(1);
  }

  const hasToolbar = searchable || filters.length > 0 || Boolean(toolbarEnd);

  /* ---- Toolbar ---------------------------------------------------------- */
  const toolbar = hasToolbar && (
    <div className="shms-table-toolbar">
      {searchable && (
        <div className="shms-table-search">
          <i className="bi bi-search shms-input-icon" aria-hidden="true" />
          <input
            type="search"
            className="shms-input"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => handleSearch(event.target.value)}
            aria-label={searchPlaceholder}
          />
          {search && (
            <button
              type="button"
              className="shms-table-search-clear"
              onClick={() => handleSearch("")}
              aria-label="Clear search"
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {filters.map(({ id, label, value, options, onChange }) => (
        <div className="shms-table-filter" key={id}>
          <label htmlFor={`${uid}-${id}`}>{label}</label>
          <select
            id={`${uid}-${id}`}
            className="shms-input shms-input-bare"
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
              setPage(1);
            }}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {toolbarEnd && <div className="shms-table-toolbar-end">{toolbarEnd}</div>}
    </div>
  );

  /* ---- States ----------------------------------------------------------- */
  if (error) {
    return (
      <div className="shms-table-wrap">
        {toolbar}
        <ErrorState message={error.message} onRetry={onRetry} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="shms-table-wrap">
        {toolbar}
        <div className="shms-table-skeleton" aria-hidden="true">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="shms-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="shms-table-wrap">
        {toolbar}
        <EmptyState
          title={emptyState?.title ?? (search ? "Nothing matches that search" : "Nothing here yet")}
          message={
            emptyState?.message ??
            (search ? "Try a different term, or clear the search." : undefined)
          }
          icon={emptyState?.icon ?? (search ? "bi-search" : "bi-inbox")}
        >
          {search ? (
            <button
              type="button"
              className="shms-btn shms-btn-outline"
              onClick={() => handleSearch("")}
            >
              Clear search
            </button>
          ) : (
            emptyState?.children
          )}
        </EmptyState>
      </div>
    );
  }

  /* ---- Table ------------------------------------------------------------ */
  return (
    <div className="shms-table-wrap">
      {toolbar}

      <table className="shms-table">
        {caption && <caption className="visually-hidden">{caption}</caption>}

        <thead>
          <tr>
            {columns.map((column) => {
              const isSorted = sort.key === column.key;
              const ariaSort = !column.sortable
                ? undefined
                : isSorted
                  ? sort.direction === "asc"
                    ? "ascending"
                    : "descending"
                  : "none";

              return (
                <th
                  key={column.key}
                  scope="col"
                  className={column.align ? `is-${column.align}` : undefined}
                  aria-sort={ariaSort}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      className="shms-th-sort"
                      onClick={() => toggleSort(column.key)}
                    >
                      {column.header}
                      <i
                        className={`bi ${
                          isSorted
                            ? sort.direction === "asc"
                              ? "bi-arrow-up"
                              : "bi-arrow-down"
                            : "bi-arrow-down-up"
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {visible.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  // Becomes the row label once the table stacks on mobile.
                  data-label={column.header}
                  className={column.align ? `is-${column.align}` : undefined}
                >
                  {column.render ? column.render(row) : (row[column.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <nav className="shms-pagination" aria-label="Pagination">
          <p className="shms-pagination-count">
            Showing <strong>{start + 1}</strong>–
            <strong>{Math.min(start + pageSize, sorted.length)}</strong> of{" "}
            <strong>{sorted.length}</strong>
          </p>

          <div className="shms-pagination-controls">
            <button
              type="button"
              className="shms-page-btn"
              onClick={() => setPage(safePage - 1)}
              disabled={safePage === 1}
              aria-label="Previous page"
            >
              <i className="bi bi-chevron-left" aria-hidden="true" />
            </button>

            {Array.from({ length: totalPages }, (_, index) => index + 1)
              // Show first, last, and a window around the current page.
              .filter(
                (number) =>
                  number === 1 ||
                  number === totalPages ||
                  Math.abs(number - safePage) <= 1,
              )
              .map((number, index, shown) => (
                <span key={number} style={{ display: "contents" }}>
                  {index > 0 && number - shown[index - 1] > 1 && (
                    <span className="shms-page-gap" aria-hidden="true">
                      …
                    </span>
                  )}
                  <button
                    type="button"
                    className="shms-page-btn"
                    onClick={() => setPage(number)}
                    aria-current={number === safePage ? "page" : undefined}
                    aria-label={`Page ${number}`}
                  >
                    {number}
                  </button>
                </span>
              ))}

            <button
              type="button"
              className="shms-page-btn"
              onClick={() => setPage(safePage + 1)}
              disabled={safePage === totalPages}
              aria-label="Next page"
            >
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

export default DataTable;
