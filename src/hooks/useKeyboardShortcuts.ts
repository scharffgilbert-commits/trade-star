import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const pageShortcuts: Record<string, string> = {
  "1": "/",
  "2": "/positions",
  "3": "/portfolio",
  "4": "/signals",
  "5": "/croc",
  "6": "/run",
};

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    (el as HTMLElement).isContentEditable
  );
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if modifier keys are pressed (except for Cmd+K handled elsewhere)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Skip if an input element is focused
      if (isInputFocused()) return;

      // Number keys 1-6: navigate to pages
      if (e.key in pageShortcuts) {
        e.preventDefault();
        navigate(pageShortcuts[e.key]);
        return;
      }

      // R key on /run page: reload (re-navigate to /run)
      if (e.key === "r" || e.key === "R") {
        if (location.pathname === "/run") {
          e.preventDefault();
          navigate("/run");
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigate, location.pathname]);
}
