import { supabaseAdmin } from '../config/supabase.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migration: Update correct_answer_id for existing questions from JSON files
 * 
 * Usage: tsx src/migrations/004_update_correct_answers.ts [questions-dir]
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
  correctOptionId?: string;
  correct_answer_id?: string;
  answer?: string;
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

async function updateCorrectAnswers(questionsDir: string) {
  try {
    console.log(`📖 Reading questions from: ${questionsDir}`);
    
    const files = fs.readdirSync(questionsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('ap-tests'));

    console.log(`📊 Found ${jsonFiles.length} question files`);

    let totalUpdated = 0;
    let totalErrors = 0;
    let totalNotFound = 0;

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

        let fileUpdated = 0;
        let fileErrors = 0;
        let fileNotFound = 0;

        for (const unit of data.units) {
          const unitName = unit.unitName || unit.name || '';
          
          if (!unit.subtopics || unit.subtopics.length === 0) {
            continue;
          }

          for (const subtopic of unit.subtopics) {
            const subtopicName = subtopic.subtopicName || subtopic.name || null;

            if (!subtopic.questions || subtopic.questions.length === 0) {
              continue;
            }

            for (const q of subtopic.questions) {
              const correctAnswerId = q.correctAnswerId || q.correctOptionId || q.correct_answer_id || q.answer || '';
              
              if (!correctAnswerId) {
                continue; // Skip if no correct answer in JSON
              }

              // Find question by original ID in metadata, or by question text and class
              const { data: existingQuestions, error: fetchError } = await supabaseAdmin
                .from('questions')
                .select('id, metadata, question_text')
                .eq('ap_class', className)
                .eq('unit_name', unitName)
                .eq('subtopic_name', subtopicName || '')
                .ilike('question_text', `%${(q.questionText || q.question || '').substring(0, 50)}%`)
                .limit(5);

              if (fetchError) {
                console.error(`❌ Error fetching question:`, fetchError.message);
                fileErrors++;
                continue;
              }

              // Try to find by original ID in metadata first
              let questionToUpdate = existingQuestions?.find(
                eq => eq.metadata?.originalQuestionId === q.id
              );

              // If not found, try to match by question text
              if (!questionToUpdate && existingQuestions && existingQuestions.length > 0) {
                const questionText = (q.questionText || q.question || '').trim();
                questionToUpdate = existingQuestions.find(
                  eq => eq.question_text?.trim() === questionText
                );
              }

              if (!questionToUpdate) {
                fileNotFound++;
                continue;
              }

              // Update the question
              const { error: updateError } = await supabaseAdmin
                .from('questions')
                .update({ correct_answer_id: correctAnswerId })
                .eq('id', questionToUpdate.id);

              if (updateError) {
                console.error(`❌ Error updating question ${questionToUpdate.id}:`, updateError.message);
                fileErrors++;
              } else {
                fileUpdated++;
              }
            }
          }
        }

        console.log(`✅ Updated ${fileUpdated} questions from ${file}`);
        if (fileNotFound > 0) {
          console.log(`⚠️  ${fileNotFound} questions not found in database`);
        }
        if (fileErrors > 0) {
          console.log(`❌ ${fileErrors} errors`);
        }

        totalUpdated += fileUpdated;
        totalNotFound += fileNotFound;
        totalErrors += fileErrors;
      } catch (error: any) {
        console.error(`❌ Error processing ${file}:`, error.message);
        totalErrors++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Total questions updated: ${totalUpdated}`);
    console.log(`⚠️  Total questions not found: ${totalNotFound}`);
    console.log(`❌ Total errors: ${totalErrors}`);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
const questionsDir = process.argv[2] || path.join(__dirname, '../../public/data');
if (!fs.existsSync(questionsDir)) {
  console.error(`❌ Questions directory not found: ${questionsDir}`);
  process.exit(1);
}

updateCorrectAnswers(questionsDir);







