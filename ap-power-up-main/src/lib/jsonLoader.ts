// JSON Loader Utility for Enhanced Question Structure
// This file handles loading question data from JSON files dynamically

import { ClassData, Question, Unit, Subtopic, initializeUserState, initializeMetadata } from './questionData';

// Cache for loaded class data
const classDataCache: Map<string, ClassData> = new Map();

/**
 * Load class data from JSON file
 * @param className - Name of the AP class (e.g., "AP Biology")
 * @returns Promise<ClassData | null>
 */
export async function loadClassData(className: string): Promise<ClassData | null> {
  // Check cache first
  if (classDataCache.has(className)) {
    const cached = classDataCache.get(className)!;
    console.log(`Using cached data for ${className} (${cached.units.length} units)`);
    return cached;
  }

  try {
    // Convert className to filename (replace spaces and special chars)
    // Handle special cases for class names with colons, spaces, etc.
    const filename = className.replace(/[^a-zA-Z0-9]/g, '_') + '.json';
    const url = `/data/${filename}?t=${Date.now()}`;
    
    console.log(`[JSON LOADER] Loading questions from JSON file: ${filename} for class: ${className}`);
    
    // Force fresh fetch to avoid browser/proxy caching stale data
    const response = await fetch(url, { cache: "no-store" });
    
    if (!response.ok) {
      console.error(`[JSON LOADER] ERROR: Could not load JSON file for ${className} (${filename}): ${response.status} ${response.statusText}`);
      console.error(`[JSON LOADER] This means questions will NOT be loaded. Check that the file exists at public/data/${filename}`);
      return null;
    }

    let data = await response.json();
    
    // Handle array-wrapped data (some JSON files have [{...}] format)
    if (Array.isArray(data) && data.length > 0) {
      data = data[0];
    }
    
    // Validate and process the data
    const classData: ClassData = {
      className: data.className || className,
      units: (data.units || []).map((unit: any) => ({
        unitName: unit.unitName || unit.name || "",
        subtopics: (unit.subtopics || []).map((subtopic: any) => ({
          subtopicName: subtopic.subtopicName || subtopic.name || "",
          questions: (subtopic.questions || []).map((q: any) => {
            // Ensure options are in the new format
            const options = Array.isArray(q.options)
              ? q.options.map((opt: any, idx: number) => {
                  if (typeof opt === "string") {
                    return {
                      id: String.fromCharCode(65 + idx), // A, B, C, D
                      content: opt,
                    };
                  }
                  return {
                    id: opt.id || String.fromCharCode(65 + idx),
                    content: opt.content || opt,
                  };
                })
              : [];

            const metadata = {
              ...initializeMetadata(),
              ...(q.metadata || {}),
              skillTags: q?.metadata?.skillTags || [],
            };

            return {
              id: q.id || "",
              questionText: q.questionText || q.question || "",
              options,
              correctAnswerId: q.correctAnswerId || q.correctOptionId || q.answer || "",
              explanation: q.explanation || "",
              commonMistakePatterns: q.commonMistakePatterns || [],
              metadata,
              userState: { ...initializeUserState(), ...(q.userState || {}) },
            };
          }),
        })),
      })),
    };

    // Validate that we actually got data
    if (!classData.units || classData.units.length === 0) {
      console.error(`[JSON LOADER] WARNING: Loaded JSON for ${className} but found 0 units. Check the JSON file structure.`);
      return null;
    }
    
    // Cache the loaded data
    classDataCache.set(className, classData);
    const totalQuestions = classData.units.reduce((sum, unit) => 
      sum + unit.subtopics.reduce((s, st) => s + st.questions.length, 0), 0
    );
    console.log(`[JSON LOADER] Successfully loaded ${classData.units.length} units with ${totalQuestions} total questions from JSON for ${className}`);
    return classData;
  } catch (error) {
    console.error(`Error loading class data for ${className} from JSON file:`, error);
    return null;
  }
}

/**
 * Get all available class names from JSON files
 */
export function getAllClassNames(): string[] {
  return [
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
    "AP French",
    "AP Latin",
    "AP Macroeconomics",
    "AP Microeconomics",
    "AP Physics 1: Algebra-Based",
    "AP Physics 2: Algebra-Based",
    "AP Physics C",
    "AP Pre-Calculus",
    "AP Psychology",
    "AP Spanish Language & Culture",
    "AP Statistics",
    "AP US History",
    "AP World History",
  ];
}

/**
 * Get units for a class
 * ONLY loads from JSON files - no fallback to hardcoded data
 */
export async function getUnitsForClass(className: string): Promise<string[]> {
  const classData = await loadClassData(className);
  
  if (!classData) {
    console.error(`Failed to load class data for ${className} from JSON file`);
    return [];
  }
  
  const unitNames = classData.units.map(u => u.unitName);
  console.log(`Loaded ${unitNames.length} units from JSON for ${className}:`, unitNames);
  return unitNames;
}

/**
 * Get subtopics for a unit
 */
export async function getSubtopicsForUnit(className: string, unitName: string): Promise<string[]> {
  const classData = await loadClassData(className);
  const unit = classData?.units.find(u => u.unitName === unitName);
  return unit?.subtopics.map(s => s.subtopicName) || [];
}

/**
 * Get all questions for a subtopic
 */
export async function getQuestionsForSubtopic(
  className: string,
  unitName: string,
  subtopicName: string
): Promise<Question[]> {
  const classData = await loadClassData(className);
  const unit = classData?.units.find(u => u.unitName === unitName);
  const subtopic = unit?.subtopics.find(s => s.subtopicName === subtopicName);
  return subtopic?.questions || [];
}

/**
 * Get all questions for a unit (across all subtopics)
 * ONLY loads from JSON files - no fallback to hardcoded data
 */
export async function getQuestionsForUnit(className: string, unitName: string): Promise<Question[]> {
  const classData = await loadClassData(className);
  
  if (!classData) {
    console.error(`Failed to load class data for ${className} from JSON file`);
    return [];
  }
  
  const unit = classData.units.find(u => u.unitName === unitName);
  if (!unit) {
    console.warn(`Unit "${unitName}" not found in JSON for ${className}. Available units:`, 
      classData.units.map(u => u.unitName));
    return [];
  }
  
  const allQuestions: Question[] = [];
  for (const subtopic of unit.subtopics) {
    allQuestions.push(...subtopic.questions);
  }
  
  console.log(`Loaded ${allQuestions.length} questions from JSON for ${className} - ${unitName}`);
  return allQuestions;
}

/**
 * Get a specific question by ID
 */
export async function getQuestionById(questionId: string): Promise<Question | null> {
  // Try to find the question by searching all classes
  const classNames = getAllClassNames();
  for (const className of classNames) {
    const classData = await loadClassData(className);
    if (!classData) continue;
    
    for (const unit of classData.units) {
      for (const subtopic of unit.subtopics) {
        const question = subtopic.questions.find(q => q.id === questionId);
        if (question) return question;
      }
    }
  }
  return null;
}

/**
 * Clear the cache (useful for development/testing)
 */
export function clearCache(): void {
  classDataCache.clear();
}
