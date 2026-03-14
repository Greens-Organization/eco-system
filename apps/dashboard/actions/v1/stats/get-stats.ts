"use server"

import { api } from "@/lib/api";
import { safeFetch } from "@/lib/api/safe-action";


export async function getStats() {
  const res = await safeFetch(api.stats.$get());

  if (!res.success) return null;

  return res.data;
}
