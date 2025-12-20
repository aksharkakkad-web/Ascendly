/**
 * Migration Script: Export localStorage Data
 * 
 * This script should be run in the browser console to export
 * all localStorage data to JSON format for migration to Supabase.
 * 
 * Usage: Copy this entire script and paste into browser console on the app page
 */

(function exportLocalStorage() {
  const DB_KEY = 'ascendly_db';
  const SESSION_KEY = 'ascendly_session';
  
  try {
    // Get database
    const dbData = localStorage.getItem(DB_KEY);
    const sessionData = localStorage.getItem(SESSION_KEY);
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      database: dbData ? JSON.parse(dbData) : null,
      session: sessionData ? JSON.parse(sessionData) : null
    };
    
    // Create download link
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `localStorage-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('✅ Export complete! File downloaded.');
    console.log('📊 Data summary:', {
      users: exportData.database?.users?.length || 0,
      quizResults: exportData.database?.quizResults?.length || 0,
      questionAttempts: Object.keys(exportData.database?.questionAttempts || {}).length,
      classes: exportData.database?.classes?.length || 0
    });
  } catch (error) {
    console.error('❌ Export failed:', error);
  }
})();

