const functions = require("firebase-functions");
const admin = require("firebase-admin");
const path = require("path");
const os = require("os");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

admin.initializeApp();

// Note: Cloud Functions (Ubuntu base image) generally has ffmpeg pre-installed.
// If it fails to find ffmpeg in the cloud, we can try using fluent-ffmpeg's setFfmpegPath.

exports.optimizeSermonVideo = functions
  .runWith({
    memory: "4GB",
    timeoutSeconds: 540,
  })
  .storage.bucket("nazarenechurch-9c030.firebasestorage.app")
  .object()
  .onFinalize(async (object) => {
    const fileBucket = object.bucket;
    const filePath = object.name;
    const contentType = object.contentType;

  // We only care about videos uploaded to the 'raw' folder
  // Path format: churches/{churchId}/sermons/{sermonId}/media/raw/{filename}
  if (!filePath.includes("/media/raw/")) {
    console.log("File is not in the raw folder. Skipping.");
    return null;
  }

  // Only process video files
  if (!contentType.startsWith("video/")) {
    console.log("This is not a video. Skipping.");
    return null;
  }

  console.log(`Starting optimization for ${filePath}`);

  // Extract path components
  // e.g. churches/123/sermons/456/media/raw/video.mp4
  const pathParts = filePath.split("/");
  const sermonId = pathParts[3]; // assuming standard path depth
  const fileName = path.basename(filePath);
  
  // Destination paths
  const optimizedFileName = `optimized_${fileName}`;
  const optimizedFilePath = filePath.replace("/media/raw/", "/media/optimized/").replace(fileName, optimizedFileName);

  const bucket = admin.storage().bucket(fileBucket);
  const tempFilePath = path.join(os.tmpdir(), fileName);
  const tempOptimizedPath = path.join(os.tmpdir(), optimizedFileName);

  try {
    // 1. Download the raw file
    console.log("Downloading raw file to temp storage...");
    await bucket.file(filePath).download({ destination: tempFilePath });
    console.log("Download complete.");

    // 2. Transcode to 720p using ffmpeg
    console.log("Transcoding to 720p...");
    await new Promise((resolve, reject) => {
      ffmpeg(tempFilePath)
        .videoCodec("libx264")
        .audioCodec("aac")
        .outputOptions([
          "-vf scale=-2:720", // 720p
          "-crf 28", // Good balance between quality and size
          "-preset fast",
        ])
        .on("end", () => {
          console.log("Transcoding finished successfully.");
          resolve();
        })
        .on("error", (err) => {
          console.error("Error during transcoding:", err);
          reject(err);
        })
        .save(tempOptimizedPath);
    });

    // 3. Upload the optimized file
    console.log("Uploading optimized file...");
    await bucket.upload(tempOptimizedPath, {
      destination: optimizedFilePath,
      metadata: {
        contentType: contentType,
      },
    });

    // 4. Generate signed URL or just get public URL
    // For standard Firebase Storage rules, we usually store the path and use getDownloadURL on the client,
    // or we can construct the persistent download URL.
    // Constructing standard Firebase Storage download URL:
    const fileRef = bucket.file(optimizedFilePath);
    await fileRef.makePublic(); // Make public if your bucket allows it, otherwise use a token
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(optimizedFilePath)}`;

    console.log("Upload complete. Updating Firestore...");

    // 5. Update Firestore Document
    const db = admin.firestore();
    await db.collection("sermons").doc(sermonId).update({
      videoStoragePath: optimizedFilePath,
      videoUrl: publicUrl,
      // You could update status here if you want it to automatically publish
      // status: 'published',
    });

    console.log("Optimization process finished completely!");

  } catch (error) {
    console.error("Optimization process failed:", error);
    
    // Optionally update Firestore to indicate failure
    if (sermonId) {
      try {
        await admin.firestore().collection("sermons").doc(sermonId).update({
          optimizationError: error.message || "Failed to process video"
        });
      } catch (e) {
        console.error("Failed to write error to Firestore", e);
      }
    }
  } finally {
    // Clean up temp files
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    if (fs.existsSync(tempOptimizedPath)) fs.unlinkSync(tempOptimizedPath);
  }

  return null;
});
