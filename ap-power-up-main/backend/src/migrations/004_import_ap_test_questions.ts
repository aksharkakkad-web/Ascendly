import { supabaseAdmin } from '../config/supabase.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migration: Import AP test questions from JSON files
 * 
 * Usage: tsx src/migrations/004_import_ap_test_questions.ts [ap-tests-dir]
 * 
 * Default AP tests directory: ../../public/data/ap-tests
 */

interface APTestQuestion {
  id?: number;
  question_text: string;
  options: Record<string, string>;
  correct_answer: string;
  skill_type?: string;
  difficulty?: string;
  estimated_time_seconds?: number;
  tags?: string[];
}

interface APTestData {
  ap_class?: string;
  test_id?: string;
  total_questions?: number;
  time_limit_minutes?: number;
  questions: APTestQuestion[];
}

async function importAPTestQuestions(apTestsDir: string) {
  try {
    console.log(`📖 Reading AP test questions from: ${apTestsDir}`);
    
    if (!fs.existsSync(apTestsDir)) {
      console.log(`⚠️  AP tests directory not found: ${apTestsDir}`);
      return;
    }

    const files = fs.readdirSync(apTestsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    console.log(`📊 Found ${jsonFiles.length} AP test files`);

    let totalImported = 0;
    let totalErrors = 0;

    for (const file of jsonFiles) {
      try {
        const filePath = path.join(apTestsDir, file);
        console.log(`\n📄 Processing: ${file}`);

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data: APTestData = JSON.parse(fileContent);

        const apClass = data.ap_class || file.replace('.json', '').replace(/_/g, ' ');
        const testId = data.test_id || file.replace('.json', '');

        if (!data.questions || data.questions.length === 0) {
          console.log(`⚠️  No questions found in ${file}`);
          continue;
        }

        const questionsToInsert = data.questions.map((q: APTestQuestion, index: number) => {
          // Convert options object to array format
          const options = Object.entries(q.options || {}).map(([id, content]) => ({
            id,
            content
          }));

          return {
            test_id: testId,
            ap_class: apClass,
            question_text: q.question_text,
            options,
            correct_answer: q.correct_answer,
            skill_type: q.skill_type || null,
            difficulty: q.difficulty || null,
            estimated_time_seconds: q.estimated_time_seconds || null,
            tags: q.tags || [],
            question_order: q.id !== undefined ? q.id : index + 1
          };
        });

        // Insert questions
        const { error } = await supabaseAdmin
          .from('ap_test_questions')
          .insert(questionsToInsert);

        if (error) {
          console.error(`❌ Error inserting questions from ${file}:`, error.message);
          totalErrors += questionsToInsert.length;
        } else {
          console.log(`✅ Imported ${questionsToInsert.length} questions from ${file}`);
          totalImported += questionsToInsert.length;
        }
      } catch (error: any) {
        console.error(`❌ Error processing ${file}:`, error.message);
        totalErrors++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Total AP test questions imported: ${totalImported}`);
    console.log(`❌ Total errors: ${totalErrors}`);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
const apTestsDir = process.argv[2] || path.join(__dirname, '../../public/data/ap-tests');
importAPTestQuestions(apTestsDir);

