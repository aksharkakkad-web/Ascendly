import { supabaseAdmin } from '../config/supabase.js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Migration: Import users from exported localStorage data
 * 
 * Usage: tsx src/migrations/002_import_users.ts <path-to-export-file.json>
 */

interface ExportedData {
  database: {
    users: any[];
    quizResults: any[];
    questionAttempts: Record<string, any[]>;
    quizProgress: Record<string, any>;
    classes: any[];
    apTestAttempts?: Record<string, any[]>;
  };
}

async function hashPassword(password: string): Promise<string> {
  // Note: Supabase handles password hashing, but we need to create users via auth API
  // For migration, we'll use a temporary password and users will need to reset
  return password; // Supabase auth.admin.createUser handles hashing
}

async function importUsers(exportFilePath: string) {
  try {
    console.log('📖 Reading export file...');
    const fileContent = fs.readFileSync(exportFilePath, 'utf-8');
    const exportData: ExportedData = JSON.parse(fileContent);

    if (!exportData.database?.users) {
      console.log('⚠️  No users found in export file');
      return;
    }

    const users = exportData.database.users;
    console.log(`📊 Found ${users.length} users to import`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Generate a temporary email if not provided
        const email = `${user.username}@migrated.local`;
        
        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: user.password || crypto.randomBytes(16).toString('hex'), // Random password if not set
          email_confirm: true,
          user_metadata: {
            username: user.username,
            role: user.role
          }
        });

        if (authError || !authData.user) {
          console.error(`❌ Failed to create auth user ${user.username}:`, authError?.message);
          errorCount++;
          continue;
        }

        // Create user profile
        const { error: profileError } = await supabaseAdmin
          .from('users')
          .insert({
            id: authData.user.id,
            username: user.username.toLowerCase(),
            first_name: user.firstName || user.first_name || '',
            last_name: user.lastName || user.last_name || '',
            nickname: user.nickname,
            display_preference: user.displayPreference === 'username' ? 'nickname' : (user.displayPreference || 'nickname'),
            role: user.role || 'student',
            streak: user.streak || 0,
            last_quiz_date: user.lastQuizDate || user.last_quiz_date || null,
            last_decay_timestamp: user.lastDecayTimestamp || user.last_decay_timestamp || null,
            show_leaderboard: user.showLeaderboard ?? (user.role === 'student' ? false : undefined),
            show_rank: user.showRank ?? (user.role === 'student' ? true : undefined),
            created_at: user.createdAt || user.created_at || new Date().toISOString()
          });

        if (profileError) {
          console.error(`❌ Failed to create profile for ${user.username}:`, profileError.message);
          // Clean up auth user
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          errorCount++;
          continue;
        }

        // Import AP classes
        const apClasses = user.apClasses || [];
        if (apClasses.length > 0) {
          await supabaseAdmin
            .from('user_ap_classes')
            .insert(apClasses.map((apClass: string) => ({
              user_id: authData.user.id,
              ap_class: apClass
            })));
        }

        // Import class scores
        const classScores = user.classScores || {};
        if (Object.keys(classScores).length > 0) {
          await supabaseAdmin
            .from('user_class_scores')
            .insert(Object.entries(classScores).map(([apClass, score]) => ({
              user_id: authData.user.id,
              ap_class: apClass,
              score: score as number
            })));
        }

        // Import daily points
        const dailyPoints = user.dailyPoints || {};
        if (Object.keys(dailyPoints).length > 0) {
          await supabaseAdmin
            .from('daily_points')
            .insert(Object.entries(dailyPoints).map(([date, points]) => ({
              user_id: authData.user.id,
              date,
              points: points as number
            })));
        }

        successCount++;
        console.log(`✅ Imported user: ${user.username}`);
      } catch (error: any) {
        console.error(`❌ Error importing user ${user.username}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully imported: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log('\n⚠️  Note: Users will need to reset their passwords via Supabase Auth');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
const exportFilePath = process.argv[2];
if (!exportFilePath) {
  console.error('Usage: tsx src/migrations/002_import_users.ts <path-to-export-file.json>');
  process.exit(1);
}

importUsers(exportFilePath);

