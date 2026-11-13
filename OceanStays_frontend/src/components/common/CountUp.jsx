import { useEffect, useRef, useState } from "react";
import { useMotion } from "../../hooks/useMotion";

/**
 * Counts a figure up from zero the first time it scrolls into view.
 *
 * Accepts numbers or strings with one number inside — "70", "4.8", "4.71%",
 * "LKR 67.5K", "1,250" — and keeps the prefix, suffix, decimals and thousands
 * separators. Anything else ("Not staying") renders as-is, as does everything
 * in the admin panel or under reduced motion.
 */
const PATTERN = /^(\D*?)(-?\d[\d,]*(?:\.\d+)?)(\D*)$/;

function parse(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const text = String(value);
    return { prefix: "", target: value, decimals: (text.split(".")[1] ?? "").length, grouped: false, suffix: "" };
  }
  if (typeof value !== "string") return null;
  const match = value.match(PATTERN);
  if (!match) return null;
  const [, prefix, number, suffix] = match;
  return {
    prefix,
    target: Number(number.replace(/,/g, "")),
    decimals: (number.split(".")[1] ?? "").length,
    grouped: number.includes(","),
    suffix,
  };
}

function format(parts, current) {
  const fixed = current.toFixed(parts.decimals);
  const [whole, fraction] = fixed.split(".");
  const wholeText = parts.grouped ? Number(whole).toLocaleString("en-US") : whole;
  return `${parts.prefix}${wholeText}${fraction ? `.${fraction}` : ""}${parts.suffix}`;
}

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

function CountUp({ value, duration = 1000 }) {
  const animate = useMotion();
  const parts = parse(value);
  const ref = useRef(null);
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState(false);
  const enabled = animate && parts !== null && parts.target !== 0;

  useEffect(() => {
    if (!enabled) return undefined;
    const element = ref.current;
    let frame = 0;
    let start = 0;

    const tick = (time) => {
      if (!start) start = time;
      const progress = Math.min(1, (time - start) / duration);
      setCurrent(parts.target * easeOutCubic(progress));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
      else setDone(true);
    };

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        frame = window.requestAnimationFrame(tick);
      }
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [enabled, parts?.target, duration]);

  if (!enabled || done) return <span ref={ref}>{value}</span>;
  return (
    <span ref={ref} aria-label={String(value)}>
      <span aria-hidden="true">{format(parts, current)}</span>
    </span>
  );
}

export default CountUp;
