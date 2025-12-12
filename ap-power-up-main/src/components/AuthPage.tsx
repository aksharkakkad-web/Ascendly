import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { GraduationCap, Users, ArrowLeft, Eye, EyeOff, LogIn, UserPlus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getAllClassNames } from "@/lib/jsonLoader";
import { toast } from "sonner";

export function AuthPage() {
  const { role } = useParams<{ role: 'student' | 'teacher' }>();
  const navigate = useNavigate();
  const { login, register } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showClassCode, setShowClassCode] = useState(false);
  const [generatedClassCode, setGeneratedClassCode] = useState<string>("");

  const classes = getAllClassNames();
  const isStudent = role === 'student';

  const toggleClass = (className: string) => {
    if (!isStudent) {
      // Teachers can only select one class
      setSelectedClasses([className]);
    } else {
      // Students can select multiple
    setSelectedClasses(prev => 
      prev.includes(className) 
        ? prev.filter(c => c !== className)
        : [...prev, className]
    );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      if (!username.trim() || !password.trim()) {
        toast.error("Please fill in all fields");
        return;
      }
    } else {
      if (!firstName.trim() || !lastName.trim() || !username.trim() || !password.trim()) {
        toast.error("Please fill in all required fields");
        return;
      }
      if (isStudent) {
      if (selectedClasses.length === 0) {
        toast.error("Please select at least one AP Class");
        return;
        }
      } else {
        // Teachers must select exactly one class to create
        if (selectedClasses.length !== 1) {
          toast.error("Please select exactly one AP Class to create your class");
          return;
        }
      }
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const result = await login(username, password);
        if (result.success) {
          toast.success("Welcome back!");
          navigate('/dashboard');
        } else {
          toast.error(result.message);
        }
      } else {
        const result = await register(
          username, 
          password, 
          role || 'student', 
          selectedClasses,
          firstName,
          lastName,
          isStudent ? nickname.trim() || undefined : undefined
        );
        if (result.success) {
          if (role === 'teacher' && result.classCode) {
            // Show class code for teachers
            setGeneratedClassCode(result.classCode);
            setShowClassCode(true);
            toast.success("Account created successfully! Your class code is ready.");
          } else {
          toast.success("Account created successfully!");
          navigate('/dashboard');
          }
        } else {
          toast.error(result.message);
        }
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className={`${isStudent ? 'gradient-secondary' : 'gradient-primary'} text-primary-foreground py-4`}>
        <nav className="container mx-auto px-6 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-background/20 flex items-center justify-center">
              {isStudent ? (
                <GraduationCap className="w-6 h-6" />
              ) : (
                <Users className="w-6 h-6" />
              )}
            </div>
            <span className="text-xl font-bold">
              {isStudent ? 'Student Portal' : 'Teacher Portal'}
            </span>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 bg-muted/30">
        <Card variant="elevated" className="w-full max-w-lg animate-scale-in">
          <CardHeader className="text-center">
            <div className={`w-16 h-16 mx-auto rounded-2xl ${isStudent ? 'gradient-secondary' : 'gradient-primary'} flex items-center justify-center mb-4`}>
              {isStudent ? (
                <GraduationCap className="w-8 h-8 text-secondary-foreground" />
              ) : (
                <Users className="w-8 h-8 text-primary-foreground" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? `Sign in to your ${isStudent ? 'student' : 'teacher'} account`
                : `Register as a ${isStudent ? 'student' : 'teacher'}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="h-12"
                      />
                    </div>
                  </div>
                  
                  {isStudent && (
                    <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
                    <p className="text-xs text-muted-foreground">
                        A random anonymous nickname will be automatically generated for you (e.g., Lion1234)
                    </p>
                  </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Username {!isLogin && '*'}</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password {!isLogin && '*'}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-3">
                  <Label>Select AP {isStudent ? 'Classes' : 'Class'} * {isStudent ? '(choose multiple)' : '(select one subject to create your class)'}</Label>
                  
                  {/* Selected classes chips */}
                  {selectedClasses.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedClasses.map((className) => (
                        <div 
                          key={className}
                          className="flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm"
                        >
                          <span>{className}</span>
                          <button 
                            type="button"
                            onClick={() => toggleClass(className)}
                            className="hover:bg-secondary-foreground/20 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <ScrollArea className="h-48 rounded-xl border p-4">
                    <div className="space-y-2">
                      {classes.map((className) => {
                        const isChecked = selectedClasses.includes(className);
                        return (
                          <div 
                            key={className}
                            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                            onClick={() => toggleClass(className)}
                          >
                            <div 
                              className={cn(
                                "h-4 w-4 shrink-0 rounded-sm border border-primary flex items-center justify-center",
                                isChecked && "bg-primary text-primary-foreground"
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isChecked && <Check className="h-3 w-3" />}
                            </div>
                            <span className="text-sm font-medium">{className}</span>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground">
                    {selectedClasses.length} class{selectedClasses.length !== 1 ? 'es' : ''} selected
                    {!isStudent && selectedClasses.length === 1 && (
                      <span className="block mt-1 text-primary font-medium">This will be your class's AP subject</span>
                    )}
                  </p>
                </div>
              )}

              {/* Class Code Display Dialog for Teachers */}
              <Dialog open={showClassCode} onOpenChange={(open) => {
                if (!open) {
                  setShowClassCode(false);
                  navigate('/dashboard');
                }
              }}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">Your Class Code</DialogTitle>
                    <DialogDescription>
                      Share this code with your students so they can join your class
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="bg-primary/10 border-2 border-primary rounded-xl p-6 text-center">
                      <div className="text-sm text-muted-foreground mb-2">Class Code</div>
                      <div className="text-4xl font-bold tracking-wider text-primary font-mono">
                        {generatedClassCode}
                      </div>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">
                        <strong className="text-foreground">Important:</strong> Save this code! Students will need it to join your class. 
                        You can view it again in your dashboard.
                      </p>
                    </div>
                    <Button 
                      variant="teacher" 
                      size="lg" 
                      className="w-full"
                      onClick={() => {
                        setShowClassCode(false);
                        navigate('/dashboard');
                      }}
                    >
                      Go to Dashboard
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button 
                type="submit" 
                variant={isStudent ? "student" : "teacher"}
                size="lg" 
                className="w-full h-12"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isLogin ? (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Sign In
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Create Account
                  </>
                )}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-card text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full h-12"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
