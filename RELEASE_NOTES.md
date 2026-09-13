# Zyphor Launcher — Release Notes (v1.3.96)
**Release Date:** September 2026  
**Title:** The Steam Workshop & Community UGC Update  
**Supported Game:** *STAY: Possession • Obsession • Permanence* (App ID: `4956550`)

---

## 🌟 Overview
Version **1.3.96** introduces full **Steam Workshop integration** for animated video backgrounds, AI-powered **TensorFlow content safety verification**, streamlined **HD & SD background performance modes**, and comprehensive **local disk storage management**.

---

## ✨ Major Features & Enhancements

### 1. 🎬 Steam Workshop Animated Backgrounds
* **Browse & Discover**: Explore community-created animated video loops directly within the launcher.
* **Search & Filters**: Search by keyword, sort by *Trending*, *Most Popular*, or *Most Recent*, and filter by category tags (*Anime*, *Cyberpunk*, *Gaming*, *Nature*, *Sci-Fi*, *4K*, *Lo-Fi*, *Minimal*).
* **1-Click Subscribe & Apply**: Download and set video backgrounds with real-time progress indicators and bandwidth stats.
* **Dedicated Steam Category**: Automatically grouped under the official `Launcher Background` tag on the Steam Community Workshop.

---

### 2. 🛡️ AI-Powered NSFW Safety Scanner (TensorFlow & NSFWJS)
* **Pre-Upload AI Inspection**: Powered by on-device `@tensorflow/tfjs` and `nsfwjs` (MobileNetV2).
* **Multi-Frame Video Analysis**: Automatically extracts and scans sample frames across video timelines using `ffmpeg-static` and `sharp`.
* **Zero Prohibited Content**: Adult, pornographic, and sexually explicit media is automatically blocked with clear warning diagnostics before ever reaching Steam.
* **Double-Layer Defense**: Integrated directly into both the frontend publish UI and the backend upload handler.

---

### 3. 🚀 Community Creator Studio (In-Launcher Workshop Uploader)
* **Direct Publishing**: Upload `.mp4` and `.webm` video loops (up to 100 MB) straight to the Steam Workshop.
* **Auto Image Optimization**: Automatically optimizes preview covers to guarantee fast load times and avoid Steam's 1MB thumbnail size limits.
* **Instant Live Sync**: Your newly uploaded background is immediately available in your library without needing to restart the launcher.
* **Strict Quality Verification**: Enforces complete metadata (Video file, Preview image, Title, and Description) for all uploads.

---

### 4. 🧹 Clean Unsubscribe & Local Storage Cleanup
* **Zero Disk Bloat**: Unsubscribing now automatically purges the downloaded video folder from your local disk (`fs.rmSync`).
* **Active Background Fallback**: If an active background is unsubscribed, the launcher smoothly falls back to the default ambient background and updates your cloud profile.
* **Cross-Tab Management**: Unsubscribe directly from either the *Discover* or *Subscribed* tabs.

---

### 5. ⚡ Performance & Video Streaming Optimizations
* **HD & SD Quality Modes**:
  * **HD**: Full resolution and maximum visual fidelity.
  * **SD**: Compresses and scales video rendering to reduce GPU utilization on lower-end systems.
* **Native HTTP 206 Partial Content Protocol (`media://`)**: Fast seeking and instant playback without black frames or streaming bottlenecks.
* **Smart Power Saving**: Ambient background videos automatically pause when the launcher is minimized or hidden.
* **Typography Polish**: Modal UI aligned with the launcher's signature `Clash Display` and `Manrope` font hierarchy.

---

## 🛠️ Technical Fixes & Improvements
* **Bypassed Stale UGC Cache**: Set `cachedResponseMaxAge: 0` to ensure live item status directly from Steam servers.
* **Ghost Item Purging**: Filtered deleted and banned items from community query responses.
* **Windows Path Safety**: Fully encoded `media:///` file URIs to prevent paths with spaces or special characters from failing to load.

---

## 📦 Compatibility & System Requirements
* **Operating System**: Windows 10 / 11 (64-bit)
* **Prerequisites**: Steam Client running & logged in with ownership of *STAY*.
* **Runtime**: Electron 33+, Node.js 20+, Chromium 130+.
