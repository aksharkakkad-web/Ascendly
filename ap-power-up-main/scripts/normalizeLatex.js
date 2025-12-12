/**
 * Normalize LaTeX strings in JSON question banks.
 * - Ensures math delimiters use $...$ (inline) and $$...$$ (display not enforced here).
 * - Ensures backslashes are single-escaped in JSON (\\).
 */

const fs = require('fs');
const path = require('path');

const targets = [
  path.join(__dirname, '../public/data/AP_Biology.json'),
  path.join(__dirname, '../public/data/AP_Calculus_AB.json'),
];

for (const file of targets) {
  if (!fs.existsSync(file)) continue;
  const raw = fs.readFileSync(file, 'utf8');
  let data = JSON.parse(raw);

  // If array-wrapped, unwrap first element
  if (Array.isArray(data) && data.length === 1) data = data[0];

  const normalize = (str) => {
    if (typeof str !== 'string') return str;
    // Collapse double-dollar to single inline if mixed
    let s = str.replace(/\$\$\s*/g, '$');
    // Ensure backslashes are single-escaped
    s = s.replace(/\\\\/g, '\\');
    return s.trim();
  };

  if (data.units) {
    for (const unit of data.units) {
      for (const sub of unit.subtopics || []) {
        for (const q of sub.questions || []) {
          q.questionText = normalize(q.questionText || q.question);
          if (q.options) {
            q.options = q.options.map((opt, idx) => {
              if (typeof opt === 'string') return normalize(opt);
              return { ...opt, content: normalize(opt.content) };
            });
          }
          if (q.explanation) q.explanation = normalize(q.explanation);
        }
      }
    }
  }

  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`Normalized ${file}`);
}

