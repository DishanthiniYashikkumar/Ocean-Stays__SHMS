import { getStatusMeta } from "../../utils/status";

/**
 * Renders a status as a consistently coloured badge.
 *
 *   <StatusBadge status={booking.status} domain="booking" />
 *   <StatusBadge status={room.status} domain="room" />
 *
 * The colour comes from utils/status.js, so no call site ever picks one.
 *
 * @param {{
 *   status: string,
 *   domain?: "booking"|"payment"|"room"|"request"|"priority"|"user",
 *   className?: string
 * }} props
 */
function StatusBadge({ status, domain = "booking", className = "" }) {
  const { label, tone } = getStatusMeta(status, domain);

  return (
    <span className={`shms-badge shms-badge-${tone} ${className}`.trim()}>
      {label}
    </span>
  );
}

export default StatusBadge;
