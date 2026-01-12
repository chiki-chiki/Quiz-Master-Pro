import { db } from "./db";
import {
  users, quizzes, responses, appState,
  type User, type InsertUser,
  type Quiz, type InsertQuiz,
  type Response, type InsertResponse,
  type AppState
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByName(name: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getLeaderboard(): Promise<User[]>;
  incrementUserScore(userId: number): Promise<void>;
  
  // Quizzes
  getQuizzes(): Promise<Quiz[]>;
  getQuiz(id: number): Promise<Quiz | undefined>;
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  updateQuiz(id: number, updates: Partial<InsertQuiz>): Promise<Quiz>;
  deleteQuiz(id: number): Promise<void>;

  // Responses
  getResponses(): Promise<(Response & { userName: string })[]>;
  getResponsesForQuiz(quizId: number): Promise<Response[]>;
  createResponse(response: InsertResponse): Promise<Response>;
  getUserResponseForQuiz(userId: number, quizId: number): Promise<Response | undefined>;
  markResponsesCorrect(quizId: number, correctAnswer: string): Promise<number[]>;

  // App State
  getAppState(): Promise<AppState>;
  updateAppState(updates: Partial<AppState>): Promise<AppState>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByName(name: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.name, name));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getLeaderboard(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isAdmin, false)).orderBy(sql`${users.score} DESC`, users.name);
  }

  async incrementUserScore(userId: number): Promise<void> {
    await db.update(users)
      .set({ score: sql`${users.score} + 1` })
      .where(eq(users.id, userId));
  }

  async getQuizzes(): Promise<Quiz[]> {
    return await db.select().from(quizzes).orderBy(quizzes.order);
  }

  async getQuiz(id: number): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz;
  }

  async createQuiz(insertQuiz: InsertQuiz): Promise<Quiz> {
    const [quiz] = await db.insert(quizzes).values(insertQuiz).returning();
    return quiz;
  }

  async updateQuiz(id: number, updates: Partial<InsertQuiz>): Promise<Quiz> {
    const [updated] = await db.update(quizzes)
      .set(updates)
      .where(eq(quizzes.id, id))
      .returning();
    return updated;
  }

  async deleteQuiz(id: number): Promise<void> {
    await db.delete(quizzes).where(eq(quizzes.id, id));
  }

  async getResponses(): Promise<(Response & { userName: string })[]> {
    const result = await db.select({
      id: responses.id,
      userId: responses.userId,
      quizId: responses.quizId,
      selection: responses.selection,
      isCorrect: responses.isCorrect,
      userName: users.name,
    })
    .from(responses)
    .innerJoin(users, eq(responses.userId, users.id));
    return result;
  }

  async getResponsesForQuiz(quizId: number): Promise<Response[]> {
    return await db.select().from(responses).where(eq(responses.quizId, quizId));
  }

  async getUserResponseForQuiz(userId: number, quizId: number): Promise<Response | undefined> {
    const [response] = await db.select().from(responses)
      .where(and(eq(responses.userId, userId), eq(responses.quizId, quizId)));
    return response;
  }

  async createResponse(insertResponse: InsertResponse): Promise<Response> {
    const state = await this.getAppState();
    if (state.isResultRevealed) {
        throw new Error("Cannot change response after results are revealed");
    }

    const quiz = await this.getQuiz(insertResponse.quizId);
    const isCorrect = quiz ? quiz.correctAnswer === insertResponse.selection : false;

    const existing = await this.getUserResponseForQuiz(insertResponse.userId, insertResponse.quizId);
    if (existing) {
        const [updated] = await db.update(responses)
            .set({ selection: insertResponse.selection, isCorrect })
            .where(eq(responses.id, existing.id))
            .returning();
        return updated;
    }
    const [response] = await db.insert(responses).values({ ...insertResponse, isCorrect }).returning();
    return response;
  }

  async markResponsesCorrect(quizId: number, correctAnswer: string): Promise<number[]> {
    const correctResponses = await db.update(responses)
      .set({ isCorrect: true })
      .where(and(eq(responses.quizId, quizId), eq(responses.selection, correctAnswer)))
      .returning();
    return correctResponses.map(r => r.userId);
  }

  async getAppState(): Promise<AppState> {
    const [state] = await db.select().from(appState);
    if (!state) {
      const [newState] = await db.insert(appState).values({
        currentQuizId: null,
        isResultRevealed: false
      }).returning();
      return newState;
    }
    return state;
  }

  async updateAppState(updates: Partial<AppState>): Promise<AppState> {
    const currentState = await this.getAppState();
    
    // タイマーが開始された場合、またはクイズが切り替わった場合にタイマーをリセット
    if (updates.currentQuizId !== undefined && updates.currentQuizId !== currentState.currentQuizId) {
      updates.timerStartedAt = null;
    }

    const [updated] = await db.update(appState)
      .set(updates)
      .where(eq(appState.id, currentState.id))
      .returning();

    // 正解発表されたタイミングで、その問題の正解者のスコアを加算する
    if (updates.isResultRevealed === true && currentState.isResultRevealed === false && currentState.currentQuizId) {
      const quiz = await this.getQuiz(currentState.currentQuizId);
      if (quiz) {
        const correctUserIds = await this.markResponsesCorrect(quiz.id, quiz.correctAnswer);
        for (const userId of correctUserIds) {
          await this.incrementUserScore(userId);
        }
      }
    }
    return updated;
  }
}

export const storage = new DatabaseStorage();