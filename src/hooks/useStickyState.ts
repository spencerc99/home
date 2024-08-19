import { useState, useEffect } from "react";

export function useStickyState<T = any>(
  key: string,
  defaultValue: T,
  onUpdateCallback?: (value: T) => void
): [T, (value: T) => void] {
  const [value, setValue] = useState(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
    onUpdateCallback?.(value);
  }, [key, value]);
  return [value, setValue];
}
