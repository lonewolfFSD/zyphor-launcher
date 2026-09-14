# Zyphor Launcher — Release Notes (1.35.997 / HUD v1.9)
**Release Date:** September 2026  
**Title:** Telemetry Overhaul, Static Wallpaper Engine & HUD Polish  

---

## 🌟 Overview
This update resolves hardware telemetry performance bottlenecks, introduces a resource-efficient **Static Wallpaper mode** with full Steam Workshop preview integration, and brings major UX & typography enhancements to the **Zyphor In-Game HUD & Faye AI Cockpit**.

---

## ✨ Major Features & Enhancements

### 1. ⚡ Non-Blocking Telemetry & 144Hz+ Framerate Fix
* **Zero-Lag Background Polling**: Eliminated all synchronous command-line processes (`execSync`) in the main process. Hardware stats are now polled asynchronously without stalling the Electron event loop or IPC channels.
* **Instantaneous CPU Delta Calculation**: Replaced blocking timer loops with instant differential tick measurements via Node's `os.cpus()` (0ms latency), dropping background telemetry CPU overhead to near 0%.
* **Compositor Smoothness**: Removed conflicting Chromium command-line flags to ensure buttery smooth 144Hz+ rendering across transparent overlay windows and launcher views.

---

### 2. 🖼️ "Static" Wallpaper Mode & Workshop Preview Support
* **Static Quality Option**: Added **Static** mode alongside **HD** and **SD** under *Settings → Appearance → Background Quality*.
* **Steam Workshop Preview Integration**: When Static mode is active, the launcher loads the wallpaper's dedicated preview image (`previewUrl` / `previewImagePath`) from Steamworks / Steam Workshop.
* **Minimal Resource Usage**: Eliminates video decoding and GPU playback loops when Static mode is selected, while maintaining continuous video loops in HD/SD modes.
* **Hotkey Cycle**: `Ctrl+Shift+Q` updated to seamlessly cycle through `HD → SD → Static`.

---

### 3. 🎮 Cockpit HUD & Overlay Refinements
* **Clean Default State**: All overlay windows and panels now initialize **closed/off by default** (`[]`) when the overlay opens, keeping the in-game view clear and uncluttered.
* **Typography Polish**: Upgraded overlay navigation tab headers to the bold uppercase `Clash Display` (`font-heading`) typeface to match Zyphor's cockpit branding.
* **Dynamic Active Session Title**: The HUD header dynamically detects and displays the active game title and session state.
* **Achievement Priority Sorting**: Unlocked Steam achievements are automatically sorted to the top of the achievement list.

---

### 4. 🧠 Faye AI Companion Improvements
* **2-Tier Dependency Verification**: Faye AI validates both the local Ollama service installation and downloaded models before activation, providing one-click setup shortcuts if components are missing.
* **Accurate Companion Status Card**: Real-time companion cards reflect exact model status and connection readiness.

---

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
