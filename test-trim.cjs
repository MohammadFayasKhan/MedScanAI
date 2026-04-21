const fs = require('fs');
const { parse } = require('csv-parse');

let totalSize = 0;
let rowCount = 0;

fs.createReadStream('./medscan_raw_data.csv')
  .pipe(parse({ columns: true, skip_empty_lines: true }))
  .on('data', (row) => {
    rowCount++;
    const trim = (str) => (str || '').substring(0, 150).replace(/\n/g, ' ').replace(/"/g, '');
    const line = `${trim(row['NAME'])},${trim(row['CONTAINS'])},${trim(row['USES'])},${trim(row['SIDE_EFFECT'])},${trim(row['QUICK_TIPS'])},${trim(row['ACTION_CLASS'])}`;
    totalSize += Buffer.byteLength(line, 'utf8');
  })
  .on('end', () => {
    console.log(`Rows: ${rowCount}, Projected Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  });
