import { supabase } from "@/integrations/supabase/client";
import type { AppLanguage } from "@/lib/presence-types";

export interface RoomPresencePoint {
  latitude: number;
  longitude: number;
  updatedAt: string;
}

export function roundPresenceCoordinate(value: number) {
  return Math.round(value * 10) / 10;
}

export function getApproxDistance(
  source: { latitude: number; longitude: number },
  target: { latitude: number; longitude: number },
) {
  const earthRadiusKm = 6371;
  const sourceLat = (source.latitude * Math.PI) / 180;
  const targetLat = (target.latitude * Math.PI) / 180;
  const latDelta = ((target.latitude - source.latitude) * Math.PI) / 180;
  const lonDelta = ((target.longitude - source.longitude) * Math.PI) / 180;

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(sourceLat) * Math.cos(targetLat) * Math.sin(lonDelta / 2) * Math.sin(lonDelta / 2);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getPresenceLabel(distanceKm: number, language: AppLanguage) {
  if (distanceKm < 50) {
    return language === "el" ? "Κοντά" : "Nearby";
  }

  return language === "el" ? "Μακριά" : "Away";
}

export function getPresenceHelperCopy(distanceKm: number, language: AppLanguage) {
  if (distanceKm < 50) {
    return language === "el" ? "Κοντά." : "Close by.";
  }

  return language === "el" ? "Λίγο μακριά." : "Further away.";
}

interface RoomPresenceRow {
  room_id: string;
  user_id: string;
  coarse_latitude: number;
  coarse_longitude: number;
  updated_at: string;
}

export async function upsertRoomPresenceSignal(roomId: string, userId: string, point: RoomPresencePoint) {
  const { error } = await supabase.from("room_presence_signals").upsert(
    {
      room_id: roomId,
      user_id: userId,
      coarse_latitude: roundPresenceCoordinate(point.latitude),
      coarse_longitude: roundPresenceCoordinate(point.longitude),
      updated_at: point.updatedAt,
    },
    {
      onConflict: "room_id,user_id",
    },
  );

  if (error) {
    throw error;
  }
}

export async function loadRoomPresenceSignals(roomId: string) {
  const { data, error } = await supabase
    .from("room_presence_signals")
    .select("room_id, user_id, coarse_latitude, coarse_longitude, updated_at")
    .eq("room_id", roomId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    room_id: row.room_id,
    user_id: row.user_id,
    coarse_latitude: Number(row.coarse_latitude),
    coarse_longitude: Number(row.coarse_longitude),
    updated_at: row.updated_at,
  })) as RoomPresenceRow[];
}

export async function deleteRoomPresenceSignal(roomId: string, userId: string) {
  const { error } = await supabase.from("room_presence_signals").delete().eq("room_id", roomId).eq("user_id", userId);

  if (error) {
    throw error;
  }
}
