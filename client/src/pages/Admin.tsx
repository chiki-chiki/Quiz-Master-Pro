import { useState, useEffect } from "react";
import { useQuizzes, useCreateQuiz, useDeleteQuiz, useUpdateQuiz } from "@/hooks/use-quizzes";
import { useGameState, useUpdateGameState } from "@/hooks/use-game-state";
import { useWebSocket } from "@/hooks/use-websocket";
import { Layout } from "@/components/ui/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Play, Eye, EyeOff, Plus, Trash2, Edit, Save, StopCircle, Trophy, Clock } from "lucide-react";
import { Quiz, User, WS_EVENTS } from "@shared/schema";

export default function Admin() {
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  useWebSocket((message) => {
    if (message.type === WS_EVENTS.SCORE_UPDATE) {
      setLeaderboard(message.payload as User[]);
    }
  });

  useEffect(() => {
    fetch('/api/leaderboard').then(res => res.json()).then(data => setLeaderboard(data));
  }, []);

  const { data: quizzes, isLoading } = useQuizzes();
  const { data: state } = useGameState();
  
  const createQuiz = useCreateQuiz();
  const deleteQuiz = useDeleteQuiz();
  const updateQuiz = useUpdateQuiz();
  const updateState = useUpdateGameState();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  if (isLoading) return <div>Loading...</div>;

  const sortedQuizzes = quizzes?.sort((a, b) => a.order - b.order) || [];
  const currentQuiz = quizzes?.find(q => q.id === state?.currentQuizId);

  const handleStartQuiz = (id: number) => {
    updateState.mutate({ currentQuizId: id, isResultRevealed: false });
  };

  const handleStopQuiz = () => {
    updateState.mutate({ currentQuizId: null, isResultRevealed: false });
  };

  const handleReveal = () => {
    if (state?.currentQuizId) {
      updateState.mutate({ 
        currentQuizId: state.currentQuizId, 
        isResultRevealed: !state.isResultRevealed,
        timerStartedAt: null // 回答発表時にタイマーをクリア
      });
    }
  };

  const handleStartTimer = () => {
    if (state?.currentQuizId) {
      updateState.mutate({
        currentQuizId: state.currentQuizId,
        isResultRevealed: false,
        timerStartedAt: new Date().toISOString()
      });
    }
  };

  const QuickEditForm = ({ quiz, onCancel }: { quiz: Quiz, onCancel: () => void }) => {
    const [formData, setFormData] = useState(quiz);
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      updateQuiz.mutate(formData, {
        onSuccess: () => onCancel()
      });
    };

    return (
      <Card className="border-2 border-primary mt-4">
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Question</Label>
              <Input 
                value={formData.question} 
                onChange={e => setFormData({...formData, question: e.target.value})}
                placeholder="Question"
                className="font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label>Image URL (Optional)</Label>
              <Input 
                value={formData.imageUrl || ""} 
                onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                placeholder="https://example.com/image.png"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input value={formData.optionA} onChange={e => setFormData({...formData, optionA: e.target.value})} placeholder="Option A" />
            <Input value={formData.optionB} onChange={e => setFormData({...formData, optionB: e.target.value})} placeholder="Option B" />
            <Input value={formData.optionC} onChange={e => setFormData({...formData, optionC: e.target.value})} placeholder="Option C" />
            <Input value={formData.optionD} onChange={e => setFormData({...formData, optionD: e.target.value})} placeholder="Option D" />
          </div>
          <div className="flex justify-between items-center">
            <div className="flex gap-4 items-center">
              <Select 
                value={formData.correctAnswer} 
                onValueChange={v => setFormData({...formData, correctAnswer: v})}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Answer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Option A</SelectItem>
                  <SelectItem value="B">Option B</SelectItem>
                  <SelectItem value="C">Option C</SelectItem>
                  <SelectItem value="D">Option D</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Label>Time (s)</Label>
                <Input 
                  type="number" 
                  className="w-20" 
                  value={formData.timeLimit} 
                  onChange={e => setFormData({...formData, timeLimit: parseInt(e.target.value) || 20})} 
                />
              </div>
            </div>
            <div className="space-x-2">
              <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
              <Button type="submit"><Save className="w-4 h-4 mr-2" /> Save</Button>
            </div>
          </div>
        </form>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your quiz event</p>
        </div>
        
        <div className="flex gap-4">
            <Card className="px-6 py-2 flex items-center gap-4 bg-neutral-900 text-white border-0">
                <div className={`w-3 h-3 rounded-full ${state?.currentQuizId ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                <span className="font-bold">
                    {state?.currentQuizId ? `Active: Quiz #${state.currentQuizId}` : "No Active Quiz"}
                </span>
                {state?.currentQuizId && (
                    <Button 
                        size="sm" 
                        variant="destructive" 
                        className="ml-2 h-8"
                        onClick={handleStopQuiz}
                    >
                        <StopCircle className="w-4 h-4 mr-2" /> Stop
                    </Button>
                )}
            </Card>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
                <Button size="lg" className="rounded-xl shadow-lg shadow-primary/20">
                <Plus className="w-5 h-5 mr-2" /> New Question
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                <DialogTitle>Create New Question</DialogTitle>
                </DialogHeader>
                <CreateQuizForm onSuccess={() => setIsCreateOpen(false)} order={sortedQuizzes.length + 1} />
            </DialogContent>
            </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-8 space-y-4">
          {sortedQuizzes.map((quiz) => (
            <div key={quiz.id}>
              {editingQuiz?.id === quiz.id ? (
                  <QuickEditForm quiz={quiz} onCancel={() => setEditingQuiz(null)} />
              ) : (
                  <Card className={`transition-all duration-200 ${currentQuiz?.id === quiz.id ? "ring-2 ring-green-500 shadow-xl scale-[1.01]" : "hover:shadow-md"}`}>
                      <CardContent className="p-6 flex items-center justify-between gap-6">
                          <div className="flex items-center gap-4 flex-1">
                              <div className="bg-muted w-10 h-10 rounded-lg flex items-center justify-center font-bold text-muted-foreground">
                                  {quiz.order}
                              </div>
                              <div className="flex-1">
                                  <h3 className="font-bold text-lg">{quiz.question}</h3>
                                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                                      <span className={quiz.correctAnswer === "A" ? "text-green-600 font-bold" : ""}>A: {quiz.optionA}</span>
                                      <span className={quiz.correctAnswer === "B" ? "text-green-600 font-bold" : ""}>B: {quiz.optionB}</span>
                                      <span className={quiz.correctAnswer === "C" ? "text-green-600 font-bold" : ""}>C: {quiz.optionC}</span>
                                      <span className={quiz.correctAnswer === "D" ? "text-green-600 font-bold" : ""}>D: {quiz.optionD}</span>
                                  </div>
                              </div>
                          </div>

                          <div className="flex items-center gap-2">
                              {currentQuiz?.id === quiz.id && (
                                <Button 
                                  onClick={handleStartTimer} 
                                  variant="outline" 
                                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                                  disabled={!!state?.timerStartedAt || state?.isResultRevealed}
                                >
                                  <Clock className="w-4 h-4 mr-2" /> Timer
                                </Button>
                              )}
                              {currentQuiz?.id === quiz.id ? (
                                  <Button 
                                      onClick={handleReveal}
                                      variant={state?.isResultRevealed ? "default" : "secondary"}
                                      className="min-w-[140px]"
                                  >
                                      {state?.isResultRevealed ? <><EyeOff className="mr-2 w-4 h-4"/> Hide Answer</> : <><Eye className="mr-2 w-4 h-4"/> Reveal Answer</>}
                                  </Button>
                              ) : (
                                  <Button onClick={() => handleStartQuiz(quiz.id)} variant="outline" className="border-green-600 text-green-600 hover:bg-green-50">
                                      <Play className="w-4 h-4 mr-2" /> Start
                                  </Button>
                              )}
                              
                              <Button variant="ghost" size="icon" onClick={() => setEditingQuiz(quiz)}>
                                  <Edit className="w-4 h-4" />
                              </Button>
                              
                              <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                      if(confirm('Are you sure?')) deleteQuiz.mutate(quiz.id);
                                  }}
                              >
                                  <Trash2 className="w-4 h-4" />
                              </Button>
                          </div>
                      </CardContent>
                  </Card>
              )}
            </div>
          ))}

          {sortedQuizzes.length === 0 && (
              <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                  <p>No questions yet. Create one to get started!</p>
              </div>
          )}
        </div>

        <div className="col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Live Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leaderboard.map((user, i) => (
                  <div key={user.id} className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm opacity-50">#{i + 1}</span>
                      <span className="font-bold">{user.name}</span>
                    </div>
                    <span className="font-mono font-bold">{user.score} pts</span>
                  </div>
                ))}
                {leaderboard.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No participants yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

function CreateQuizForm({ onSuccess, order }: { onSuccess: () => void, order: number }) {
  const { mutate, isPending } = useCreateQuiz();
  const [formData, setFormData] = useState({
    question: "",
    imageUrl: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correctAnswer: "A",
    order: order,
    timeLimit: 20
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(formData, {
      onSuccess: () => {
        setFormData({ question: "", imageUrl: "", optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A", order: order + 1, timeLimit: 20 });
        onSuccess();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Question Text</Label>
          <Input 
              required
              value={formData.question}
              onChange={e => setFormData({...formData, question: e.target.value})}
              placeholder="e.g. What is the capital of France?"
          />
        </div>
        <div className="space-y-2">
          <Label>Image URL (Optional)</Label>
          <Input 
              value={formData.imageUrl}
              onChange={e => setFormData({...formData, imageUrl: e.target.value})}
              placeholder="https://example.com/image.png"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label className="text-red-500">Option A</Label>
            <Input required value={formData.optionA} onChange={e => setFormData({...formData, optionA: e.target.value})} />
        </div>
        <div className="space-y-2">
            <Label className="text-blue-500">Option B</Label>
            <Input required value={formData.optionB} onChange={e => setFormData({...formData, optionB: e.target.value})} />
        </div>
        <div className="space-y-2">
            <Label className="text-green-500">Option C</Label>
            <Input required value={formData.optionC} onChange={e => setFormData({...formData, optionC: e.target.value})} />
        </div>
        <div className="space-y-2">
            <Label className="text-yellow-500">Option D</Label>
            <Input required value={formData.optionD} onChange={e => setFormData({...formData, optionD: e.target.value})} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Correct Answer</Label>
        <Select 
            value={formData.correctAnswer} 
            onValueChange={v => setFormData({...formData, correctAnswer: v})}
        >
            <SelectTrigger>
            <SelectValue placeholder="Select correct answer" />
            </SelectTrigger>
            <SelectContent>
            <SelectItem value="A">Option A</SelectItem>
            <SelectItem value="B">Option B</SelectItem>
            <SelectItem value="C">Option C</SelectItem>
            <SelectItem value="D">Option D</SelectItem>
            </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Time Limit (seconds)</Label>
        <Input 
          type="number" 
          value={formData.timeLimit} 
          onChange={e => setFormData({...formData, timeLimit: parseInt(e.target.value) || 20})} 
        />
      </div>

      <div className="pt-4 flex justify-end gap-2">
        <Button disabled={isPending} type="submit" className="w-full">
            {isPending ? "Creating..." : "Create Question"}
        </Button>
      </div>
    </form>
  );
}
