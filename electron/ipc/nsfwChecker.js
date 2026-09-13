const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { execFile } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const tf = require('@tensorflow/tfjs');
const nsfwjs = require('nsfwjs');
const sharp = require('sharp');

let nsfwModelPromise = null;

/**
 * Lazy loads the NSFWJS MobileNetV2 model once and caches it.
 */
async function getModel() {
  if (!nsfwModelPromise) {
    nsfwModelPromise = nsfwjs.load('MobileNetV2').catch((err) => {
      // Fallback if parameter signature differs
      return nsfwjs.load();
    });
  }
  return nsfwModelPromise;
}

/**
 * Evaluates predictions from nsfwjs.
 * Classes: Drawing, Hentai, Neutral, Porn, Sexy
 */
function evaluatePredictions(predictions) {
  const porn = predictions.find((p) => p.className === 'Porn')?.probability || 0;
  const hentai = predictions.find((p) => p.className === 'Hentai')?.probability || 0;
  const sexy = predictions.find((p) => p.className === 'Sexy')?.probability || 0;

  if (porn >= 0.35 || hentai >= 0.35 || (porn + hentai) >= 0.40) {
    const highest = Math.max(porn, hentai);
    return {
      isNsfw: true,
      reason: `Adult or pornographic content detected (${Math.round(highest * 100)}% confidence). Adult content is strictly forbidden on Steam Workshop.`,
      scores: { porn, hentai, sexy },
    };
  }

  if (sexy >= 0.70) {
    return {
      isNsfw: true,
      reason: `Sexually suggestive or explicit content detected (${Math.round(sexy * 100)}% confidence). Steam Workshop strictly prohibits NSFW content.`,
      scores: { porn, hentai, sexy },
    };
  }

  return { isNsfw: false, scores: { porn, hentai, sexy } };
}

/**
 * Checks an image file for NSFW content.
 * @param {string} imagePath
 * @returns {Promise<{ isNsfw: boolean, reason?: string, scores?: object }>}
 */
async function checkImage(imagePath) {
  if (!imagePath || !fs.existsSync(imagePath)) {
    return { isNsfw: false };
  }

  try {
    const model = await getModel();
    const imgBuffer = await sharp(imagePath)
      .resize(224, 224, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const tensor = tf.tensor3d(
      new Uint8Array(imgBuffer.data),
      [imgBuffer.info.height, imgBuffer.info.width, 3],
      'int32'
    );

    const predictions = await model.classify(tensor);
    tensor.dispose();

    const evaluation = evaluatePredictions(predictions);
    if (evaluation.isNsfw) {
      console.warn('[nsfwChecker] NSFW detected in image:', imagePath, evaluation);
    }
    return evaluation;
  } catch (err) {
    console.error('[nsfwChecker] checkImage error:', err);
    return { isNsfw: false, error: err.message };
  }
}

/**
 * Extracts sample frames from a video file and checks each for NSFW content.
 * @param {string} videoPath
 * @returns {Promise<{ isNsfw: boolean, reason?: string, scores?: object }>}
 */
async function checkVideo(videoPath) {
  if (!videoPath || !fs.existsSync(videoPath)) {
    return { isNsfw: false };
  }

  const tempDir = path.join(
    app.getPath('temp'),
    `zyphor_nsfw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  );
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Extract up to 5 sample frames spread across the video
    await new Promise((resolve, reject) => {
      execFile(
        ffmpeg,
        [
          '-y',
          '-i', videoPath,
          '-vf', 'fps=1/2,scale=224:224',
          '-vframes', '5',
          path.join(tempDir, 'frame_%03d.jpg'),
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    let frameFiles = fs.readdirSync(tempDir).filter((f) => f.endsWith('.jpg'));
    if (!frameFiles.length) {
      // Fallback: extract single frame at 0s
      await new Promise((resolve, reject) => {
        execFile(
          ffmpeg,
          [
            '-y',
            '-i', videoPath,
            '-vframes', '1',
            '-vf', 'scale=224:224',
            path.join(tempDir, 'frame_001.jpg'),
          ],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      frameFiles = fs.readdirSync(tempDir).filter((f) => f.endsWith('.jpg'));
    }

    if (!frameFiles.length) {
      return { isNsfw: false };
    }

    const model = await getModel();
    for (const frameFile of frameFiles) {
      const framePath = path.join(tempDir, frameFile);
      const imgBuffer = await sharp(framePath)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const tensor = tf.tensor3d(
        new Uint8Array(imgBuffer.data),
        [imgBuffer.info.height, imgBuffer.info.width, 3],
        'int32'
      );

      const predictions = await model.classify(tensor);
      tensor.dispose();

      const evaluation = evaluatePredictions(predictions);
      if (evaluation.isNsfw) {
        console.warn('[nsfwChecker] NSFW detected in video frame:', videoPath, frameFile, evaluation);
        return evaluation;
      }
    }

    return { isNsfw: false };
  } catch (err) {
    console.error('[nsfwChecker] checkVideo error:', err);
    return { isNsfw: false, error: err.message };
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

module.exports = {
  checkImage,
  checkVideo,
};
