import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Users, ArrowLeft, Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { PremiumLoader } from "@/components/ui/premium-loader";

export function LoginRedirect() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        toast.success("Welcome back!");
        navigate('/dashboard');
      } else {
        toast.error(result.message);
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
      <header className="gradient-hero text-primary-foreground py-4">
        <nav className="container mx-auto px-6 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-10 h-10" />
            <span className="text-2xl">Back to Home</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center">
              <GraduationCap className="w-10 h-10 text-secondary-foreground" />
            </div>
            <span className="text-3xl font-bold">Ascendly</span>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-12 bg-muted/30">
        <Card variant="elevated" className="w-full max-w-2xl animate-scale-in">
          <CardHeader className="text-center">
            <div className="w-32 h-32 mx-auto rounded-2xl gradient-primary flex items-center justify-center mb-8">
              <LogIn className="w-16 h-16 text-primary-foreground" />
            </div>
            <CardTitle className="text-4xl">Welcome Back</CardTitle>
            <CardDescription className="text-2xl">
              Sign in to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-4">
                <Label htmlFor="username" className="text-2xl">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-24 !text-5xl md:!text-5xl"
                />
              </div>

              <div className="space-y-4">
                <Label htmlFor="password" className="text-2xl">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-24 pr-24 !text-5xl md:!text-5xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-10 h-10" /> : <Eye className="w-10 h-10" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                variant="hero"
                size="lg" 
                className="w-full h-24 text-[38.88px]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <PremiumLoader size="sm" />
                ) : (
                  <>
                    <LogIn className="w-10 h-10 mr-4" />
                    Sign In
                  </>
                )}
              </Button>

              <div className="relative my-12">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t"></div>
                </div>
                <div className="relative flex justify-center text-2xl">
                  <span className="px-8 bg-card text-muted-foreground">or create an account</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <Button
                  type="button"
                  variant="student"
                  size="lg"
                  className="h-24 text-[38.88px]"
                  onClick={() => navigate('/auth/student')}
                >
                  <GraduationCap className="w-8 h-8 mr-4" />
                  Student
                </Button>
                <Button
                  type="button"
                  variant="teacher"
                  size="lg"
                  className="h-24 text-[38.88px]"
                  onClick={() => navigate('/auth/teacher')}
                >
                  <Users className="w-8 h-8 mr-4" />
                  Teacher
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
