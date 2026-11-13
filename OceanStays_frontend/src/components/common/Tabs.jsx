/**
 * Pill filter tabs.
 *
 *   <Tabs tabs={[{ id: "all", label: "All", count: 12 }]} value={tab} onChange={setTab} />
 *
 * They filter a list in place rather than switch panels, so they are a group
 * of toggle buttons (`aria-pressed`) — the same semantics the pages used.
 *
 * @param {{
 *   tabs: Array<{ id: string, label: import("react").ReactNode, count?: number, icon?: string }>,
 *   value: string,
 *   onChange: (id: string) => void,
 *   label?: string,
 *   className?: string,
 *   style?: import("react").CSSProperties,
 * }} props
 */
function Tabs({ tabs, value, onChange, label = "Filter", className = "", style }) {
  return (
    <ul className={`shms-tabs ${className}`.trim()} style={style} aria-label={label}>
      {tabs.map((tab) => (
        <li key={tab.id}>
          <button
            type="button"
            className="shms-tab"
            aria-pressed={value === tab.id}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <i className={`bi ${tab.icon}`} aria-hidden="true" />}
            {tab.label}
            {tab.count !== undefined && tab.count !== null && (
              <span className="shms-tab-count">{tab.count}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default Tabs;
