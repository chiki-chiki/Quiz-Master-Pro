import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertQuiz } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useQuizzes() {
  return useQuery({
    queryKey: [api.quizzes.list.path],
    queryFn: async () => {
      const res = await fetch(api.quizzes.list.path);
      if (!res.ok) throw new Error("Failed to fetch quizzes");
      return api.quizzes.list.responses[200].parse(await res.json());
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useCreateQuiz() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertQuiz) => {
      const res = await fetch(api.quizzes.create.path, {
        method: api.quizzes.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create quiz");
      return api.quizzes.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.quizzes.list.path] });
      toast({ title: "Quiz Created", description: "The question has been added." });
    },
  });
}

export function useUpdateQuiz() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<InsertQuiz> & { id: number }) => {
      const url = buildUrl(api.quizzes.update.path, { id });
      const res = await fetch(url, {
        method: api.quizzes.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update quiz");
      return api.quizzes.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.quizzes.list.path] });
      toast({ title: "Updated", description: "Changes saved successfully." });
    },
  });
}

export function useDeleteQuiz() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.quizzes.delete.path, { id });
      const res = await fetch(url, { method: api.quizzes.delete.method });
      if (!res.ok) throw new Error("Failed to delete quiz");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.quizzes.list.path] });
      toast({ title: "Deleted", description: "Question removed." });
    },
  });
}
