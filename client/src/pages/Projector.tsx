import { useGameState, useAllResponses } from "@/hooks/use-game-state";
import { useQuizzes } from "@/hooks/use-quizzes";
import { useWebSocket } from "@/hooks/use-websocket";
import { Layout } from "@/components/ui/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { User, WS_EVENTS } from "@shared/schema";
import { Loader2, Trophy } from "lucide-react";
import { useState, useEffect } from "react";

export default function Projector() {
  const { data: initialLeaderboard } = useGameState(); // We'll use a separate state for leaderboard
  const [leaderboard, setLeaderboard] = useState<User[]>([]);

  useWebSocket((message: WsMessage) => {
    if (message.type === WS_EVENTS.SCORE_UPDATE) {
      setLeaderboard(message.payload as User[]);
    }
  });

  useEffect(() => {
    // Fetch initial leaderboard
    fetch('/api/leaderboard').then(res => res.json()).then(data => setLeaderboard(data));
  }, []);

  const { data: state } = useGameState();
  const { data: quizzes } = useQuizzes();
  const { data: responses } = useAllResponses();
  
  const currentQuiz = quizzes?.find((q) => q.id === state?.currentQuizId);
  const showResults = state?.isResultRevealed;

  // Derive connected users from responses? 
  // Ideally backend provides a list of online users, but for now we visualize based on responses + unique IDs
  // In a real app, we'd have a specific "online users" endpoint or store.
  // We'll use the responses to visualize "who is here and answered" for the current quiz.
  
  // Group responses for chart if results revealed
  const stats = { A: 0, B: 0, C: 0, D: 0 };
  if (responses && currentQuiz) {
    responses.forEach(r => {
      if (r.quizId === currentQuiz.id && r.selection in stats) {
        stats[r.selection as keyof typeof stats]++;
      }
    });
  }

  const totalResponses = responses?.filter(r => r.quizId === currentQuiz?.id).length || 0;

  if (!currentQuiz) {
    return (
      <Layout className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center space-y-8 animate-pulse">
          <h1 className="text-8xl font-black tracking-tighter bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
            QUIZ NIGHT
          </h1>
          <p className="text-4xl text-neutral-400 font-light">Join now on your device</p>
          <div className="mt-12 p-8 border-4 border-white/20 rounded-3xl inline-block">
            <span className="text-6xl font-mono tracking-widest">WAITING...</span>
          </div>
        </div>
      </Layout>
    );
  }

  const options = [
    { label: "A", text: currentQuiz.optionA, color: "bg-red-500", count: stats.A },
    { label: "B", text: currentQuiz.optionB, color: "bg-blue-500", count: stats.B },
    { label: "C", text: currentQuiz.optionC, color: "bg-green-500", count: stats.C },
    { label: "D", text: currentQuiz.optionD, color: "bg-yellow-500", count: stats.D },
  ];

  return (
    <Layout className="h-screen flex flex-col p-8 bg-neutral-900 text-white overflow-hidden">
      {/* Header Question */}
      <motion.div 
        key={currentQuiz.question}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8"
      >
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/10 shadow-2xl">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight text-center drop-shadow-xl">
            {currentQuiz.question}
          </h1>
        </div>
      </motion.div>

      {/* Main Content Area - Split between Options and Live Stats */}
      <div className="flex-1 grid grid-cols-12 gap-8 h-full">
        
        {/* Options Grid */}
        <div className="col-span-8 grid grid-cols-2 gap-6 h-full content-start">
          {options.map((opt) => {
            const isCorrect = currentQuiz.correctAnswer === opt.label;
            const isDimmed = showResults && !isCorrect;
            const choiceResponses = responses?.filter(r => r.quizId === currentQuiz.id && r.selection === opt.label) || [];
            
            return (
              <motion.div
                key={opt.label}
                layout
                className={cn(
                  "relative rounded-3xl p-8 flex flex-col justify-start h-full min-h-[180px] border-4 transition-all duration-500",
                  opt.label === "A" ? "border-red-500 bg-red-500/10" :
                  opt.label === "B" ? "border-blue-500 bg-blue-500/10" :
                  opt.label === "C" ? "border-green-500 bg-green-500/10" :
                  "border-yellow-500 bg-yellow-500/10",
                  isDimmed && "opacity-20 grayscale scale-95",
                  showResults && isCorrect && "bg-white text-black scale-105 shadow-[0_0_50px_rgba(34,197,94,0.6)] border-transparent z-10"
                )}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center text-4xl font-black shrink-0",
                    opt.label === "A" ? "bg-red-500 text-white" :
                    opt.label === "B" ? "bg-blue-500 text-white" :
                    opt.label === "C" ? "bg-green-500 text-white" :
                    "bg-yellow-500 text-black"
                  )}>
                    {opt.label}
                  </div>
                  <p className={cn(
                    "text-4xl font-bold leading-tight",
                    showResults && isCorrect ? "text-black" : "text-white"
                  )}>
                    {opt.text}
                  </p>
                </div>

                {/* Participant Names */}
                <div className="flex flex-wrap gap-2 mt-auto overflow-hidden">
                  <AnimatePresence>
                    {choiceResponses.map((r) => (
                      <motion.span
                        key={r.userId}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className={cn(
                          "px-3 py-1 rounded-full text-lg font-bold shadow-sm border",
                          showResults && isCorrect ? "bg-green-100 border-green-200 text-green-800" : "bg-white/10 border-white/20 text-white"
                        )}
                      >
                        {r.userName}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Result Bar */}
                {showResults && (
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${totalResponses > 0 ? (opt.count / totalResponses) * 100 : 0}%` }}
                    className={cn(
                      "absolute bottom-0 left-0 h-4 transition-all duration-1000 ease-out",
                      opt.label === "A" ? "bg-red-500" :
                      opt.label === "B" ? "bg-blue-500" :
                      opt.label === "C" ? "bg-green-500" :
                      "bg-yellow-500"
                    )}
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Participant List / Live Feed */}
        <div className="col-span-4 bg-white/5 rounded-3xl border border-white/10 p-6 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white/70">Responses</h2>
            <div className="bg-primary/20 text-primary px-4 py-2 rounded-full font-mono text-xl font-bold">
              {totalResponses} Total
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
            {showResults ? (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-yellow-500 flex items-center gap-2">
                  <Trophy className="w-6 h-6" /> Leaderboard
                </h3>
                {leaderboard.slice(0, 10).map((user, i) => (
                  <motion.div
                    key={user.id}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className={cn(
                      "p-3 rounded-xl flex items-center justify-between border bg-white/10 border-white/10",
                      i === 0 && "bg-yellow-500/20 border-yellow-500/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xl opacity-50">#{i + 1}</span>
                      <span className="font-bold text-lg">{user.name}</span>
                    </div>
                    <span className="font-black text-xl">{user.score} pts</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              responses?.filter(r => r.quizId === currentQuiz.id).map((response, i) => (
                <motion.div
                  key={`${response.userId}-${i}`}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="p-3 rounded-xl flex items-center justify-between border bg-white/10 border-white/10 text-white"
                >
                  <span className="font-bold text-lg truncate max-w-[70%]">
                    {response.userName}
                  </span>
                  <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
