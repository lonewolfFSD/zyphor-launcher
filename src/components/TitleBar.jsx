import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBug, faCircleInfo, faRotate, faCircleQuestion,
  faChevronDown, faArrowUpRightFromSquare,
  faSun, faCloud, faCloudSun, faCloudRain, faCloudShowersHeavy,
  faSnowflake, faBolt, faSmog, faCloudMoon, faMoon,
  faLocationDot, faClock,
} from '@fortawesome/free-solid-svg-icons';
import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js';

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '1.1.5';

/** Map WMO weather_code → { icon, color, label } */
function getWeatherMeta(code, isNight = false) {
  if (code === 0) {
    return isNight
      ? { icon: faMoon, color: '#a5b4fc', label: 'Clear' }
      : { icon: faSun, color: '#fbbf24', label: 'Clear' };
  }
  if (code === 1) {
    return isNight
      ? { icon: faCloudMoon, color: '#93c5fd', label: 'Mainly clear' }
      : { icon: faCloudSun, color: '#fcd34d', label: 'Mainly clear' };
  }
  if (code === 2) return { icon: faCloudSun, color: '#93c5fd', label: 'Partly cloudy' };
  if (code === 3) return { icon: faCloud, color: '#94a3b8', label: 'Overcast' };
  if (code === 45 || code === 48) return { icon: faSmog, color: '#a1a1aa', label: 'Fog' };
  if (code >= 51 && code <= 57) return { icon: faCloudRain, color: '#60a5fa', label: 'Drizzle' };
  if (code >= 61 && code <= 67) return { icon: faCloudRain, color: '#3b82f6', label: 'Rain' };
  if (code >= 71 && code <= 77) return { icon: faSnowflake, color: '#e0f2fe', label: 'Snow' };
  if (code >= 80 && code <= 82) return { icon: faCloudShowersHeavy, color: '#2563eb', label: 'Showers' };
  if (code >= 85 && code <= 86) return { icon: faSnowflake, color: '#bae6fd', label: 'Snow showers' };
  if (code >= 95) return { icon: faBolt, color: '#f59e0b', label: 'Thunderstorm' };
  return { icon: faCloud, color: '#94a3b8', label: '—' };
}

export default function TitleBar({ profile }) {
  const { settings } = useSettings();
  const theme       = THEMES[settings?.theme]  || THEMES.oled;
  const accent      = ACCENTS[settings?.accent] || ACCENTS.bulb;
  const [menuOpen, setMenuOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState(null); // { temp, code, place, humidity }
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [updateChecking, setUpdateChecking] = useState(false);
  // Same pattern as NavRail: enrich profile from Firestore so we get location
  const [resolvedLocation, setResolvedLocation] = useState(profile?.location ?? null);

  const isVip       = Boolean(profile?.isVip);
  const vipGold     = '#FDB515';
  const accentColor = isVip ? vipGold : accent.hex;

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch location from Firestore exactly like NavRail does (users/{uid}.location)
  useEffect(() => {
    if (!profile?.uid) {
      setResolvedLocation(profile?.location ?? null);
      return;
    }
    // Prefer prop first if already present
    if (profile.location && profile.location !== 'Classified' && profile.location !== 'Unknown') {
      setResolvedLocation(profile.location);
      return;
    }
    getDoc(doc(db, 'users', profile.uid))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const loc = data?.location || profile?.location || null;
          setResolvedLocation(loc);
        } else {
          setResolvedLocation(profile?.location ?? null);
        }
      })
      .catch(() => setResolvedLocation(profile?.location ?? null));
  }, [profile?.uid, profile?.location]);

  // Weather fetch via Open-Meteo (no API key) — uses resolvedLocation
  const fetchWeather = useCallback(async () => {
    const loc = resolvedLocation;
    if (!loc || loc === 'Classified' || loc === 'Unknown') {
      // Fallback: browser geolocation
      if (!navigator.geolocation) {
        setWeather(null);
        return;
      }
      setWeatherLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,relative_humidity_2m&timezone=auto`
            );
            const data = await res.json();
            if (data?.current) {
              setWeather({
                temp: Math.round(data.current.temperature_2m),
                code: data.current.weather_code,
                humidity: data.current.relative_humidity_2m,
                place: 'Nearby',
              });
            }
          } catch {
            setWeather(null);
          } finally {
            setWeatherLoading(false);
          }
        },
        () => {
          setWeatherLoading(false);
          setWeather(null);
        },
        { timeout: 8000, maximumAge: 600000 }
      );
      return;
    }

    setWeatherLoading(true);
    try {
      // Geocode city name (same string NavRail shows under Location)
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=1`
      );
      const geo = await geoRes.json();
      const place = geo?.results?.[0];
      if (!place) {
        setWeather(null);
        return;
      }

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,relative_humidity_2m&timezone=auto`
      );
      const data = await res.json();
      if (data?.current) {
        setWeather({
          temp: Math.round(data.current.temperature_2m),
          code: data.current.weather_code,
          humidity: data.current.relative_humidity_2m,
          place: place.name + (place.country_code ? `, ${place.country_code}` : ''),
        });
      }
    } catch (err) {
      console.warn('[TitleBar] weather fetch failed:', err);
      setWeather(null);
    } finally {
      setWeatherLoading(false);
    }
  }, [resolvedLocation]);

  useEffect(() => {
    fetchWeather();
    // Refresh weather every 30 min
    const id = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchWeather]);

  function openExternal(url) {
    if (window.launcherAPI?.openExternal) window.launcherAPI.openExternal(url);
    else window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function handleCheckUpdates() {
    setUpdateChecking(true);
    try {
      await window.launcherAPI?.checkForUpdates?.();
    } catch (e) {
      console.warn('Update check failed', e);
    } finally {
      setTimeout(() => setUpdateChecking(false), 1800);
    }
  }

  const hour = now.getHours();
  const isNight = hour < 6 || hour >= 20;
  const wMeta = weather ? getWeatherMeta(weather.code, isNight) : null;

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  const menuItems = [
    {
      icon: faBug,
      label: 'Report a bug',
      sub: 'Open GitHub issue',
      action: () => openExternal('https://github.com/zyphorstudios/launcher/issues/new?template=bug_report.md'),
    },
    {
      icon: faCircleQuestion,
      label: 'Help & support',
      sub: 'Docs and FAQs',
      action: () => openExternal('https://zyphorstudios.com/support'),
    },
    {
      icon: faDiscord,
      label: 'Join Discord',
      sub: 'Community server',
      action: () => openExternal('https://discord.gg/zyphor'),
    },
    { divider: true },
    {
      icon: faRotate,
      label: updateChecking ? 'Checking…' : 'Check for updates',
      sub: `Current: v${APP_VERSION}`,
      action: handleCheckUpdates,
    },
    {
      icon: faCircleInfo,
      label: 'About Zyphor Launcher',
      sub: 'Version info',
      action: () => window.launcherAPI?.openAbout?.() ?? openExternal('https://zyphorstudios.com'),
    },
  ];

  return (
    <div
      className="relative flex h-9 shrink-0 items-center justify-between border-b"
      style={{
        WebkitAppRegion: 'drag',
        backgroundColor: `${theme.surface}e0`,
        borderColor: theme.border,
        color: theme.text,
      }}
    >
      {/* Full-width accent underline */}
      <motion.div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[1px]"
        style={{ backgroundColor: accentColor }}
        initial={{ scaleX: 0, opacity: 0, transformOrigin: 'left' }}
        animate={{ scaleX: 1, opacity: isVip ? 0.55 : 0.25 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      />

      {/* Left — wordmark + menu trigger */}
      <div
        className="flex items-center gap-0 pl-3"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        {isVip && (
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="mr-2 text-[10px] select-none"
            style={{ color: vipGold }}
          >
            ✦
          </motion.span>
        )}

        {/* Clickable wordmark opens menu */}
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${accentColor}12`; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          className="flex items-center gap-2 rounded px-2 py-1 transition-all duration-150"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <span
            className="font-mono text-[11px] uppercase tracking-widest select-none"
            style={{ color: `${theme.text}77` }}
          >
            Zyphor Launcher
          </span>
          <span
            className="rounded px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-widest"
            style={{
              backgroundColor: `${accentColor}18`,
              color: accentColor,
              border: `1px solid ${accentColor}33`,
            }}
          >
            v{APP_VERSION}
          </span>
          <FontAwesomeIcon
            icon={faChevronDown}
            className="text-[9px] transition-transform duration-200 p-1.5 rounded"
            style={{
              color: `${theme.text}44`,
              backgroundColor: `${accentColor}18`,
              transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>

        {/* Dropdown menu */}
        <AnimatePresence>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                style={{ WebkitAppRegion: 'no-drag' }}
                onClick={() => setMenuOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="absolute left-3 top-full z-50 mt-1 min-w-[260px] overflow-hidden rounded-xl border shadow-2xl"
                style={{
                  backgroundColor: `${theme.surface}f8`,
                  borderColor: theme.border,
                  backdropFilter: 'blur(12px)',
                  WebkitAppRegion: 'no-drag',
                }}
              >
                <div
                  className="px-3 py-2.5 border-b"
                  style={{ borderColor: theme.border }}
                >
                  <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: `${theme.text}44` }}>
                    v{APP_VERSION}
                  </p>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: theme.text }}>
                    Zyphor Launcher
                  </p>
                </div>

                <div className="py-1">
                  {menuItems.map((item, i) =>
                    item.divider ? (
                      <div
                        key={i}
                        className="my-1 h-px mx-2"
                        style={{ backgroundColor: theme.border }}
                      />
                    ) : (
                      <button
                        key={i}
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2 transition-colors duration-100 text-left"
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${accentColor}12`; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        onClick={() => { item.action(); setMenuOpen(false); }}
                      >
                        <div
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${accentColor}18` }}
                        >
                          <FontAwesomeIcon
                            icon={item.icon}
                            className={`text-[11px] ${item.label.includes('Checking') ? 'animate-spin' : ''}`}
                            style={{ color: accentColor }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold leading-tight" style={{ color: theme.text }}>
                            {item.label}
                          </p>
                          <p className="text-[10px] leading-tight mt-0.5" style={{ color: `${theme.text}55` }}>
                            {item.sub}
                          </p>
                        </div>
                        <FontAwesomeIcon
                          icon={faArrowUpRightFromSquare}
                          className="ml-auto text-[9px] opacity-20 shrink-0"
                          style={{ color: theme.text }}
                        />
                      </button>
                    )
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Center — Time + Weather */}
      <div
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3 select-none"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        {/* Clock */}
        <div className="flex items-center gap-1.5">
          <FontAwesomeIcon icon={faClock} className="text-[10px]" style={{ color: `${theme.text}55` }} />
          <span className="font-mono text-[12px] font-semibold tabular-nums tracking-tight" style={{ color: theme.text }}>
            {timeStr}
          </span>
          <span className="text-[10px] opacity-40 hidden sm:inline" style={{ color: theme.text }}>
            {dateStr}
          </span>
        </div>

        <span className="h-3.5 w-px" style={{ backgroundColor: theme.border }} />

        {/* Weather */}
        <div className="flex items-center gap-1.5 min-w-[90px]">
          {weatherLoading ? (
            <span className="text-[10px] opacity-40 animate-pulse">Weather…</span>
          ) : weather && wMeta ? (
            <>
              <FontAwesomeIcon
                icon={wMeta.icon}
                className="text-[13px]"
                style={{ color: wMeta.color, filter: `drop-shadow(0 0 4px ${wMeta.color}66)` }}
                title={wMeta.label}
              />
              <span className="font-mono text-[12px] font-semibold tabular-nums" style={{ color: theme.text }}>
                {weather.temp}°
              </span>
              <span className="text-[10px] opacity-45 max-w-[90px] truncate hidden md:inline" title={weather.place}>
                {weather.place}
              </span>
            </>
          ) : (
            <span className="text-[10px] opacity-30 flex items-center gap-1">
              <FontAwesomeIcon icon={faLocationDot} className="text-[9px]" />
              No location
            </span>
          )}
        </div>
      </div>

      {/* Right — window controls */}
      <div
        className="flex items-center gap-0.5 pr-2"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <TitleBarButton label="Minimize" onClick={() => window.launcherAPI?.minimizeWindow?.()} accentColor={accentColor} theme={theme}>
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5">
            <rect x="0" y="4.5" width="10" height="1" fill="currentColor" />
          </svg>
        </TitleBarButton>

        <TitleBarButton label="Maximize" onClick={() => window.launcherAPI?.maximizeWindow?.()} accentColor={accentColor} theme={theme}>
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5">
            <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </TitleBarButton>

        <TitleBarButton label="Close" onClick={() => window.launcherAPI?.closeWindow?.()} accentColor={accentColor} theme={theme} danger>
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5">
            <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </TitleBarButton>
      </div>
    </div>
  );
}

function TitleBarButton({ children, label, onClick, danger = false, accentColor, theme }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-8 items-center justify-center rounded transition-all duration-150"
      style={{ color: `${theme.text}55` }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = danger ? 'rgba(185,50,50,0.55)' : `${accentColor}18`;
        e.currentTarget.style.color = danger ? '#ff8080' : accentColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.color = `${theme.text}55`;
      }}
    >
      {children}
    </button>
  );
}
