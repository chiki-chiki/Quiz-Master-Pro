import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { WS_EVENTS, type WsMessage } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";

const MemoryStoreSession = MemoryStore(session);

import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage_multer });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Serve uploaded files
  app.use("/uploads", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  }, (req, res, next) => {
    const filePath = path.join(uploadDir, req.path);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    next();
  });

  // Upload endpoint
  app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  });
  
  // Session setup
  const sessionMiddleware = session({
    secret: 'quiz-secret', // In production use environment variable
    resave: false,
    saveUninitialized: false,
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: { secure: process.env.NODE_ENV === "production" }
  });

  app.use(sessionMiddleware);

  // WebSocket Setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Broadcast helper
  const broadcast = (message: WsMessage) => {
    const data = JSON.stringify(message);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  };

  wss.on('connection', (ws) => {
    // console.log('Client connected');
  });


  // === API ROUTES ===

  // --- Auth ---
  app.post(api.auth.login.path, async (req, res) => {
    const input = api.auth.login.input.parse(req.body);
    let user = await storage.getUserByName(input.name);
    if (!user) {
      user = await storage.createUser({ name: input.name });
    }
    
    // Set session
    (req.session as any).userId = user.id;
    
    // Broadcast join
    broadcast({ type: WS_EVENTS.USER_JOIN, payload: user });

    res.json(user);
  });

  app.get(api.auth.me.path, async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(userId);
    if (!user) {
        return res.status(401).json({ message: "User not found" });
    }
    res.json(user);
  });

  app.post(api.auth.logout.path, (req, res) => {
      req.session.destroy(() => {
          res.json({ success: true });
      });
  });

  // Reset endpoint
  app.post("/api/reset", async (req, res) => {
    await storage.resetAllData();
    broadcast({ type: WS_EVENTS.QUIZ_UPDATE, payload: null });
    broadcast({ type: WS_EVENTS.STATE_UPDATE, payload: await storage.getAppState() });
    broadcast({ type: WS_EVENTS.SCORE_UPDATE, payload: [] });
    res.json({ success: true });
  });

  // --- Quizzes ---
  app.get(api.quizzes.list.path, async (req, res) => {
    const quizzes = await storage.getQuizzes();
    res.json(quizzes);
  });

  app.post(api.quizzes.create.path, async (req, res) => {
    const quiz = await storage.createQuiz(req.body);
    broadcast({ type: WS_EVENTS.QUIZ_UPDATE, payload: null });
    res.status(201).json(quiz);
  });

  app.put(api.quizzes.update.path, async (req, res) => {
    const quiz = await storage.updateQuiz(Number(req.params.id), req.body);
    broadcast({ type: WS_EVENTS.QUIZ_UPDATE, payload: quiz }); 
    res.json(quiz);
  });
  
  app.delete(api.quizzes.delete.path, async (req, res) => {
      await storage.deleteQuiz(Number(req.params.id));
      broadcast({ type: WS_EVENTS.QUIZ_UPDATE, payload: null });
      res.status(204).end();
  });

  // --- State ---
  app.get(api.state.get.path, async (req, res) => {
    const state = await storage.getAppState();
    res.json(state);
  });

  app.get('/api/leaderboard', async (req, res) => {
    const leaderboard = await storage.getLeaderboard();
    res.json(leaderboard);
  });

  app.post(api.state.update.path, async (req, res) => {
    const newState = await storage.updateAppState(req.body);
    broadcast({ type: WS_EVENTS.STATE_UPDATE, payload: newState });
    if (req.body.isResultRevealed) {
      const leaderboard = await storage.getLeaderboard();
      broadcast({ type: WS_EVENTS.SCORE_UPDATE, payload: leaderboard });
    }
    return res.json(newState);
  });

  // --- Responses ---
  app.get(api.responses.list.path, async (req, res) => {
    const allResponses = await storage.getResponses();
    res.json(allResponses);
  });

  app.post(api.responses.submit.path, async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    
    const response = await storage.createResponse({
        ...req.body,
        userId: userId
    });

    broadcast({ type: WS_EVENTS.RESPONSE_UPDATE, payload: response });
    res.json(response);
  });

  // --- Seed Data ---
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
    const existing = await storage.getQuizzes();
    if (existing.length === 0) {
        console.log("Seeding quizzes...");
        await storage.createQuiz({
            question: "世界で一番高い山は？",
            optionA: "富士山",
            optionB: "エベレスト",
            optionC: "K2",
            optionD: "マッターホルン",
            correctAnswer: "B",
            order: 1
        });
        await storage.createQuiz({
            question: "「HTML」の「H」は何の略？",
            optionA: "High",
            optionB: "Home",
            optionC: "Hyper",
            optionD: "Hybrid",
            correctAnswer: "C",
            order: 2
        });
        await storage.createQuiz({
            question: "太陽系で一番大きな惑星は？",
            optionA: "地球",
            optionB: "土星",
            optionC: "火星",
            optionD: "木星",
            correctAnswer: "D",
            order: 3
        });
        await storage.createQuiz({
            question: "プログラミング言語「Python」の名前の由来は？",
            optionA: "蛇のニシキヘビ",
            optionB: "コメディ番組「空飛ぶモンティ・パイソン」",
            optionC: "開発者のペットの名前",
            optionD: "ギリシャ神話の怪物",
            correctAnswer: "B",
            order: 4
        });
         await storage.createQuiz({
            question: "日本の現在の首都は？",
            optionA: "大阪",
            optionB: "京都",
            optionC: "東京",
            optionD: "福岡",
            correctAnswer: "C",
            order: 5
        });
    }
}
