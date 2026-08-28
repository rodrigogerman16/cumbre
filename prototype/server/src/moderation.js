// Content moderation hook for uploaded photos/video.
//
// PRODUCTION: replace `moderateBuffer` below with a real call to an image/video
// moderation API before the file is written to permanent storage, e.g.:
//
//   Sightengine   POST https://api.sightengine.com/1.0/check.json (models=nudity-2.1)
//   Google Cloud Vision SafeSearch  -> annotateImage({ features: [{type: "SAFE_SEARCH_DETECTION"}] })
//   AWS Rekognition DetectModerationLabels
//
// For video, sample frames at a fixed interval (e.g. every 2s) and moderate
// each frame the same way; reject the whole upload if any sampled frame fails.
//
// Route handlers only rely on the shape returned here — { status, reason } —
// so swapping the implementation doesn't require touching src/routes/*.

const STUB_MODE = (process.env.MODERATION_MODE || "stub") === "stub";

export async function moderateBuffer(buffer, mimeType) {
  if (!STUB_MODE) {
    throw new Error("No real moderation provider configured. Set MODERATION_MODE and implement the API call here.");
  }

  // Stub behavior for local development: everything is approved automatically
  // since there is no real classifier wired up in this sandbox. This is NOT
  // safe for a real deployment — ship this behind a real provider before
  // accepting user uploads in production.
  return {
    status: "APPROVED",
    reason: null,
  };
}
