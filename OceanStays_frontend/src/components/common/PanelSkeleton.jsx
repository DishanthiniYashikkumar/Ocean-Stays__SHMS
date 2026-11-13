/**
 * Placeholder rows for a panel whose data is still loading.
 *
 * @param {{ rows?: number }} props
 */
function PanelSkeleton({ rows = 3 }) {
  return (
    <div className="shms-panel-body" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="shms-skeleton-row">
          <div className="shms-skeleton shms-skeleton-title" />
          <div className="shms-skeleton shms-skeleton-text" />
        </div>
      ))}
    </div>
  );
}

export default PanelSkeleton;
