import { getConfig } from "../config";
import { OpenWaDriver } from "./openwa-driver";
import { CloudApiDriver } from "./cloud-api-driver";
import type { BeregamGateway } from "./gateway";

export type { BeregamGateway, OpsiKirim } from "./gateway";

let tersimpan: BeregamGateway | null = null;

/**
 * Memilih driver sesuai konfigurasi.
 *
 * BeregamService tidak pernah tahu driver mana yang dipakai - ia hanya
 * bicara lewat antarmuka BeregamGateway. Itulah yang membuat pergantian
 * engine nanti tidak menyentuh logika bot sama sekali.
 */
export function getGateway(): BeregamGateway {
  if (tersimpan) return tersimpan;

  const { driver } = getConfig();
  tersimpan = driver === "cloud-api" ? new CloudApiDriver() : new OpenWaDriver();
  return tersimpan;
}
