import { useContext } from "react";
import { MotionContext } from "../context/motionContext";

export function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** True when the current shell animates and the user hasn't asked for less motion. */
export function useMotion() {
  return useContext(MotionContext) && !prefersReducedMotion();
}

export default useMotion;
