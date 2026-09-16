/* Monta o index.html autossuficiente a partir de src/ + data/ */
const fs = require('fs');
const path = require('path');
const root = __dirname;

const css = fs.readFileSync(path.join(root,'src/styles.css'),'utf8');
const parser = fs.readFileSync(path.join(root,'parser.core.js'),'utf8');
const app = fs.readFileSync(path.join(root,'src/app.js'),'utf8');

// amostra -> base64
const dataDir = path.join(root,'data');
const sample = {};
fs.readdirSync(dataDir).filter(f=>f.endsWith('.csv')).forEach(f=>{
  const buf = fs.readFileSync(path.join(dataDir,f));
  sample[f] = buf.toString('base64');
});
const sampleJs = 'window.SL_SAMPLE = ' + JSON.stringify(sample) + ';';

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SL Process · Dashboard Google Ads</title>
<meta name="description" content="Dashboard de performance da campanha de Google Ads da SL Process — Engenharia Industrial. Upload mensal de planilhas e relatório gerado automaticamente.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400..600,0..1,0&display=swap" rel="stylesheet">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%23003958'/><text x='50' y='63' font-family='Arial' font-size='42' font-weight='700' fill='%23E29601' text-anchor='middle'>SL</text></svg>">
<style>
${css}
</style>
</head>
<body>
<div class="app" id="app"></div>
<script>
${parser}
</script>
<script>
${sampleJs}
</script>
<script>
${app}
</script>
</body>
</html>`;

fs.writeFileSync(path.join(root,'index.html'), html, 'utf8');
const kb = (Buffer.byteLength(html)/1024).toFixed(0);
console.log('index.html gerado ('+kb+' KB) · '+Object.keys(sample).length+' CSVs embutidos.');
