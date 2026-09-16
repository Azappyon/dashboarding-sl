const fs = require('fs');
const path = require('path');
const P = require('./parser.core.js');
const dir = path.join(__dirname, 'data');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.csv'));
const reports = {};
console.log('=== Detecção de tipo + linhas ===');
for (const f of files) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  const r = P.parseReport(text, f);
  reports[r.type] = r;
  console.log(`${r.type.padEnd(12)} | ${String(r.rows.length).padStart(3)} linhas | período: ${r.period} | ${f}`);
}

function fmt(n, d = 2) { return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }); }

console.log('\n=== Total canônico (Relatório de campanha) ===');
const camp = reports['campaign'];
const ct = camp.campaignTotal;
console.log('Impr.:', camp.metric(ct, 'impressions'));
console.log('Cliques:', camp.metric(ct, 'clicks'));
console.log('Custo:', fmt(camp.metric(ct, 'cost')));
console.log('Conversões:', camp.metric(ct, 'conversions'));
console.log('CTR (calc):', fmt(camp.metric(ct,'clicks')/camp.metric(ct,'impressions')*100)+'%');
console.log('CPC (calc):', fmt(camp.metric(ct,'cost')/camp.metric(ct,'clicks')));
console.log('CPA (calc):', fmt(camp.metric(ct,'cost')/camp.metric(ct,'conversions')));

console.log('\n=== Grupos derivados do relatório de anúncios ===');
const ads = reports['ads'];
const groups = P.aggregateBy(ads, 'Grupo de anúncios');
let sImp=0,sCl=0,sCo=0,sCv=0;
groups.sort((a,b)=>b.cost-a.cost).forEach(g=>{
  console.log(`${g.key.padEnd(24)} imp:${String(g.impressions).padStart(4)} cl:${String(g.clicks).padStart(3)} custo:${fmt(g.cost).padStart(8)} conv:${g.conversions} CPA:${g.cpa?fmt(g.cpa):'—'}`);
  sImp+=g.impressions;sCl+=g.clicks;sCo+=g.cost;sCv+=g.conversions;
});
console.log(`SOMA GRUPOS -> imp:${sImp} cl:${sCl} custo:${fmt(sCo)} conv:${sCv}`);

console.log('\n=== Dispositivos ===');
const dev = reports['devices'];
dev.rows.forEach(r=>{
  console.log(`${dev.text(r,'Dispositivo').padEnd(14)} imp:${dev.metric(r,'impressions')} cl:${dev.metric(r,'clicks')} custo:${fmt(dev.metric(r,'cost'))} conv:${dev.metric(r,'conversions')}`);
});

console.log('\n=== Palavras-chave: top 5 por custo ===');
const kw = P.aggregateBy(reports['keywords'], 'Palavra-chave');
kw.sort((a,b)=>b.cost-a.cost).slice(0,5).forEach(k=>console.log(`${fmt(k.cost).padStart(8)}  ${k.key}`));

console.log('\n=== Termos de pesquisa: top 5 por cliques ===');
const st = P.aggregateBy(reports['searchterms'], 'Termo de pesquisa');
st.sort((a,b)=>b.clicks-a.clicks).slice(0,5).forEach(s=>console.log(`cl:${String(s.clicks).padStart(2)} custo:${fmt(s.cost).padStart(7)} conv:${s.conversions}  ${s.key}`));

console.log('\n=== Idade (conversões) ===');
P.aggregateBy(reports['age'],'Idade').sort((a,b)=>b.impressions-a.impressions).forEach(a=>console.log(`${a.key.padEnd(14)} imp:${String(a.impressions).padStart(4)} conv:${a.conversions}`));

console.log('\n=== Gênero ===');
P.aggregateBy(reports['gender'],'Sexo').forEach(g=>console.log(`${g.key.padEnd(12)} imp:${String(g.impressions).padStart(4)} custo:${fmt(g.cost)} conv:${g.conversions}`));

console.log('\n=== Programação (deve estar vazio) ===');
console.log('linhas de dados:', reports['schedule'].rows.length);

console.log('\n=== Locais ===');
reports['locations'].rows.forEach(r=>console.log(`${reports['locations'].text(r,'Local')} imp:${reports['locations'].metric(r,'impressions')} conv:${reports['locations'].metric(r,'conversions')}`));

// checagem automática
const EXP = {imp:726, cl:44, co:154.56, cv:1};
const got = {imp:camp.metric(ct,'impressions'), cl:camp.metric(ct,'clicks'), co:camp.metric(ct,'cost'), cv:camp.metric(ct,'conversions')};
const ok = got.imp===EXP.imp && got.cl===EXP.cl && Math.abs(got.co-EXP.co)<0.01 && got.cv===EXP.cv;
console.log('\n=== VALIDAÇÃO FINAL:', ok ? 'PASSOU ✓' : 'FALHOU ✗', JSON.stringify(got), '===');
process.exit(ok?0:1);
