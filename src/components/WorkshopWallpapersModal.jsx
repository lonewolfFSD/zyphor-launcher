import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSteam } from '@fortawesome/free-brands-svg-icons';
import {
  Search,
  Check,
  ExternalLink,
  X,
  RefreshCw,
  Film,
  Upload,
  FolderDown,
  AlertCircle,
  FileVideo,
  Image as ImageIcon,
  CheckCircle2,
  Lock,
  Globe,
  Users,
  SlidersHorizontal,
  Download,
} from 'lucide-react';

const AVAILABLE_TAGS = [
  'All',
  'Anime',
  'Cyberpunk',
  'Gaming',
  'Nature',
  'Sci-Fi',
  'Ambient',
  'Lo-Fi',
  '4K',
  'STAY: Possession • Obsession • Permanence',
  'Minimal',
];

const SORT_OPTIONS = [
  { id: 'trend', label: 'Trending' },
  { id: 'popularity', label: 'Most Popular' },
  { id: 'newest', label: 'Most Recent' },
];

export default function WorkshopWallpapersModal({
  isOpen,
  onClose,
  profile,
  currentWorkshopId,
  onApplyWallpaper,
  onResetActiveBackground,
  theme,
  accent,
}) {
  const [activeTab, setActiveTab] = useState('discover'); // 'discover' | 'subscribed' | 'publish'
  const [steamRunning, setSteamRunning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [subscribedItems, setSubscribedItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [selectedSort, setSelectedSort] = useState('trend');

  // Item states mapping: id -> { isSubscribed, isInstalled, isDownloading, progress, videoPath }
  const [itemStates, setItemStates] = useState({});
  const [actionInProgress, setActionInProgress] = useState({});

  // Publish Form State
  const [pubVideoPath, setPubVideoPath] = useState('');
  const [pubVideoInfo, setPubVideoInfo] = useState(null); // { sizeMB, isTooLarge, name }
  const [pubPreviewPath, setPubPreviewPath] = useState('');
  const [pubTitle, setPubTitle] = useState('');
  const [pubDesc, setPubDesc] = useState('');
  const [pubTags, setPubTags] = useState(['Gaming']);
  const [pubVisibility, setPubVisibility] = useState(0); // 0 = Public, 1 = Friends, 2 = Private
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState(null);
  const [modalNotification, setModalNotification] = useState(null); // { type: 'error' | 'success', message: '' }

  // NSFW Safety Scan State
  const [nsfwScan, setNsfwScan] = useState({
    isScanning: false,
    isNsfw: false,
    reason: null,
    imageNsfw: false,
    videoNsfw: false,
  });

  const runNsfwCheck = useCallback(async (type, filePath) => {
    if (!filePath || !window.launcherAPI?.workshop?.checkNsfw) return;
    setNsfwScan((prev) => ({
      ...prev,
      isScanning: true,
      reason: null,
      ...(type === 'image' ? { imageNsfw: false } : { videoNsfw: false }),
    }));

    try {
      const res = await window.launcherAPI.workshop.checkNsfw(
        type === 'image' ? { imagePath: filePath } : { videoPath: filePath }
      );
      if (res?.isNsfw) {
        setNsfwScan((prev) => {
          const nextImgNsfw = type === 'image' ? true : prev.imageNsfw;
          const nextVidNsfw = type === 'video' ? true : prev.videoNsfw;
          return {
            isScanning: false,
            isNsfw: true,
            imageNsfw: nextImgNsfw,
            videoNsfw: nextVidNsfw,
            reason: res.reason || 'Adult or sexually explicit content detected. Prohibited on Steam Workshop.',
          };
        });
      } else {
        setNsfwScan((prev) => {
          const nextImgNsfw = type === 'image' ? false : prev.imageNsfw;
          const nextVidNsfw = type === 'video' ? false : prev.videoNsfw;
          return {
            ...prev,
            isScanning: false,
            imageNsfw: nextImgNsfw,
            videoNsfw: nextVidNsfw,
            isNsfw: nextImgNsfw || nextVidNsfw,
            reason: nextImgNsfw || nextVidNsfw ? prev.reason : null,
          };
        });
      }
    } catch (err) {
      console.error('[Workshop] NSFW check error:', err);
      setNsfwScan((prev) => ({ ...prev, isScanning: false }));
    }
  }, []);

  useEffect(() => {
    if (!modalNotification) return;
    const t = setTimeout(() => setModalNotification(null), 4000);
    return () => clearTimeout(t);
  }, [modalNotification]);

  const pollIntervalRef = useRef(null);
  const activePollersRef = useRef(new Map());
  const autoApplyIdsRef = useRef(new Set());

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      activePollersRef.current.forEach((timer) => clearInterval(timer));
      activePollersRef.current.clear();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  // Theme tokens
  const bgColor = theme?.bg || '#0d1117';
  const surfaceColor = theme?.surface || '#161b22';
  const borderColor = theme?.border || 'rgba(255, 255, 255, 0.1)';
  const accentColor = accent?.hex || '#38bdf8';
  const accentOnColor = accent?.on || '#000000';

  // Check Steam status
  useEffect(() => {
    if (!isOpen) return;
    async function checkSteam() {
      try {
        const res = await window.launcherAPI?.steam?.getStatus?.();
        setSteamRunning(Boolean(res?.initialized));
      } catch {
        setSteamRunning(false);
      }
    }
    checkSteam();
  }, [isOpen]);

  // Load Discover Items from Steam UGC
  const loadDiscoverItems = useCallback(async () => {
    if (!window.launcherAPI?.workshop?.getItems) return;
    setLoading(true);
    try {
      const res = await window.launcherAPI.workshop.getItems({
        page,
        count: 18,
        search: searchQuery.trim(),
        tag: selectedTag === 'All' ? undefined : selectedTag,
        sort: selectedSort,
      });

      if (res?.ok) {
        setItems(res.items || []);
        setTotalCount(res.totalResults || res.items?.length || 0);

        // Fetch state for each item
        const states = {};
        for (const it of res.items || []) {
          try {
            const st = await window.launcherAPI.workshop.getItemState(it.publishedFileId);
            states[it.publishedFileId] = st;
          } catch {}
        }
        setItemStates((prev) => ({ ...prev, ...states }));
      } else {
        setItems([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('[Workshop] loadDiscoverItems error:', err);
      setItems([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, selectedTag, selectedSort]);

  // Load Subscribed Items from Steam UGC
  const loadSubscribedItems = useCallback(async () => {
    if (!window.launcherAPI?.workshop?.getSubscribedItems) return;
    setLoading(true);
    try {
      const res = await window.launcherAPI.workshop.getSubscribedItems();
      if (res?.ok) {
        setSubscribedItems(res.items || []);
        const states = {};
        for (const it of res.items || []) {
          try {
            const st = await window.launcherAPI.workshop.getItemState(it.publishedFileId);
            states[it.publishedFileId] = st;
          } catch {}
        }
        setItemStates((prev) => ({ ...prev, ...states }));
      } else {
        setSubscribedItems([]);
      }
    } catch (err) {
      console.error('[Workshop] loadSubscribedItems error:', err);
      setSubscribedItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !steamRunning) return;
    if (activeTab === 'discover') {
      loadDiscoverItems();
    } else if (activeTab === 'subscribed') {
      loadSubscribedItems();
    }
  }, [isOpen, steamRunning, activeTab, loadDiscoverItems, loadSubscribedItems]);

  // Apply wallpaper handler
  const handleApplyWallpaper = useCallback(async (item, knownVideoPath = null) => {
    if (!item) return;
    const id = item.publishedFileId;
    let videoPath = knownVideoPath || itemStates[id]?.videoPath;

    if (!videoPath) {
      setActionInProgress((p) => ({ ...p, [id]: true }));
      try {
        const st = await window.launcherAPI?.workshop?.getItemState?.(id);
        if (st?.videoPath) {
          videoPath = st.videoPath;
          setItemStates((p) => ({ ...p, [id]: st }));
        }
      } catch (err) {
        console.error('[Workshop] Failed to query item state for apply:', err);
      } finally {
        setActionInProgress((p) => ({ ...p, [id]: false }));
      }
    }

    if (!videoPath) {
      console.warn('[Workshop] Cannot apply wallpaper: videoPath not found for item', id);
      return;
    }

    console.log('[Workshop] Applying wallpaper:', item.title, videoPath);
    onApplyWallpaper?.(item, videoPath);

    if (profile?.uid) {
      setDoc(doc(db, 'users', profile.uid), { activeWallpaperId: id }, { merge: true }).catch((err) => {
        console.warn('[Workshop] Failed to persist activeWallpaperId:', err);
      });
    }
  }, [itemStates, onApplyWallpaper, profile?.uid]);

  // Subscribe & apply handler
  const handleSubscribeAndApply = useCallback(async (item) => {
    if (!item) return;
    const id = item.publishedFileId;
    const currentState = itemStates[id];

    // If already installed and local video path exists, apply immediately
    if (currentState?.isInstalled && currentState?.videoPath) {
      return handleApplyWallpaper(item, currentState.videoPath);
    }

    // Mark action in progress & immediately set downloading visual state
    setActionInProgress((p) => ({ ...p, [id]: true }));
    autoApplyIdsRef.current.add(id);

    setItemStates((p) => ({
      ...p,
      [id]: {
        ...(p[id] || {}),
        isDownloading: true,
        downloadProgress: { percent: 0, current: '0', total: '0' },
      },
    }));

    try {
      const subRes = await window.launcherAPI?.workshop?.subscribe?.(id);
      if (subRes && subRes.ok === false) {
        throw new Error(subRes.error || 'Failed to subscribe. Item may have been deleted on Steam.');
      }

      const dlRes = await window.launcherAPI?.workshop?.downloadItem?.(id, true);
      if (dlRes && dlRes.ok === false) {
        throw new Error(dlRes.error || 'Failed to start Steam download.');
      }

      // Start focused polling for this item
      if (activePollersRef.current.has(id)) {
        clearInterval(activePollersRef.current.get(id));
      }

      const startTime = Date.now();
      const timer = setInterval(async () => {
        try {
          const st = await window.launcherAPI?.workshop?.getItemState?.(id);
          if (st) {
            setItemStates((p) => ({ ...p, [id]: st }));

            if (st.isInstalled && st.videoPath) {
              clearInterval(timer);
              activePollersRef.current.delete(id);
              setActionInProgress((p) => ({ ...p, [id]: false }));

              if (autoApplyIdsRef.current.has(id)) {
                autoApplyIdsRef.current.delete(id);
                handleApplyWallpaper(item, st.videoPath);
              }
              loadSubscribedItems();
              return;
            }
          }

          // 90 second safety timeout
          if (Date.now() - startTime > 90000) {
            clearInterval(timer);
            activePollersRef.current.delete(id);
            setActionInProgress((p) => ({ ...p, [id]: false }));
            autoApplyIdsRef.current.delete(id);
            setItemStates((p) => ({
              ...p,
              [id]: { ...(p[id] || {}), isDownloading: false },
            }));
            setModalNotification({
              type: 'error',
              message: 'Download timed out. Please check Steam client connection.',
            });
          }
        } catch (err) {
          console.error('[Workshop] Download polling error:', err);
        }
      }, 500);

      activePollersRef.current.set(id, timer);
    } catch (err) {
      console.error('[Workshop] Subscribe/Apply error:', err);
      setActionInProgress((p) => ({ ...p, [id]: false }));
      autoApplyIdsRef.current.delete(id);
      setItemStates((p) => ({
        ...p,
        [id]: { ...(p[id] || {}), isDownloading: false },
      }));
      setModalNotification({
        type: 'error',
        message: err.message || 'Subscription failed. Item may have been deleted on Steam.',
      });
      loadDiscoverItems();
    }
  }, [itemStates, handleApplyWallpaper, loadSubscribedItems, loadDiscoverItems]);

  // Background download poller for any other downloading items
  useEffect(() => {
    const downloadingIds = Object.keys(itemStates).filter(
      (id) => itemStates[id]?.isDownloading && !activePollersRef.current.has(id)
    );
    if (!downloadingIds.length) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    if (!pollIntervalRef.current) {
      pollIntervalRef.current = setInterval(async () => {
        for (const id of downloadingIds) {
          try {
            const st = await window.launcherAPI?.workshop?.getItemState?.(id);
            if (st) {
              setItemStates((p) => ({ ...p, [id]: st }));
              if (st.isInstalled && st.videoPath) {
                if (autoApplyIdsRef.current.has(id)) {
                  autoApplyIdsRef.current.delete(id);
                  const currentItem =
                    items.find((i) => i.publishedFileId === id) ||
                    subscribedItems.find((i) => i.publishedFileId === id);
                  if (currentItem) {
                    handleApplyWallpaper(currentItem, st.videoPath);
                  }
                }
              }
            }
          } catch {}
        }
      }, 1000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [itemStates, items, subscribedItems, handleApplyWallpaper]);

  // Unsubscribe handler
  async function handleUnsubscribe(item) {
    if (!item) return;
    const id = item.publishedFileId;
    setActionInProgress((p) => ({ ...p, [id]: true }));
    try {
      const res = await window.launcherAPI?.workshop?.unsubscribe?.(id);
      if (res && res.ok === false) {
        throw new Error(res.error || 'Failed to unsubscribe.');
      }

      // Immediately remove from subscribed items list
      setSubscribedItems((prev) => prev.filter((it) => it.publishedFileId !== id));

      // Reset state for this item
      setItemStates((prev) => ({
        ...prev,
        [id]: {
          isSubscribed: false,
          isInstalled: false,
          isDownloading: false,
          downloadProgress: null,
          videoPath: null,
          localVideoPath: null,
        },
      }));

      // If active background was this item, reset to default and clear in Firestore
      if (currentWorkshopId === id) {
        onResetActiveBackground?.();
        if (profile?.uid) {
          setDoc(doc(db, 'users', profile.uid), { activeWallpaperId: null }, { merge: true }).catch((err) => {
            console.warn('[Workshop] Failed to clear activeWallpaperId in Firestore:', err);
          });
        }
        setModalNotification({
          type: 'info',
          message: `Unsubscribed and removed "${item.title}". Active background reset to default.`,
        });
      } else {
        setModalNotification({
          type: 'success',
          message: `Unsubscribed and deleted "${item.title}" from local disk.`,
        });
      }

      // Reload discover list in background to sync state
      loadDiscoverItems();
    } catch (err) {
      console.error('[Workshop] Unsubscribe error:', err);
      setModalNotification({
        type: 'error',
        message: err.message || 'Failed to unsubscribe.',
      });
    } finally {
      setActionInProgress((p) => ({ ...p, [id]: false }));
    }
  }

  // Publish flow
  async function handlePickVideo() {
    try {
      const p = await window.launcherAPI?.workshop?.pickVideoFile?.();
      if (p) {
        setPubVideoPath(p);
        runNsfwCheck('video', p);
        // Query video size and limits
        if (window.launcherAPI?.workshop?.getFileInfo) {
          const info = await window.launcherAPI.workshop.getFileInfo(p);
          if (info?.ok) {
            setPubVideoInfo(info);
          } else {
            setPubVideoInfo(null);
          }
        }
      }
    } catch (err) {
      console.error('Pick video error:', err);
    }
  }

  async function handlePickPreview() {
    try {
      const p = await window.launcherAPI?.workshop?.pickImageFile?.();
      if (p) {
        setPubPreviewPath(p);
        runNsfwCheck('image', p);
      }
    } catch (err) {
      console.error('Pick image error:', err);
    }
  }

  async function handlePublishSubmit(e) {
    e.preventDefault();
    if (!pubVideoPath || !pubPreviewPath || !pubTitle.trim() || !pubDesc.trim()) {
      setPublishStatus({ error: 'Video file, preview image, title, and description are all required.' });
      return;
    }

    if (pubVideoInfo?.isTooLarge) {
      setPublishStatus({
        error: `Selected video is ${pubVideoInfo.sizeMB} MB. Video loop size must not exceed 100 MB.`,
      });
      return;
    }

    if (nsfwScan.isScanning) {
      setPublishStatus({
        error: 'Please wait for the TensorFlow safety scan to finish before uploading.',
      });
      return;
    }

    if (nsfwScan.isNsfw) {
      setPublishStatus({
        error: nsfwScan.reason || 'Upload blocked: NSFW or adult content detected.',
      });
      return;
    }

    setPublishing(true);
    setPublishStatus(null);

    try {
      const res = await window.launcherAPI.workshop.publishItem({
        videoPath: pubVideoPath,
        previewImagePath: pubPreviewPath,
        title: pubTitle.trim(),
        description: pubDesc.trim(),
        tags: pubTags,
        visibility: pubVisibility,
      });

      if (res.ok) {
        setPublishStatus({ success: "Published successfully! Steam File ID: " + res.publishedFileId });
        const uploadedVideoPath = pubVideoPath;
        setPubVideoPath('');
        setPubVideoInfo(null);
        setPubPreviewPath('');
        setPubTitle('');
        setPubDesc('');
        setNsfwScan({ isScanning: false, isNsfw: false, reason: null, imageNsfw: false, videoNsfw: false });

        // Live injection so user sees their new background immediately without relaunching
        if (res.item) {
          setItems((prev) => [res.item, ...prev.filter((i) => i.publishedFileId !== res.publishedFileId)]);
          setSubscribedItems((prev) => [res.item, ...prev.filter((i) => i.publishedFileId !== res.publishedFileId)]);
          setItemStates((prev) => ({
            ...prev,
            [res.publishedFileId]: {
              isSubscribed: true,
              isInstalled: true,
              isDownloading: false,
              videoPath: res.item.videoPath || uploadedVideoPath,
            },
          }));
        }

        setTimeout(() => {
          setActiveTab('subscribed');
          loadDiscoverItems();
          loadSubscribedItems();
        }, 1000);
      } else {
        setPublishStatus({ error: res.error || 'Failed to publish to Steam Workshop.' });
      }
    } catch (err) {
      setPublishStatus({ error: err.message || 'Unexpected publish error' });
    } finally {
      setPublishing(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.16 }}
        className="relative flex flex-col w-full max-w-5xl h-[86vh] rounded-xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: bgColor,
          borderColor: borderColor,
        }}
      >
        {/* Header Bar */}
        <div
          className="flex items-center justify-between border-b px-6 py-5"
          style={{
            backgroundColor: surfaceColor,
            borderColor: borderColor,
          }}
        >
          <div className="flex items-center gap-3">
            {/* Font Awesome Steam Logo with Theme Accent Coloring */}

              <FontAwesomeIcon icon={faSteam} className="text-4xl" />

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-display font-bold tracking-wide text-white">Steam Workshop Backgrounds</h2>
              </div>
              <p className="text-xs text-zinc-400">
                Browse and apply community-made video loops directly from Steam
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2">
            <div
              className="flex rounded-lg border p-1"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                borderColor: borderColor,
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('discover')}
                className="flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-display font-semibold tracking-wide transition-colors"
                style={{
                  backgroundColor: activeTab === 'discover' ? accentColor : 'transparent',
                  color: activeTab === 'discover' ? accentOnColor : '#a1a1aa',
                }}
              >
                <Search className="h-3.5 w-3.5" />
                Browse Workshop
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('subscribed')}
                className="flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-display font-semibold tracking-wide transition-colors"
                style={{
                  backgroundColor: activeTab === 'subscribed' ? accentColor : 'transparent',
                  color: activeTab === 'subscribed' ? accentOnColor : '#a1a1aa',
                }}
              >
                <FolderDown className="h-3.5 w-3.5" />
                Subscribed
                {subscribedItems.length > 0 && (
                  <span
                    className="ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-mono"
                    style={{
                      backgroundColor: activeTab === 'subscribed' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
                      color: activeTab === 'subscribed' ? accentOnColor : '#e4e4e7',
                    }}
                  >
                    {subscribedItems.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('publish')}
                className="flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-display font-semibold tracking-wide transition-colors"
                style={{
                  backgroundColor: activeTab === 'publish' ? accentColor : 'transparent',
                  color: activeTab === 'publish' ? accentOnColor : '#a1a1aa',
                }}
              >
                <Upload className="h-3.5 w-3.5" />
                Upload Background
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border text-zinc-400 hover:text-white transition-colors"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderColor: borderColor,
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Steam Offline Warning */}
        {!steamRunning && (
          <div className="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/10 px-6 py-2.5 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400" />
              <span>Steam is not currently running. Please launch the Steam client to browse and download backgrounds.</span>
            </div>
            <button
              type="button"
              onClick={async () => {
                const res = await window.launcherAPI?.steam?.getStatus?.();
                setSteamRunning(Boolean(res?.initialized));
              }}
              className="flex items-center gap-1 rounded bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-200 hover:bg-amber-500/30"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}

        {/* Notification Banner */}
        <AnimatePresence>
          {modalNotification && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`px-6 py-2.5 text-xs font-medium border-b flex items-center justify-between ${
                modalNotification.type === 'error'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalNotification.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setModalNotification(null)}
                className="text-white/60 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: BROWSE WORKSHOP */}
          {activeTab === 'discover' && (
            <div className="flex flex-col gap-5">
              {/* Search & Sort Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search Steam Workshop backgrounds…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadDiscoverItems()}
                    className="w-full rounded-lg border pl-9 pr-8 py-2 text-xs text-white placeholder:text-zinc-500 outline-none transition-colors"
                    style={{
                      backgroundColor: surfaceColor,
                      borderColor: borderColor,
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); loadDiscoverItems(); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div
                  className="flex items-center gap-2 rounded-lg border px-3 py-1.5"
                  style={{
                    backgroundColor: surfaceColor,
                    borderColor: borderColor,
                  }}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="text-xs text-zinc-400">Sort:</span>
                  <select
                    value={selectedSort}
                    onChange={(e) => setSelectedSort(e.target.value)}
                    className="bg-transparent text-xs font-medium text-white outline-none cursor-pointer"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} style={{ backgroundColor: surfaceColor, color: '#fff' }}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Refresh Button */}
                <button
                  type="button"
                  onClick={() => loadDiscoverItems()}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: surfaceColor,
                    borderColor: borderColor,
                  }}
                  title="Reload backgrounds directly from Steam"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {/* Tag Filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                {AVAILABLE_TAGS.map((tag) => {
                  const isSelected = selectedTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => { setSelectedTag(tag); setPage(1); }}
                      className="rounded-md px-3 py-1 text-xs font-medium transition-colors border"
                      style={{
                        backgroundColor: isSelected ? accentColor : 'rgba(255, 255, 255, 0.05)',
                        color: isSelected ? accentOnColor : '#a1a1aa',
                        borderColor: isSelected ? accentColor : borderColor,
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

              {/* Grid: Loading / Empty / Items */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 py-8">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-lg border h-56 flex flex-col p-3 gap-3"
                      style={{
                        backgroundColor: surfaceColor,
                        borderColor: borderColor,
                      }}
                    >
                      <div className="bg-white/10 rounded-md w-full h-32" />
                      <div className="bg-white/10 rounded h-4 w-3/4" />
                      <div className="bg-white/10 rounded h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                /* Authentic Clean Steam Empty State with Theme Accent Icon */
                <div
                  className="flex flex-col items-center justify-center rounded-xl border py-16 px-6 text-center"
                  style={{
                    backgroundColor: surfaceColor + '88',
                    borderColor: borderColor,
                  }}
                >
                  <h3 className="text-lg font-display font-semibold tracking-wide text-white">No Workshop Backgrounds Found</h3>
                  <p className="text-sm text-zinc-400 max-w-md mt-1 mb-5">
                    {searchQuery
                      ? 'No workshop items matched "' + searchQuery + '". Try a different search term or filter.'
                      : 'There are currently no backgrounds uploaded to the Steam Workshop for this title.'}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('publish')}
                      className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-display font-semibold tracking-wide transition-all hover:brightness-110 active:scale-98 shadow-sm"
                      style={{
                        backgroundColor: accentColor,
                        color: accentOnColor,
                      }}
                    >
                      Upload the First Background
                    </button>
                    <button
                      type="button"
                      onClick={() => window.launcherAPI?.openExternal?.('https://steamcommunity.com/app/4956550/workshop/')}
                      className="flex items-center gap-1.5 rounded-xl border px-6 py-3 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderColor: borderColor,
                      }}
                    >
                      Open Steam Workshop
                    </button>
                  </div>
                </div>
              ) : (
                /* Real Steam Items Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {items.map((item) => {
                    const st = itemStates[item.publishedFileId] || {};
                    const isCurrent = currentWorkshopId === item.publishedFileId;
                    const inProgress = Boolean(actionInProgress[item.publishedFileId]);
                    const isDownloading = Boolean(st.isDownloading || inProgress);
                    const progressPercent = st.downloadProgress?.percent || 0;
                    let downloadSizeInfo = '';
                    try {
                      if (st.downloadProgress?.total && Number(st.downloadProgress.total) > 0) {
                        const curMB = (Number(st.downloadProgress.current) / (1024 * 1024)).toFixed(1);
                        const totMB = (Number(st.downloadProgress.total) / (1024 * 1024)).toFixed(1);
                        downloadSizeInfo = `${curMB} / ${totMB} MB`;
                      }
                    } catch {}

                    return (
                      <div
                        key={item.publishedFileId}
                        className="flex flex-col rounded-lg border overflow-hidden transition-all shadow-sm"
                        style={{
                          backgroundColor: surfaceColor,
                          borderColor: borderColor,
                        }}
                      >
                        {/* Thumbnail Viewport */}
                        <div className="relative w-full aspect-video bg-black/60 overflow-hidden">
                          {item.previewUrl ? (
                            <img
                              src={item.previewUrl}
                              alt={item.title}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-zinc-600">
                              <Film className="h-8 w-8" />
                            </div>
                          )}

                          {isCurrent && (
                            <div
                              className="absolute top-2 right-2 flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow"
                              style={{
                                backgroundColor: accentColor,
                                color: accentOnColor,
                              }}
                            >
                              <Check className="h-3 w-3" />
                              Active
                            </div>
                          )}

                          {/* Live Download Progress Overlay */}
                          {isDownloading && (
                            <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-[2px] flex flex-col gap-1.5 transition-all">
                              <div className="flex items-center justify-between text-[10px] font-medium text-white/90">
                                <span className="flex items-center gap-1.5">
                                  <RefreshCw className="h-2.5 w-2.5 animate-spin" style={{ color: accentColor }} />
                                  {progressPercent > 0 ? `Downloading ${progressPercent}%` : 'Starting download…'}
                                </span>
                                {downloadSizeInfo && (
                                  <span className="text-[9px] text-zinc-400 font-mono">{downloadSizeInfo}</span>
                                )}
                              </div>
                              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${Math.max(6, progressPercent)}%`,
                                    backgroundColor: accentColor,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Info */}
                        <div className="flex flex-col flex-1 p-3.5 justify-between gap-3">
                          <div>
                            <h4 className="text-xs font-display font-semibold tracking-wide text-white truncate" title={item.title}>
                              {item.title}
                            </h4>
                            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                              by {item.ownerName || 'Community Creator'}
                            </p>
                          </div>

                          {/* Action Button */}
                          <div
                            className="flex items-center justify-between gap-2 pt-2 border-t"
                            style={{ borderColor: borderColor }}
                          >
                            <span className="text-[10px] text-zinc-500">
                              {item.subscriptions ? item.subscriptions + ' subs' : 'Steam UGC'}
                            </span>

                            {isCurrent ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={inProgress || isDownloading}
                                  onClick={() => handleUnsubscribe(item)}
                                  className="text-[11px] text-rose-400/80 hover:text-rose-300 transition-colors disabled:opacity-50"
                                  title="Unsubscribe and delete from disk"
                                >
                                  Unsubscribe
                                </button>
                                <span
                                  className="text-[11px] font-semibold flex items-center gap-1"
                                  style={{ color: accentColor }}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" /> In Use
                                </span>
                              </div>
                            ) : isDownloading ? (
                              <button
                                type="button"
                                disabled
                                className="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium border opacity-90 cursor-wait"
                                style={{
                                  backgroundColor: accentColor + '20',
                                  color: accentColor,
                                  borderColor: accentColor + '40',
                                }}
                              >
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                {progressPercent > 0 ? `${progressPercent}%` : 'Downloading…'}
                              </button>
                            ) : st.isInstalled ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={inProgress || isDownloading}
                                  onClick={() => handleUnsubscribe(item)}
                                  className="text-[11px] text-rose-400/80 hover:text-rose-300 transition-colors disabled:opacity-50"
                                  title="Unsubscribe and delete from disk"
                                >
                                  Unsubscribe
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApplyWallpaper(item, st.videoPath)}
                                  className="flex items-center gap-1.5 rounded-md px-3.5 py-1 text-xs font-semibold transition-all hover:brightness-110 shadow-sm"
                                  style={{
                                    backgroundColor: accentColor,
                                    color: accentOnColor,
                                  }}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Apply
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSubscribeAndApply(item)}
                                className="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors border hover:brightness-110"
                                style={{
                                  backgroundColor: accentColor + '18',
                                  color: accentColor,
                                  borderColor: accentColor + '35',
                                }}
                              >
                                <Download className="h-3 w-3" />
                                Subscribe & Apply
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SUBSCRIBED */}
          {activeTab === 'subscribed' && (
            <div className="flex flex-col gap-4">
              {loading ? (
                <div className="flex justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-zinc-500" />
                </div>
              ) : subscribedItems.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center rounded-xl border py-16 px-6 text-center"
                  style={{
                    backgroundColor: surfaceColor + '88',
                    borderColor: borderColor,
                  }}
                >
                  <FolderDown className="h-8 w-8 text-zinc-500 mb-2" />
                  <h3 className="text-base font-display font-semibold tracking-wide text-white">No Subscribed Backgrounds</h3>
                  <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-4">
                    You have not subscribed to any Workshop backgrounds yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('discover')}
                    className="rounded-lg px-4 py-2 text-xs font-display font-semibold tracking-wide transition-all hover:brightness-110 shadow-sm"
                    style={{
                      backgroundColor: accentColor,
                      color: accentOnColor,
                    }}
                  >
                    Browse Workshop
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: borderColor }}>
                    <p className="text-xs text-zinc-400">
                      {subscribedItems.length} subscribed {subscribedItems.length === 1 ? 'background' : 'backgrounds'}
                    </p>
                    <button
                      type="button"
                      onClick={() => loadSubscribedItems()}
                      disabled={loading}
                      className="flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
                      style={{
                        backgroundColor: surfaceColor,
                        borderColor: borderColor,
                      }}
                      title="Reload subscribed backgrounds from Steam"
                    >
                      <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {subscribedItems.map((item) => {
                    const st = itemStates[item.publishedFileId] || {};
                    const isCurrent = currentWorkshopId === item.publishedFileId;
                    const inProgress = Boolean(actionInProgress[item.publishedFileId]);
                    const isDownloading = Boolean(st.isDownloading || inProgress);
                    const progressPercent = st.downloadProgress?.percent || 0;
                    let downloadSizeInfo = '';
                    try {
                      if (st.downloadProgress?.total && Number(st.downloadProgress.total) > 0) {
                        const curMB = (Number(st.downloadProgress.current) / (1024 * 1024)).toFixed(1);
                        const totMB = (Number(st.downloadProgress.total) / (1024 * 1024)).toFixed(1);
                        downloadSizeInfo = `${curMB} / ${totMB} MB`;
                      }
                    } catch {}

                    return (
                      <div
                        key={item.publishedFileId}
                        className="flex flex-col rounded-lg border overflow-hidden shadow-sm"
                        style={{
                          backgroundColor: surfaceColor,
                          borderColor: borderColor,
                        }}
                      >
                        <div className="relative w-full aspect-video bg-black/60 overflow-hidden">
                          {item.previewUrl ? (
                            <img src={item.previewUrl} alt={item.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-zinc-600">
                              <Film className="h-8 w-8" />
                            </div>
                          )}
                          {isCurrent && (
                            <div
                              className="absolute top-2 right-2 flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase shadow"
                              style={{
                                backgroundColor: accentColor,
                                color: accentOnColor,
                              }}
                            >
                              <Check className="h-3 w-3" />
                              Active
                            </div>
                          )}

                          {/* Live Download Progress Overlay */}
                          {isDownloading && (
                            <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/95 via-black/80 to-transparent backdrop-blur-[2px] flex flex-col gap-1.5 transition-all">
                              <div className="flex items-center justify-between text-[10px] font-medium text-white/90">
                                <span className="flex items-center gap-1.5">
                                  <RefreshCw className="h-2.5 w-2.5 animate-spin" style={{ color: accentColor }} />
                                  {progressPercent > 0 ? `Downloading ${progressPercent}%` : 'Starting download…'}
                                </span>
                                {downloadSizeInfo && (
                                  <span className="text-[9px] text-zinc-400 font-mono">{downloadSizeInfo}</span>
                                )}
                              </div>
                              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${Math.max(6, progressPercent)}%`,
                                    backgroundColor: accentColor,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col flex-1 p-3.5 justify-between gap-3">
                          <div>
                            <h4 className="text-xs font-display font-semibold tracking-wide text-white truncate">{item.title}</h4>
                            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                              {isDownloading ? 'Downloading…' : st.isInstalled ? 'Installed locally' : 'Ready to download'}
                            </p>
                          </div>

                          <div
                            className="flex items-center justify-between gap-2 pt-2 border-t"
                            style={{ borderColor: borderColor }}
                          >
                            <button
                              type="button"
                              disabled={inProgress || isDownloading}
                              onClick={() => handleUnsubscribe(item)}
                              className="text-[11px] text-rose-400/80 hover:text-rose-300 transition-colors disabled:opacity-50"
                            >
                              Unsubscribe
                            </button>

                            {isCurrent ? (
                              <span
                                className="text-[11px] font-semibold flex items-center gap-1"
                                style={{ color: accentColor }}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" /> In Use
                              </span>
                            ) : isDownloading ? (
                              <button
                                type="button"
                                disabled
                                className="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium border opacity-90 cursor-wait"
                                style={{
                                  backgroundColor: accentColor + '20',
                                  color: accentColor,
                                  borderColor: accentColor + '40',
                                }}
                              >
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                {progressPercent > 0 ? `${progressPercent}%` : 'Downloading…'}
                              </button>
                            ) : st.isInstalled ? (
                              <button
                                type="button"
                                onClick={() => handleApplyWallpaper(item, st.videoPath)}
                                className="flex items-center gap-1.5 rounded-md px-3.5 py-1 text-xs font-semibold transition-all hover:brightness-110 shadow-sm"
                                style={{
                                  backgroundColor: accentColor,
                                  color: accentOnColor,
                                }}
                              >
                                <Check className="h-3.5 w-3.5" />
                                Apply
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSubscribeAndApply(item)}
                                className="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors border hover:brightness-110"
                                style={{
                                  backgroundColor: accentColor + '18',
                                  color: accentColor,
                                  borderColor: accentColor + '35',
                                }}
                              >
                                <Download className="h-3 w-3" />
                                Download & Apply
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            </div>
          )}

          {/* TAB 3: PUBLISH BACKGROUND */}
          {activeTab === 'publish' && (
            <div className="max-w-2xl mx-auto py-4">
              <form onSubmit={handlePublishSubmit} className="flex flex-col gap-4">
                <div className="border-b pb-3" style={{ borderColor: borderColor }}>
                  <h3 className="text-xl font-display font-bold tracking-wide text-white mt-6">Publish Background to Steam Workshop</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Upload an animated video background (.mp4 or .webm) for other players to use.
                  </p>
                </div>

                {publishStatus && (
                  <div
                    className={"p-3 rounded-lg text-xs " + (
                      publishStatus.success
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                    )}
                  >
                    {publishStatus.success || publishStatus.error}
                  </div>
                )}

                {/* Video Picker */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-300">Video File (.mp4 or .webm) <span className="text-rose-400">*</span></label>
                    <span className="text-[11px] text-zinc-500">Max size: 100 MB</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePickVideo}
                      className="flex items-center gap-2 rounded-lg border px-3.5 py-3 text-xs font-medium text-white hover:text-white transition-colors shrink-0"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderColor: borderColor,
                      }}
                    >
                      <FileVideo className="h-3.5 w-3.5 text-zinc-400" />
                      Choose Video File…
                    </button>
                    <span className="text-xs text-zinc-300 truncate flex-1 font-mono">
                      {pubVideoPath ? pubVideoPath.split(/[\\/]/).pop() : 'No file selected'}
                    </span>
                    {pubVideoInfo && (
                      <span
                        className={
                          "text-[11px] font-semibold px-3 py-1 rounded-md border shrink-0 " +
                          (pubVideoInfo.isTooLarge
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400')
                        }
                      >
                        {pubVideoInfo.sizeMB} MB {pubVideoInfo.isTooLarge ? '(Limit exceeded)' : '✓'}
                      </span>
                    )}
                  </div>
                  {pubVideoInfo?.isTooLarge && (
                    <p className="text-[11px] text-rose-400">
                      File exceeds the 100 MB upload limit. Please compress or trim your loop before publishing.
                    </p>
                  )}
                </div>

                {/* Thumbnail Picker */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-300">Preview Image (.jpg or .png) <span className="text-rose-400">*</span></label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePickPreview}
                      className="flex items-center gap-2 rounded-lg border px-3.5 py-3 text-xs font-medium text-white hover:text-white transition-colors shrink-0"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderColor: borderColor,
                      }}
                    >
                      <ImageIcon className="h-3.5 w-3.5 text-zinc-400" />
                      Choose Preview Image…
                    </button>
                    <span className="text-xs text-zinc-400 truncate flex-1">
                      {pubPreviewPath ? pubPreviewPath.split(/[\\/]/).pop() : 'No image selected (Required)'}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-300">Title <span className="text-rose-400">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cyberpunk Rainy Alley Loop"
                    value={pubTitle}
                    onChange={(e) => setPubTitle(e.target.value)}
                    className="rounded-lg border px-3 py-3 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors"
                    style={{
                      backgroundColor: surfaceColor,
                      borderColor: borderColor,
                    }}
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-300">Description <span className="text-rose-400">*</span></label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe your background, loop duration, FPS, or credit the original animator…"
                    value={pubDesc}
                    onChange={(e) => setPubDesc(e.target.value)}
                    className="rounded-lg border px-3 py-3 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors resize-none"
                    style={{
                      backgroundColor: surfaceColor,
                      borderColor: borderColor,
                    }}
                  />
                </div>

                {/* Category Tags */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-300">Categories</label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_TAGS.filter((t) => t !== 'All').map((tag) => {
                      const active = pubTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setPubTags((prev) =>
                              active ? prev.filter((t) => t !== tag) : [...prev, tag]
                            );
                          }}
                          className="rounded px-2.5 py-1 text-xs font-medium transition-colors border"
                          style={{
                            backgroundColor: active ? accentColor : 'rgba(255, 255, 255, 0.05)',
                            color: active ? accentOnColor : '#a1a1aa',
                            borderColor: active ? accentColor : borderColor,
                          }}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Visibility */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-300">Visibility</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 0, label: 'Public', icon: Globe },
                      { val: 1, label: 'Friends Only', icon: Users },
                      { val: 2, label: 'Private', icon: Lock },
                    ].map((opt) => {
                      const Icon = opt.icon;
                      const selected = pubVisibility === opt.val;
                      return (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setPubVisibility(opt.val)}
                          className="flex items-center justify-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors"
                          style={{
                            borderColor: selected ? accentColor : borderColor,
                            backgroundColor: selected ? accentColor + '18' : 'rgba(255, 255, 255, 0.05)',
                            color: selected ? accentColor : '#a1a1aa',
                          }}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Safety / NSFW Status Notification */}
                {nsfwScan.isScanning && (
                  <div className="flex items-center gap-2.5 p-3 rounded-lg text-xs bg-sky-500/10 border border-sky-500/30 text-sky-300">
                    <RefreshCw className="h-4 w-4 animate-spin text-sky-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-sky-200">Safety Scan in Progress</p>
                      <p className="text-sky-300/80 text-[11px] mt-0.5">Analyzing media frames with Zyphor NSFW AI model detector…</p>
                    </div>
                  </div>
                )}

                {nsfwScan.isNsfw && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg text-xs bg-rose-500/15 border border-rose-500/30 text-rose-300">
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-rose-200">NSFW Content Detected — Upload Blocked</p>
                      <p className="mt-0.5 text-rose-300/90 text-[11px]">{nsfwScan.reason || 'Media was flagged for sexually explicit or adult content.'}</p>
                    </div>
                  </div>
                )}

                {!nsfwScan.isScanning && !nsfwScan.isNsfw && pubVideoPath && pubPreviewPath && (
                  <div className="flex items-center gap-2 p-3 rounded-lg text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="text-[11px]">Media verified safe by Zyphor NSFW AI model. Ready to publish.</span>
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={
                      publishing ||
                      !pubVideoPath ||
                      !pubPreviewPath ||
                      !pubTitle.trim() ||
                      !pubDesc.trim() ||
                      !steamRunning ||
                      Boolean(pubVideoInfo?.isTooLarge) ||
                      nsfwScan.isScanning ||
                      nsfwScan.isNsfw
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-4 text-base font-display font-semibold tracking-wide transition-all hover:brightness-110 active:scale-98 disabled:opacity-40 shadow-sm"
                    style={{
                      backgroundColor: nsfwScan.isNsfw ? '#f43f5e' : accentColor,
                      color: nsfwScan.isNsfw ? '#ffffff' : accentOnColor,
                    }}
                  >
                    {publishing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Uploading to Steam Workshop…
                      </>
                    ) : nsfwScan.isScanning ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Scanning Media Safety…
                      </>
                    ) : nsfwScan.isNsfw ? (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        Upload Blocked (NSFW Content Detected)
                      </>
                    ) : (
                      <>
                        Publish to Steam Workshop
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
