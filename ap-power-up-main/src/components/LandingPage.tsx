import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Users, Trophy, Zap, BookOpen, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="gradient-hero text-primary-foreground">
        <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-secondary-foreground" />
            </div>
            <span className="text-xl font-bold">Ascendly</span>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline-secondary" 
              onClick={() => navigate('/login')}
              className="border-secondary/30 text-primary-foreground hover:bg-secondary hover:text-secondary-foreground"
            >
              Log In
            </Button>
          </div>
        </nav>

        <div className="container mx-auto px-6 py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-secondary/20 rounded-full px-4 py-2 mb-6 animate-fade-in">
              <Zap className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium">Gamified Learning Experience</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Ace Your <span className="text-secondary">AP Exams</span> with Confidence
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Take quizzes, earn points, climb the leaderboard. Make exam prep engaging and track your progress in real-time.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Button 
                variant="student" 
                size="xl"
                onClick={() => navigate('/auth/student')}
                className="group"
              >
                <GraduationCap className="w-5 h-5 mr-2 group-hover:animate-bounce-subtle" />
                I'm a Student
              </Button>
              <Button 
                variant="teacher" 
                size="xl"
                onClick={() => navigate('/auth/teacher')}
              >
                <Users className="w-5 h-5 mr-2" />
                I'm a Teacher
              </Button>
            </div>
          </div>
        </div>

        {/* Wave decoration */}
        <div className="relative h-16">
          <svg className="absolute bottom-0 w-full h-16" viewBox="0 0 1440 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 64L60 58.7C120 53 240 43 360 37.3C480 32 600 32 720 37.3C840 43 960 53 1080 53.3C1200 53 1320 43 1380 37.3L1440 32V64H1380C1320 64 1200 64 1080 64C960 64 840 64 720 64C600 64 480 64 360 64C240 64 120 64 60 64H0Z" fill="hsl(var(--background))"/>
          </svg>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Ascendly?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Built for students who want to succeed and teachers who want to track progress
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card variant="elevated" className="group hover:scale-105 transition-transform duration-300">
              <CardContent className="pt-8">
                <div className="w-14 h-14 rounded-2xl gradient-secondary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-7 h-7 text-secondary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-3">25+ AP Courses</h3>
                <p className="text-muted-foreground">
                  Comprehensive quiz banks covering all major AP subjects from Biology to World History
                </p>
              </CardContent>
            </Card>

            <Card variant="elevated" className="group hover:scale-105 transition-transform duration-300">
              <CardContent className="pt-8">
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Trophy className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-3">Real-Time Leaderboard</h3>
                <p className="text-muted-foreground">
                  Compete with classmates and see where you stand. Healthy competition drives results
                </p>
              </CardContent>
            </Card>

            <Card variant="elevated" className="group hover:scale-105 transition-transform duration-300">
              <CardContent className="pt-8">
                <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Target className="w-7 h-7 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-3">Track Progress</h3>
                <p className="text-muted-foreground">
                  Teachers can monitor class progress and students can track their streak and scores
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 gradient-primary text-primary-foreground">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold text-secondary mb-2">25+</div>
              <div className="text-primary-foreground/70">AP Courses</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-secondary mb-2">500+</div>
              <div className="text-primary-foreground/70">Questions</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-secondary mb-2">10</div>
              <div className="text-primary-foreground/70">Points per Correct</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-secondary mb-2">∞</div>
              <div className="text-primary-foreground/70">Practice Sessions</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Start Learning?</h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            Join your classmates and start earning points today. Every correct answer gets you closer to the top!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="student" 
              size="xl"
              onClick={() => navigate('/auth/student')}
            >
              Get Started as Student
            </Button>
            <Button 
              variant="teacher" 
              size="xl"
              onClick={() => navigate('/auth/teacher')}
            >
              Get Started as Teacher
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <span className="font-semibold">Ascendly</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 Ascendly. Built for academic excellence.
          </p>
        </div>
      </footer>
    </div>
  );
}
