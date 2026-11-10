"use client";

import { useEffect } from "react";
import Lenis from "lenis";

type ScrollOwner = Window | HTMLElement;

const owners = '.kay-project-grid, [data-slot="table-container"], .kay-drawer-body';
const modal = '[data-slot="sheet-content"], [data-slot="dialog-content"], [data-slot="alert-dialog-content"]';
const nativeScroll = 'input, textarea, select, [contenteditable], [data-native-scroll], .kay-filter-rail, .kay-record-panel, .kay-record-aside, .kay-kanban-scroll, .kay-kanban-body, .kay-calendar-week, .kay-calendar-day-events, .kay-calendar-agenda, .kay-calendar-by-type, .kay-menu';

export function useWorkspaceWheel(pathname: string) {
  useEffect(() => {
    const desktop = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const controllers = new Map<ScrollOwner, Lenis>();
    const listeners = new AbortController();
    const capture = { capture: true, signal: listeners.signal };
    let animationFrame = 0;
    let ownerFrame = 0;

    function tick(time: number) {
      animationFrame = 0;
      for (const controller of controllers.values()) controller.raf(time);
      if ([...controllers.values()].some(controller => controller.isScrolling === "smooth")) animationFrame = requestAnimationFrame(tick);
    }

    function wake() {
      if (animationFrame) return;
      for (const controller of controllers.values()) controller.raf(performance.now());
      animationFrame = requestAnimationFrame(tick);
    }

    function interrupt() {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      for (const controller of controllers.values()) {
        if (controller.isScrolling !== "smooth") continue;
        controller.stop();
        controller.start();
      }
    }

    function add(owner: ScrollOwner) {
      const controller = new Lenis({
        wrapper: owner,
        content: owner instanceof HTMLElement ? owner : document.documentElement,
        duration: .6,
        lerp: 0,
        easing: progress => 1 - (1 - progress) ** 3,
        allowNestedScroll: true,
        virtualScroll({ event, deltaX, deltaY }) {
          if (!desktop.matches || !(event instanceof WheelEvent) || event.defaultPrevented || event.ctrlKey || event.shiftKey || Math.abs(deltaX) >= Math.abs(deltaY)) return false;
          const target = event.target;
          if (!(target instanceof Element) || target.closest(nativeScroll)) return false;
          if (owner === window && (!target.closest(".kay-shell") || document.querySelector(modal))) return false;
          const nested = target.closest<HTMLElement>(owners);
          if (nested && nested !== owner && controllers.has(nested)) return false;
          // Content can grow without changing a bounded table or drawer's own size.
          if (!controller.isScrolling) controller.resize();
          if (!controller.limit) return false;
          wake();
          return true;
        },
      });
      controllers.set(owner, controller);
    }

    function reconcile() {
      ownerFrame = 0;
      const next = new Set<ScrollOwner>();
      if (desktop.matches) {
        next.add(window);
        document.querySelectorAll<HTMLElement>(owners).forEach(element => {
          if (element.clientHeight && element.scrollHeight > element.clientHeight + 1 && /^(auto|scroll)$/.test(getComputedStyle(element).overflowY)) next.add(element);
        });
      }
      for (const [owner, controller] of controllers) {
        if (next.has(owner)) continue;
        controller.destroy();
        controllers.delete(owner);
      }
      for (const owner of next) if (!controllers.has(owner)) add(owner);
    }

    function schedule() {
      if (ownerFrame || !desktop.matches) return;
      ownerFrame = requestAnimationFrame(reconcile);
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector(modal) && controllers.get(window)?.isScrolling === "smooth") interrupt();
      schedule();
    });
    function syncPreference() {
      interrupt();
      cancelAnimationFrame(ownerFrame);
      observer.disconnect();
      if (desktop.matches) observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-state", "hidden"] });
      reconcile();
    }

    desktop.addEventListener("change", syncPreference, { signal: listeners.signal });
    window.addEventListener("resize", () => { interrupt(); schedule(); }, { signal: listeners.signal });
    for (const event of ["keydown", "pointerdown", "focusin", "dragstart", "pagehide"]) window.addEventListener(event, interrupt, capture);
    syncPreference();

    return () => {
      listeners.abort();
      observer.disconnect();
      cancelAnimationFrame(ownerFrame);
      interrupt();
      for (const controller of controllers.values()) controller.destroy();
    };
  }, [pathname]);
}
