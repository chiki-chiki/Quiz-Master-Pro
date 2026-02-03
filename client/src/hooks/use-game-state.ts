import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type AdminUpdateStateRequest, type SubmitResponseRequest } from "@shared/schema";

export function useGameState() {
  return useQuery({
    queryKey: [api.state.get.path],
    queryFn: async () => {
      const res = await fetch(api.state.get.path);
      if (!res.ok) throw new Error("Failed to fetch game state");
      return api.state.get.responses[200].parse(await res.json());
    },
    refetchInterval: 5000, // Fallback polling in case WS fails
  });
}

export function useUpdateGameState() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AdminUpdateStateRequest) => {
      const res = await fetch(api.state.update.path, {
        method: api.state.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update state");
      return api.state.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.state.get.path] });
    },
  });
}

export function useSubmitResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SubmitResponseRequest) => {
      const res = await fetch(api.responses.submit.path, {
        method: api.responses.submit.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to submit response");
      return api.responses.submit.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      // Invalidate responses list if we are watching it
      queryClient.invalidateQueries({ queryKey: [api.responses.list.path] });
    },
  });
}

export function useAllResponses() {
  return useQuery({
    queryKey: [api.responses.list.path],
    queryFn: async () => {
      const res = await fetch(api.responses.list.path);
      if (!res.ok) throw new Error("Failed to fetch responses");
      return api.responses.list.responses[200].parse(await res.json());
    },
  });
}
