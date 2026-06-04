import { supabase } from "@/integrations/supabase/client";
import type { RatingScore } from "@/lib/presence-types";

const FEEDBACK_SCREENSHOT_BUCKET = "room-feedback-screenshots";

export interface RoomFeedbackInput {
  roomId: string;
  rating: RatingScore;
  message: string;
  includeDebug: boolean;
  screenshot: File | null;
  userType: string;
  roomState: string;
}

function detectBrowser() {
  const userAgent = navigator.userAgent;

  if (userAgent.includes("Edg/")) {
    return "Microsoft Edge";
  }

  if (userAgent.includes("Firefox/")) {
    return "Firefox";
  }

  if (userAgent.includes("Chrome/") && !userAgent.includes("Edg/")) {
    return "Chrome";
  }

  if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) {
    return "Safari";
  }

  return "Browser";
}

function detectDevice(roomState: string) {
  const browserNavigator = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = browserNavigator.userAgentData?.platform ?? navigator.platform ?? "Unknown device";
  const viewport = `${window.innerWidth}×${window.innerHeight}`;
  return `${platform} · ${viewport} · room: ${roomState}`;
}

function getScreenshotExtension(file: File) {
  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  if (file.type === "image/gif") {
    return "gif";
  }

  return "jpg";
}

async function uploadScreenshot(roomId: string, file: File) {
  const fileExtension = getScreenshotExtension(file);
  const path = `${roomId}/${crypto.randomUUID()}.${fileExtension}`;

  const { error } = await supabase.storage.from(FEEDBACK_SCREENSHOT_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(FEEDBACK_SCREENSHOT_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function submitRoomFeedback(input: RoomFeedbackInput) {
  const trimmedMessage = input.message.trim();
  const screenshotUrl = input.screenshot ? await uploadScreenshot(input.roomId, input.screenshot).catch(() => null) : null;

  const { error } = await supabase.from("room_feedback").insert({
    room_id: input.roomId,
    rating: input.rating,
    message: trimmedMessage || null,
    include_debug: input.includeDebug,
    browser: input.includeDebug ? detectBrowser() : null,
    device: input.includeDebug ? detectDevice(input.roomState) : null,
    user_type: input.userType,
    screenshot_url: screenshotUrl,
  });

  if (error) {
    throw error;
  }
}

export function getRoomFeedbackPrompt(rating: RatingScore, language: "en" | "el") {
  if (rating === "good") {
    return language === "en" ? "Anything you enjoyed?" : "Τι σου άρεσε περισσότερο;";
  }

  if (rating === "neutral") {
    return language === "en" ? "What could feel better?" : "Τι θα μπορούσε να γίνει καλύτερο;";
  }

  return language === "en" ? "What went wrong?" : "Τι πήγε στραβά;";
}

export function getRoomFeedbackTitle(rating: RatingScore, language: "en" | "el") {
  if (rating === "good") {
    return language === "en" ? "Glad it felt good" : "Χαιρόμαστε που πήγε καλά";
  }

  if (rating === "neutral") {
    return language === "en" ? "Thanks for the note" : "Ευχαριστούμε για τη σημείωση";
  }

  return language === "en" ? "We’re sorry it was rough" : "Λυπούμαστε που ήταν δύσκολο";
}

export function getRoomFeedbackNote(language: "en" | "el") {
  return language === "en"
    ? "Optional. A short note helps us understand the room better."
    : "Προαιρετικό. Μια σύντομη σημείωση βοηθά να καταλάβουμε καλύτερα το room.";
}
