import { useId } from "react";

/**
 * Ocean Stays brand mark — a sun setting over two waves on a navy badge.
 *
 * Inline SVG (rather than an <img>) so it can animate: with `animated`, the
 * sun rises and the waves roll on first paint. Motion is CSS in
 * styles/motion.css and only runs inside [data-motion="on"] shells.
 * public/favicon.svg and public/logo-mark.svg are static copies of this art.
 *
 * The waves repeat every 32 units, so shifting them by 32 loops seamlessly.
 */
const BACK_WAVE = "M-32 40 q8 -5 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 V64 H-32 Z";
const FRONT_WAVE = "M-32 49 q8 4 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 V64 H-32 Z";

export function LogoMark({ size = 40, title, animated = false, className = "" }) {
  // useId() returns characters (":", "«") that break url(#id) references.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = { bg: `os-bg-${uid}`, sun: `os-sun-${uid}`, clip: `os-clip-${uid}` };
  const classes = ["shms-logo-mark", animated ? "is-animated" : "", className].filter(Boolean).join(" ");

  return (
    <svg
      className={classes}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={ids.bg} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#1b5089" />
          <stop offset="1" stopColor="#061529" />
        </linearGradient>
        <linearGradient id={ids.sun} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8e2ad" />
          <stop offset="1" stopColor="#e0a94f" />
        </linearGradient>
        <clipPath id={ids.clip}>
          <rect width="64" height="64" rx="15" />
        </clipPath>
      </defs>

      <rect width="64" height="64" rx="15" fill={`url(#${ids.bg})`} />
      <g clipPath={`url(#${ids.clip})`}>
        <circle className="shms-logo-sun" cx="32" cy="38" r="13" fill={`url(#${ids.sun})`} />
        <path className="shms-logo-wave shms-logo-wave-back" d={BACK_WAVE} fill="#2fb3a8" />
        <path className="shms-logo-wave shms-logo-wave-front" d={FRONT_WAVE} fill="#7dd8cf" />
      </g>
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="14.25" fill="none" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="1.5" />
    </svg>
  );
}

export default LogoMark;
