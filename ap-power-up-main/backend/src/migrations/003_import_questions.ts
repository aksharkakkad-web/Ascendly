import { supabaseAdmin } from '../config/supabase.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migration: Import questions from JSON files
 * 
 * Usage: tsx src/migrations/003_import_questions.ts [questions-dir]
 * 
 * Default questions directory: ../../public/data
 */

interface QuestionOption {
  id: string;
  content: string;
}

interface Question {
  id?: string;
  questionText: string;
  question?: string;
  options: QuestionOption[] | string[];
  correctAnswerId?: string;
  correct_answer_id?: string;
  correctOptionId?: string;
  answer?: string;
  explanation?: string;
  apClass?: string;
  ap_class?: string;
  unitName?: string;
  unit_name?: string;
  unit?: string;
  subtopicName?: string;
  subtopic_name?: string;
  subtopic?: string;
  metadata?: any;
  stimulus?: any[];
  stimulusMeta?: any;
}

interface ClassData {
  className?: string;
  units?: Array<{
    unitName?: string;
    name?: string;
    subtopics?: Array<{
      subtopicName?: string;
      name?: string;
      questions: Question[];
    }>;
  }>;
}

async function importQuestions(questionsDir: string) {
  try {
    console.log(`📖 Reading questions from: ${questionsDir}`);
    
    const files = fs.readdirSync(questionsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('ap-tests'));

    console.log(`📊 Found ${jsonFiles.length} question files`);

    let totalImported = 0;
    let totalErrors = 0;

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(questionsDir, file);
        console.log(`\n📄 Processing: ${file}`);

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        let data: ClassData | ClassData[] = JSON.parse(fileContent);

        // Handle array-wrapped data
        if (Array.isArray(data) && data.length > 0) {
          data = data[0];
        }

        const className = data.className || file.replace('.json', '').replace(/_/g, ' ');
        
        if (!data.units || data.units.length === 0) {
          console.log(`⚠️  No units found in ${file}`);
          continue;
        }

        let fileImported = 0;
        let fileErrors = 0;

        for (const unit of data.units) {
          const unitName = unit.unitName || unit.name || '';
          
          if (!unit.subtopics || unit.subtopics.length === 0) {
            console.log(`⚠️  No subtopics found in unit: ${unitName}`);
            continue;
          }

          for (const subtopic of unit.subtopics) {
            const subtopicName = subtopic.subtopicName || subtopic.name || null;

            if (!subtopic.questions || subtopic.questions.length === 0) {
              continue;
            }

            const questionsToInsert = subtopic.questions.map((q: Question) => {
              // Normalize options
              let options: QuestionOption[] = [];
              if (Array.isArray(q.options)) {
                options = q.options.map((opt: any, idx: number) => {
                  if (typeof opt === 'string') {
                    return {
                      id: String.fromCharCode(65 + idx),
                      content: opt
                    };
                  }
                  return {
                    id: opt.id || String.fromCharCode(65 + idx),
                    content: opt.content || opt
                  };
                });
              } else if (q.options) {
                options = q.options as QuestionOption[];
              }

              // Always generate UUID for database, preserve original ID in metadata
              const generatedUUID = crypto.randomUUID();
              const originalQuestionId = q.id;

              return {
                id: generatedUUID, // Always use UUID for database
                question_text: q.questionText || q.question || '',
                options,
                correct_answer_id: q.correctAnswerId || q.correctOptionId || q.correct_answer_id || q.answer || '',
                explanation: q.explanation || null,
                ap_class: className,
                unit_name: unitName,
                subtopic_name: subtopicName,
                metadata: {
                  ...(q.metadata || {}),
                  originalQuestionId: originalQuestionId, // Preserve original ID for reference
                  stimulus: q.stimulus || null, // Store stimulus in metadata
                  stimulusMeta: q.stimulusMeta || null // Store stimulusMeta in metadata
                }
              };
            });

            // Insert questions in batches
            const batchSize = 100;
            for (let i = 0; i < questionsToInsert.length; i += batchSize) {
              const batch = questionsToInsert.slice(i, i + batchSize);
              
              const { error } = await supabaseAdmin
                .from('questions')
                .insert(batch);

              if (error) {
                console.error(`❌ Error inserting batch:`, error.message);
                fileErrors += batch.length;
              } else {
                fileImported += batch.length;
              }
            }
          }
        }

        console.log(`✅ Imported ${fileImported} questions from ${file}`);
        if (fileErrors > 0) {
          console.log(`❌ ${fileErrors} errors`);
        }

        totalImported += fileImported;
        totalErrors += fileErrors;
      } catch (error: any) {
        console.error(`❌ Error processing ${file}:`, error.message);
        totalErrors++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Total questions imported: ${totalImported}`);
    console.log(`❌ Total errors: ${totalErrors}`);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Import crypto module
import * as crypto from 'crypto';

// Run migration
const questionsDir = process.argv[2] || path.join(__dirname, '../../public/data');
if (!fs.existsSync(questionsDir)) {
  console.error(`❌ Questions directory not found: ${questionsDir}`);
  process.exit(1);
}

importQuestions(questionsDir);

