import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap, Trophy, BookOpen, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <HeroGeometric />

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="w-full">
          <div className="text-center mb-16">
            <h2 className="text-[45px] md:text-[54px] font-bold mb-4">Why Choose Ascendly?</h2>
            <p className="text-muted-foreground text-[1.6875rem]">
              Built for students who want to succeed and teachers who want to track progress
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card variant="elevated" className="group hover:scale-105 transition-transform duration-300">
              <CardContent className="pt-[5rem] pb-[5rem]">
                <div className="w-[4.65rem] h-[4.65rem] rounded-2xl gradient-secondary flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-[2.33rem] h-[2.33rem] text-secondary-foreground" />
                </div>
                <h3 className="text-[2.078125rem] font-bold mb-4">20 AP Courses</h3>
                <p className="text-muted-foreground text-[1.6625rem]">
                  Comprehensive quiz banks covering all major AP subjects from Biology to World History
                </p>
              </CardContent>
            </Card>

            <Card variant="elevated" className="group hover:scale-105 transition-transform duration-300">
              <CardContent className="pt-[5rem] pb-[5rem]">
                <div className="w-[4.65rem] h-[4.65rem] rounded-2xl gradient-primary flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <Trophy className="w-[2.33rem] h-[2.33rem] text-primary-foreground" />
                </div>
                <h3 className="text-[2.078125rem] font-bold mb-4">Real-Time Leaderboard</h3>
                <p className="text-muted-foreground text-[1.6625rem]">
                  Compete with classmates and see where you stand. Healthy competition drives results
                </p>
              </CardContent>
            </Card>

            <Card variant="elevated" className="group hover:scale-105 transition-transform duration-300">
              <CardContent className="pt-[5rem] pb-[5rem]">
                <div className="w-[4.65rem] h-[4.65rem] rounded-2xl bg-accent flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-[2.33rem] h-[2.33rem] text-accent-foreground" />
                </div>
                <h3 className="text-[2.078125rem] font-bold mb-4">Focused Analytics</h3>
                <p className="text-muted-foreground text-[1.6625rem]">
                  Detailed insights into your performance with targeted analytics to identify strengths and weaknesses
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 gradient-primary text-primary-foreground">
        <div className="w-full px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-[3.43539rem] md:text-[4.58052rem] font-bold text-white mb-2">20</div>
              <div className="text-white text-[1.52684rem]">AP Courses</div>
            </div>
            <div>
              <div className="text-[3.43539rem] md:text-[4.58052rem] font-bold text-white mb-2">500+</div>
              <div className="text-white text-[1.52684rem]">Questions per AP class</div>
            </div>
            <div>
              <div className="text-[3.43539rem] md:text-[4.58052rem] font-bold text-white mb-2">∞</div>
              <div className="text-white text-[1.52684rem]">Sessions</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="w-full text-center">
          <h2 className="text-[2.8125rem] md:text-[3.375rem] font-bold mb-6">Ready to Start Learning?</h2>
          <p className="text-muted-foreground text-[1.6875rem] mb-10">
            Join your classmates and start earning points today. Every correct answer gets you closer to the top!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="student" 
              size="xl"
              onClick={() => navigate('/auth/student')}
              className="h-20 px-12 text-[1.875rem]"
            >
              Get Started as Student
            </Button>
            <Button 
              variant="teacher" 
              size="xl"
              onClick={() => navigate('/auth/teacher')}
              className="h-20 px-12 text-[1.875rem]"
            >
              Get Started as Teacher
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4">
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
