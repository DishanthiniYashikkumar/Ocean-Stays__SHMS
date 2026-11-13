import { useEffect } from "react";
import { prefersReducedMotion } from "./useMotion";

/**
 * Fades content up as it scrolls into view, without per-page markup.
 *
 * Elements matching REVEAL_SELECTOR inside `rootRef` get `shms-reveal` (added
 * here, from JS, so nothing is ever hidden without JS or under reduced motion),
 * then `is-visible` when they enter the viewport. Siblings are staggered via
 * the --reveal-i variable. Once the entrance has played, both classes are
 * removed so the element's own hover/transition styles apply untouched.
 * Content that arrives later (after a fetch) is picked up by a MutationObserver.
 */
const REVEAL_SELECTOR = [
  ".shms-section-head",
  ".shms-heading",
  ".shms-page-head",
  ".shms-grid > *",
  ".shms-about > *",
  ".shms-room-card",
  ".shms-facility-card",
  ".shms-experience-card",
  ".shms-testimonial-card",
  ".shms-gallery-item",
  ".shms-location > *",
  ".shms-cta",
  ".shms-panel",
  ".shms-stat",
  ".shms-hk-task",
  ".shms-card",
].join(",");

const SKIP_INSIDE = ".shms-modal, [role='dialog'], .shms-notify-panel, .shms-hero, [data-no-reveal]";
const DURATION_MS = 620;
const STAGGER_MS = 70;
const MAX_STAGGER = 6;

export default function useScrollReveal(rootRef, { enabled = true, key } = {}) {
  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root || prefersReducedMotion() || !("IntersectionObserver" in window)) return undefined;

    const tracked = new WeakSet();
    const timers = new Set();

    const finish = (element, delay) => {
      const timer = window.setTimeout(() => {
        element.classList.remove("shms-reveal", "is-visible");
        element.style.removeProperty("--reveal-i");
        timers.delete(timer);
      }, DURATION_MS + delay + 60);
      timers.add(timer);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target;
          observer.unobserve(element);
          element.classList.add("is-visible");
          const index = Number(element.style.getPropertyValue("--reveal-i")) || 0;
          finish(element, index * STAGGER_MS);
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );

    const scan = () => {
      root.querySelectorAll(REVEAL_SELECTOR).forEach((element) => {
        if (tracked.has(element)) return;
        tracked.add(element);
        if (element.closest(SKIP_INSIDE)) return;
        // Only the outermost match animates; nested matches ride along with it.
        if (element.parentElement?.closest(".shms-reveal")) return;
        const siblings = element.parentElement ? Array.from(element.parentElement.children) : [element];
        element.style.setProperty("--reveal-i", String(Math.min(siblings.indexOf(element), MAX_STAGGER)));
        element.classList.add("shms-reveal");
        observer.observe(element);
      });
    };

    scan();
    let frame = 0;
    const mutations = new MutationObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(scan);
    });
    mutations.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [rootRef, enabled, key]);
}
