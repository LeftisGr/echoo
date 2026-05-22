import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function upperWithoutAccents(value: string, locale: string = "el") {
  return value
    .toLocaleUpperCase(locale)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
