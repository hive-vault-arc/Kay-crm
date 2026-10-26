"use client";

import { useSyncExternalStore } from "react";

const query = "(max-width: 830px)";
const subscribe = (changed: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", changed);
  return () => media.removeEventListener("change", changed);
};
const snapshot = () => window.matchMedia(query).matches;
const serverSnapshot = () => false;

export function usePhoneLayout() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
