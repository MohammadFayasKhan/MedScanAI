const fs = require('fs');
const { parse } = require('csv-parse/sync');

const azFile = 'A_Z_medicines_dataset_of_India.csv';
const rows = parse(fs.readFileSync(azFile, 'utf8'), { columns: true, skip_empty_lines: true, relax_column_count: true });

console.log('Parsed AZ dataset:', rows.length, 'rows');
console.log('Sample row:', rows[0]);
