import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { addCustomQuestion } from "@/lib/quizData";
import { getUnitsForClass } from "@/lib/jsonLoader";
import { getLeaderboard, getClassRoster, User, getClassScore, getTeacherClassStudents, getTeacherClassLeaderboard, getTotalScore, getDisplayName, getUserQuizHistory, getClassByTeacherAndSubject, updateClassLeaderboardSetting, getClassAggregatedAnalytics, ClassAnalytics } from "@/lib/database";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { deleteUserAccount } from "@/lib/database";
import { 
  Users, Trophy, LogOut, BookOpen, Star, Medal, Crown,
  ClipboardList, Flame, TrendingUp, UserX, Plus, Check, CheckCircle
} from "lucide-react";
import { toast } from "sonner";

export function TeacherDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [questionUnit, setQuestionUnit] = useState<string>("");
  const [units, setUnits] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'roster' | 'leaderboard' | 'analytics'>('roster');
  const [viewingStudent, setViewingStudent] = useState<User | null>(null);
  const [classAnalytics, setClassAnalytics] = useState<{ studentId: string; analytics: ClassAnalytics }[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  if (!user) {
    navigate('/');
    return null;
  }

  // Use first class by default if none selected
  const activeClass = selectedClass || user.apClasses[0] || "";
  
  useEffect(() => {
    if (activeClass) {
      getUnitsForClass(activeClass).then(setUnits);
    } else {
      setUnits([]);
    }
  }, [activeClass]);
  // Get students who joined via teacher's class codes
  const roster = activeClass ? getTeacherClassStudents(user.id, activeClass) : [];
  const leaderboard = activeClass ? getTeacherClassLeaderboard(user.id, activeClass) : [];
  
  // Get class data and leaderboard setting
  const classData = activeClass ? getClassByTeacherAndSubject(user.id, activeClass) : null;
  const [leaderboardEnabled, setLeaderboardEnabled] = useState<boolean>(true);
  
  // Update leaderboard enabled state when class changes
  useEffect(() => {
    if (classData) {
      setLeaderboardEnabled(classData.leaderboardEnabled !== false);
    } else {
      setLeaderboardEnabled(true);
    }
  }, [classData, activeClass]);

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success("Logged out successfully");
  };

  const handleAddQuestion = () => {
    if (!questionUnit) {
      toast.error("Please select a unit first");
      return;
    }
    if (!newQuestion.trim()) {
      toast.error("Please enter a question");
      return;
    }
    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      toast.error("Please fill in all four options");
      return;
    }
    if (!correctAnswer) {
      toast.error("Please select the correct answer");
      return;
    }

    const options = [optionA.trim(), optionB.trim(), optionC.trim(), optionD.trim()];
    const answerText = correctAnswer === 'A' ? optionA.trim() 
      : correctAnswer === 'B' ? optionB.trim()
      : correctAnswer === 'C' ? optionC.trim()
      : optionD.trim();

    addCustomQuestion(activeClass, questionUnit, {
      question: newQuestion.trim(),
      options,
      answer: answerText
    });

    // Reset form
    setNewQuestion("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setCorrectAnswer("");

    toast.success("Question added!", {
      description: `Added to ${questionUnit} in ${activeClass}`
    });
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-gold" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-silver" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-bronze" />;
    return <span className="text-muted-foreground font-medium">#{rank}</span>;
  };

  const totalStudents = roster.length;
  const totalPoints = roster.reduce((sum, s) => sum + getClassScore(s, activeClass), 0);
  const avgPoints = totalStudents > 0 ? Math.round(totalPoints / totalStudents) : 0;
  const activeStudents = roster.filter(s => getClassScore(s, activeClass) > 0).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-primary text-primary-foreground py-4">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold">{user.username}</div>
              <div className="text-sm opacity-80">Teacher • {user.apClasses.length} Classes</div>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="text-primary-foreground hover:bg-primary-foreground/10">
            <LogOut className="w-5 h-5 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Class Selector */}
        <div className="mb-6">
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Select Class to View</label>
          <Select value={activeClass} onValueChange={(v) => { setSelectedClass(v); setQuestionUnit(""); }}>
            <SelectTrigger className="w-full max-w-xs h-12">
              <SelectValue placeholder="Choose a class" />
            </SelectTrigger>
            <SelectContent>
              {user.apClasses.map((className) => (
                <SelectItem key={className} value={className}>
                  {className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card variant="elevated" className="animate-fade-in">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{totalStudents}</div>
                  <div className="text-sm text-muted-foreground">Total Students</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{activeStudents}</div>
                  <div className="text-sm text-muted-foreground">Active Students</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center">
                  <Star className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{totalPoints}</div>
                  <div className="text-sm text-muted-foreground">Total Points</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{avgPoints}</div>
                  <div className="text-sm text-muted-foreground">Avg Points</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-muted rounded-xl">
              <button
                onClick={() => setActiveTab('roster')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all
                  ${activeTab === 'roster' 
                    ? 'bg-card text-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                <ClipboardList className="w-5 h-5" />
                Class Roster
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all
                  ${activeTab === 'leaderboard' 
                    ? 'bg-card text-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                <Trophy className="w-5 h-5" />
                Leaderboard
              </button>
              <button
                onClick={async () => {
                  setActiveTab('analytics');
                  if (activeClass) {
                    setLoadingAnalytics(true);
                    try {
                      const analytics = await getClassAggregatedAnalytics(activeClass);
                      setClassAnalytics(analytics);
                    } catch (error) {
                      console.error('Error loading analytics:', error);
                      toast.error('Failed to load analytics');
                    } finally {
                      setLoadingAnalytics(false);
                    }
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all
                  ${activeTab === 'analytics' 
                    ? 'bg-card text-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                <TrendingUp className="w-5 h-5" />
                Analytics
              </button>
            </div>

            {/* Tab Content */}
            <Card variant="elevated" className="animate-fade-in">
              {activeTab === 'roster' ? (
                <>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-primary" />
                      Student Roster
                    </CardTitle>
                    <CardDescription>All students enrolled in {activeClass}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {roster.length > 0 ? (
                      <div className="rounded-xl border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead>Student</TableHead>
                              <TableHead className="text-center">Score</TableHead>
                              <TableHead className="text-center">Streak</TableHead>
                              <TableHead className="text-right">Joined</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {roster.map((student) => (
                              <TableRow 
                                key={student.id} 
                                className="hover:bg-muted/30 cursor-pointer"
                                onClick={() => setViewingStudent(student)}
                              >
                                <TableCell className="font-medium">{getDisplayName(student)}</TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Star className="w-4 h-4 text-gold" />
                                    {getClassScore(student, activeClass)}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Flame className="w-4 h-4 text-orange-500" />
                                    {student.streak}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {new Date(student.createdAt).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No students enrolled yet.</p>
                        <p className="text-sm">Students will appear here once they join your class using your class code.</p>
                      </div>
                    )}
                  </CardContent>
                </>
              ) : activeTab === 'leaderboard' ? (
                <>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-gold" />
                      Class Leaderboard
                    </CardTitle>
                    <CardDescription>Top performers in {activeClass}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {leaderboard.length > 0 ? (
                      <div className="space-y-3">
                        {leaderboard.map((student, index) => {
                          const rank = index + 1;
                          return (
                            <div 
                              key={student.id}
                              className={`flex items-center gap-4 p-4 rounded-xl transition-all cursor-pointer hover:scale-[1.02]
                                ${rank <= 3 ? 'bg-muted font-medium' : 'bg-muted/30'}
                                ${rank === 1 ? 'ring-2 ring-gold/50 bg-gold/10' : ''}
                              `}
                              onClick={() => setViewingStudent(student)}
                            >
                              <div className="w-8 flex justify-center">
                                {getRankIcon(rank)}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">{getDisplayName(student)}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                  <Flame className="w-3 h-3 text-orange-500" />
                                  {student.streak} day streak
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-lg font-bold">
                                <Star className="w-5 h-5 text-gold" />
                                {getClassScore(student, activeClass)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No scores yet.</p>
                        <p className="text-sm">The leaderboard will populate as students complete quizzes.</p>
                      </div>
                    )}
                  </CardContent>
                </>
              ) : (
                <>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      Student Analytics
                    </CardTitle>
                    <CardDescription>Performance metrics for {activeClass}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingAnalytics ? (
                      <div className="text-center py-12 text-muted-foreground">
                        Loading analytics...
                      </div>
                    ) : classAnalytics.length > 0 ? (
                      <div className="space-y-6">
                        {classAnalytics.map(({ studentId, analytics }) => {
                          const student = roster.find(s => s.id === studentId);
                          if (!student) return null;
                          
                          return (
                            <Card key={studentId} className="border">
                              <CardHeader>
                                <CardTitle className="text-lg">{getDisplayName(student)}</CardTitle>
                                <CardDescription>
                                  {analytics.attemptedQuestions}/{analytics.totalQuestions} questions attempted • 
                                  {analytics.averageAccuracy.toFixed(1)}% accuracy
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {/* Overall Stats */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div className="p-3 rounded-lg bg-muted/50">
                                    <div className="text-lg font-bold">{analytics.totalAttempts}</div>
                                    <div className="text-xs text-muted-foreground">Total Attempts</div>
                                  </div>
                                  <div className="p-3 rounded-lg bg-muted/50">
                                    <div className="text-lg font-bold">{analytics.totalCorrectAttempts}</div>
                                    <div className="text-xs text-muted-foreground">Correct</div>
                                  </div>
                                  <div className="p-3 rounded-lg bg-muted/50">
                                    <div className="text-lg font-bold">{analytics.correctQuestions}</div>
                                    <div className="text-xs text-muted-foreground">Mastered</div>
                                  </div>
                                  <div className="p-3 rounded-lg bg-muted/50">
                                    <div className="text-lg font-bold">{analytics.averageAccuracy.toFixed(1)}%</div>
                                    <div className="text-xs text-muted-foreground">Accuracy</div>
                                  </div>
                                </div>

                                {/* Units */}
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-sm">Units</h4>
                                  {analytics.units.map((unit) => (
                                    <div key={unit.unitName} className="p-4 rounded-lg border bg-card">
                                      <div className="flex items-center justify-between mb-2">
                                        <h5 className="font-medium">{unit.unitName}</h5>
                                        <span className="text-sm font-bold text-secondary">
                                          {unit.averageAccuracy.toFixed(1)}%
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                        <div>
                                          <span className="text-muted-foreground">Attempted: </span>
                                          <span className="font-medium">{unit.attemptedQuestions}/{unit.totalQuestions}</span>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Attempts: </span>
                                          <span className="font-medium">{unit.totalAttempts}</span>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Correct: </span>
                                          <span className="font-medium">{unit.totalCorrectAttempts}</span>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Mastered: </span>
                                          <span className="font-medium">{unit.correctQuestions}</span>
                                        </div>
                                      </div>
                                      
                                      {/* Subtopics */}
                                      <div className="mt-3 space-y-2">
                                        {unit.subtopics.map((subtopic) => (
                                          <div key={subtopic.subtopicName} className="p-2 rounded bg-muted/30 text-xs">
                                            <div className="flex items-center justify-between">
                                              <span className="font-medium">{subtopic.subtopicName}</span>
                                              <span className="text-secondary font-bold">
                                                {subtopic.averageAccuracy.toFixed(1)}%
                                              </span>
                                            </div>
                                            <div className="text-muted-foreground mt-1">
                                              {subtopic.attemptedQuestions}/{subtopic.totalQuestions} questions • 
                                              {subtopic.totalAttempts} attempts • 
                                              Avg streak: {subtopic.averageStreak.toFixed(1)}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No analytics data available yet.</p>
                        <p className="text-sm">Analytics will appear as students practice questions.</p>
                      </div>
                    )}
                  </CardContent>
                </>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Add Question */}
            <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-accent" />
                  Add Question
                </CardTitle>
                <CardDescription>Create a multiple choice question</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Select Unit</Label>
                  <Select value={questionUnit} onValueChange={setQuestionUnit}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Choose a unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Question</Label>
                  <Input
                    placeholder="Enter your question..."
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Answer Options</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { label: 'A', value: optionA, setter: setOptionA },
                      { label: 'B', value: optionB, setter: setOptionB },
                      { label: 'C', value: optionC, setter: setOptionC },
                      { label: 'D', value: optionD, setter: setOptionD },
                    ].map(({ label, value, setter }) => (
                      <div key={label} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCorrectAnswer(label)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-all shrink-0
                            ${correctAnswer === label 
                              ? 'bg-success text-success-foreground' 
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                        >
                          {correctAnswer === label ? <Check className="w-4 h-4" /> : label}
                        </button>
                        <Input
                          placeholder={`Option ${label}`}
                          value={value}
                          onChange={(e) => setter(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Click A/B/C/D to mark as correct answer</p>
                </div>

                <Button 
                  variant="teacher" 
                  className="w-full"
                  onClick={handleAddQuestion}
                  disabled={!questionUnit || !newQuestion || !optionA || !optionB || !optionC || !optionD || !correctAnswer}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
              <CardHeader>
                <CardTitle>Class Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-xl bg-muted/50">
                  <span className="text-muted-foreground">Participation Rate</span>
                  <span className="font-bold">
                    {totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-muted/50">
                  <span className="text-muted-foreground">Avg Score per Student</span>
                  <span className="font-bold">{avgPoints} pts</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-muted/50">
                  <span className="text-muted-foreground">Top Score</span>
                  <span className="font-bold">{leaderboard[0] ? getClassScore(leaderboard[0], activeClass) : 0} pts</span>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card variant="elevated" className="animate-fade-in border-destructive/20" style={{ animationDelay: '0.6s' }}>
              <CardHeader>
                <CardTitle className="text-destructive text-sm">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="w-full">
                      <UserX className="w-4 h-4 mr-2" />
                      Delete My Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your teacher account and remove you from the system. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => {
                          deleteUserAccount(user.id);
                          logout();
                          navigate('/');
                          toast.success("Account deleted");
                        }}
                      >
                        Delete Account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Student Details Dialog */}
      <Dialog open={!!viewingStudent} onOpenChange={(open) => !open && setViewingStudent(null)}>
        <DialogContent className="max-w-md">
          {viewingStudent && (() => {
            const studentHistory = getUserQuizHistory(viewingStudent.id);
            const totalQuizzes = studentHistory.length;
            const avgAccuracy = totalQuizzes > 0 
              ? Math.round(studentHistory.reduce((sum, q) => sum + (q.score / q.totalQuestions) * 100, 0) / totalQuizzes)
              : 0;
            const classQuizzes = studentHistory.filter(q => q.apClass === activeClass);
            const classAvgAccuracy = classQuizzes.length > 0
              ? Math.round(classQuizzes.reduce((sum, q) => sum + (q.score / q.totalQuestions) * 100, 0) / classQuizzes.length)
              : 0;
            
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-secondary flex items-center justify-center">
                      <Users className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    {getDisplayName(viewingStudent)}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-muted text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Star className="w-4 h-4 text-gold" />
                      </div>
                      <div className="text-2xl font-bold">{getTotalScore(viewingStudent)}</div>
                      <div className="text-xs text-muted-foreground">Total Points</div>
                    </div>
                    <div className="p-3 rounded-xl bg-muted text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Star className="w-4 h-4 text-gold" />
                      </div>
                      <div className="text-2xl font-bold">{getClassScore(viewingStudent, activeClass)}</div>
                      <div className="text-xs text-muted-foreground">{activeClass} Points</div>
                    </div>
                    <div className="p-3 rounded-xl bg-muted text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Flame className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="text-2xl font-bold">{viewingStudent.streak}</div>
                      <div className="text-xs text-muted-foreground">Day Streak</div>
                    </div>
                    <div className="p-3 rounded-xl bg-muted text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <BookOpen className="w-4 h-4 text-secondary" />
                      </div>
                      <div className="text-2xl font-bold">{classQuizzes.length}</div>
                      <div className="text-xs text-muted-foreground">{activeClass} Quizzes</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-muted text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <CheckCircle className="w-4 h-4 text-success" />
                      </div>
                      <div className="text-2xl font-bold">{classAvgAccuracy}%</div>
                      <div className="text-xs text-muted-foreground">{activeClass} Accuracy</div>
                    </div>
                    <div className="p-3 rounded-xl bg-muted text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <CheckCircle className="w-4 h-4 text-success" />
                      </div>
                      <div className="text-2xl font-bold">{avgAccuracy}%</div>
                      <div className="text-xs text-muted-foreground">Overall Accuracy</div>
                    </div>
                  </div>

                  {classQuizzes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Recent {activeClass} Activity</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {classQuizzes.slice(0, 5).map((quiz, i) => (
                          <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
                            <span className="truncate flex-1">{quiz.unit}</span>
                            <span className="font-medium text-secondary">{quiz.score}/{quiz.totalQuestions}</span>
                            {quiz.pointsEarned && (
                              <span className="text-xs text-muted-foreground ml-2">+{quiz.pointsEarned} pts</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
