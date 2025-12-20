"use client";

import { motion } from "framer-motion";
import { GraduationCap, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Typewriter } from "@/components/Typewriter";


function ElegantShape({
    className,
    delay = 0,
    width = 400,
    height = 100,
    rotate = 0,
    gradient = "from-white/[0.08]",
}: {
    className?: string;
    delay?: number;
    width?: number;
    height?: number;
    rotate?: number;
    gradient?: string;
}) {
    return (
        <motion.div
            initial={{
                opacity: 0,
                y: -150,
                rotate: rotate - 15,
            }}
            animate={{
                opacity: 1,
                y: 0,
                rotate: rotate,
            }}
            transition={{
                duration: 2.4,
                delay,
                ease: [0.23, 0.86, 0.39, 0.96],
                opacity: { duration: 1.2 },
            }}
            className={cn("absolute", className)}
        >
            <motion.div
                animate={{
                    y: [0, 15, 0],
                }}
                transition={{
                    duration: 12,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                }}
                style={{
                    width,
                    height,
                }}
                className="relative"
            >
                <div
                    className={cn(
                        "absolute inset-0 rounded-full",
                        "bg-gradient-to-r to-transparent",
                        gradient,
                        "backdrop-blur-[2px] border-2 border-white/[0.15]",
                        "shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]",
                        "after:absolute after:inset-0 after:rounded-full",
                        "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]"
                    )}
                />
            </motion.div>
        </motion.div>
    );
}

function HeroGeometric() {
    const navigate = useNavigate();
    const fadeUpVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                duration: 1,
                delay: 0.5 + i * 0.2,
                ease: [0.25, 0.4, 0.25, 1],
            },
        }),
    };

    // Brand colors: Navy (215 50% 23%), Green (152 60% 45%), Teal (168 65% 40%)
    // Using HSL values directly in Tailwind classes
    return (
        <div className="relative min-h-screen w-full flex flex-col overflow-hidden bg-gradient-to-br from-[hsl(215,50%,18%)] via-[hsl(215,50%,23%)] to-[hsl(215,50%,28%)]">
            {/* Navigation Bar */}
            <nav className="relative z-20 w-full px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-[hsl(152,60%,45%)] flex items-center justify-center">
                        <GraduationCap className="w-10 h-10 text-white" />
                    </div>
                    <span className="text-3xl font-bold text-white">Ascendly</span>
                </div>
                <div className="flex gap-3">
                    <Button 
                        variant="outline-secondary" 
                        onClick={() => navigate('/login')}
                        className="border-white/30 text-white hover:bg-[hsl(152,60%,45%)] hover:text-white h-12 px-6 text-lg shadow-lg"
                    >
                        Log In
                    </Button>
                </div>
            </nav>

            {/* Background gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(152,60%,45%)]/[0.05] via-transparent to-[hsl(168,65%,40%)]/[0.05] blur-3xl" />

            {/* Animated Background Shapes */}
            <div className="absolute inset-0 overflow-hidden">
                <ElegantShape
                    delay={0.3}
                    width={1200}
                    height={280}
                    rotate={12}
                    gradient="from-[hsl(215,50%,23%)]/[0.15]"
                    className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
                />

                <ElegantShape
                    delay={0.5}
                    width={1000}
                    height={240}
                    rotate={-15}
                    gradient="from-[hsl(152,60%,45%)]/[0.15]"
                    className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
                />

                <ElegantShape
                    delay={0.4}
                    width={600}
                    height={160}
                    rotate={-8}
                    gradient="from-[hsl(168,65%,40%)]/[0.15]"
                    className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
                />

                <ElegantShape
                    delay={0.6}
                    width={400}
                    height={120}
                    rotate={20}
                    gradient="from-[hsl(152,60%,45%)]/[0.12]"
                    className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
                />

                <ElegantShape
                    delay={0.7}
                    width={300}
                    height={80}
                    rotate={-25}
                    gradient="from-[hsl(168,65%,40%)]/[0.12]"
                    className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]"
                />
            </div>

            {/* Hero Content */}
            <div className="relative z-10 flex-1 flex items-center justify-center container mx-auto px-4 md:px-6">
                <div className="max-w-[62.4rem] mx-auto text-center">
                    <motion.div
                        custom={0}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <h1 className="text-[2.8125rem] sm:text-[4.6875rem] md:text-[7.5rem] font-bold mb-6 md:mb-8 tracking-tight">
                            <span
                                className={cn(
                                    "bg-clip-text text-transparent bg-gradient-to-r from-[hsl(152,60%,45%)] via-white/90 to-[hsl(168,65%,40%)]"
                                )}
                            >
                                Transform How You Study for APs
                            </span>
                        </h1>
                    </motion.div>

                    <motion.div
                        custom={1}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <Typewriter 
                            words={[
                                "Take quizzes",
                                "Earn points",
                                "Climb leaderboard",
                                "Track progress",
                                "Ascendly"
                            ]}
                            typingSpeed={100}
                            deletingSpeed={50}
                            pauseTime={1000}
                        />
                    </motion.div>

                    {/* CTA Buttons */}
                    <motion.div
                        custom={2}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-col sm:flex-row gap-6 justify-center mt-10"
                    >
                        <Button 
                            variant="student" 
                            size="xl"
                            onClick={() => navigate('/auth/student')}
                            className="group px-[3.75rem]"
                            style={{ height: '6.25rem', fontSize: '1.5625rem' }}
                        >
                            <GraduationCap className="w-[1.875rem] h-[1.875rem] mr-2 group-hover:animate-bounce-subtle" />
                            I'm a Student
                        </Button>
                        <Button 
                            variant="teacher" 
                            size="xl"
                            onClick={() => navigate('/auth/teacher')}
                            className="px-[3.75rem] border border-white/80"
                            style={{ height: '6.25rem', fontSize: '1.5625rem' }}
                        >
                            <Users className="w-[1.875rem] h-[1.875rem] mr-2" />
                            I'm a Teacher
                        </Button>
                    </motion.div>
                </div>
            </div>

            {/* Bottom gradient fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(215,50%,18%)] via-transparent to-[hsl(215,50%,18%)]/80 pointer-events-none" />
        </div>
    );
}

export { HeroGeometric }
