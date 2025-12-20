// AP Test JSON Loader
// Handles loading AP test data from JSON files in /public/data/ap-tests/

import { APTestData, APTestQuestion, APTestClassFile, APTest } from './apTestData';
import { deriveStimulusMeta, StimulusItem } from './questionData';

// Cache for loaded AP test class files - key: className
const apTestClassCache: Map<string, APTestClassFile> = new Map();
// Cache for available test IDs per class - key: className, value: test IDs
const classTestsCache: Map<string, number[]> = new Map();

/**
 * Normalize class name for matching (case-insensitive)
 */
function normalizeClassName(className: string): string {
  return className
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Load AP test class file from JSON
 * @param className - Name of the AP class (e.g., "AP Biology")
 * @returns Promise<APTestClassFile | null>
 */
async function loadAPTestClassFile(className: string): Promise<APTestClassFile | null> {
  // Check cache first
  if (apTestClassCache.has(className)) {
    const cached = apTestClassCache.get(className)!;
    console.log(`[AP Test Loader] Using cached data for ${className} (${cached.tests.length} tests)`);
    return cached;
  }

  try {
    // Convert className to filename
    // The files are named like: AP_Biology.json, AP_Calculus_AB.json, etc.
    // Format: AP_ClassName.json where spaces and special chars become underscores
    // IMPORTANT: Always use uppercase "AP" prefix in filename, regardless of input case
    const normalizedClass = className.trim();
    
    // Generate filename variations - prioritize exact match first
    const filenameVariations: string[] = [];
    
    // Extract the class name part (everything after "AP" or "ap")
    let classPart = normalizedClass.replace(/^ap\s+/i, '').trim();
    
    // Capitalize first letter of each word in class part for consistency
    // "biology" -> "Biology", "calculus ab" -> "Calculus_Ab"
    classPart = classPart
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('_');
    
    // Always use uppercase "AP_" prefix - this is the standard format
    const standardFilename = 'AP_' + classPart + '.json';
    filenameVariations.push(standardFilename);
    
    // Also try direct conversion in case input already matches file format exactly
    const directConversion = normalizedClass.replace(/\s+/g, '_') + '.json';
    if (directConversion !== standardFilename) {
      filenameVariations.push(directConversion);
    }
    
    // Remove duplicates
    const uniqueVariations = [...new Set(filenameVariations)];
    
    let response: Response | null = null;
    let filename = '';
    
    // Try each filename variation
    for (const filenameVar of uniqueVariations) {
      const url = `/data/ap-tests/${filenameVar}?t=${Date.now()}`;
      console.log(`[AP Test Loader] Trying to load: ${filenameVar} for class: ${className} from URL: ${url}`);
      
      try {
        response = await fetch(url, { cache: "no-store" });
        console.log(`[AP Test Loader] Response status for ${filenameVar}: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          // Check if response is actually JSON (not HTML error page)
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            filename = filenameVar;
            console.log(`[AP Test Loader] Successfully found file: ${filename}`);
            break;
          } else {
            console.warn(`[AP Test Loader] Response for ${filenameVar} is not JSON (content-type: ${contentType})`);
            // Try to read as text to see what we got (but don't consume the response)
            const clonedResponse = response.clone();
            clonedResponse.text().then(text => {
              console.warn(`[AP Test Loader] Response preview: ${text.substring(0, 200)}`);
            }).catch(() => {});
          }
        } else {
          // For 404, try to see what we got
          if (response.status === 404) {
            const clonedResponse = response.clone();
            clonedResponse.text().then(text => {
              if (text.includes('<!doctype') || text.includes('<html')) {
                console.log(`[AP Test Loader] Got HTML 404 page for ${filenameVar}`);
              }
            }).catch(() => {});
          }
          console.log(`[AP Test Loader] File ${filenameVar} not found (${response.status})`);
        }
      } catch (e) {
        console.error(`[AP Test Loader] Error fetching ${filenameVar}:`, e);
        // Continue to next variation
        continue;
      }
    }
    
    if (!response || !response.ok || !filename) {
      console.error(`[AP Test Loader] ERROR: Could not load AP test JSON file for ${className}. Tried: ${uniqueVariations.join(', ')}`);
      return null;
    }

    // Parse JSON - if this fails, we'll catch it in the outer try-catch
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      // If JSON parsing fails, try to read as text to see what we got
      const text = await response.text();
      console.error(`[AP Test Loader] Failed to parse JSON. Response preview: ${text.substring(0, 500)}`);
      throw new Error(`Invalid JSON response: ${jsonError}`);
    }
    
    // Normalize class name from JSON (handle case variations)
    const jsonClassName = data.ap_class || className;
    
    // Handle both new format (with tests array) and old format (single test at root)
    let tests: APTest[] = [];
    
    if (data.tests && Array.isArray(data.tests)) {
      // New format: tests array
      tests = data.tests.map((test: any) => {
        const apTest: APTest = {
          test_id: test.test_id || 0,
          total_questions: test.total_questions || 0,
          time_limit_minutes: test.time_limit_minutes || 90,
          questions: (test.questions || []).map((q: any) => {
            const stimulus: StimulusItem[] = q.stimulus || [];
            const stimulusMeta = q.stimulusMeta || deriveStimulusMeta(stimulus);
            
            const question: APTestQuestion = {
              id: q.id || 0,
              question_text: q.question_text || "",
              options: {
                A: q.options?.A || "",
                B: q.options?.B || "",
                C: q.options?.C || "",
                D: q.options?.D || "",
              },
              correct_answer: (q.correct_answer || "A") as "A" | "B" | "C" | "D",
              skill_type: q.skill_type || "Unknown",
              difficulty: (q.difficulty || "Medium") as "Easy" | "Medium" | "Hard",
              estimated_time_seconds: q.estimated_time_seconds || 90,
              tags: Array.isArray(q.tags) ? q.tags : [],
              stimulus: stimulus.length > 0 ? stimulus : undefined,
              stimulusMeta: stimulusMeta.hasStimulus ? stimulusMeta : undefined,
              userState: q.userState || undefined,
            };
            return question;
          }),
        };
        
        if (apTest.total_questions !== apTest.questions.length) {
          console.warn(`[AP Test Loader] total_questions (${apTest.total_questions}) doesn't match actual questions (${apTest.questions.length}) for test_id ${apTest.test_id}. Updating.`);
          apTest.total_questions = apTest.questions.length;
        }
        
        return apTest;
      });
    } else if (data.questions && Array.isArray(data.questions)) {
      // Old format: single test at root level - convert to new format
      console.log(`[AP Test Loader] Detected old format for ${className}, converting to new format`);
      const apTest: APTest = {
        test_id: 1, // Default to test_id 1 for old format
        total_questions: data.total_questions || data.questions.length,
        time_limit_minutes: data.time_limit_minutes || 90,
        questions: (data.questions || []).map((q: any) => {
          const stimulus: StimulusItem[] = q.stimulus || [];
          const stimulusMeta = q.stimulusMeta || deriveStimulusMeta(stimulus);
          
          const question: APTestQuestion = {
            id: q.id || 0,
            question_text: q.question_text || "",
            options: {
              A: q.options?.A || "",
              B: q.options?.B || "",
              C: q.options?.C || "",
              D: q.options?.D || "",
            },
            correct_answer: (q.correct_answer || "A") as "A" | "B" | "C" | "D",
            skill_type: q.skill_type || "Unknown",
            difficulty: (q.difficulty || "Medium") as "Easy" | "Medium" | "Hard",
            estimated_time_seconds: q.estimated_time_seconds || 90,
            tags: Array.isArray(q.tags) ? q.tags : [],
            stimulus: stimulus.length > 0 ? stimulus : undefined,
            stimulusMeta: stimulusMeta.hasStimulus ? stimulusMeta : undefined,
            userState: q.userState || undefined,
          };
          return question;
        }),
      };
      
      if (apTest.total_questions !== apTest.questions.length) {
        apTest.total_questions = apTest.questions.length;
      }
      
      tests = [apTest];
    }

    // Validate that we actually got data
    if (!tests || tests.length === 0) {
      console.error(`[AP Test Loader] WARNING: Loaded JSON for ${className} but found 0 tests. Check the JSON file structure.`);
      return null;
    }
    
    // Normalize class name to title case for consistency
    const normalizedClassName = jsonClassName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    const classFile: APTestClassFile = {
      ap_class: normalizedClassName,
      tests,
    };
    
    // Cache the loaded data (use original className as key for lookup)
    apTestClassCache.set(className, classFile);
    console.log(`[AP Test Loader] Successfully loaded ${classFile.tests.length} tests from JSON for ${className}`);
    return classFile;
  } catch (error) {
    console.error(`[AP Test Loader] Error loading AP test data for ${className} from JSON file:`, error);
    return null;
  }
}

/**
 * Load a specific AP test by class and test_id
 * @param className - Name of the AP class (e.g., "AP Biology")
 * @param testId - The test_id from the JSON structure
 * @returns Promise<APTestData | null>
 */
export async function loadAPTestData(className: string, testId: number): Promise<APTestData | null> {
  // Try normalized name first, then original
  const normalized = normalizeClassName(className);
  let classFile = await loadAPTestClassFile(normalized);
  if (!classFile) {
    classFile = await loadAPTestClassFile(className);
  }
  
  if (!classFile) {
    return null;
  }

  const test = classFile.tests.find(t => t.test_id === testId);
  if (!test) {
    console.error(`[AP Test Loader] Test with test_id ${testId} not found in ${className}. Available test_ids:`, classFile.tests.map(t => t.test_id));
    return null;
  }

  // Validate test data
  if (!test.questions || test.questions.length === 0) {
    console.error(`[AP Test Loader] Test with test_id ${testId} has no questions`);
    return null;
  }

  const testData: APTestData = {
    ap_class: classFile.ap_class,
    test_id: test.test_id,
    total_questions: test.total_questions,
    time_limit_minutes: test.time_limit_minutes,
    questions: test.questions,
  };

  console.log(`[AP Test Loader] Successfully loaded test data:`, {
    ap_class: testData.ap_class,
    test_id: testData.test_id,
    total_questions: testData.total_questions,
    questions_count: testData.questions.length,
    time_limit_minutes: testData.time_limit_minutes
  });

  return testData;
}

/**
 * Get list of available test IDs for a specific class
 * Returns array of test IDs for the given class
 */
export async function getAvailableTestsForClass(className: string): Promise<number[]> {
  // Normalize class name for cache lookup
  const normalized = normalizeClassName(className);
  
  // Check cache first (try both normalized and original)
  if (classTestsCache.has(normalized)) {
    return classTestsCache.get(normalized)!;
  }
  if (classTestsCache.has(className)) {
    return classTestsCache.get(className)!;
  }

  // Try loading with normalized name first, then original
  let classFile = await loadAPTestClassFile(normalized);
  if (!classFile) {
    classFile = await loadAPTestClassFile(className);
  }
  
  if (!classFile) {
    classTestsCache.set(normalized, []);
    classTestsCache.set(className, []);
    return [];
  }

  const testIds = classFile.tests.map(test => test.test_id).sort((a, b) => a - b);
  classTestsCache.set(normalized, testIds);
  classTestsCache.set(className, testIds);
  return testIds;
}

/**
 * Get list of classes that have available AP tests
 * Returns array of class names that have at least one test
 */
export async function getAvailableAPTestClasses(): Promise<string[]> {
  const allClasses = [
    "AP Biology",
    "AP Calculus AB",
    "AP Calculus BC",
    "AP Chemistry",
    "AP Comparative Politics",
    "AP Computer Science A",
    "AP Computer Science Principles",
    "AP English III: Language & Composition",
    "AP English IV: Literature & Composition",
    "AP Environmental Science",
    "AP Macroeconomics",
    "AP Microeconomics",
    "AP Physics 1: Algebra-Based",
    "AP Physics 2: Algebra-Based",
    "AP Physics C",
    "AP Pre-Calculus",
    "AP Psychology",
    "AP Statistics",
    "AP US History",
    "AP World History",
  ];

  // Check which classes have at least one test
  const available: string[] = [];
  await Promise.all(
    allClasses.map(async (className) => {
      // Try both the normalized name and variations
      const normalized = normalizeClassName(className);
      console.log(`[AP Test Loader] Checking for tests in class: ${className} (normalized: ${normalized})`);
      
      let tests = await getAvailableTestsForClass(normalized);
      if (tests.length > 0) {
        console.log(`[AP Test Loader] Found ${tests.length} tests for ${normalized}`);
        available.push(normalized);
      } else {
        // Also try the original className
        tests = await getAvailableTestsForClass(className);
        if (tests.length > 0) {
          console.log(`[AP Test Loader] Found ${tests.length} tests for ${className} (original)`);
          available.push(className);
        } else {
          console.log(`[AP Test Loader] No tests found for ${className}`);
        }
      }
    })
  );

  console.log(`[AP Test Loader] Total available classes with tests: ${available.length}`, available);
  return available;
}

/**
 * Clear the cache (useful for development/testing)
 */
export function clearAPTestCache(): void {
  apTestClassCache.clear();
  classTestsCache.clear();
}
