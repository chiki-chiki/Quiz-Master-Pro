import { db } from "./db";
import {
  users, quizzes, responses, appState,
  type User, type InsertUser,
  type Quiz, type InsertQuiz,
  type Response, type InsertResponse,
  type AppState
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByName(name: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Quizzes
  getQuizzes(): Promise<Quiz[]>;
  getQuiz(id: number): Promise<Quiz | undefined>;
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  updateQuiz(id: number, updates: Partial<InsertQuiz>): Promise<Quiz>;
  deleteQuiz(id: number): Promise<void>;

  // Responses
  getResponses(): Promise<(Response & { userName: string })[]>; // 名前も返す
  getResponsesForQuiz(quizId: number): Promise<Response[]>;
  createResponse(response: InsertResponse): Promise<Response>;
  getUserResponseForQuiz(userId: number, quizId: number): Promise<Response | undefined>;

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
    // ユーザー名もjoinして返す
    const result = await db.select({
      id: responses.id,
      userId: responses.userId,
      quizId: responses.quizId,
      selection: responses.selection,
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
    // 同じクイズへの回答があれば更新、なければ作成
    const existing = await this.getUserResponseForQuiz(insertResponse.userId, insertResponse.quizId);
    if (existing) {
        const [updated] = await db.update(responses)
            .set({ selection: insertResponse.selection })
            .where(eq(responses.id, existing.id))
            .returning();
        return updated;
    }
    const [response] = await db.insert(responses).values(insertResponse).returning();
    return response;
  }

  async getAppState(): Promise<AppState> {
    const [state] = await db.select().from(appState);
    if (!state) {
      // 初期化
      const [newState] = await db.insert(appState).values({
        currentQuizId: null,
        isResultRevealed: false
      }).returning();
      return newState;
    }
    return state;
  }

  async updateAppState(updates: Partial<AppState>): Promise<AppState> {
    // 常にID=1を更新と仮定（またはgetAppStateで取れたID）
    const currentState = await this.getAppState();
    const [updated] = await db.update(appState)
      .set(updates)
      .where(eq(appState.id, currentState.id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
