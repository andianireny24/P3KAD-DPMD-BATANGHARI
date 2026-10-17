import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import type { Me } from "@/lib/types";

// lib/session owns the session cache: never hand-roll login/logout cache handling elsewhere.
export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: () => apiGet<Me>("/auth/me") });
}

export async function beginSession() {
  await queryClient.invalidateQueries({ queryKey: ["me"] });
}

export async function endSession() {
  try {
    await apiPost("/auth/logout");
  } finally {
    queryClient.clear();
    await queryClient.invalidateQueries({ queryKey: ["me"] });
  }
}
