import { useGameState, useAllResponses } from "@/hooks/use-game-state";
import { useQuizzes } from "@/hooks/use-quizzes";
import { useWebSocket } from "@/hooks/use-websocket";
import { Layout } from "@/components/ui/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { User, WS_EVENTS } from "@shared/schema";
import { Loader2, Trophy } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";

import { Maximize, Minimize } from "lucide-react";

export default function Projector() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const { data: initialLeaderboard } = useGameState(); // We'll use a separate state for leaderboard
  const [leaderboard, setLeaderboard] = useState<User[]>([]);

  const { data: state, refetch: refetchState } = useGameState();
  const { data: quizzes } = useQuizzes();
  const { data: responses, refetch: refetchResponses } = useAllResponses();
  const prevShowResults = useRef(false);

  useWebSocket((message) => {
    if (message.type === WS_EVENTS.STATE_UPDATE) {
      refetchState();
      refetchResponses();
    }
    if (message.type === WS_EVENTS.SCORE_UPDATE) {
      setLeaderboard(message.payload as User[]);
    }
    if (message.type === WS_EVENTS.RESPONSE_UPDATE) {
      refetchResponses();
    }
  });

  useEffect(() => {
    // Fetch initial leaderboard
    fetch('/api/leaderboard').then(res => res.json()).then(data => setLeaderboard(data));
  }, []);

  const currentQuiz = quizzes?.find((q) => q.id === state?.currentQuizId);
  const showResults = state?.isResultRevealed;

  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (state?.timerStartedAt && currentQuiz) {
      const startTime = new Date(state.timerStartedAt).getTime();
      const limit = currentQuiz.timeLimit * 1000;
      
      const interval = setInterval(() => {
        const now = Date.now();
        const diff = Math.max(0, Math.ceil((startTime + limit - now) / 1000));
        setTimeLeft(diff);
        if (diff <= 0) clearInterval(interval);
      }, 100);

      return () => clearInterval(interval);
    } else {
      setTimeLeft(null);
    }
  }, [state?.timerStartedAt, currentQuiz]);

  useEffect(() => {
    if (state?.isResultRevealed && !prevShowResults.current && currentQuiz) {
      const correctOption = currentQuiz.correctAnswer;
      const selector = `[data-option="${correctOption}"]`;
      const element = document.querySelector(selector);
      
      let origin = { y: 0.6, x: 0.5 };
      if (element) {
        const rect = element.getBoundingClientRect();
        origin = {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight
        };
      }

      // 1. Center burst from the correct option
      confetti({
        particleCount: 250,
        spread: 120,
        origin: origin,
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
        scalar: 1.5,
        gravity: 0.8,
        drift: 0,
        ticks: 400
      });

      // 2. Extra side bursts for maximum flair
      setTimeout(() => {
        confetti({
          particleCount: 150,
          angle: 60,
          spread: 80,
          origin: { x: 0, y: 0.6 },
          colors: ['#ffdd00', '#ff0000', '#ff00ff']
        });
        confetti({
          particleCount: 150,
          angle: 120,
          spread: 80,
          origin: { x: 1, y: 0.6 },
          colors: ['#00ff00', '#0000ff', '#00ffff']
        });
      }, 200);

      // 3. Continuous celebration shower
      const end = Date.now() + 3000;
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#ff0000', '#ffff00']
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#0000ff', '#00ff00']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
    prevShowResults.current = !!state?.isResultRevealed;
  }, [state?.isResultRevealed, currentQuiz]);

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
    <Layout className="h-screen flex flex-col p-4 bg-neutral-900 text-white overflow-hidden relative">
      <button 
        onClick={toggleFullscreen}
        className="absolute top-2 right-2 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm border border-white/10"
        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
      >
        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
      </button>
      {/* Header Question */}
      <motion.div 
        key={currentQuiz.question}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-2 relative shrink-0"
      >
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 shadow-xl flex flex-col items-center gap-1">
          <h1 className="text-2xl md:text-3xl font-bold leading-tight text-center drop-shadow-xl">
            {currentQuiz.question}
          </h1>
          {currentQuiz.imageUrl && (
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={currentQuiz.imageUrl} 
              alt="Question" 
              className="max-h-[50vh] w-auto rounded-xl shadow-lg border-2 border-white/20 object-contain"
            />
          )}
        </div>
        
        {timeLeft !== null && (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "absolute -top-1 -right-1 w-12 h-12 rounded-full flex items-center justify-center text-xl font-black border-2 shadow-xl z-20",
              timeLeft > 5 ? "bg-primary border-primary/20 text-white" : "bg-red-500 border-red-200 text-white animate-bounce"
            )}
          >
            {timeLeft}
          </motion.div>
        )}
      </motion.div>

      {/* Main Content Area - Split between Options and Live Stats */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0 overflow-hidden">
        
        {/* Options Grid */}
        <div className="col-span-8 grid grid-cols-2 gap-3 h-full content-start overflow-hidden">
          {options.map((opt) => {
            const isCorrect = currentQuiz.correctAnswer === opt.label;
            const isDimmed = showResults && !isCorrect;
            const choiceResponses = responses?.filter(r => r.quizId === currentQuiz.id && r.selection === opt.label) || [];
            
            return (
              <motion.div
                key={opt.label}
                layout
                data-option={opt.label}
                className={cn(
                  "relative rounded-xl p-3 flex flex-col justify-start h-full min-h-0 border-2 transition-all duration-500 overflow-hidden",
                  opt.label === "A" ? "border-red-500 bg-red-500/10" :
                  opt.label === "B" ? "border-blue-500 bg-blue-500/10" :
                  opt.label === "C" ? "border-green-500 bg-green-500/10" :
                  "border-yellow-500 bg-yellow-500/10",
                  isDimmed && "opacity-20 grayscale scale-95",
                  showResults && isCorrect && "bg-white text-black scale-105 shadow-[0_0_20px_rgba(34,197,94,0.4)] border-transparent z-10"
                )}
              >
                <div className="flex items-center gap-2 mb-1 shrink-0">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xl font-black shrink-0",
                    opt.label === "A" ? "bg-red-500 text-white" :
                    opt.label === "B" ? "bg-blue-500 text-white" :
                    opt.label === "C" ? "bg-green-500 text-white" :
                    "bg-yellow-500 text-black"
                  )}>
                    {opt.label}
                  </div>
                  <p className={cn(
                    "text-xl font-bold leading-tight truncate",
                    showResults && isCorrect ? "text-black" : "text-white"
                  )}>
                    {opt.text}
                  </p>
                </div>

                {/* Participant Names */}
                <div className="flex flex-wrap gap-1 mt-1 overflow-y-auto content-start scrollbar-hide flex-1">
                  <AnimatePresence>
                    {choiceResponses.map((r) => {
                      const nameCount = choiceResponses.length;
                      let fontSizeClass = "text-sm px-1.5 py-0.5";
                      if (nameCount > 150) fontSizeClass = "text-[6px] px-0.5 py-0";
                      else if (nameCount > 100) fontSizeClass = "text-[8px] px-1 py-0";
                      else if (nameCount > 60) fontSizeClass = "text-[9px] px-1 py-0";
                      else if (nameCount > 40) fontSizeClass = "text-[10px] px-1 py-0";
                      else if (nameCount > 20) fontSizeClass = "text-xs px-1.5 py-0.5";
                      
                      return (
                        <motion.span
                          key={r.userId}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className={cn(
                            "rounded-full font-bold shadow-sm border whitespace-nowrap leading-none",
                            fontSizeClass,
                            showResults && isCorrect ? "bg-green-100 border-green-200 text-green-800" : "bg-white/10 border-white/20 text-white"
                          )}
                        >
                          {r.userName}
                        </motion.span>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Result Bar */}
                {showResults && (
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${totalResponses > 0 ? (opt.count / totalResponses) * 100 : 0}%` }}
                    className={cn(
                      "absolute bottom-0 left-0 h-2 transition-all duration-1000 ease-out",
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
        <div className="col-span-4 bg-white/5 rounded-2xl border border-white/10 p-4 flex flex-col overflow-hidden min-h-0">
          <div className="flex justify-between items-center mb-3 shrink-0">
            <h2 className="text-lg font-bold text-white/70">Responses</h2>
            <div className="bg-primary/20 text-primary px-3 py-1 rounded-full font-mono text-lg font-bold">
              {totalResponses}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-hide">
            {showResults ? (
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-yellow-500 flex items-center gap-2 mb-2 sticky top-0 bg-neutral-900/50 backdrop-blur-sm py-1">
                  <Trophy className="w-5 h-5" /> Leaderboard
                </h3>
                {leaderboard.slice(0, 10).map((user, i) => (
                  <motion.div
                    key={user.id}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className={cn(
                      "p-2 rounded-lg flex items-center justify-between border bg-white/10 border-white/10",
                      i === 0 && "bg-yellow-500/20 border-yellow-500/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base opacity-50">#{i + 1}</span>
                      <span className="font-bold text-base truncate max-w-[80px]">{user.name}</span>
                    </div>
                    <span className="font-black text-lg">{user.score}</span>
                  </motion.div>
                ))}
              </div>
            ) : (
              responses?.filter(r => r.quizId === currentQuiz.id).map((response, i) => (
                <motion.div
                  key={`${response.userId}-${i}`}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="p-2 rounded-lg flex items-center justify-between border bg-white/10 border-white/10 text-white"
                >
                  <span className="font-bold text-base truncate max-w-[80%]">
                    {response.userName}
                  </span>
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
