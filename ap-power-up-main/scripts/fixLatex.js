/**
 * Comprehensive LaTeX normalization script for AP test prep platform.
 * 
 * Converts various LaTeX formats to $...$ (inline) format that MathText component expects.
 * Handles: \\(...\\), \\\\(...\\\\), \[...\], and undelimited LaTeX commands.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all JSON files in the data directory
const dataDir = path.join(__dirname, '../public/data');
const jsonFiles = fs.readdirSync(dataDir)
  .filter(file => file.endsWith('.json'))
  .map(file => path.join(dataDir, file));

/**
 * Normalizes LaTeX expressions in a string
 */
function normalizeLatex(str) {
  if (typeof str !== 'string') return str;
  
  let result = str;
  
  // Step 1: Convert double-escaped LaTeX delimiters \\\\( ... \\\\) to $ ... $
  // Use a simple approach: find \\\\(, then find the matching \\\\)
  let pos = 0;
  while ((pos = result.indexOf('\\\\\\(', pos)) !== -1) {
    const start = pos;
    const openLen = 4; // length of '\\\\\\('
    let depth = 1;
    let searchPos = pos + openLen;
    
    // Find matching closing delimiter
    while (searchPos < result.length && depth > 0) {
      if (result.substring(searchPos, searchPos + 4) === '\\\\\\)') {
        depth--;
        if (depth === 0) {
          const end = searchPos + 4;
          const content = result.substring(start + openLen, searchPos);
          const replacement = `$${content}$`;
          result = result.substring(0, start) + replacement + result.substring(end);
          pos = start + replacement.length;
          break;
        }
      } else if (result.substring(searchPos, searchPos + 4) === '\\\\\\(') {
        depth++;
        searchPos += 4;
      } else {
        searchPos++;
      }
    }
    if (depth > 0) break; // No match found, skip
  }
  
  // Step 2: Convert single-escaped LaTeX delimiters \\( ... \\) to $ ... $
  pos = 0;
  while ((pos = result.indexOf('\\(', pos)) !== -1) {
    const start = pos;
    const openLen = 2; // length of '\\('
    let depth = 1;
    let searchPos = pos + openLen;
    
    while (searchPos < result.length && depth > 0) {
      if (result.substring(searchPos, searchPos + 2) === '\\)') {
        depth--;
        if (depth === 0) {
          const end = searchPos + 2;
          const content = result.substring(start + openLen, searchPos);
          const replacement = `$${content}$`;
          result = result.substring(0, start) + replacement + result.substring(end);
          pos = start + replacement.length;
          break;
        }
      } else if (result.substring(searchPos, searchPos + 2) === '\\(') {
        depth++;
        searchPos += 2;
      } else {
        searchPos++;
      }
    }
    if (depth > 0) break;
  }
  
  // Step 3: Convert display math \\\[ ... \\\] to $$ ... $$
  pos = 0;
  while ((pos = result.indexOf('\\\\\\[', pos)) !== -1) {
    const start = pos;
    const openLen = 4; // length of '\\\\\\['
    const closePos = result.indexOf('\\\\\\]', start + openLen);
    if (closePos !== -1) {
      const end = closePos + 4;
      const content = result.substring(start + openLen, closePos);
      const replacement = `$$${content}$$`;
      result = result.substring(0, start) + replacement + result.substring(end);
      pos = start + replacement.length;
    } else {
      pos++;
    }
  }
  
  // Step 4: Convert display math \[ ... \] to $$ ... $$
  pos = 0;
  while ((pos = result.indexOf('\\[', pos)) !== -1) {
    const start = pos;
    const openLen = 2; // length of '\\['
    const closePos = result.indexOf('\\]', start + openLen);
    if (closePos !== -1) {
      const end = closePos + 2;
      const content = result.substring(start + openLen, closePos);
      const replacement = `$$${content}$$`;
      result = result.substring(0, start) + replacement + result.substring(end);
      pos = start + replacement.length;
    } else {
      pos++;
    }
  }
  
  // Step 5: Fix double-escaped backslashes in LaTeX commands
  // Convert \\\\command to \\command (proper JSON escaping)
  // Common LaTeX commands
  const commands = [
    'frac', 'sqrt', 'sum', 'int', 'Delta', 'delta', 'alpha', 'beta', 'gamma',
    'theta', 'pi', 'sigma', 'rho', 'omega', 'phi', 'psi', 'lambda', 'eta',
    'cdot', 'times', 'leq', 'le', 'geq', 'ge', 'pm', 'mp', 'neq', 'to',
    'text', 'rightarrow', 'leftarrow', 'Rightarrow', 'Leftarrow', 'Psi'
  ];
  
  for (const cmd of commands) {
    // Fix \\\\cmd{ to \\cmd{
    result = result.replace(new RegExp(`\\\\\\\\${cmd}\\\\{`, 'g'), `\\\\${cmd}{`);
    // Fix \\\\cmd (without brace) to \\cmd
    result = result.replace(new RegExp(`\\\\\\\\${cmd}(?![{a-zA-Z])`, 'g'), `\\\\${cmd}`);
  }
  
  // Fix double-escaped special chars
  result = result.replace(/\\\\\\\\_/g, '\\\\_');
  result = result.replace(/\\\\\\\\\\^/g, '\\\\^');
  
  // Step 6: Wrap undelimited LaTeX expressions
  // Check if we're already inside $...$ by counting dollar signs
  function isInMathMode(text, pos) {
    const before = text.substring(0, pos);
    const dollars = (before.match(/\$/g) || []).length;
    return dollars % 2 === 1;
  }
  
  // Find \frac{...}{...} patterns that aren't delimited
  const fracPattern = /\\frac\{[^}]+\}\{[^}]+\}/g;
  const matches = [];
  let match;
  
  while ((match = fracPattern.exec(result)) !== null) {
    if (!isInMathMode(result, match.index)) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[0]
      });
    }
  }
  
  // Apply replacements in reverse order
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    result = result.substring(0, m.start) + 
             `$${m.content}$` + 
             result.substring(m.end);
  }
  
  // Step 7: Clean up any remaining excessive backslashes
  result = result.replace(/\\\\{3,}/g, '\\\\');
  
  return result;
}

/**
 * Process a JSON file and normalize all LaTeX
 */
function processFile(filePath) {
  console.log(`Processing ${path.basename(filePath)}...`);
  
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    let data = JSON.parse(raw);
    
    // Handle array-wrapped data
    if (Array.isArray(data) && data.length > 0) {
      data = data[0];
    }
    
    if (!data.units || !Array.isArray(data.units)) {
      console.log(`  Skipping - no units found`);
      return;
    }
    
    let questionCount = 0;
    let fixedCount = 0;
    
    // Process all questions
    for (const unit of data.units) {
      if (!unit.subtopics || !Array.isArray(unit.subtopics)) continue;
      
      for (const subtopic of unit.subtopics) {
        if (!subtopic.questions || !Array.isArray(subtopic.questions)) continue;
        
        for (const question of subtopic.questions) {
          questionCount++;
          let changed = false;
          
          // Normalize question text
          if (question.questionText) {
            const original = question.questionText;
            question.questionText = normalizeLatex(question.questionText);
            if (question.questionText !== original) {
              changed = true;
            }
          } else if (question.question) {
            // Legacy field name
            const original = question.question;
            question.question = normalizeLatex(question.question);
            if (question.question !== original) {
              changed = true;
            }
          }
          
          // Normalize options
          if (question.options && Array.isArray(question.options)) {
            for (const option of question.options) {
              if (typeof option === 'string') {
                const original = option;
                const normalized = normalizeLatex(option);
                const index = question.options.indexOf(option);
                question.options[index] = normalized;
                if (normalized !== original) {
                  changed = true;
                }
              } else if (option && typeof option.content === 'string') {
                const original = option.content;
                option.content = normalizeLatex(option.content);
                if (option.content !== original) {
                  changed = true;
                }
              }
            }
          }
          
          // Normalize explanation
          if (question.explanation) {
            const original = question.explanation;
            question.explanation = normalizeLatex(question.explanation);
            if (question.explanation !== original) {
              changed = true;
            }
          }
          
          if (changed) {
            fixedCount++;
          }
        }
      }
    }
    
    // Write back to file with proper JSON formatting
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    
    console.log(`  ✓ Processed ${questionCount} questions, fixed ${fixedCount}`);
    
  } catch (error) {
    console.error(`  ✗ Error processing ${filePath}:`, error.message);
  }
}

// Process all JSON files
console.log('Starting LaTeX normalization...\n');

for (const file of jsonFiles) {
  processFile(file);
}

console.log('\n✓ LaTeX normalization complete!');
