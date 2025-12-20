import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText, Play, AlertCircle } from "lucide-react";
import { loadAPTestData, getAvailableAPTestClasses, getAvailableTestsForClass } from "@/lib/apTestLoader";
import { APTestData } from "@/lib/apTestData";
import { toast } from "sonner";

interface ClassTestInfo {
  className: string;
  testIds: number[];
}

interface APTestSectionProps {
  userClasses: string[];
  onStartTest: (testData: APTestData) => void;
}

export function APTestSection({ userClasses, onStartTest }: APTestSectionProps) {
  const [availableClassTests, setAvailableClassTests] = useState<ClassTestInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [testDataCache, setTestDataCache] = useState<Record<string, APTestData>>({});

  useEffect(() => {
    async function loadTests() {
      setLoading(true);
      try {
        console.log('[APTestSection] User classes:', userClasses);
        
        // Clear cache to ensure fresh data
        const { clearAPTestCache } = await import('@/lib/apTestLoader');
        clearAPTestCache();
        
        // Get all classes that have tests
        const availableClasses = await getAvailableAPTestClasses();
        console.log('[APTestSection] Available AP test classes:', availableClasses);
        
        // Filter to only show tests for classes the user is enrolled in (case-insensitive matching)
        const normalizeClass = (name: string) => name.toLowerCase().trim();
        const userAvailableClasses = availableClasses.filter(testClass => {
          const matches = userClasses.some(userClass => normalizeClass(userClass) === normalizeClass(testClass));
          if (!matches) {
            console.log(`[APTestSection] Class "${testClass}" not in user classes:`, userClasses);
          }
          return matches;
        });
        
        console.log('[APTestSection] User available classes after filtering:', userAvailableClasses);

        // Get all tests for each class
        const classTests: ClassTestInfo[] = [];
        await Promise.all(
          userAvailableClasses.map(async (className) => {
            console.log(`[APTestSection] Loading tests for class: ${className}`);
            const testIds = await getAvailableTestsForClass(className);
            console.log(`[APTestSection] Found ${testIds.length} tests for ${className}:`, testIds);
            
            if (testIds.length > 0) {
              classTests.push({ className, testIds });
              
              // Pre-load test metadata for the first test of each class
              if (testIds.length > 0) {
                const firstTestId = testIds[0];
                const data = await loadAPTestData(className, firstTestId);
                if (data) {
                  console.log(`[APTestSection] Pre-loaded test data for ${className} - Practice ${firstTestId}`);
                  setTestDataCache(prev => ({
                    ...prev,
                    [`${className}:${firstTestId}`]: data
                  }));
                } else {
                  console.error(`[APTestSection] Failed to load test data for ${className} - Practice ${firstTestId}`);
                }
              }
            }
          })
        );

        console.log('[APTestSection] Final class tests:', classTests);
        setAvailableClassTests(classTests);
      } catch (error) {
        console.error("Error loading available AP tests:", error);
        toast.error("Failed to load AP tests");
      } finally {
        setLoading(false);
      }
    }

    if (userClasses.length > 0) {
      loadTests();
    } else {
      setLoading(false);
    }
  }, [userClasses]);

  const handleStartTest = async (className: string, testId: number) => {
    try {
      const cacheKey = `${className}:${testId}`;
      let testData = testDataCache[cacheKey];
      if (!testData) {
        console.log(`[APTestSection] Loading test data for ${className} - Practice ${testId}`);
        testData = await loadAPTestData(className, testId);
        if (!testData) {
          console.error(`[APTestSection] Failed to load test data for ${className} - Practice ${testId}`);
          toast.error(`Failed to load AP test for ${className} - Practice ${testId}`);
          return;
        }
        console.log(`[APTestSection] Successfully loaded test data:`, {
          ap_class: testData.ap_class,
          test_id: testData.test_id,
          total_questions: testData.total_questions,
          questions_length: testData.questions?.length || 0,
          time_limit_minutes: testData.time_limit_minutes
        });
        setTestDataCache(prev => ({ ...prev, [cacheKey]: testData! }));
      } else {
        console.log(`[APTestSection] Using cached test data for ${className} - Practice ${testId}`);
      }
      
      // Validate testData before passing it
      if (!testData.questions || testData.questions.length === 0) {
        console.error(`[APTestSection] Test data has no questions:`, testData);
        toast.error(`Test data is invalid: no questions found`);
        return;
      }
      
      console.log(`[APTestSection] Starting test with ${testData.questions.length} questions`);
      onStartTest(testData);
    } catch (error) {
      console.error("Error starting AP test:", error);
      toast.error("Failed to start AP test");
    }
  };

  if (loading) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-4 text-3xl md:text-4xl lg:text-5xl font-bold">
            <FileText className="w-8 h-8 md:w-9 md:h-9 text-secondary" />
            AP Test
          </CardTitle>
          <CardDescription className="text-xl md:text-2xl mt-3">
            Loading available tests...
          </CardDescription>
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="outline" className="text-xl md:text-2xl px-5 py-2 bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300">
              Coming out soon
            </Badge>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (availableClassTests.length === 0) {
    return (
      <Card variant="elevated">
        <CardHeader className="pb-5 px-8 pt-6">
          <CardTitle className="flex items-center gap-4 text-3xl md:text-4xl lg:text-5xl font-bold">
            <FileText className="w-8 h-8 md:w-9 md:h-9 text-secondary" />
            AP Test
          </CardTitle>
          <CardDescription className="text-xl md:text-2xl mt-3">
            Take a full-length AP-style test to assess your readiness
          </CardDescription>
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="outline" className="text-xl md:text-2xl px-5 py-2 bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300">
              Coming out soon
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-6">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">
              No AP tests are currently available for your enrolled classes. Check back later or contact your teacher.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader className="pb-5 px-8 pt-6">
        <CardTitle className="flex items-center gap-4 text-3xl md:text-4xl lg:text-5xl font-bold">
          <FileText className="w-8 h-8 md:w-9 md:h-9 text-secondary" />
          AP Test
        </CardTitle>
        <CardDescription className="text-xl md:text-2xl mt-3">
          Take a full-length AP-style test to assess your readiness
        </CardDescription>
        <div className="mt-4 flex items-center gap-2">
          <Badge variant="outline" className="text-xl md:text-2xl px-5 py-2 bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300">
            Coming out soon
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 px-8 pb-6">
        {availableClassTests.map(({ className, testIds }) => (
          <div key={className} className="space-y-4">
            <h3 className="text-2xl md:text-3xl font-bold">{className}</h3>
            <div className="space-y-3">
              {testIds.map((testId) => {
                const cacheKey = `${className}:${testId}`;
                const testData = testDataCache[cacheKey];
                return (
                  <div
                    key={testId}
                    className="flex items-center justify-between p-6 rounded-xl border-2 border-border hover:border-secondary transition-all bg-card"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-xl md:text-2xl font-semibold">Practice {testId}</h4>
                        <Badge variant="outline" className="text-xl px-6 py-3">
                          Full Test
                        </Badge>
                      </div>
                      {testData && (
                        <div className="flex items-center gap-6 mt-3 text-xl md:text-2xl text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <FileText className="w-6 h-6 md:w-7 md:h-7" />
                            <span>{testData.total_questions} questions</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-6 h-6 md:w-7 md:h-7" />
                            <span>{testData.time_limit_minutes} minutes</span>
                          </div>
                        </div>
                      )}
                      <p className="text-base text-muted-foreground mt-2">
                        Complete a full AP-style multiple-choice test with detailed performance tracking
                      </p>
                    </div>
                    <Button
                      variant="student"
                      size="lg"
                      className="h-16 text-xl font-bold px-8 ml-6"
                      onClick={() => handleStartTest(className, testId)}
                    >
                      <Play className="w-6 h-6 mr-2" />
                      Start Test
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border">
          <p className="text-base md:text-lg text-muted-foreground">
            <strong>Note:</strong> AP tests are timed and must be completed in one session. 
            Your performance will be tracked for detailed analytics including accuracy by skill type, 
            topic tags, time management, and predicted AP score.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
