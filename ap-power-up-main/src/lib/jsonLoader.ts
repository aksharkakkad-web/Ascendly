// JSON Loader Utility for Enhanced Question Structure
// This file handles loading question data from JSON files dynamically

import { ClassData, Question, Unit, Subtopic, initializeUserState, initializeMetadata, deriveStimulusMeta, StimulusItem } from './questionData';

// Cache for loaded class data
const classDataCache: Map<string, ClassData> = new Map();

/**
 * Load class data from API or JSON file (fallback)
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

  // Try API first, but check if data is complete
  try {
    const { questionApi } = await import('./api');
    const questions = await questionApi.getQuestions({ apClass: className });
    
    if (questions && questions.length > 0) {
      // Check if API questions have correct_answer_id populated
      // If more than 50% are missing correct_answer_id, fall back to JSON
      const questionsWithCorrectAnswer = questions.filter((q: any) => 
        q.correct_answer_id || q.correctAnswerId || q.correctOptionId || q.answer
      ).length;
      const completenessRatio = questionsWithCorrectAnswer / questions.length;
      
      // Also check if API questions have stimulus data (either at root or in metadata)
      // Count questions that have stimulus
      const questionsWithStimulus = questions.filter((q: any) => {
        if (q.stimulus && Array.isArray(q.stimulus) && q.stimulus.length > 0) return true;
        if (q.metadata) {
          let metadata = q.metadata;
          if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch (e) { return false; }
          }
          if (metadata && metadata.stimulus && Array.isArray(metadata.stimulus) && metadata.stimulus.length > 0) return true;
        }
        return false;
      }).length;
      
      const stimulusCompletenessRatio = questionsWithStimulus / questions.length;
      
      // Fall back to JSON if correct answers are missing OR if stimulus data is missing
      // (only use API if both correct answers AND stimulus are present)
      if (completenessRatio < 0.5) {
        console.warn(`[JSON LOADER] API data incomplete (${Math.round(completenessRatio * 100)}% have correct answers). Falling back to JSON.`);
        // Fall through to JSON loading
      } else if (stimulusCompletenessRatio < 0.1) {
        // If less than 10% have stimulus, API is likely missing stimulus data - use JSON
        console.warn(`[JSON LOADER] API data missing stimulus (only ${Math.round(stimulusCompletenessRatio * 100)}% have stimulus). Falling back to JSON for complete data.`);
        // Fall through to JSON loading
      } else {
        // Transform API questions to ClassData format
        // Group by unit and subtopic
        const unitsMap = new Map<string, Map<string, any[]>>();
        
        questions.forEach((q: any) => {
          const unitName = q.unit_name;
          const subtopicName = q.subtopic_name || 'General';
          
          if (!unitsMap.has(unitName)) {
            unitsMap.set(unitName, new Map());
          }
          
          const subtopicsMap = unitsMap.get(unitName)!;
          if (!subtopicsMap.has(subtopicName)) {
            subtopicsMap.set(subtopicName, []);
          }
          
          // Extract stimulus from multiple possible locations
          // Try root level first, then metadata (handle both object and string)
          let stimulus: any[] = [];
          if (q.stimulus) {
            // Handle both array and null
            if (Array.isArray(q.stimulus)) {
              stimulus = q.stimulus;
            }
          } else if (q.metadata) {
            // Handle metadata as object or JSON string
            let metadata = q.metadata;
            if (typeof metadata === 'string') {
              try {
                metadata = JSON.parse(metadata);
              } catch (e) {
                console.warn(`[JSON LOADER] Failed to parse metadata JSON for question ${q.id}`);
                metadata = {};
              }
            }
            if (metadata && metadata.stimulus !== undefined && metadata.stimulus !== null) {
              if (Array.isArray(metadata.stimulus)) {
                stimulus = metadata.stimulus;
              }
            }
          }
          
          // Extract stimulusMeta similarly
          let stimulusMeta: any = undefined;
          if (q.stimulusMeta) {
            stimulusMeta = q.stimulusMeta;
          } else if (q.metadata) {
            let metadata = q.metadata;
            if (typeof metadata === 'string') {
              try {
                metadata = JSON.parse(metadata);
              } catch (e) {
                metadata = {};
              }
            }
            if (metadata && metadata.stimulusMeta) {
              stimulusMeta = metadata.stimulusMeta;
            }
          }
          
          // Derive stimulusMeta if not found
          if (!stimulusMeta) {
            stimulusMeta = deriveStimulusMeta(stimulus);
          }
          
          const correctAnswerId = q.correct_answer_id || q.correctAnswerId || q.correctOptionId || q.answer || '';
          
          if (!correctAnswerId) {
            console.warn(`[JSON LOADER] API question ${q.id} is missing correct_answer_id`);
          }
          
          subtopicsMap.get(subtopicName)!.push({
            id: q.id,
            questionText: q.question_text,
            options: q.options,
            correctAnswerId,
            explanation: q.explanation || '',
            metadata: q.metadata || {},
            stimulus: stimulus && stimulus.length > 0 ? stimulus : undefined,
            stimulusMeta: stimulusMeta && stimulusMeta.hasStimulus ? stimulusMeta : undefined,
          });
        });
        
        const classData: ClassData = {
          className,
          units: Array.from(unitsMap.entries()).map(([unitName, subtopicsMap]) => ({
            unitName,
            subtopics: Array.from(subtopicsMap.entries()).map(([subtopicName, questions]) => ({
              subtopicName,
              questions
            }))
          }))
        };
        
        if (classData.units.length > 0) {
          classDataCache.set(className, classData);
          const totalQuestions = classData.units.reduce((sum, unit) => 
            sum + unit.subtopics.reduce((s, st) => s + st.questions.length, 0), 0
          );
          console.log(`[JSON LOADER] Loaded ${classData.units.length} units with ${totalQuestions} total questions from API for ${className}`);
          return classData;
        }
      }
    }
  } catch (error) {
    console.warn(`[JSON LOADER] Failed to load from API, falling back to JSON:`, error);
  }

  // Fallback to JSON files
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

            // Load stimulus data - ensure it's properly typed
            const stimulus: StimulusItem[] = Array.isArray(q.stimulus) ? q.stimulus : [];
            const stimulusMeta = q.stimulusMeta || deriveStimulusMeta(stimulus);

            // Debug logging for stimulus
            if (stimulus.length > 0) {
              console.log(`[JSON LOADER] Question ${q.id || 'unknown'} has ${stimulus.length} stimulus items:`, stimulus.map(s => s.type));
            }

            // Ensure correctAnswerId is set - check all possible field names
            const correctAnswerId = q.correctAnswerId || 
                                   q.correctOptionId || 
                                   q.correct_answer_id || 
                                   q.answer || 
                                   '';
            
            // Log warning if correctAnswerId is missing
            if (!correctAnswerId && q.id) {
              console.warn(`[JSON LOADER] Question ${q.id} is missing correctAnswerId. Available fields:`, Object.keys(q));
            }
            
            return {
              id: q.id || "",
              questionText: q.questionText || q.question || "",
              options,
              correctAnswerId,
              explanation: q.explanation || "",
              commonMistakePatterns: q.commonMistakePatterns || [],
              metadata,
              userState: { ...initializeUserState(), ...(q.userState || {}) },
              stimulus: stimulus.length > 0 ? stimulus : undefined,
              stimulusMeta: stimulusMeta.hasStimulus ? stimulusMeta : undefined,
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
