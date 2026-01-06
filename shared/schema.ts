import { pgTable, text, serial, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// ユーザー（参加者）
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isAdmin: boolean("is_admin").default(false), // 管理者フラグ
  score: integer("score").default(0).notNull(), // 合計スコア
});

// クイズ問題
export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctAnswer: text("correct_answer").notNull(), // 'A', 'B', 'C', 'D'
  order: integer("order").notNull(), // 表示順
});

// 回答
export const responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  quizId: integer("quiz_id").notNull(),
  selection: text("selection").notNull(), // 'A', 'B', 'C', 'D'
  isCorrect: boolean("is_correct").default(false).notNull(),
});

// アプリケーションの状態（現在の問題など）
export const appState = pgTable("app_state", {
  id: serial("id").primaryKey(), // 常に1つのレコードのみ使用
  currentQuizId: integer("current_quiz_id"), // nullなら待機中
  isResultRevealed: boolean("is_result_revealed").default(false),
});

// === SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).omit({ id: true, isAdmin: true, score: true });
export const insertQuizSchema = createInsertSchema(quizzes).omit({ id: true });
export const insertResponseSchema = createInsertSchema(responses).omit({ id: true, isCorrect: true });
export const insertAppStateSchema = createInsertSchema(appState).omit({ id: true });

// === EXPLICIT TYPES ===
export type User = typeof users.$inferSelect;
export type Quiz = typeof quizzes.$inferSelect;
export type Response = typeof responses.$inferSelect;
export type AppState = typeof appState.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type InsertResponse = z.infer<typeof insertResponseSchema>;

// API Requests
export type LoginRequest = { name: string };
export type SubmitResponseRequest = { quizId: number; selection: string };
export type AdminUpdateStateRequest = { currentQuizId: number | null; isResultRevealed: boolean };

// WebSocket Messages
export const WS_EVENTS = {
  STATE_UPDATE: 'state_update', // 現在の問題や公開状態が変わった
  RESPONSE_UPDATE: 'response_update', // 誰かが回答した
  QUIZ_UPDATE: 'quiz_update', // 問題文や選択肢が編集された
  USER_JOIN: 'user_join', // 新しいユーザーが参加した
  SCORE_UPDATE: 'score_update', // スコアが更新された
} as const;

export interface WsMessage<T = unknown> {
  type: keyof typeof WS_EVENTS;
  payload: T;
}
