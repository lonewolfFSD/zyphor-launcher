import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  faUsers, faUserPlus, faMagnifyingGlass,
  faGamepad, faCheck, faXmark, faUserMinus, faClock,
  faUserCheck, faBolt, faArrowUpRightFromSquare,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  collection, query, where, getDocs, getDoc, doc,
  addDoc, updateDoc, deleteDoc, onSnapshot,
  serverTimestamp, arrayUnion, arrayRemove, limit,
} from 'firebase/firestore';
import { db } from '../firebase.js';
import { useSettings, THEMES, ACCENTS } from '../hooks/useSettings.js';
import { ExternalLink } from 'lucide-react';

const DEFAULT_AVATAR = 'https://i.ibb.co/8h8W4F2/Untitled-Project-10.jpg';
const PROFILE_BASE   = 'https://www.zyphorstudios.com/profile/';

function openProfile(uid) {
  window.open(`${PROFILE_BASE}${uid}`, '_blank', 'noopener,noreferrer');
}

export default function FriendsPage({ profile }) {
  const { settings } = useSettings();
  const theme       = THEMES[settings?.theme]  || THEMES.oled;
  const accent      = ACCENTS[settings?.accent] || ACCENTS.bulb;
  const accentColor = profile?.isVip ? '#FDB515' : accent.hex;

  // ── uid from profile prop — the launcher authenticates via Firestore
  // handshake, not Firebase Auth, so we use profile.uid directly.
  const uid = profile?.uid ?? null;

  const [tab,             setTab]             = useState('friends');
  const [friendsList,     setFriendsList]     = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery,     setSearchQuery]     = useState('');
  const [searchResults,   setSearchResults]   = useState([]);
  const [defaultUsers,    setDefaultUsers]    = useState([]);
  const [isSearching,     setIsSearching]     = useState(false);
  const [sentTo,          setSentTo]          = useState(new Set());
  const [loading,         setLoading]         = useState(true);
  const [friendFilter,    setFriendFilter]    = useState('all');

  // ── load friends ──
  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const userSnap = await getDoc(doc(db, 'users', uid));
        if (!userSnap.exists() || cancelled) { setFriendsList([]); return; }
        const friendIds = userSnap.data().friends || [];
        if (friendIds.length === 0) { setFriendsList([]); return; }
        const docs = await Promise.all(friendIds.map(id => getDoc(doc(db, 'users', id))));
        const list = docs.filter(d => d.exists()).map(d => {
          const fd = d.data();
          let photo = fd.photoURL || DEFAULT_AVATAR;
          if (!fd.isVip && photo.includes('.gif')) photo = DEFAULT_AVATAR;
          return { id: d.id, ...fd, photoURL: photo };
        });
        if (!cancelled) setFriendsList(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [uid]);

  // ── live pending requests ──
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'notifications'),
      where('receiverId', '==', uid),
      where('status', '==', 'pending'),
    );
    return onSnapshot(q, async snap => {
      const reqs = [];
      for (const d of snap.docs) {
        const rd = d.data();
        const senderDoc = await getDoc(doc(db, 'users', rd.senderId));
        if (senderDoc.exists()) reqs.push({ id: d.id, ...rd, senderProfile: senderDoc.data() });
      }
      setPendingRequests(reqs);
    });
  }, [uid]);

  // ── pre-populate sentTo with already-pending outgoing requests ──
  useEffect(() => {
    if (!uid) return;
    getDocs(query(
      collection(db, 'notifications'),
      where('senderId', '==', uid),
      where('status', '==', 'pending'),
      limit(50)
    )).then(snap => {
      const ids = snap.docs
        .map(d => d.data())
        .filter(d => d.status === 'pending' && d.receiverId)
        .map(d => d.receiverId);
      if (ids.length > 0) setSentTo(prev => new Set([...prev, ...ids]));
    }).catch(() => {/* silently ignore if index missing */});
  }, [uid]);

  // ── load default users on search tab open ──
  // NOTE: intentionally re-runs when uid changes (no defaultUsers.length guard)
  // so auth-late-load doesn't leave the list permanently empty.
  useEffect(() => {
    if (tab !== 'search') return;
    const load = async () => {
      setIsSearching(true);
      try {
        const snap = await getDocs(query(collection(db, 'users'), limit(50)));
        setDefaultUsers(
          snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.id !== uid)
        );
      } finally { setIsSearching(false); }
    };
    load();
  }, [tab, uid]);

  // ── debounced search ──
  useEffect(() => {
    if (tab !== 'search') return;
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const snap = await getDocs(collection(db, 'users'));
        setSearchResults(
          snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(u => u.id !== uid &&
              (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()))
        );
      } finally { setIsSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery, tab, uid]);

  // ── actions ──
  const handleAccept = async (notifId, senderId) => {
    if (!uid) return;
    await updateDoc(doc(db, 'users', uid),      { friends: arrayUnion(senderId) });
    await updateDoc(doc(db, 'users', senderId), { friends: arrayUnion(uid) });
    await updateDoc(doc(db, 'notifications', notifId), { status: 'accepted' });
    const newDoc = await getDoc(doc(db, 'users', senderId));
    if (newDoc.exists()) {
      const fd = newDoc.data();
      let photo = fd.photoURL || DEFAULT_AVATAR;
      if (!fd.isVip && photo.includes('.gif')) photo = DEFAULT_AVATAR;
      setFriendsList(prev => [...prev, { id: newDoc.id, ...fd, photoURL: photo }]);
    }
    setPendingRequests(prev => prev.filter(r => r.id !== notifId));
  };

  const handleDecline = async (notifId) => {
  setPendingRequests(prev => prev.filter(r => r.id !== notifId)); // optimistic
  await deleteDoc(doc(db, 'notifications', notifId));
};

  const handleUnfriend = async (friendId) => {
    if (!uid) return;
    await updateDoc(doc(db, 'users', uid),      { friends: arrayRemove(friendId) });
    await updateDoc(doc(db, 'users', friendId), { friends: arrayRemove(uid) });
    setFriendsList(prev => prev.filter(f => f.id !== friendId));
  };

  const friendIds = useMemo(() => new Set(friendsList.map(f => f.id)), [friendsList]);

  const displayFriends = friendsList.filter(f =>
    friendFilter === 'all' ? true : f.status === friendFilter
  );
  const onlineCount  = friendsList.filter(f => f.status === 'online' || f.status === 'ingame').length;
  const displaySearch = searchQuery.trim().length >= 2 ? searchResults : defaultUsers;

  const handleSendRequest = async (targetId) => {
    if (!uid || sentTo.has(targetId) || friendIds.has(targetId)) return;

    // Optimistic UI update
    setSentTo(prev => new Set([...prev, targetId]));

    try {
      await addDoc(collection(db, 'notifications'), {
        senderId: uid,
        receiverId: targetId,
        type: 'friend_request',
        status: 'pending',
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to send friend request:', err);
      // roll back
      setSentTo(prev => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  };

  const TABS = [
    { id: 'friends',  label: 'Your Allies',      icon: faUsers },
    { id: 'requests', label: 'Pending Requests',    icon: faUserPlus, badge: pendingRequests.length },
    { id: 'search',   label: 'Global Scan', icon: faMagnifyingGlass },
  ];

  return (
    <div
      className="h-full flex flex-col gap-4 overflow-hidden rounded-3xl border p-5"
      style={{ backgroundColor: `${theme.surface}cc`, borderColor: theme.border, color: theme.text }}
    >
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">SOCIAL NETWORK</p>
          <h1 className="text-3xl font-medium uppercase leading-tight tracking-wide" style={{ color: accentColor, fontFamily: 'Apple Garamond' }}>
            Allied Operatives
          </h1>
        </div>
        <div
          className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest"
          style={{ borderColor: theme.border, backgroundColor: `${theme.bg}88` }}
        >
          <FontAwesomeIcon icon={faBolt} style={{ color: accentColor, fontSize: 10 }} />
          {onlineCount} online · {friendsList.length} total
        </div>
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 rounded-xl overflow-hidden border" style={{ borderColor: theme.border }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="relative flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px] uppercase tracking-widest transition-all"
            style={{
              backgroundColor: tab === t.id ? accentColor : 'transparent',
              color: tab === t.id ? (profile?.isVip ? '#000' : accent.on) : undefined,
              fontFamily: 'Apple Garamond',
              fontWeight: tab === t.id ? '800' : '400',
              opacity: tab === t.id ? 1 : 0.45,
            }}
          >
            <FontAwesomeIcon icon={t.icon} style={{ fontSize: 11 }} />
            {t.label}
            {t.badge > 0 && (
              <span
                className="absolute top-1 right-2 h-4 w-4 rounded-full flex items-center justify-center text-[12px] font-black"
                style={{ backgroundColor: '#ef4444', color: '#fff',  }}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <AnimatePresence mode="wait">

          {/* ── ALLIES TAB ── */}
          {tab === 'friends' && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-3"
            >
              {/* Filter pills */}
              <div className="flex gap-2 overflow-x-auto shrink-0 pb-0.5 no-scrollbar">
                {['all', 'online', 'ingame', 'offline'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFriendFilter(f)}
                    className="rounded-lg border px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all"
                    style={{
                      borderColor: friendFilter === f ? accentColor : theme.border,
                      backgroundColor: friendFilter === f ? `${accentColor}22` : 'transparent',
                      color: friendFilter === f ? accentColor : undefined,
                      opacity: friendFilter === f ? 1 : 0.4,
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Never show spinner — show 0 state immediately */}
              {displayFriends.length === 0 ? (
                <div
                  className="flex flex-col items-center gap-2 rounded-xl border px-4 py-10 text-center"
                  style={{ borderColor: theme.border, backgroundColor: `${theme.bg}66` }}
                >
                  <FontAwesomeIcon icon={faUsers} style={{ fontSize: 28 }} className="opacity-15" />
                  <p className="text-xs font-black uppercase tracking-widest opacity-40 mt-1">
                    {friendFilter !== 'all'
                      ? `No ${friendFilter} operatives`
                      : '0 allied operatives'}
                  </p>
                  {friendFilter === 'all' && (
                    <button
                      onClick={() => setTab('search')}
                      className="mt-2 rounded-xl border px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all hover:opacity-80"
                      style={{ borderColor: accentColor, color: accentColor }}
                    >
                      Find Operatives
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {displayFriends.map(friend => (
                    <FriendRow
                      key={friend.id}
                      friend={friend}
                      accentColor={accentColor}
                      theme={theme}
                      onUnfriend={() => handleUnfriend(friend.id)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── REQUESTS TAB ── */}
          {tab === 'requests' && (
            <motion.div
              key="requests"
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-3"
            >
              {pendingRequests.length === 0 ? (
                <div
                  className="flex flex-col items-center gap-2 rounded-xl border px-4 py-10 text-center"
                  style={{ borderColor: theme.border, backgroundColor: `${theme.bg}66` }}
                >
                  <FontAwesomeIcon icon={faClock} style={{ fontSize: 28 }} className="opacity-15" />
                  <p className="text-xs font-black uppercase tracking-widest opacity-40 mt-1">No pending requests</p>
                </div>
              ) : (
                <>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-40">
                    {pendingRequests.length} incoming request{pendingRequests.length !== 1 ? 's' : ''}
                  </p>
                  {pendingRequests.map(req => (
                    <RequestRow
                      key={req.id}
                      req={req}
                      accentColor={accentColor}
                      theme={theme}
                      onAccept={() => handleAccept(req.id, req.senderId)}
                      onDecline={() => handleDecline(req.id)}
                    />
                  ))}
                </>
              )}
            </motion.div>
          )}

          {/* ── GLOBAL SCAN TAB ── */}
          {tab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-3"
            >
              {/* Search input */}
              <div
                className="flex items-center gap-2.5 rounded-xl border px-5 py-4 shrink-0"
                style={{ borderColor: theme.border, backgroundColor: `${theme.bg}66` }}
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} style={{ color: accentColor, fontSize: 16 }} className="shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="SEARCH BY DISPLAY NAME OR ZYPHOR ID..."
                  className="flex-1 bg-transparent text-xs font-black tracking-widest outline-none placeholder:opacity-30"
                  style={{ color: theme.text }}
                />
                {isSearching && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
                    className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent opacity-50 shrink-0"
                  />
                )}
              </div>

              {/* Count label */}
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40 shrink-0">
                {searchQuery.trim().length >= 2
                  ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`
                  : `${defaultUsers.length} operatives found`}
              </p>

              {/* Grid — 3 cols default, 4 cols on large screens */}
              {displaySearch.length === 0 && !isSearching ? (
                <div
                  className="flex flex-col items-center gap-2 rounded-xl border px-4 py-10 text-center"
                  style={{ borderColor: theme.border, backgroundColor: `${theme.bg}66` }}
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} style={{ fontSize: 24 }} className="opacity-15" />
                  <p className="text-xs font-black uppercase tracking-widest opacity-40 mt-1">No operatives found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 xl:grid-cols-8 gap-3">
                  {displaySearch.map(user => (
                    <SearchCard
                      key={user.id}
                      user={user}
                      accentColor={accentColor}
                      theme={theme}
                      alreadyFriend={friendIds.has(user.id)}
                      alreadySent={sentTo.has(user.id)}
                      onSend={() => handleSendRequest(user.id)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function FriendRow({ friend, accentColor, theme, onUnfriend }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const dotColor =
    friend.status === 'online' ? '#22c55e' :
    friend.status === 'ingame' ? '#3b82f6' : '#555';

  return (
    <motion.div
      layout
      className="flex items-center gap-3 rounded-xl border px-3.5 py-3"
      style={{ borderColor: theme.border, backgroundColor: `${theme.bg}66` }}
    >
      <div
        className="h-14 w-14 shrink-0 rounded-xl overflow-hidden border flex items-center justify-center font-black text-sm"
        style={{ borderColor: `${accentColor}33`, backgroundColor: `${accentColor}18`, color: accentColor }}
      >
        {friend.photoURL
          ? <img src={friend.photoURL} alt="" className="h-full w-full object-cover" />
          : (friend.displayName ?? '?').charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {friend.isVip && <span className="text-[8px] font-black" style={{ color: '#FDB515' }}>✦</span>}
          <p className="text-[13px] font-black uppercase tracking-wider truncate">{friend.displayName ?? 'UNKNOWN'}</p>
        </div>
        {friend.currentGame ? (
          <p className="text-[9px] truncate" style={{ color: '#3b82f6' }}>
            <FontAwesomeIcon icon={faGamepad} style={{ fontSize: 8, marginRight: 4 }} />
            {friend.currentGame}
          </p>
        ) : (
          <p className="text-[9px] mt-0.5 uppercase tracking-widest" style={{ color: dotColor }}>
            {friend.status ?? 'offline'}
          </p>
        )}
      </div>

      <div
        className="h-2.5 w-2.5 rounded-full shrink-0"
        style={{ backgroundColor: dotColor, boxShadow: friend.status !== 'offline' ? `0 0 6px ${dotColor}88` : 'none' }}
      />

      {/* View profile button */}
      <button
        onClick={() => openProfile(friend.id)}
        className="rounded-lg border p-2 text-[12px] opacity-30 hover:opacity-80 transition-all shrink-0"
        style={{ borderColor: theme.border }}
        title="View profile"
      >
        <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
      </button>

      {showConfirm ? (
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => { onUnfriend(); setShowConfirm(false); }}
            className="rounded-lg border px-2 py-1 text-[12px] font-black uppercase tracking-widest transition-all hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400"
            style={{ borderColor: theme.border }}
          >
            Confirm
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="rounded-lg border px-2 py-1 text-[12px] font-black opacity-40 hover:opacity-80"
            style={{ borderColor: theme.border }}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          className="rounded-lg border p-2 text-[12px] text-red-400 opacity-35 hover:opacity-80 hover:border-red-500/40 hover:text-red-400 transition-all shrink-0"
          style={{ borderColor: theme.border }}
          title="Remove ally"
        >
          <FontAwesomeIcon icon={faUserMinus} />
        </button>
      )}
    </motion.div>
  );
}

function RequestRow({ req, accentColor, theme, onAccept, onDecline }) {
  const sp = req.senderProfile ?? {};
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      className="flex items-center gap-3 rounded-xl border px-3.5 py-3"
      style={{ borderColor: `${accentColor}44`, backgroundColor: `${accentColor}08` }}
    >
      <div
        className="h-14 w-14 shrink-0 rounded-xl overflow-hidden border flex items-center justify-center font-black text-sm"
        style={{ borderColor: `${accentColor}33`, backgroundColor: `${accentColor}18`, color: accentColor }}
      >
        {sp.photoURL
          ? <img src={sp.photoURL} alt="" className="h-full w-full object-cover" />
          : (sp.displayName ?? '?').charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black uppercase tracking-wider truncate">{sp.displayName ?? 'UNKNOWN'}</p>
        <p className="text-[9px] uppercase tracking-widest opacity-40">Wants to ally</p>
      </div>
      <button
        onClick={() => openProfile(req.senderId)}
        className="rounded-lg border p-2 text-[10px] opacity-30 hover:opacity-80 transition-all shrink-0"
        style={{ borderColor: theme.border }}
        title="View profile"
      >
        <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
      </button>
      <div className="flex gap-1.5 shrink-0">
        <button
          onClick={onAccept}
          className="rounded-xl border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all hover:opacity-80"
          style={{ borderColor: accentColor, backgroundColor: `${accentColor}22`, color: accentColor }}
        >
          <FontAwesomeIcon icon={faCheck} />
        </button>
        <button
          onClick={onDecline}
          className="rounded-xl border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest opacity-40 hover:opacity-80 transition-all"
          style={{ borderColor: theme.border }}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
    </motion.div>
  );
}

// Card layout for global scan grid
function SearchCard({ user, accentColor, theme, alreadyFriend, alreadySent, onSend }) {
  const [sending, setSending] = useState(false);
  const letter = (user.displayName ?? '?').charAt(0).toUpperCase();

  const handleAdd = async () => {
    if (sending) return;
    setSending(true);
    try { await onSend(); } finally { setSending(false); }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
      className="flex flex-col items-center gap-2 rounded-3xl border px-4 py-4 text-center"
      style={{ borderColor: theme.border, backgroundColor: `${theme.bg}66` }}
    >
      {/* Avatar */}
      <div
        className="h-26 w-26 rounded-3xl overflow-hidden border flex items-center justify-center font-black text-lg shrink-0"
        style={{ borderColor: `${accentColor}33`, backgroundColor: `${accentColor}18`, color: accentColor }}
      >
        {user.photoURL
          ? <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
          : letter}
      </div>

      {/* Name */}
      <div className="w-full min-w-0">
        <div className="flex items-center justify-center gap-1">
          {user.isVip && <span className="text-[8px] font-black" style={{ color: '#FDB515' }}>✦</span>}
          <p className="text-[12px] font-black uppercase tracking-wider mt-1 truncate">{user.displayName ?? 'UNKNOWN'}</p>
        </div>
        <p className="text-[10px] opacity-25 truncate font-mono mt-0.5">{user.id?.slice(0, 22)}…</p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-1.5 w-full mt-1">
        {/* View */}
        <button
          onClick={() => openProfile(user.id)}
          className="flex-1 flex items-center justify-center gap-1 rounded-xl border py-3 text-[9.5px] font-black uppercase tracking-widest transition-all hover:opacity-80"
          style={{ borderColor: theme.border, opacity: 0.5, backgroundColor: `${accentColor}22` }}
          title="View profile"
        >
          View Profile
        </button>

       {/* Add / Ally / Sent / Sending */}
        {alreadyFriend ? (
          <span
            className="flex-1 flex hidden items-center justify-center gap-1 rounded-lg border py-3 text-[9px] font-black uppercase tracking-widest"
            style={{ borderColor: '#22c55e44', color: '#22c55e', backgroundColor: '#22c55e18' }}
          >
            
          </span>
        ) : alreadySent || sending ? (
          <span
            className="flex-1 flex items-center justify-center gap-1 rounded-lg border py-3 text-[9px] font-black uppercase tracking-widest opacity-50"
            style={{ borderColor: accentColor, color: accentColor, backgroundColor: `${accentColor}18` }}
          >
            <FontAwesomeIcon icon={faClock} style={{ fontSize: 8 }} />
            {sending ? 'Sending…' : 'Sent'}
          </span>
        ) : (
          <button
            onClick={handleAdd}
            className="flex-1 flex items-center justify-center gap-1 rounded-lg border py-3 text-[9px] font-black uppercase tracking-widest transition-all hover:opacity-80"
            style={{ borderColor: accentColor, color: accentColor, backgroundColor: `${accentColor}18` }}
          >
            <FontAwesomeIcon icon={faUserPlus} style={{ fontSize: 8 }} />
            Add
          </button>
        )}
      </div>
    </motion.div>
  );
}