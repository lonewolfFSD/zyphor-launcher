import { useEffect, useCallback } from 'react';

const NAV_PAGES = ['home', 'news', 'friends', 'achievements', 'screenshots'];

/**
 * useHotkeys — global keyboard shortcuts for Zyphor Launcher
 *
 * Navigation
 *   Ctrl+1–5         → Home / News / Friends / Achievements / Screenshots
 *   Ctrl+,           → Settings
 *   Ctrl+Tab         → Cycle through nav pages forward
 *   Ctrl+Shift+Tab   → Cycle through nav pages backward
 *   F11              → Toggle fullscreen
 *   Escape           → Handled per-page (modals etc.) — no-op here
 *
 * Launcher actions
 *   Ctrl+P           → Play / stop game  (calls onPlay)
 *   Ctrl+R           → Refresh current page  (calls onRefresh)
 *   Ctrl+Shift+S     → Open screenshots folder  (calls onOpenFolder)
 *
 * Friends page
 *   Ctrl+F           → Focus search input (only when on friends page)
 *
 * Screenshots page
 *   Ctrl+A           → Select all screenshots  (calls onSelectAll)
 *   Ctrl+D           → Deselect all  (calls onDeselectAll)
 *   Delete           → Delete selected  (calls onDeleteSelected)
 *
 * Account
 *   Ctrl+Shift+A     → Toggle account popover  (calls onToggleAccount)
 *   Ctrl+Shift+C     → Copy UID to clipboard  (calls onCopyUid)
 *
 * Appearance
 *   Ctrl+Shift+D     → Cycle theme  (calls onCycleTheme)
 *   Ctrl+Shift+L     → Toggle liquid glass  (calls onToggleLiquidGlass)
 *   Ctrl+`           → Toggle dev info overlay  (calls onToggleDevInfo)
 */
export function useHotkeys({
  activePage,
  navigateTo,
  onPlay,
  onRefresh,
  onOpenFolder,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
  onToggleAccount,
  onCopyUid,
  onCycleTheme,
  onCycleAccent,
  onToggleLiquidGlass,
  onToggleDevInfo,
}) {
  const handle = useCallback((e) => {
    const ctrl  = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const key   = e.key;

    // ── Skip if typing in an input ──────────────────────────────────────────
    const tag = document.activeElement?.tagName;
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      || document.activeElement?.isContentEditable;

    // Allow Escape + F11 even in inputs
    if (isInput && key !== 'Escape' && key !== 'F11') return;

    // ── Navigation: Ctrl+1–5 ────────────────────────────────────────────────
    if (ctrl && !shift && key >= '1' && key <= '5') {
      e.preventDefault();
      const page = NAV_PAGES[parseInt(key) - 1];
      if (page) navigateTo(page);
      return;
    }

    // ── Navigation: Ctrl+, → Settings ───────────────────────────────────────
    if (ctrl && !shift && key === ',') {
      e.preventDefault();
      navigateTo('settings');
      return;
    }

    // ── Navigation: Ctrl+Tab / Ctrl+Shift+Tab — cycle pages ─────────────────
    if (ctrl && key === 'Tab') {
      e.preventDefault();
      const idx = NAV_PAGES.indexOf(activePage);
      const safeIdx = idx === -1 ? 0 : idx;  // ← add this fallback
      const next = shift
        ? (safeIdx - 1 + NAV_PAGES.length) % NAV_PAGES.length
        : (safeIdx + 1) % NAV_PAGES.length;
      navigateTo(NAV_PAGES[next]);
      return;
    }

    // ── F11 → fullscreen toggle ──────────────────────────────────────────────
    if (key === 'F11') {
      e.preventDefault();
      window.launcherAPI?.toggleFullscreen?.();
      return;
    }

    // ── Ctrl+P → play/stop ──────────────────────────────────────────────────
    if (ctrl && !shift && key === 'p') {
      e.preventDefault();
      onPlay?.();
      return;
    }

    // ── Ctrl+R → refresh ────────────────────────────────────────────────────
    if (ctrl && !shift && key === 'r') {
      e.preventDefault();
      onRefresh?.();
      return;
    }

    // ── Ctrl+F → focus search (friends page only) ───────────────────────────
    if (ctrl && !shift && key === 'f' && activePage === 'friends') {
      e.preventDefault();
      document.querySelector('input[type="text"]')?.focus();
      return;
    }

    // ── Ctrl+Shift+S → open screenshots folder ──────────────────────────────
    if (ctrl && shift && key === 'S') {
      e.preventDefault();
      onOpenFolder?.();
      return;
    }

    if (ctrl && shift && key === 'E') {
      e.preventDefault();
      onCycleAccent?.();
      return;
    }

    // ── Screenshots page only ────────────────────────────────────────────────
    if (activePage === 'screenshots') {
      if (ctrl && !shift && key === 'a') {
        e.preventDefault();
        onSelectAll?.();
        return;
      }
      if (ctrl && !shift && key === 'd') {
        e.preventDefault();
        onDeselectAll?.();
        return;
      }
      if (key === 'Delete' && !ctrl && !shift) {
        e.preventDefault();
        onDeleteSelected?.();
        return;
      }
    }

    // ── Ctrl+Shift+A → toggle account popover ───────────────────────────────
    if (ctrl && shift && key === 'A') {
      e.preventDefault();
      onToggleAccount?.();
      return;
    }

    // ── Ctrl+Shift+C → copy UID ─────────────────────────────────────────────
    if (ctrl && shift && key === 'C') {
      e.preventDefault();
      onCopyUid?.();
      return;
    }

    // ── Ctrl+Shift+D → cycle theme ──────────────────────────────────────────
    if (ctrl && shift && key === 'D') {
      e.preventDefault();
      onCycleTheme?.();
      return;
    }

    // ── Ctrl+Shift+L → toggle liquid glass ──────────────────────────────────
    if (ctrl && shift && key === 'L') {
      e.preventDefault();
      onToggleLiquidGlass?.();
      return;
    }

    // ── Ctrl+` → toggle dev info overlay ────────────────────────────────────
    if (ctrl && (key === '`' || key === 'Dead')) {
      e.preventDefault();
      onToggleDevInfo?.();
      return;
    }
  }, [
    activePage, navigateTo, onPlay, onRefresh, onOpenFolder,
    onSelectAll, onDeselectAll, onDeleteSelected,
    onToggleAccount, onCopyUid, onCycleTheme, onCycleAccent, onToggleLiquidGlass, onToggleDevInfo,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [handle]);
}