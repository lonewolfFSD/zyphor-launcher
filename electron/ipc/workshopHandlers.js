const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { checkImage, checkVideo } = require('./nsfwChecker.js');

/**
 * Helper to serialize a workshop item with BigInts safely converted to strings.
 */
function serializeWorkshopItem(item) {
  if (!item) return null;
  return {
    publishedFileId: item.publishedFileId ? item.publishedFileId.toString() : '',
    title: item.title || '',
    description: item.description || '',
    timeCreated: item.timeCreated,
    timeUpdated: item.timeUpdated,
    visibility: item.visibility,
    banned: item.banned,
    acceptedForUse: item.acceptedForUse,
    tags: Array.isArray(item.tags) ? item.tags : [],
    url: item.url || '',
    numUpvotes: item.numUpvotes || 0,
    numDownvotes: item.numDownvotes || 0,
    previewUrl: item.previewUrl || '',
    owner: item.owner
      ? {
          steamId64: item.owner.steamId64 ? item.owner.steamId64.toString() : '',
          steamId32: item.owner.steamId32 || '',
          accountId: item.owner.accountId || 0,
        }
      : null,
    statistics: item.statistics
      ? {
          numSubscriptions: item.statistics.numSubscriptions ? item.statistics.numSubscriptions.toString() : '0',
          numFavorites: item.statistics.numFavorites ? item.statistics.numFavorites.toString() : '0',
          numUniqueSubscriptions: item.statistics.numUniqueSubscriptions ? item.statistics.numUniqueSubscriptions.toString() : '0',
          numUniqueFavorites: item.statistics.numUniqueFavorites ? item.statistics.numUniqueFavorites.toString() : '0',
        }
      : {},
  };
}

/**
 * Scans a workshop item's installed folder to find a video file (.mp4, .webm, etc.).
 */
function findVideoInFolder(folderPath) {
  if (!folderPath || !fs.existsSync(folderPath)) return null;
  try {
    const files = fs.readdirSync(folderPath);
    const videoFile = files.find((f) => /\.(mp4|webm|mkv|mov)$/i.test(f));
    return videoFile ? path.join(folderPath, videoFile) : null;
  } catch (err) {
    console.warn('[workshop] findVideoInFolder error:', err);
    return null;
  }
}

function registerWorkshopHandlers(getSteamClient, appId) {
  // Get file info (size, name) for validation before upload
  ipcMain.handle('workshop:getFileInfo', async (_event, filePath) => {
    try {
      if (!filePath || !fs.existsSync(filePath)) {
        return { ok: false, error: 'file_not_found' };
      }
      const stats = fs.statSync(filePath);
      const sizeBytes = stats.size;
      const sizeMB = Number((sizeBytes / (1024 * 1024)).toFixed(2));
      return {
        ok: true,
        name: path.basename(filePath),
        sizeBytes,
        sizeMB,
        isTooLarge: sizeMB > 100, // 100 MB wallpaper limit
      };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Safety / NSFW check using TensorFlow & NSFWJS
  ipcMain.handle('workshop:checkNsfw', async (_event, payload = {}) => {
    try {
      const { imagePath, videoPath } = payload;
      if (imagePath) {
        return await checkImage(imagePath);
      }
      if (videoPath) {
        return await checkVideo(videoPath);
      }
      return { isNsfw: false };
    } catch (err) {
      console.error('[workshop:checkNsfw] error:', err);
      return { isNsfw: false, error: err.message };
    }
  });

  // Query public workshop items
  ipcMain.handle('workshop:getItems', async (_event, params = {}) => {
    const client = getSteamClient();
    if (!client || !client.workshop) {
      return { ok: false, error: 'steam_not_available', items: [], totalResults: 0 };
    }

    try {
      const page = params.page || 1;
      let queryType = 3; // RankedByTrend default
      if (params.sort === 'popularity') queryType = 0; // RankedByVote
      else if (params.sort === 'newest') queryType = 1; // RankedByPublicationDate
      else if (typeof params.queryType === 'number') queryType = params.queryType;

      const itemType = 0; // Items = 0
      const queryConfig = {
        searchText: params.search || undefined,
        requiredTags: (params.tag && params.tag !== 'All') ? [params.tag] : undefined,
        matchAnyTag: true,
        cachedResponseMaxAge: 0, // Force fresh query from Steam, do not return stale cached results
      };

      const result = await client.workshop.getAllItems(page, queryType, itemType, appId, appId, queryConfig);
      const items = (result.items || [])
        .filter((it) => it && it.title && it.title.trim().length > 0 && !it.banned)
        .map(serializeWorkshopItem);

      return {
        ok: true,
        items,
        totalResults: result.totalResults || items.length,
        returnedResults: result.returnedResults || items.length,
      };
    } catch (err) {
      console.error('[workshop:getItems] error:', err);
      return { ok: false, error: err.message, items: [], totalResults: 0 };
    }
  });

  // Get single item detail
  ipcMain.handle('workshop:getItem', async (_event, publishedFileId) => {
    const client = getSteamClient();
    if (!client || !client.workshop) return { ok: false, error: 'steam_not_available' };

    try {
      const id = BigInt(publishedFileId);
      const item = await client.workshop.getItem(id);
      return { ok: true, item: serializeWorkshopItem(item) };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Get state of an item (subscribed, downloading, installed, needsUpdate)
  ipcMain.handle('workshop:getItemState', async (_event, publishedFileId) => {
    const client = getSteamClient();
    if (!client || !client.workshop) return { ok: false, state: 0 };

    try {
      const id = BigInt(publishedFileId);
      const stateNum = client.workshop.state(id);
      const isSubscribed = Boolean(stateNum & 1);
      const isInstalled = Boolean(stateNum & 4);
      const isNeedsUpdate = Boolean(stateNum & 8);
      const isDownloading = Boolean(stateNum & 16 || stateNum & 32);

      let downloadProgress = null;
      if (isDownloading) {
        try {
          const info = client.workshop.downloadInfo(id);
          if (info) {
            const cur = info.current ? BigInt(info.current) : 0n;
            const tot = info.total ? BigInt(info.total) : 0n;
            downloadProgress = {
              current: cur.toString(),
              total: tot.toString(),
              percent: tot > 0n ? Math.round(Number((cur * 100n) / tot)) : 0,
            };
          }
        } catch (dErr) {
          console.warn('[workshop:getItemState] downloadInfo error:', dErr);
        }
      }

      let localVideoPath = null;
      if (isInstalled) {
        try {
          const install = client.workshop.installInfo(id);
          if (install?.folder) {
            localVideoPath = findVideoInFolder(install.folder);
          }
        } catch (iErr) {
          console.warn('[workshop:getItemState] installInfo error:', iErr);
        }
      }

      return {
        ok: true,
        state: stateNum,
        isSubscribed,
        isInstalled,
        isNeedsUpdate,
        isDownloading,
        downloadProgress,
        localVideoPath,
        videoPath: localVideoPath,
      };
    } catch (err) {
      return { ok: false, error: err.message, state: 0 };
    }
  });

  // Download workshop item
  ipcMain.handle('workshop:downloadItem', async (_event, publishedFileId) => {
    const client = getSteamClient();
    if (!client || !client.workshop) return { ok: false, error: 'steam_not_available' };

    try {
      const id = BigInt(publishedFileId);
      const started = client.workshop.download(id, true);
      return { ok: true, started };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Subscribe to item
  ipcMain.handle('workshop:subscribe', async (_event, publishedFileId) => {
    const client = getSteamClient();
    if (!client || !client.workshop) return { ok: false, error: 'steam_not_available' };

    try {
      const id = BigInt(publishedFileId);
      await client.workshop.subscribe(id);
      client.workshop.download(id, true);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Unsubscribe from item
  ipcMain.handle('workshop:unsubscribe', async (_event, publishedFileId) => {
    const client = getSteamClient();
    if (!client || !client.workshop) return { ok: false, error: 'steam_not_available' };

    try {
      const id = BigInt(publishedFileId);

      // Locate local installed folder before unsubscribing
      let installFolder = null;
      try {
        const install = client.workshop.installInfo(id);
        if (install?.folder && fs.existsSync(install.folder)) {
          installFolder = install.folder;
        }
      } catch (iErr) {
        console.warn('[workshop:unsubscribe] installInfo query error:', iErr);
      }

      await client.workshop.unsubscribe(id);

      // Delete the downloaded item directory completely from user space / disk
      if (installFolder && fs.existsSync(installFolder)) {
        try {
          fs.rmSync(installFolder, { recursive: true, force: true });
          console.log('[workshop:unsubscribe] Successfully deleted local workshop folder:', installFolder);
        } catch (rmErr) {
          console.warn('[workshop:unsubscribe] Failed to delete workshop folder from disk:', rmErr);
        }
      }

      return { ok: true, deletedFolder: installFolder };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // Get user's subscribed items
  ipcMain.handle('workshop:getSubscribedItems', async () => {
    const client = getSteamClient();
    if (!client || !client.workshop) return { ok: false, items: [] };

    try {
      const subscribedIds = client.workshop.getSubscribedItems() || [];
      if (!subscribedIds.length) return { ok: true, items: [] };

      const detailsResult = await client.workshop.getItems(subscribedIds);
      const items = (detailsResult.items || [])
        .filter((item) => item && item.title && item.title.trim().length > 0 && !item.banned)
        .map((item) => {
          const serialized = serializeWorkshopItem(item);
          try {
            const install = client.workshop.installInfo(item.publishedFileId);
            if (install?.folder) {
              const foundPath = findVideoInFolder(install.folder);
              serialized.localVideoPath = foundPath;
              serialized.videoPath = foundPath;
            }
          } catch (iErr) {
            console.warn('[workshop:getSubscribedItems] installInfo error:', iErr);
          }
          return serialized;
        });

      return { ok: true, items };
    } catch (err) {
      return { ok: false, error: err.message, items: [] };
    }
  });

  // Publish / Upload new community wallpaper
  ipcMain.handle('workshop:publishItem', async (_event, payload) => {
    const client = getSteamClient();
    if (!client || !client.workshop) return { ok: false, error: 'steam_not_available' };

    try {
      const { title, description, videoPath, previewImagePath, tags } = payload;
      if (!videoPath || !fs.existsSync(videoPath)) {
        return { ok: false, error: 'A valid video file (.mp4 or .webm) is required.' };
      }
      if (!previewImagePath || !fs.existsSync(previewImagePath)) {
        return { ok: false, error: 'A preview image (.jpg or .png) is required.' };
      }
      if (!title || !title.trim()) {
        return { ok: false, error: 'A title is required.' };
      }
      if (!description || !description.trim()) {
        return { ok: false, error: 'A description is required.' };
      }

      // Hard limit of 100 MB for animated wallpaper video loops
      const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
      const videoStats = fs.statSync(videoPath);
      if (videoStats.size > MAX_VIDEO_BYTES) {
        const currentMB = (videoStats.size / (1024 * 1024)).toFixed(1);
        return {
          ok: false,
          error: `Video file size (${currentMB} MB) exceeds the 100 MB limit for wallpaper loops. Please choose a smaller video loop.`,
        };
      }

      // Safety check: NSFW classification with TensorFlow & NSFWJS
      const imgSafety = await checkImage(previewImagePath);
      if (imgSafety.isNsfw) {
        return {
          ok: false,
          error: imgSafety.reason || 'Preview image contains prohibited NSFW content.',
        };
      }

      const vidSafety = await checkVideo(videoPath);
      if (vidSafety.isNsfw) {
        return {
          ok: false,
          error: vidSafety.reason || 'Video contains prohibited NSFW content.',
        };
      }

      // Create workshop item entry on Steam
      const createRes = await client.workshop.createItem(appId);
      const itemId = createRes.itemId;

      // Prepare a staging content folder containing the video file
      const { app } = require('electron');
      const stagingDir = path.join(app.getPath('temp'), `zyphor_ugc_${itemId.toString()}`);
      fs.mkdirSync(stagingDir, { recursive: true });

      const destVideoPath = path.join(stagingDir, path.basename(videoPath));
      fs.copyFileSync(videoPath, destVideoPath);

      // Steam strictly requires preview images to be under 1MB (1,048,576 bytes).
      // Automatically optimize/compress using sharp so uploads never fail with 'limit exceeded'.
      let finalPreviewPath = previewImagePath;
      if (previewImagePath && fs.existsSync(previewImagePath)) {
        try {
          const stats = fs.statSync(previewImagePath);
          if (stats.size > 800 * 1024 || !/\.(jpe?g)$/i.test(previewImagePath)) {
            const sharp = require('sharp');
            const compressedPreview = path.join(stagingDir, 'preview.jpg');
            await sharp(previewImagePath)
              .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 85, progressive: true })
              .toFile(compressedPreview);
            finalPreviewPath = compressedPreview;
          }
        } catch (imgErr) {
          console.warn('[workshop:publishItem] Preview compression fallback:', imgErr);
        }
      }

      // Ensure official category tags are always attached
      const combinedTags = Array.from(
        new Set([
          'Launcher Background',
          'Wallpaper',
          ...(Array.isArray(tags) ? tags : []),
        ])
      );

      // Submit the item update with content folder and preview image
      const updateDetails = {
        title: title || 'Animated Background',
        description: description || 'Custom animated background for Zyphor Launcher.',
        contentPath: stagingDir,
        previewPath: finalPreviewPath,
        tags: combinedTags,
        visibility: typeof payload.visibility === 'number' ? payload.visibility : 0,
      };

      const updateRes = await client.workshop.updateItem(itemId, updateDetails);

      // Clean up staging folder
      try { fs.rmSync(stagingDir, { recursive: true, force: true }); } catch {}

      // Auto-subscribe the creator so they are subscribed in Steam client immediately
      try {
        await client.workshop.subscribe(itemId);
      } catch (subErr) {
        console.warn('[workshop:publishItem] auto-subscribe error:', subErr);
      }

      // Fetch the newly created item right away so it can be added to the UI live without relaunching
      let createdItem = null;
      try {
        const rawItem = await client.workshop.getItem(itemId);
        if (rawItem) {
          createdItem = serializeWorkshopItem(rawItem);
          createdItem.localVideoPath = videoPath;
          createdItem.videoPath = videoPath;
        }
      } catch (getErr) {
        console.warn('[workshop:publishItem] getItem error:', getErr);
      }

      return {
        ok: true,
        publishedFileId: itemId.toString(),
        needsToAcceptAgreement: updateRes.needsToAcceptAgreement,
        item: createdItem,
      };
    } catch (err) {
      console.error('[workshop:publishItem] error:', err);
      return { ok: false, error: err.message };
    }
  });
}

module.exports = { registerWorkshopHandlers };
