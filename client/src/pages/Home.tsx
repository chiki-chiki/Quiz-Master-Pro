import { useState } from "react";
import { useUser, useLogin } from "@/hooks/use-auth";
import { useGameState, useSubmitResponse, useAllResponses } from "@/hooks/use-game-state";
import { useQuizzes } from "@/hooks/use-quizzes";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Layout } from "@/components/ui/Layout";
import { Loader2, CheckCircle2, Trophy, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Home() {
  useWebSocket();
  const { data: user, isLoading: isLoadingUser } = useUser();
  const { data: state } = useGameState();
  const { data: quizzes } = useQuizzes();
  const { data: responses } = useAllResponses();
  const loginMutation = useLogin();
  const submitMutation = useSubmitResponse();
  const [name, setName] = useState("");

  const currentQuiz = quizzes?.find((q) => q.id === state?.currentQuizId);
  const myResponse = responses?.find(
    (r) => r.userId === user?.id && r.quizId === currentQuiz?.id
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      loginMutation.mutate({ name });
    }
  };

  const handleSubmit = (option: string) => {
    if (currentQuiz && !state?.isResultRevealed) {
      submitMutation.mutate({ quizId: currentQuiz.id, selection: option });
    }
  };

  if (isLoadingUser) {
    return (
      <Layout className="flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </Layout>
    );
  }

  // --- LOGIN SCREEN ---
  if (!user) {
    return (
      <Layout className="flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 shadow-2xl border-primary/10">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-display font-bold text-primary mb-2">QuizLive</h1>
              <p className="text-muted-foreground">Join the event and compete!</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg p-6 rounded-xl border-2 focus:ring-primary focus:border-primary"
                autoFocus
              />
              <Button
                type="submit"
                disabled={loginMutation.isPending || !name.trim()}
                className="w-full h-14 text-lg font-bold rounded-xl"
              >
                {loginMutation.isPending ? (
                  <Loader2 className="animate-spin mr-2" />
                ) : (
                  "Join Game"
                )}
              </Button>
            </form>
          </Card>
        </motion.div>
      </Layout>
    );
  }

  // --- WAITING SCREEN (No active quiz) ---
  if (!currentQuiz) {
    return (
      <Layout className="flex flex-col items-center justify-center min-h-[80vh]">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6"
        >
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-3xl font-display font-bold">Waiting for next question...</h2>
          <p className="text-xl text-muted-foreground">
            Get ready, {user.name}! Keep your eyes on the screen.
          </p>
        </motion.div>
      </Layout>
    );
  }

  // --- QUIZ ACTIVE ---
  const options = [
    { label: "A", text: currentQuiz.optionA, color: "border-red-500 text-red-600 bg-red-50" },
    { label: "B", text: currentQuiz.optionB, color: "border-blue-500 text-blue-600 bg-blue-50" },
    { label: "C", text: currentQuiz.optionC, color: "border-green-500 text-green-600 bg-green-50" },
    { label: "D", text: currentQuiz.optionD, color: "border-yellow-500 text-yellow-600 bg-yellow-50" },
  ];

  return (
    <Layout className="max-w-2xl mx-auto pb-20">
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
           <span className="font-mono text-sm text-muted-foreground">LIVE</span>
        </div>
        <div className="font-bold text-muted-foreground">
          Logged in as <span className="text-foreground">{user.name}</span>
        </div>
      </div>

      <motion.div
        key={currentQuiz.id}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="space-y-6"
      >
        <Card className="p-6 border-l-4 border-l-primary shadow-lg mb-8">
          <h2 className="text-2xl font-bold font-display leading-tight">{currentQuiz.question}</h2>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          {options.map((opt) => {
            const isSelected = myResponse?.selection === opt.label;
            const isCorrect = currentQuiz.correctAnswer === opt.label;
            const showResult = state?.isResultRevealed;
            
            // Determine visual state
            let buttonClass = cn(
              "quiz-button w-full text-left relative h-24 flex items-center gap-4 group",
              "border-2 hover:bg-neutral-50 bg-white", 
              showResult && isCorrect && "bg-green-100 border-green-500 ring-2 ring-green-500",
              showResult && !isCorrect && isSelected && "bg-red-100 border-red-500 opacity-70",
              showResult && !isCorrect && !isSelected && "opacity-50 grayscale",
              !showResult && isSelected && "ring-4 ring-primary border-primary bg-primary/5"
            );

            return (
              <button
                key={opt.label}
                disabled={!!myResponse || showResult}
                onClick={() => handleSubmit(opt.label)}
                className={buttonClass}
              >
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-2xl font-black shrink-0 transition-colors",
                  isSelected ? "bg-primary text-white" : "bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200",
                  showResult && isCorrect && "bg-green-500 text-white",
                  showResult && !isCorrect && isSelected && "bg-red-500 text-white"
                )}>
                  {opt.label}
                </div>
                <span className="text-xl font-medium">{opt.text}</span>
                
                {isSelected && !showResult && (
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                  </motion.div>
                )}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {myResponse && !state?.isResultRevealed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="mt-8 text-center bg-primary/10 rounded-xl p-4"
            >
              <p className="flex items-center justify-center gap-2 font-bold text-primary text-lg">
                <Clock className="w-5 h-5 animate-pulse" />
                Answer Submitted! Waiting for results...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Layout>
  );
}
