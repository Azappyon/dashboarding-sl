/* ===================================================================
   SL PROCESS · Dashboard Google Ads — Aplicação analítica (Material 3)
   Recursos: slicer global + cross-filter, tabelas ordenáveis/pesquisáveis,
   modo apresentação, tema claro/escuro. Parser e insights inalterados.
   =================================================================== */
(function () {
  'use strict';
  var P = window.SLParser;
  var STATE = { reports:{}, model:null, fullModel:null, page:'resumo', usingSample:true, files:[],
                filters:{groups:null}, allGroups:[], groupColorMap:{}, theme:'light', present:false };

  /* ---------- Formatação pt-BR ---------- */
  var nf0 = new Intl.NumberFormat('pt-BR');
  function int(n){ return nf0.format(Math.round(n||0)); }
  function dec(n){ return Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function brl(n){ return 'R$ '+dec(n); }
  function pct(fr,d){ d=d==null?2:d; return Number((fr||0)*100).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})+'%'; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function truncate(s,n){ s=String(s||''); return s.length>n?s.slice(0,n-1)+'…':s; }
  function msym(name,cls){ return '<span class="msym '+(cls||'')+'">'+name+'</span>'; }

  /* ---------- Paletas de gráfico (validadas CVD) ---------- */
  var LIGHT={c1:'#1670A6',c2:'#E29601',c3:'#2FA6A0',c4:'#8E5FB0',neutral:'#9AAEB8'};
  var DARK ={c1:'#2E86C0',c2:'#D8912A',c3:'#2FA79E',c4:'#9463B8',neutral:'#7C8B99'};
  var C=Object.assign({primary:'#1670A6'},LIGHT);
  function series(){ return [C.c1,C.c2,C.c3,C.c4,C.primary,C.neutral]; }
  function groupColors(){ return STATE.groupColorMap||{}; }
  function gcol(name){ return groupColors()[name]||C.c1; }
  function tip(title,rows){ return 'data-tip="'+esc(JSON.stringify({t:title,r:rows}))+'"'; }
  function dotName(color,name){ return '<div class="cell-dim"><span class="dot" style="background:'+color+'"></span><span>'+esc(name)+'</span></div>'; }

  /* ==================================================================
     GRÁFICOS
     ================================================================== */
  function donut(items,opts){
    opts=opts||{};
    var size=224,cx=112,cy=112,r=86,thick=30,gap=0.03,total=0;
    items.forEach(function(it){total+=it.value;});
    var s='<svg class="chart chart-anim" viewBox="0 0 '+size+' '+size+'" width="'+size+'" height="'+size+'" role="img" aria-label="'+esc(opts.aria||'rosca')+'">';
    s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="var(--surface-3)" stroke-width="'+thick+'"/>';
    if(total>0){var ang=-Math.PI/2,di=0;items.forEach(function(it){var frac=it.value/total;if(frac<=0){di++;return;}
      var a1=ang+gap/2,a2=ang+frac*Math.PI*2-gap/2;if(a2<a1)a2=a1;var large=(a2-a1)>Math.PI?1:0;
      var x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1),x2=cx+r*Math.cos(a2),y2=cy+r*Math.sin(a2);
      s+='<path class="slice" style="animation-delay:'+(di*70)+'ms" d="M '+x1.toFixed(2)+' '+y1.toFixed(2)+' A '+r+' '+r+' 0 '+large+' 1 '+x2.toFixed(2)+' '+y2.toFixed(2)+'" fill="none" stroke="'+it.color+'" stroke-width="'+thick+'" stroke-linecap="round" '+(opts.slice?'data-slice="'+esc(it.label)+'" ':'')+tip(it.label,[['Valor',it.valueLabel||dec(it.value)],['Participação',pct(frac,1)]])+'></path>';
      ang+=frac*Math.PI*2;di++;});}
    s+='<text x="'+cx+'" y="'+(cy-6)+'" text-anchor="middle" class="svg-center-t">'+esc(opts.centerTop||'Total')+'</text>';
    s+='<text x="'+cx+'" y="'+(cy+16)+'" text-anchor="middle" class="svg-center-v">'+esc(opts.centerVal||int(total))+'</text></svg>';
    return s;
  }
  function donutLegend(items,opts){
    opts=opts||{};var total=0;items.forEach(function(it){total+=it.value;});
    return '<div class="legend">'+items.map(function(it){var p=total>0?it.value/total:0;
      return '<div class="lg'+(opts.slice?' clickable':'')+'"'+(opts.slice?' data-slice="'+esc(it.label)+'" role="button" tabindex="0"':'')+'><span class="sw" style="background:'+it.color+'"></span><span class="lg-name">'+esc(it.label)+'</span><span class="lg-val">'+esc(it.valueLabel||dec(it.value))+'</span><span class="lg-pct">'+pct(p,0)+'</span></div>';
    }).join('')+'</div>';
  }
  function hbars(items,opts){
    opts=opts||{};var W=720,rowH=56,H=Math.max(items.length*rowH,60),max=0;
    items.forEach(function(it){if(it.value>max)max=it.value;});if(max<=0)max=1;
    var s='<svg class="chart chart-anim" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMinYMin meet" role="img" aria-label="'+esc(opts.aria||'barras')+'">';
    items.forEach(function(it,i){var y=i*rowH,labelY=y+13,subY=y+29,barY=y+36,w=Math.max((it.value/max)*W,it.value>0?4:0),color=it.color||C.c1;
      s+='<text x="0" y="'+labelY+'" class="svg-cat">'+esc(truncate(it.label,50))+'</text>';
      s+='<text x="'+W+'" y="'+labelY+'" text-anchor="end" class="svg-val">'+esc(it.valueLabel!=null?it.valueLabel:dec(it.value))+'</text>';
      if(it.sub)s+='<text x="'+W+'" y="'+subY+'" text-anchor="end" class="svg-sub">'+esc(it.sub)+'</text>';
      s+='<rect x="0" y="'+barY+'" width="'+W+'" height="13" rx="6.5" fill="var(--surface-3)"/>';
      s+='<rect class="bar" style="animation-delay:'+(i*60)+'ms" x="0" y="'+barY+'" width="'+w+'" height="13" rx="6.5" fill="'+color+'" '+(opts.slice&&it.slice?'data-slice="'+esc(it.slice)+'" ':'')+tip(it.label,it.ttRows||[['Valor',it.valueLabel||dec(it.value)]])+'></rect>';
    });
    return s+'</svg>';
  }
  function vbars(items,opts){
    opts=opts||{};var W=720,H=280,padT=24,padB=52,innerH=H-padT-padB,padL=6,max=0;
    items.forEach(function(it){if(it.value>max)max=it.value;});if(max<=0)max=1;
    var n=items.length,gap=16,bw=Math.min((W-padL*2-gap*(n-1))/n,86),totalW=bw*n+gap*(n-1),startX=padL+(W-padL*2-totalW)/2;
    var s='<svg class="chart chart-anim" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMin meet" role="img" aria-label="'+esc(opts.aria||'colunas')+'">';
    for(var g=0;g<=2;g++){var gy=padT+innerH-(innerH*g/2);s+='<line class="svg-grid" x1="'+padL+'" y1="'+gy+'" x2="'+(W-padL)+'" y2="'+gy+'"/>';}
    items.forEach(function(it,i){var h=(it.value/max)*innerH,x=startX+i*(bw+gap),y=padT+innerH-h,color=it.color||C.c1;
      s+='<rect class="vbar" style="animation-delay:'+(i*50)+'ms" x="'+x+'" y="'+y+'" width="'+bw+'" height="'+Math.max(h,it.value>0?3:0)+'" rx="7" fill="'+color+'" '+tip(it.label,it.ttRows||[['Valor',it.valueLabel||int(it.value)]])+'></rect>';
      s+='<text x="'+(x+bw/2)+'" y="'+(y-8)+'" text-anchor="middle" class="svg-val">'+esc(it.valueLabel!=null?it.valueLabel:int(it.value))+'</text>';
      s+='<text x="'+(x+bw/2)+'" y="'+(padT+innerH+20)+'" text-anchor="middle" class="svg-cat">'+esc(truncate(it.label,12))+'</text>';
      if(it.sub)s+='<text x="'+(x+bw/2)+'" y="'+(padT+innerH+35)+'" text-anchor="middle" class="svg-sub">'+esc(it.sub)+'</text>';
    });
    return s+'</svg>';
  }
  function funnel(t){
    var stages=[{label:'Impressões',value:t.impressions,color:C.c1,icon:'visibility'},{label:'Cliques',value:t.clicks,color:C.c3,icon:'ads_click'},{label:'Conversões',value:t.conversions,color:C.c2,icon:'target'}];
    var max=t.impressions||1,h='<div style="display:flex;flex-direction:column;gap:14px">';
    stages.forEach(function(st,i){var w=Math.max((st.value/max)*100,st.value>0?2:0),rate='';
      if(i===1&&t.impressions>0)rate='CTR '+pct(t.clicks/t.impressions);if(i===2&&t.clicks>0)rate='Taxa conv. '+pct(t.conversions/t.clicks);
      h+='<div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:500">'+msym(st.icon,'s18')+esc(st.label)+'</span><span style="font-weight:600;font-variant-numeric:tabular-nums">'+int(st.value)+(rate?' <span style="color:var(--on-surface-variant);font-weight:400;font-size:12px">· '+rate+'</span>':'')+'</span></div><div style="height:20px;border-radius:8px;background:var(--surface-3);overflow:hidden"><div style="height:100%;width:'+w+'%;border-radius:8px;background:'+st.color+';transition:width .8s var(--ease)"></div></div></div>';});
    return h+'</div>';
  }

  /* ==================================================================
     TABELA ORDENÁVEL / PESQUISÁVEL
     ================================================================== */
  var TABLES={};
  function dataTable(id,cols,rows,opts){
    opts=opts||{};TABLES[id]={cols:cols,rows:rows,sort:opts.sort||null,q:'',opts:opts};
    var n=dtView(TABLES[id]).length;
    var tools=opts.search?'<div class="dt-tools"><div class="dt-search">'+msym('search','s18')+'<input type="text" placeholder="'+esc(opts.searchPlaceholder||'Pesquisar…')+'" aria-label="Pesquisar na tabela"></div><span class="dt-count" id="dtc-'+id+'">'+n+' de '+rows.length+' linhas</span></div>':'';
    return '<div class="dt" data-dt="'+id+'">'+tools+'<div class="tbl-wrap" data-dtbody>'+dtInner(id)+'</div></div>';
  }
  function dtView(t){
    var rows=t.rows.slice();
    if(t.q){var q=t.q.toLowerCase(),keys=t.opts.searchKeys||t.cols.map(function(c){return c.key;});
      rows=rows.filter(function(r){return keys.some(function(k){return String(r[k]==null?'':r[k]).toLowerCase().indexOf(q)>=0;});});}
    if(t.sort){var c=null;t.cols.forEach(function(x){if(x.key===t.sort.key)c=x;});
      if(c){var dir=t.sort.dir==='asc'?1:-1;rows.sort(function(a,b){var va=c.sortVal?c.sortVal(a):a[c.key],vb=c.sortVal?c.sortVal(b):b[c.key];
        if(typeof va==='string')va=va.toLowerCase();if(typeof vb==='string')vb=vb.toLowerCase();return va<vb?-dir:va>vb?dir:0;});}}
    return rows;
  }
  function isNumCol(t,key){var c=null;t.cols.forEach(function(x){if(x.key===key)c=x;});return c&&(c.num||c.sortVal);}
  function dtInner(id){
    var t=TABLES[id],rows=dtView(t);
    var th=t.cols.map(function(c){var sortable=c.sortable!==false,active=t.sort&&t.sort.key===c.key;
      var cls=(c.num?'num ':'')+(sortable?'sortable':'')+(active?' active':'');
      var attrs=sortable?' role="button" tabindex="0" data-sortkey="'+esc(c.key)+'" aria-sort="'+(active?(t.sort.dir==='asc'?'ascending':'descending'):'none')+'"':'';
      var ic=sortable?'<span class="sort-ic">'+msym(active?(t.sort.dir==='asc'?'arrow_upward':'arrow_downward'):'unfold_more','s18')+'</span>':'';
      return '<th class="'+cls+'"'+attrs+'>'+esc(c.label)+ic+'</th>';}).join('');
    var tb=rows.length?rows.map(function(r){return '<tr>'+t.cols.map(function(c){return '<td'+(c.num?' class="num"':'')+'>'+(c.render?c.render(r):esc(r[c.key]==null?'':r[c.key]))+'</td>';}).join('')+'</tr>';}).join(''):'<tr><td colspan="'+t.cols.length+'" style="text-align:center;color:var(--on-surface-variant);padding:26px">Nenhum resultado.</td></tr>';
    return '<table class="tbl"><thead><tr>'+th+'</tr></thead><tbody>'+tb+'</tbody></table>';
  }
  function updateCount(id){var el=document.getElementById('dtc-'+id);if(el)el.textContent=dtView(TABLES[id]).length+' de '+TABLES[id].rows.length+' linhas';}

  /* ==================================================================
     MODELO (dados) — com filtro por grupo
     ================================================================== */
  function rowM(rep,row){ return P.derive({impressions:rep.metric(row,'impressions'),clicks:rep.metric(row,'clicks'),cost:rep.metric(row,'cost'),conversions:rep.metric(row,'conversions')}); }
  function totalsFrom(rep){ return (rep&&rep.campaignTotal)?rowM(rep,rep.campaignTotal):null; }
  function aggTotals(list){var t={impressions:0,clicks:0,cost:0,conversions:0};list.forEach(function(g){t.impressions+=g.impressions;t.clicks+=g.clicks;t.cost+=g.cost;t.conversions+=g.conversions;});return P.derive(t);}
  function filterRep(rep,gf){ if(!rep||!gf) return rep; var di=rep.col('Grupo de anúncios'); if(di<0) return rep;
    var rows=rep.rows.filter(function(r){return gf.has(String(r[di]==null?'':r[di]).trim());}); return Object.assign({},rep,{rows:rows}); }

  function buildModel(reports,filters,withInsights){
    var gf=(filters&&filters.groups&&filters.groups.size)?filters.groups:null;
    var ads=filterRep(reports.ads,gf),kw=filterRep(reports.keywords,gf),st=filterRep(reports.searchterms,gf),
        age=filterRep(reports.age,gf),gen=filterRep(reports.gender,gf),inc=filterRep(reports.income,gf);
    var m={reports:reports,filteredByGroup:!!gf};
    m.period=(reports.campaign||reports.ads||reports.devices||{}).period||'';
    m.groups=ads?P.aggregateBy(ads,'Grupo de anúncios'):(reports.adgroup?P.aggregateBy(reports.adgroup,'Grupo de anúncios'):[]);
    m.groups.forEach(function(g){g.name=g.key;});
    m.totals=gf?aggTotals(m.groups):(totalsFrom(reports.campaign)||(ads?aggTotals(P.aggregateBy(ads,'Grupo de anúncios')):null)||{impressions:0,clicks:0,cost:0,conversions:0,ctr:0,cpc:0,cpa:0,convRate:0});
    m.campaigns=reports.campaign?reports.campaign.rows.map(function(r){var d=rowM(reports.campaign,r);d.name=reports.campaign.text(r,'Campanha');d.status=reports.campaign.text(r,'Status');d.statusReason=reports.campaign.text(r,'Motivos do status');d.budget=P.num(reports.campaign.text(r,'Orçamento'));return d;}):[];
    m.ads=ads?ads.rows.map(function(r){var d=rowM(ads,r);d.name=ads.text(r,'Título 1')||ads.text(r,'Tipo de anúncio');d.url=ads.text(r,'URL final');d.group=ads.text(r,'Grupo de anúncios');d.status=ads.text(r,'Status do anúncio')||ads.text(r,'Status');return d;}):[];
    m.keywords=kw?P.aggregateBy(kw,'Palavra-chave',{keep:['Grupo de anúncios']}):[];m.keywords.forEach(function(k){k.name=k.key.replace(/^"|"$/g,'');k.group=k.extra['Grupo de anúncios']||'';});
    m.terms=st?P.aggregateBy(st,'Termo de pesquisa',{keep:['Grupo de anúncios']}):[];m.terms.forEach(function(t){t.name=t.key;t.group=t.extra['Grupo de anúncios']||'';});
    m.locations=reports.locations?reports.locations.rows.map(function(r){var d=rowM(reports.locations,r);d.name=reports.locations.text(r,'Local');return d;}):[];
    m.devices=reports.devices?reports.devices.rows.map(function(r){var d=rowM(reports.devices,r);d.name=reports.devices.text(r,'Dispositivo');return d;}).filter(function(d){return d.name;}):[];
    m.age=age?P.aggregateBy(age,'Idade'):[];m.gender=gen?P.aggregateBy(gen,'Sexo'):[];m.income=inc?P.aggregateBy(inc,'Renda familiar'):[];
    m.schedule=reports.schedule?reports.schedule.rows.map(function(r){var d=rowM(reports.schedule,r);d.name=reports.schedule.text(r,'Data e hora');return d;}):[];
    if(withInsights)m.insights=generateInsights(m);
    return m;
  }

  /* ---------- Motor de insights (inalterado) ---------- */
  function generateInsights(m){
    var t=m.totals,pos=[],opp=[];var byCost=function(a,b){return b.cost-a.cost;},conv=function(x){return x.conversions>0;},noConv=function(x){return x.conversions===0&&x.cost>0;};
    var mobile=m.devices.filter(function(d){return /smart|celular|mobile/i.test(d.name);})[0];
    var desktop=m.devices.filter(function(d){return /comput|desktop/i.test(d.name);})[0];
    var gConv=m.groups.filter(conv).sort(function(a,b){return a.cpa-b.cpa;});
    var gWasteful=m.groups.filter(noConv).sort(byCost);var kwWaste=m.keywords.filter(noConv).sort(byCost);var termWaste=m.terms.filter(noConv).sort(byCost);
    var limited=m.campaigns.filter(function(c){return /limit/i.test(c.status||'')||/limit/i.test(c.statusReason||'');})[0];
    var ageUnknown=m.age.filter(function(a){return /desconhec/i.test(a.key);})[0];var totImpAge=m.age.reduce(function(s,a){return s+a.impressions;},0)||1;
    if(t.ctr>=0.03)pos.push({title:'CTR acima da média da Rede de Pesquisa',desc:'A campanha registrou CTR de '+pct(t.ctr)+' ('+int(t.clicks)+' cliques em '+int(t.impressions)+' impressões), acima da média típica de 3–5% para busca — sinal de anúncios e palavras-chave bem alinhados à intenção.'});
    if(gConv.length)pos.push({title:'Grupo mais eficiente: '+gConv[0].name,desc:'“'+gConv[0].name+'” entregou conversão com CPA de '+brl(gConv[0].cpa)+', o melhor da conta. Boa base para escalar investimento com previsibilidade.'});
    if(desktop&&desktop.conversions>0)pos.push({title:'Desktop converte com eficiência',desc:'Computadores geraram '+int(desktop.conversions)+' conversão(ões) com CPA de '+brl(desktop.cpa)+' e taxa de conversão de '+pct(desktop.convRate)+', bem acima do mobile — indica público mais qualificado nesse dispositivo.'});
    var bestGroupCtr=m.groups.slice().sort(function(a,b){return b.ctr-a.ctr;})[0];
    if(bestGroupCtr&&bestGroupCtr.impressions>30)pos.push({title:'Boa relevância em '+bestGroupCtr.name,desc:'O grupo “'+bestGroupCtr.name+'” alcançou CTR de '+pct(bestGroupCtr.ctr)+' com '+int(bestGroupCtr.impressions)+' impressões, mostrando forte aderência entre anúncio e busca.'});
    pos.push({title:'Custo por clique competitivo',desc:'O CPC médio de '+brl(t.cpc)+' está dentro do esperado para o nicho de engenharia industrial B2B, preservando o orçamento para tráfego qualificado.'});
    if(mobile&&mobile.conversions===0&&mobile.cost>0){var share=t.cost>0?mobile.cost/t.cost:0;opp.push({title:'Mobile concentra investimento sem converter',desc:'Smartphones representam '+pct(share,0)+' do investimento ('+brl(mobile.cost)+') e '+int(mobile.clicks)+' cliques, mas 0 conversão no período.',action:'Aplicar <b>ajuste de lance negativo por dispositivo</b> no mobile e revisar a experiência da landing page em celular (velocidade, formulário, clique-para-ligar).'});}
    if(kwWaste.length)opp.push({title:'Palavra-chave de maior custo sem retorno',desc:'“'+truncate(kwWaste[0].name,60)+'” consumiu '+brl(kwWaste[0].cost)+' em '+int(kwWaste[0].clicks)+' cliques sem gerar conversão — o maior desperdício entre as palavras-chave.',action:'Revisar <b>correspondência e página de destino</b> dessa palavra; se persistir, reduzir lance ou pausar e realocar verba para termos que convertem.'});
    if(termWaste.length){var brandish=termWaste.filter(function(x){return /nexia|superus|holding|s a|ltda/i.test(x.name);});var pick=brandish[0]||termWaste[0];opp.push({title:'Termos irrelevantes / de concorrentes gastando verba',desc:'Termos como “'+truncate(pick.name,42)+'” ('+brl(pick.cost)+', 0 conversão) atraem buscas de marca de terceiros e institucionais que não convertem.',action:'Adicionar <b>palavras-chave negativas</b> para concorrentes e nomes de empresas, refinando o tráfego para intenção comercial real.'});}
    if(limited)opp.push({title:'Campanha limitada por orçamento',desc:'A campanha “'+truncate(limited.name,42)+'” está com status “'+esc(limited.status)+'”'+(limited.budget?' (orçamento diário de '+brl(limited.budget)+')':'')+', ou seja, deixando de aparecer em parte dos leilões.',action:'Com CTR saudável, vale <b>aumentar o orçamento diário</b> de forma gradual para capturar mais volume qualificado sem perder eficiência.'});
    if(t.conversions<=3)opp.push({title:'Volume de conversões baixo para otimização',desc:'Foram '+int(t.conversions)+' conversão(ões) em '+int(t.clicks)+' cliques ('+pct(t.convRate)+'). Volume baixo dificulta lances automáticos e leitura estatística.',action:'Auditar o <b>rastreamento de conversões</b> (tags/eventos) e reforçar CRO da página — CTAs, prova social e formulário — para transformar cliques em contatos.'});
    if(ageUnknown&&(ageUnknown.impressions/totImpAge)>0.15)opp.push({title:'Alta parcela de público “Desconhecido”',desc:'“Desconhecida” responde por '+pct(ageUnknown.impressions/totImpAge,0)+' das impressões por idade — dado demográfico incompleto por limitações de sinal/consentimento.',action:'Não excluir esse público automaticamente; <b>monitorar tendência</b> e reforçar sinais de conversão para melhorar a modelagem do Google ao longo do tempo.'});
    var priority;
    if(mobile&&mobile.conversions===0&&desktop&&desktop.conversions>0)priority={title:'Realocar verba do mobile para desktop e destravar o orçamento',desc:'Hoje o mobile consome '+pct(t.cost>0?mobile.cost/t.cost:0,0)+' do investimento sem converter, enquanto o desktop entrega as conversões a um CPA de '+brl(desktop.cpa)+'. No próximo mês, priorize: (1) ajuste de lance negativo no mobile e correção da landing em celular; (2) aumento gradual do orçamento diário, já que a campanha está limitada; e (3) revisão do rastreamento de conversões — 1 conversão em '+int(t.clicks)+' cliques indica gargalo entre o clique e o lead. Essas três ações atacam a maior alavanca de eficiência da conta.'};
    else if(gWasteful.length)priority={title:'Cortar desperdício e reforçar o que converte',desc:'O grupo “'+gWasteful[0].name+'” concentra '+brl(gWasteful[0].cost)+' sem conversão. Realoque essa verba para “'+(gConv[0]?gConv[0].name:'os grupos que convertem')+'”, adicione negativas para termos irrelevantes e valide o rastreamento de conversões antes de escalar.'};
    else priority={title:'Escalar com foco em conversão',desc:'Com CTR saudável e CPC controlado, o próximo passo é aumentar volume qualificado: elevar orçamento gradualmente, reforçar CRO da página e monitorar o CPA por grupo e dispositivo.'};
    return {positives:pos.slice(0,3),opportunities:opp.slice(0,3),priority:priority};
  }

  /* ==================================================================
     PÁGINAS
     ================================================================== */
  var PAGES=[
    {id:'resumo',idx:'01',label:'Resumo Executivo',icon:'dashboard',title:'Resumo Executivo'},
    {id:'campanhas',idx:'02',label:'Campanhas e Grupos',icon:'stacked_bar_chart',title:'Campanhas e Grupos'},
    {id:'anuncios',idx:'03',label:'Anúncios',icon:'article',title:'Anúncios'},
    {id:'palavras',idx:'04',label:'Palavras-chave',icon:'sell',title:'Palavras-chave'},
    {id:'termos',idx:'05',label:'Termos de Pesquisa',icon:'search',title:'Termos de Pesquisa'},
    {id:'locais',idx:'06',label:'Localização',icon:'location_on',title:'Localização'},
    {id:'dispositivos',idx:'07',label:'Dispositivos',icon:'devices',title:'Dispositivos'},
    {id:'programacao',idx:'08',label:'Programação',icon:'schedule',title:'Programação de Anúncios'},
    {id:'publico',idx:'09',label:'Perfil do Público',icon:'group',title:'Perfil do Público'},
    {id:'insights',idx:'10',label:'Insights',icon:'lightbulb',title:'Insights e Recomendações'}
  ];
  function head(idx,title,desc){return '<div class="page-head"><div class="eyebrow">'+msym('bookmark','s18')+'Página '+idx+'</div><h2>'+esc(title)+'</h2>'+(desc?'<p>'+esc(desc)+'</p>':'')+'</div>';}
  function card(inner,cls){return '<div class="card '+(cls||'')+'"><div class="card-pad">'+inner+'</div></div>';}
  function sect(icon,t){return '<div class="section-title">'+msym(icon,'s20')+esc(t)+'</div>';}
  function empty(icon,title,desc){return '<div class="empty">'+msym(icon||'inbox')+'<h3>'+esc(title)+'</h3><p>'+esc(desc)+'</p></div>';}
  function campNote(){return STATE.model.filteredByGroup?'<div class="callout info mt18">'+msym('info')+'<div>Este relatório é de <b>nível de campanha</b> e não é segmentado por grupo — os números abaixo refletem toda a campanha, independentemente do filtro ativo.</div></div>':'';}

  function pgResumo(m){
    var t=m.totals;
    var kpis=[
      {label:'Investimento total',icon:'payments',accent:true,value:brl(t.cost),sub:m.campaigns[0]&&m.campaigns[0].budget?'orçamento diário '+brl(m.campaigns[0].budget):''},
      {label:'Impressões',icon:'visibility',value:int(t.impressions),sub:'alcance no período'},
      {label:'Cliques',icon:'ads_click',value:int(t.clicks),sub:'visitas ao site'},
      {label:'CTR',icon:'percent',value:pct(t.ctr),meter:Math.min(t.ctr/0.10,1),delta:{v:(t.ctr>=0.04?'+':'')+dec((t.ctr-0.04)*100)+' p.p. vs. meta 4%',dir:t.ctr>=0.04?'up':'down'}},
      {label:'CPC médio',icon:'sell',value:brl(t.cpc),sub:'custo por clique'},
      {label:'Conversões',icon:'target',value:int(t.conversions),sub:'leads gerados'},
      {label:'CPA',icon:'trending_up',value:t.conversions>0?brl(t.cpa):'—',sub:'custo por conversão'},
      {label:'Taxa de conversão',icon:'bolt',value:pct(t.convRate),meter:Math.min(t.convRate/0.05,1),delta:{v:dec((t.convRate-0.03)*100)+' p.p. vs. meta 3%',dir:t.convRate>=0.03?'up':'down'}}
    ];
    var h=head('01','Resumo Executivo','Visão consolidada da campanha no período. Clique numa fatia do gráfico para filtrar todo o painel por grupo.');
    h+='<div class="grid g-kpi">'+kpis.map(function(k){var top='<div class="k-top"><div class="k-ic">'+msym(k.icon)+'</div>'+(k.delta?'<span class="k-delta '+k.delta.dir+'">'+msym(k.delta.dir==='up'?'arrow_upward':'arrow_downward','s18')+k.delta.v+'</span>':'')+'</div>';
      var body='<div class="k-label">'+esc(k.label)+'</div><div class="k-value">'+k.value+'</div>'+(k.sub?'<div class="k-sub">'+esc(k.sub)+'</div>':'')+(k.meter!=null?'<div class="meter"><i style="width:'+(k.meter*100)+'%"></i></div>':'');
      return '<div class="kpi '+(k.accent?'accent':'')+'">'+top+body+'</div>';}).join('')+'</div>';
    var gitems=m.groups.slice().sort(function(a,b){return b.cost-a.cost;}).map(function(g){return {label:g.name,value:g.cost,valueLabel:brl(g.cost),color:gcol(g.name)};});
    h+='<div class="grid g-2 mt24">';
    h+=card(sect('donut_small','Investimento por grupo')+'<div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap"><div style="flex:none">'+donut(gitems,{centerTop:'Investido',centerVal:brl(t.cost),slice:true,aria:'investimento por grupo'})+'</div><div style="flex:1;min-width:190px">'+donutLegend(gitems,{slice:true})+'</div></div><div class="footnote">'+msym('ads_click','s18')+'Clique numa fatia ou item da legenda para filtrar o painel.</div>','hover');
    h+=card(sect('filter_alt','Funil de conversão')+funnel(t),'hover');
    h+='</div>';
    return h;
  }

  function pgCampanhas(m){
    var h=head('02','Performance de Campanhas e Grupos','Custo e conversões por campanha e a performance de cada grupo de anúncios.');
    if(m.campaigns.length){h+='<div class="grid g-2-3">';var c=m.campaigns[0];
      h+=card(sect('campaign','Campanha ativa')+'<div style="font-size:16px;font-weight:600;margin-bottom:12px">'+esc(c.name)+'</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">'+[['Investimento',brl(c.cost)],['Cliques',int(c.clicks)],['Conversões',int(c.conversions)],['CTR',pct(c.ctr)]].map(function(x){return '<div><div class="dim-sub">'+x[0]+'</div><div style="font-size:19px;font-weight:600;font-variant-numeric:tabular-nums">'+x[1]+'</div></div>';}).join('')+'</div>'+(c.status?'<div class="callout warn mt18">'+msym('info')+'<div>Status no Google Ads: <b>'+esc(c.status)+'</b>'+(c.statusReason?' — '+esc(c.statusReason):'')+'.</div></div>':''),'hover');
      var gitems=m.groups.slice().sort(function(a,b){return b.cost-a.cost;}).map(function(g){return {label:g.name,value:g.cost,valueLabel:brl(g.cost),color:gcol(g.name)};});
      h+=card(sect('donut_small','Distribuição de investimento')+'<div style="display:flex;gap:22px;align-items:center;flex-wrap:wrap"><div style="flex:none">'+donut(gitems,{centerTop:'Total',centerVal:brl(m.totals.cost),slice:true})+'</div><div style="flex:1;min-width:180px">'+donutLegend(gitems,{slice:true})+'</div></div>','hover');
      h+='</div>';}
    if(m.groups.length){var gs=m.groups.slice().sort(function(a,b){return b.cost-a.cost;});
      var cols=[
        {key:'name',label:'Grupo',render:function(r){return dotName(gcol(r.name),r.name);}},
        {key:'impressions',label:'Impr.',num:true,render:function(r){return int(r.impressions);}},
        {key:'clicks',label:'Cliques',num:true,render:function(r){return int(r.clicks);}},
        {key:'ctr',label:'CTR',num:true,render:function(r){return pct(r.ctr);}},
        {key:'cost',label:'Custo',num:true,render:function(r){return brl(r.cost);}},
        {key:'conversions',label:'Conv.',num:true,render:function(r){return int(r.conversions);}},
        {key:'cpa',label:'CPA',num:true,render:function(r){return r.conversions>0?brl(r.cpa):'—';}}
      ];
      h+='<div class="mt24">'+card(sect('bar_chart','Performance dos grupos de anúncios')+
        hbars(gs.map(function(g){return {label:g.name,value:g.cost,valueLabel:brl(g.cost),sub:int(g.clicks)+' cliques · '+int(g.conversions)+' conv'+(g.conversions>0?' · CPA '+brl(g.cpa):''),color:gcol(g.name),slice:g.name,ttRows:[['Custo',brl(g.cost)],['Cliques',int(g.clicks)],['Conversões',int(g.conversions)],['CTR',pct(g.ctr)]]};}),{slice:true})+
        '<div class="footnote">'+msym('ads_click','s18')+'Clique numa barra para filtrar o painel por grupo · toque nos títulos da tabela para ordenar.</div>'+
        dataTable('grupos',cols,gs,{sort:{key:'cost',dir:'desc'}}))+'</div>';
    } else h+=card(empty('bar_chart','Sem dados de grupos','Carregue o relatório de anúncios ou de grupos de anúncios.'));
    return h;
  }

  function pgAnuncios(m){
    var h=head('03','Anúncios','Anúncios ranqueados por conversão, com destaque para o melhor e o pior desempenho.');
    if(!m.ads.length) return h+card(empty('article','Sem dados de anúncios','O relatório de anúncios não foi carregado ou o filtro não retornou anúncios.'));
    var ads=m.ads.slice();var converting=ads.filter(function(a){return a.conversions>0;}).sort(function(a,b){return a.cpa-b.cpa;});
    var best=converting[0];var wasteful=ads.filter(function(a){return a.conversions===0&&a.cost>0;}).sort(function(a,b){return b.cost-a.cost;});
    var worst=wasteful[0]||ads.slice().sort(function(a,b){return b.cpa-a.cpa;})[0];
    h+='<div class="hl-row">';
    if(best)h+='<div class="hl best"><div class="hl-cap">'+msym('verified','s18')+'Melhor CPA</div><div class="hl-name">'+esc(best.name)+'</div><div class="dim-sub">'+esc(best.group)+'</div><div class="hl-metrics"><div><div class="mv">'+brl(best.cpa)+'</div><div class="ml">CPA</div></div><div><div class="mv">'+int(best.conversions)+'</div><div class="ml">Conversões</div></div><div><div class="mv">'+brl(best.cost)+'</div><div class="ml">Custo</div></div></div></div>';
    if(worst)h+='<div class="hl worst"><div class="hl-cap">'+msym('warning','s18')+(worst.conversions===0?'Maior custo sem conversão':'Pior CPA')+'</div><div class="hl-name">'+esc(worst.name)+'</div><div class="dim-sub">'+esc(worst.group)+'</div><div class="hl-metrics"><div><div class="mv">'+(worst.conversions>0?brl(worst.cpa):'—')+'</div><div class="ml">CPA</div></div><div><div class="mv">'+int(worst.conversions)+'</div><div class="ml">Conversões</div></div><div><div class="mv">'+brl(worst.cost)+'</div><div class="ml">Custo</div></div></div></div>';
    h+='</div>';
    var maxCost=Math.max.apply(null,ads.map(function(a){return a.cost;}))||1;
    var cols=[
      {key:'name',label:'Anúncio (Título 1)',render:function(a){return '<span class="dim-name">'+esc(truncate(a.name,38))+'</span>'+(a.conversions>0?' <span class="pill pill-good">'+msym('check','s18')+'converte</span>':'');}},
      {key:'group',label:'Grupo',render:function(a){return '<span class="dim-sub">'+esc(a.group)+'</span>';}},
      {key:'impressions',label:'Impr.',num:true,render:function(a){return int(a.impressions);}},
      {key:'clicks',label:'Cliques',num:true,render:function(a){return int(a.clicks);}},
      {key:'ctr',label:'CTR',num:true,render:function(a){return pct(a.ctr);}},
      {key:'cost',label:'Custo',sortVal:function(a){return a.cost;},render:function(a){return '<div style="display:flex;align-items:center;gap:10px"><span style="font-variant-numeric:tabular-nums;min-width:64px">'+brl(a.cost)+'</span><div class="cellbar"><i style="width:'+(a.cost/maxCost*100)+'%;background:'+(a.conversions>0?C.c3:C.c2)+'"></i></div></div>';}},
      {key:'conversions',label:'Conv.',num:true,render:function(a){return int(a.conversions);}},
      {key:'cpa',label:'CPA',num:true,sortVal:function(a){return a.conversions>0?a.cpa:Infinity;},render:function(a){return a.conversions>0?brl(a.cpa):'—';}}
    ];
    h+='<div class="card"><div class="card-pad">'+dataTable('anuncios',cols,ads,{sort:{key:'conversions',dir:'desc'},search:true,searchKeys:['name','group'],searchPlaceholder:'Pesquisar anúncio ou grupo…'})+'</div></div>';
    return h;
  }

  function pgPalavras(m){
    var h=head('04','Palavras-chave','Top 10 por conversão e Top 10 por custo — para identificar retorno e desperdício.');
    if(!m.keywords.length) return h+card(empty('sell','Sem dados de palavras-chave','O relatório de palavras-chave não foi carregado.'));
    var byConv=m.keywords.slice().filter(function(k){return k.impressions>0||k.cost>0;}).sort(function(a,b){return (b.conversions-a.conversions)||(b.clicks-a.clicks)||(b.cost-a.cost);}).slice(0,10);
    var byCost=m.keywords.slice().sort(function(a,b){return b.cost-a.cost;}).slice(0,10);
    h+='<div class="grid g-2">';
    h+=card(sect('trophy','Top 10 por conversão / cliques')+hbars(byConv.map(function(k){return {label:k.name,value:k.conversions>0?k.conversions:k.clicks,valueLabel:(k.conversions>0?int(k.conversions)+' conv':int(k.clicks)+' cl'),sub:brl(k.cost),color:k.conversions>0?C.c3:C.c1,ttRows:[['Cliques',int(k.clicks)],['Conversões',int(k.conversions)],['Custo',brl(k.cost)]]};}))+'<div class="footnote">'+msym('info','s18')+'Ordenado por conversões e, como critério secundário, cliques.</div>','hover');
    h+=card(sect('savings','Top 10 por custo (foco em desperdício)')+hbars(byCost.map(function(k){return {label:k.name,value:k.cost,valueLabel:brl(k.cost),sub:int(k.clicks)+' cl · '+int(k.conversions)+' conv',color:k.conversions>0?C.c3:C.c2,ttRows:[['Custo',brl(k.cost)],['Cliques',int(k.clicks)],['Conversões',int(k.conversions)]]};}))+'<div class="footnote">'+msym('warning','s18')+'Barras laranja = gasto sem conversão; candidatas a ajuste ou pausa.</div>','hover');
    h+='</div>';
    return h;
  }

  function pgTermos(m){
    var h=head('05','Termos de Pesquisa','As buscas reais que acionaram os anúncios. Ordene e pesquise a tabela; destaque para alto custo e zero conversão.');
    if(!m.terms.length) return h+card(empty('search','Sem dados de termos','O relatório de termos de pesquisa não foi carregado.'));
    var waste=m.terms.slice().filter(function(t){return t.conversions===0&&t.cost>0;}).sort(function(a,b){return b.cost-a.cost;});
    if(waste.length){var wcols=[
        {key:'name',label:'Termo',render:function(r){return '<span class="dim-name">'+esc(r.name)+'</span>';}},
        {key:'group',label:'Grupo',render:function(r){return '<span class="dim-sub">'+esc(r.group)+'</span>';}},
        {key:'clicks',label:'Cliques',num:true,render:function(r){return int(r.clicks);}},
        {key:'cost',label:'Custo',num:true,render:function(r){return brl(r.cost);}}];
      h+='<div class="card" style="border-left:4px solid var(--error)"><div class="card-pad"><div class="section-title" style="color:var(--error)">'+msym('report','s20')+'Alto custo e zero conversão — candidatos a negativas</div>'+dataTable('waste',wcols,waste.slice(0,10),{sort:{key:'cost',dir:'desc'}})+'</div></div>';}
    var maxCl=Math.max.apply(null,m.terms.map(function(t){return t.clicks;}))||1;
    var cols=[
      {key:'name',label:'Termo de pesquisa',render:function(t){return '<span class="dim-name">'+esc(truncate(t.name,46))+'</span>'+(t.conversions>0?' <span class="pill pill-good">'+msym('check','s18')+'conv</span>':(t.cost>0?' <span class="pill pill-bad">'+msym('close','s18')+'0 conv</span>':''));}},
      {key:'group',label:'Grupo',render:function(t){return '<span class="dim-sub">'+esc(t.group)+'</span>';}},
      {key:'impressions',label:'Impr.',num:true,render:function(t){return int(t.impressions);}},
      {key:'clicks',label:'Cliques',sortVal:function(t){return t.clicks;},render:function(t){return '<div style="display:flex;align-items:center;gap:9px"><span style="font-variant-numeric:tabular-nums;min-width:22px">'+int(t.clicks)+'</span><div class="cellbar" style="min-width:56px"><i style="width:'+(t.clicks/maxCl*100)+'%;background:'+C.c1+'"></i></div></div>';}},
      {key:'cost',label:'Custo',num:true,render:function(t){return brl(t.cost);}},
      {key:'conversions',label:'Conv.',num:true,render:function(t){return int(t.conversions);}}
    ];
    h+='<div class="mt24"><div class="card"><div class="card-pad">'+sect('search','Todos os termos de pesquisa')+dataTable('termos',cols,m.terms,{sort:{key:'clicks',dir:'desc'},search:true,searchKeys:['name','group'],searchPlaceholder:'Pesquisar termo…'})+'</div></div></div>';
    return h;
  }

  function pgLocais(m){
    var h=head('06','Localização','Ranking de localidades por investimento e conversão, e CPA por localidade.');
    var locs=m.locations.slice().filter(function(l){return l.name;});
    if(!locs.length) return h+card(empty('location_on','Sem dados de localização','O relatório de locais não foi carregado.'));
    var cityLevel=locs.filter(function(l){return !/^brasil$/i.test(l.name.trim());});
    h+=campNote();
    h+='<div class="grid g-2-3">';
    h+=card(sect('map','Investimento e conversões por localidade')+hbars(locs.slice().sort(function(a,b){return b.cost-a.cost;}).map(function(l){return {label:l.name,value:l.cost,valueLabel:brl(l.cost),sub:int(l.clicks)+' cliques · '+int(l.conversions)+' conv',color:C.c1,ttRows:[['Custo',brl(l.cost)],['Cliques',int(l.clicks)],['Conversões',int(l.conversions)]]};})),'hover');
    var totalConv=locs.reduce(function(s,l){return s+l.conversions;},0);
    h+=card(sect('insights','Leitura')+'<div class="ctx"><div class="ctx-item"><div class="ci">'+msym('public','s20')+'</div><div><div class="ct">Cobertura nacional</div><div class="cd">Veiculação concentrada em <b>Brasil</b> (nível país): '+int(locs[0]?locs[0].impressions:0)+' impressões e '+int(totalConv)+' conversão(ões).</div></div></div></div>','hover');
    h+='</div>';
    var cols=[
      {key:'name',label:'Localidade',render:function(l){return '<span class="dim-name">'+esc(l.name)+'</span>';}},
      {key:'impressions',label:'Impr.',num:true,render:function(l){return int(l.impressions);}},
      {key:'clicks',label:'Cliques',num:true,render:function(l){return int(l.clicks);}},
      {key:'cost',label:'Custo',num:true,render:function(l){return brl(l.cost);}},
      {key:'conversions',label:'Conv.',num:true,render:function(l){return int(l.conversions);}},
      {key:'cpa',label:'CPA',num:true,sortVal:function(l){return l.conversions>0?l.cpa:Infinity;},render:function(l){return l.conversions>0?brl(l.cpa):'—';}},
      {key:'convRate',label:'Taxa conv.',num:true,render:function(l){return pct(l.convRate);}}
    ];
    h+='<div class="mt24"><div class="card"><div class="card-pad">'+dataTable('locais',cols,locs,{sort:{key:'cost',dir:'desc'}})+'</div></div></div>';
    if(!cityLevel.length)h+='<div class="callout info mt24">'+msym('info')+'<div>O relatório exportado traz apenas o nível <b>país (Brasil)</b>. Para ranquear por cidade/estado, exporte o relatório de locais segmentado por <b>cidade</b> ou <b>região</b> e recarregue.</div></div>';
    return h;
  }

  function pgDispositivos(m){
    var h=head('07','Dispositivos','Distribuição de investimento por dispositivo e eficiência comparada.');
    var devs=m.devices.slice().filter(function(d){return d.impressions>0||d.cost>0;});
    if(!devs.length) return h+card(empty('devices','Sem dados de dispositivos','O relatório de dispositivos não foi carregado.'));
    h+=campNote();
    var col={};devs.slice().sort(function(a,b){return b.cost-a.cost;}).forEach(function(d,i){col[d.name]=series()[i%series().length];});
    var pieItems=devs.map(function(d){return {label:d.name,value:d.cost,valueLabel:brl(d.cost),color:col[d.name]};});
    h+='<div class="grid g-2">';
    h+=card(sect('donut_small','Investimento por dispositivo')+'<div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap"><div style="flex:none">'+donut(pieItems,{centerTop:'Investido',centerVal:brl(m.totals.cost),aria:'investimento por dispositivo'})+'</div><div style="flex:1;min-width:180px">'+donutLegend(pieItems)+'</div></div>','hover');
    var cols=[
      {key:'name',label:'Dispositivo',render:function(d){return dotName(col[d.name],d.name);}},
      {key:'cost',label:'Custo',num:true,render:function(d){return brl(d.cost);}},
      {key:'clicks',label:'Cliques',num:true,render:function(d){return int(d.clicks);}},
      {key:'conversions',label:'Conv.',num:true,render:function(d){return int(d.conversions);}},
      {key:'cpa',label:'CPA',num:true,sortVal:function(d){return d.conversions>0?d.cpa:Infinity;},render:function(d){return d.conversions>0?brl(d.cpa):'—';}},
      {key:'convRate',label:'Taxa conv.',num:true,render:function(d){return pct(d.convRate);}}
    ];
    h+=card(sect('speed','Eficiência por dispositivo')+dataTable('dispositivos',cols,devs,{sort:{key:'cost',dir:'desc'}}),'hover');
    h+='</div>';
    return h;
  }

  function pgProgramacao(m){
    var h=head('08','Programação de Anúncios','Conversões por dia da semana e picos por hora do dia.');
    var rows=m.schedule.filter(function(r){return r.impressions>0||r.clicks>0||r.cost>0;});
    if(!rows.length) return h+card(empty('schedule','Relatório de programação sem dados segmentados','O arquivo exportado traz apenas a linha de total. Para preencher esta página, exporte o Relatório de programação de anúncios com os segmentos “Dia da semana” e “Hora do dia” ativados e recarregue os arquivos.'));
    var dias={},horas={};
    rows.forEach(function(r){var name=(r.name||'').toLowerCase();if(/segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo/.test(name))dias[r.name]=(dias[r.name]||0)+r.conversions;if(/(\d{1,2})\s*h|(\d{1,2}):/.test(name))horas[r.name]=(horas[r.name]||0)+r.conversions;});
    h+='<div class="mt18">'+card(sect('calendar_month','Conversões por dia da semana')+vbars(Object.keys(dias).map(function(k){return {label:k,value:dias[k],color:C.c1};})))+'</div>';
    h+='<div class="mt24">'+card(sect('schedule','Conversões por hora do dia')+vbars(Object.keys(horas).map(function(k){return {label:k,value:horas[k],color:C.c2};})))+'</div>';
    return h;
  }

  function pgPublico(m){
    var h=head('09','Perfil do Público','Conversões por faixa etária, distribuição por gênero e por renda familiar.');
    var order=['18 a 24','25 a 34','35 a 44','45 a 54','55 a 64','+65','Desconhecida'];
    var age=m.age.slice().sort(function(a,b){var ia=order.indexOf(a.key.trim()),ib=order.indexOf(b.key.trim());return (ia<0?99:ia)-(ib<0?99:ib);});
    var ageHasConv=age.some(function(a){return a.conversions>0;});
    h+=card(sect('elderly','Conversões por faixa etária')+(age.length?vbars(age.map(function(a){var v=ageHasConv?a.conversions:a.impressions;return {label:a.key.trim(),value:v,valueLabel:ageHasConv?int(a.conversions):int(a.impressions),sub:ageHasConv?int(a.impressions)+' impr':null,color:/desconhec/i.test(a.key)?C.neutral:C.c1,ttRows:[['Impressões',int(a.impressions)],['Cliques',int(a.clicks)],['Conversões',int(a.conversions)]]};}),{aria:'idade'})+(!ageHasConv?'<div class="footnote">'+msym('info','s18')+'Sem conversões distribuídas por idade no período — o gráfico mostra o alcance (impressões) por faixa.</div>':''):empty('elderly','Sem dados de idade','Relatório de idade não carregado.')),'hover');
    h+='<div class="grid g-2 mt24">';
    var g=m.gender.slice().filter(function(x){return x.impressions>0||x.cost>0;});
    var gc={};g.forEach(function(x){gc[x.key]=/masc/i.test(x.key)?C.c1:/femin/i.test(x.key)?C.c2:C.neutral;});
    var gi=g.map(function(x){return {label:x.key,value:x.impressions,valueLabel:int(x.impressions),color:gc[x.key]};});
    h+=card(sect('wc','Distribuição por gênero')+'<div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap"><div style="flex:none">'+donut(gi,{centerTop:'Impressões',centerVal:int(g.reduce(function(s,x){return s+x.impressions;},0)),aria:'gênero'})+'</div><div style="flex:1;min-width:160px">'+donutLegend(gi)+'</div></div>','hover');
    var inc=m.income.slice().filter(function(x){return x.impressions>0;}).sort(function(a,b){return b.impressions-a.impressions;});
    h+=card(sect('account_balance_wallet','Renda familiar (impressões)')+(inc.length?hbars(inc.map(function(x){return {label:x.key,value:x.impressions,valueLabel:int(x.impressions),sub:int(x.clicks)+' cl',color:/desconhec/i.test(x.key)?C.neutral:C.c3,ttRows:[['Impressões',int(x.impressions)],['Cliques',int(x.clicks)]]};})):empty('account_balance_wallet','Sem dados','Relatório de renda familiar não carregado.')),'hover');
    h+='</div>';
    var unk=m.gender.filter(function(x){return /desconhec/i.test(x.key);})[0],totG=m.gender.reduce(function(s,x){return s+x.impressions;},0)||1;
    var ageUnk=m.age.filter(function(x){return /desconhec/i.test(x.key);})[0],totA=m.age.reduce(function(s,x){return s+x.impressions;},0)||1;
    var maxUnk=Math.max(unk?unk.impressions/totG:0,ageUnk?ageUnk.impressions/totA:0);
    if(maxUnk>0.15)h+='<div class="callout warn mt24">'+msym('help')+'<div>Parcela relevante de público <b>“Desconhecido”</b> (até '+pct(maxUnk,0)+' das impressões). É comum por limitações de sinal/consentimento e <b>não deve ser excluído automaticamente</b> — acompanhe a evolução ao longo dos meses.</div></div>';
    return h;
  }

  function pgInsights(){
    var ins=STATE.fullModel.insights,h=head('10','Insights e Recomendações','Leitura estratégica do período: o que funcionou, onde melhorar e a prioridade para o próximo mês.');
    if(STATE.model.filteredByGroup)h+='<div class="callout info sample-banner">'+msym('info')+'<div>As recomendações abaixo consideram a conta <b>inteira</b> (não são afetadas pelo filtro de grupo ativo).</div></div>';
    h+='<div class="grid g-2">';
    h+='<div><div class="section-title">'+msym('thumb_up','s20')+'Pontos positivos</div><div class="ins-col">'+ins.positives.map(function(p){return '<div class="ins pos"><div class="ic">'+msym('check','fill')+'</div><div><div class="it">'+esc(p.title)+'</div><div class="id">'+esc(p.desc)+'</div></div></div>';}).join('')+'</div></div>';
    h+='<div><div class="section-title">'+msym('trending_up','s20')+'Oportunidades de melhoria</div><div class="ins-col">'+ins.opportunities.map(function(o){return '<div class="ins opp"><div class="ic">'+msym('tips_and_updates','fill')+'</div><div><div class="it">'+esc(o.title)+'</div><div class="id">'+esc(o.desc)+'</div><div class="act">'+msym('arrow_forward','s18')+'<span><b>Ação:</b> '+o.action+'</span></div></div></div>';}).join('')+'</div></div>';
    h+='</div>';
    h+='<div class="priority mt24"><div class="p-cap">'+msym('flag','fill')+'Recomendação prioritária para o próximo mês</div><h3>'+esc(ins.priority.title)+'</h3><p>'+esc(ins.priority.desc)+'</p></div>';
    return h;
  }

  var R={resumo:pgResumo,campanhas:pgCampanhas,anuncios:pgAnuncios,palavras:pgPalavras,termos:pgTermos,locais:pgLocais,dispositivos:pgDispositivos,programacao:pgProgramacao,publico:pgPublico,insights:pgInsights};

  /* ==================================================================
     SHELL, TOOLTIP, NAV, FILTROS, TEMA, APRESENTAÇÃO, UPLOAD
     ================================================================== */
  var tipEl;
  function initContentHandlers(container){
    tipEl=document.createElement('div');tipEl.className='tooltip';document.body.appendChild(tipEl);
    container.addEventListener('mouseover',function(e){var el=e.target.closest('[data-tip]');if(!el)return;try{var d=JSON.parse(el.dataset.tip);tipEl.innerHTML='<div class="tt-t">'+esc(d.t)+'</div>'+d.r.map(function(r){return '<div class="tt-r"><span>'+esc(r[0])+'</span><b>'+esc(r[1])+'</b></div>';}).join('');tipEl.classList.add('show');}catch(err){}});
    container.addEventListener('mousemove',function(e){if(!tipEl.classList.contains('show'))return;var x=e.clientX+14,y=e.clientY+14,w=tipEl.offsetWidth,hh=tipEl.offsetHeight;if(x+w>window.innerWidth-8)x=e.clientX-w-14;if(y+hh>window.innerHeight-8)y=e.clientY-hh-14;tipEl.style.left=x+'px';tipEl.style.top=y+'px';});
    container.addEventListener('mouseout',function(e){if(e.target.closest('[data-tip]'))tipEl.classList.remove('show');});
    container.addEventListener('click',function(e){
      var th=e.target.closest('[data-sortkey]');
      if(th){var wrap=th.closest('[data-dt]'),id=wrap.getAttribute('data-dt'),t=TABLES[id],key=th.getAttribute('data-sortkey');
        if(t.sort&&t.sort.key===key)t.sort.dir=t.sort.dir==='asc'?'desc':'asc';else t.sort={key:key,dir:isNumCol(t,key)?'desc':'asc'};
        wrap.querySelector('[data-dtbody]').innerHTML=dtInner(id);updateCount(id);return;}
      var slice=e.target.closest('[data-slice]');
      if(slice){setGroupFilter(slice.getAttribute('data-slice'));return;}
    });
    container.addEventListener('keydown',function(e){if(e.key!=='Enter'&&e.key!==' ')return;var th=e.target.closest('[data-sortkey]');var sl=e.target.closest('[data-slice]');if(th){e.preventDefault();th.click();}else if(sl){e.preventDefault();setGroupFilter(sl.getAttribute('data-slice'));}});
    container.addEventListener('input',function(e){var inp=e.target.closest('.dt-search input');if(!inp)return;var wrap=inp.closest('[data-dt]'),id=wrap.getAttribute('data-dt');TABLES[id].q=inp.value;wrap.querySelector('[data-dtbody]').innerHTML=dtInner(id);updateCount(id);});
  }

  function renderShell(){
    var nav=PAGES.map(function(p){return '<button class="nav-item" data-page="'+p.id+'" aria-label="'+esc(p.label)+'">'+msym(p.icon)+'<span>'+esc(p.label)+'</span><span class="idx">'+p.idx+'</span></button>';}).join('');
    document.getElementById('app').innerHTML=
      '<aside class="rail" id="rail"><div class="brand"><div class="mark">SL</div><div><div class="name">SL Process</div><div class="sub">Dashboard Google Ads</div></div></div><nav class="nav" id="nav">'+nav+'</nav><div class="rail-foot">Engenharia Industrial · Brasil<br>Campanha de Rede de Pesquisa</div></aside>'+
      '<div class="rail-scrim hidden" id="railScrim"></div>'+
      '<div class="main">'+
        '<div class="appbar"><div class="lead"><button class="menu-btn" id="menuBtn" aria-label="Menu">'+msym('menu')+'</button><div><div class="crumb">SL Process · Campanha de Rede de Pesquisa</div><h1 id="pageTitle">Resumo Executivo</h1></div></div>'+
          '<div class="actions"><span class="chip" id="periodChip">'+msym('calendar_month','s18')+'<span id="periodTxt">—</span></span>'+
          '<button class="icon-btn" id="themeBtn" aria-label="Alternar tema">'+msym('dark_mode')+'</button>'+
          '<button class="icon-btn" id="presentBtn" aria-label="Modo apresentação">'+msym('slideshow')+'</button>'+
          '<button class="btn btn-filled" id="uploadBtn">'+msym('cloud_upload','s20')+'<span class="btn-txt">Atualizar planilhas</span></button></div></div>'+
        '<div class="slicer" id="slicer"></div>'+
        '<div class="content" id="content"></div></div>'+
      '<div class="present-bar" id="presentBar"><button id="pPrev" aria-label="Página anterior">'+msym('chevron_left')+'</button><span class="pb-pos" id="pPos">1 / 10</span><button id="pNext" aria-label="Próxima página">'+msym('chevron_right')+'</button><button class="pb-exit" id="pExit" aria-label="Sair da apresentação">'+msym('close')+'</button></div>';
    document.getElementById('nav').addEventListener('click',function(e){var b=e.target.closest('.nav-item');if(!b)return;navigate(b.getAttribute('data-page'));closeRail();});
    document.getElementById('uploadBtn').addEventListener('click',openUpload);
    document.getElementById('menuBtn').addEventListener('click',function(){document.getElementById('rail').classList.toggle('open');document.getElementById('railScrim').classList.toggle('hidden');});
    document.getElementById('railScrim').addEventListener('click',closeRail);
    document.getElementById('themeBtn').addEventListener('click',toggleTheme);
    document.getElementById('presentBtn').addEventListener('click',togglePresent);
    document.getElementById('pPrev').addEventListener('click',function(){stepPage(-1);});
    document.getElementById('pNext').addEventListener('click',function(){stepPage(1);});
    document.getElementById('pExit').addEventListener('click',togglePresent);
    document.getElementById('slicer').addEventListener('click',onSlicerClick);
    document.getElementById('slicer').addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){var c=e.target.closest('[data-group],[data-all],[data-clear]');if(c){e.preventDefault();c.click();}}});
    initContentHandlers(document.getElementById('content'));
  }
  function closeRail(){document.getElementById('rail').classList.remove('open');document.getElementById('railScrim').classList.add('hidden');}

  /* ---- Slicer ---- */
  function renderSlicer(){
    var f=STATE.filters.groups,all=STATE.allGroups;
    var chips='<span class="s-lab">'+msym('filter_alt','s18')+'Grupo de anúncios</span>';
    chips+='<button class="slice-chip all'+(!f?' active':'')+'" data-all role="button">Todos</button>';
    chips+=all.map(function(g){var active=f&&f.has(g);return '<button class="slice-chip'+(active?' active':'')+'" data-group="'+esc(g)+'"><span class="dot" style="background:'+gcol(g)+'"></span>'+esc(truncate(g,26))+'</button>';}).join('');
    var right='';
    if(f)right='<div class="s-right"><span class="s-note">'+f.size+' de '+all.length+' grupos</span><button class="s-clear" data-clear>'+msym('close','s18')+'Limpar filtro</button></div>';
    document.getElementById('slicer').innerHTML=chips+right;
  }
  function onSlicerClick(e){
    var all=e.target.closest('[data-all]');if(all){STATE.filters.groups=null;return applyFilter();}
    var clr=e.target.closest('[data-clear]');if(clr){STATE.filters.groups=null;return applyFilter();}
    var g=e.target.closest('[data-group]');if(g){toggleGroup(g.getAttribute('data-group'));}
  }
  function toggleGroup(name){
    var f=STATE.filters.groups?new Set(STATE.filters.groups):new Set();
    if(f.has(name))f.delete(name);else f.add(name);
    STATE.filters.groups=(f.size===0||f.size===STATE.allGroups.length)?null:f;
    applyFilter();
  }
  function setGroupFilter(name){
    var f=STATE.filters.groups;
    if(f&&f.size===1&&f.has(name))STATE.filters.groups=null;else STATE.filters.groups=new Set([name]);
    applyFilter();
  }
  function applyFilter(){STATE.model=buildModel(STATE.reports,STATE.filters,false);renderSlicer();navigate(STATE.page);}

  /* ---- Navegação ---- */
  function navigate(pageId){
    STATE.page=pageId;
    var p=PAGES.filter(function(x){return x.id===pageId;})[0]||PAGES[0];
    document.getElementById('pageTitle').textContent=p.title;
    Array.prototype.forEach.call(document.querySelectorAll('.nav-item'),function(el){el.classList.toggle('active',el.getAttribute('data-page')===pageId);});
    var banner=STATE.usingSample?'<div class="callout info sample-banner">'+msym('science')+'<div>Exibindo <b>dados de exemplo</b>. Clique em <b>“Atualizar planilhas”</b> para subir os CSVs do mês e gerar o relatório.</div></div>':'';
    var flag='';
    if(STATE.filters.groups){var names=Array.from(STATE.filters.groups);flag='<div class="filter-flag">'+msym('filter_alt','s18')+'Filtrado por grupo: '+esc(names.map(function(n){return truncate(n,22);}).join(', '))+'</div>';}
    document.getElementById('content').innerHTML=banner+flag+(R[pageId]||pgResumo)(STATE.model);
    requestAnimationFrame(function(){Array.prototype.forEach.call(document.querySelectorAll('.kpi .meter i'),function(el){var w=el.style.width;el.style.width='0';requestAnimationFrame(function(){el.style.width=w;});});});
    updatePresentBar();window.scrollTo(0,0);
  }
  function refresh(){
    computeGroupColors();
    STATE.fullModel=buildModel(STATE.reports,{groups:null},true);
    STATE.model=buildModel(STATE.reports,STATE.filters,false);
    document.getElementById('periodTxt').textContent=STATE.model.period||'—';
    renderSlicer();navigate(STATE.page);
  }
  function computeGroupColors(){
    STATE.allGroups=[];STATE.groupColorMap={};
    var full=STATE.reports.ads?P.aggregateBy(STATE.reports.ads,'Grupo de anúncios'):(STATE.reports.keywords?P.aggregateBy(STATE.reports.keywords,'Grupo de anúncios'):[]);
    full.sort(function(a,b){return b.cost-a.cost;}).forEach(function(g,i){if(g.key&&STATE.allGroups.indexOf(g.key)<0){STATE.allGroups.push(g.key);STATE.groupColorMap[g.key]=series()[i%series().length];}});
  }

  /* ---- Tema ---- */
  function applyTheme(t){STATE.theme=t;document.documentElement.setAttribute('data-theme',t);try{localStorage.setItem('sl_theme',t);}catch(e){}
    Object.assign(C,t==='dark'?DARK:LIGHT);computeGroupColors();
    var b=document.getElementById('themeBtn');if(b)b.innerHTML=msym(t==='dark'?'light_mode':'dark_mode');
    navigate(STATE.page);}
  function toggleTheme(){applyTheme(STATE.theme==='dark'?'light':'dark');}

  /* ---- Apresentação ---- */
  function togglePresent(){
    STATE.present=!STATE.present;document.body.classList.toggle('present',STATE.present);
    var b=document.getElementById('presentBtn');
    if(STATE.present){try{if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen();}catch(e){}if(b)b.innerHTML=msym('close_fullscreen');}
    else{try{if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen();}catch(e){}if(b)b.innerHTML=msym('slideshow');}
    updatePresentBar();
  }
  function stepPage(dir){var i=PAGES.map(function(p){return p.id;}).indexOf(STATE.page);i=(i+dir+PAGES.length)%PAGES.length;navigate(PAGES[i].id);}
  function updatePresentBar(){var i=PAGES.map(function(p){return p.id;}).indexOf(STATE.page);var el=document.getElementById('pPos');if(el)el.textContent=(i+1)+' / '+PAGES.length;}
  document.addEventListener('keydown',function(e){if(!STATE.present)return;if(e.key==='ArrowRight')stepPage(1);else if(e.key==='ArrowLeft')stepPage(-1);else if(e.key==='Escape'){if(!document.fullscreenElement)togglePresent();}});
  document.addEventListener('fullscreenchange',function(){if(!document.fullscreenElement&&STATE.present){STATE.present=false;document.body.classList.remove('present');var b=document.getElementById('presentBtn');if(b)b.innerHTML=msym('slideshow');}});

  /* ---- Upload ---- */
  function typeLabel(t){return ({campaign:'Campanha',adgroup:'Grupos de anúncios',ads:'Anúncios',keywords:'Palavras-chave',searchterms:'Termos de pesquisa',locations:'Locais',devices:'Dispositivos',schedule:'Programação',age:'Idade',gender:'Gênero',income:'Renda familiar'})[t]||t;}
  function openUpload(){
    var ov=document.createElement('div');ov.className='scrim';ov.id='scrim';
    ov.innerHTML='<div class="dialog"><div class="d-head"><div class="d-ic">'+msym('cloud_upload')+'</div><div><h3>Atualizar planilhas do mês</h3><p>Arraste ou selecione os CSVs exportados do Google Ads. O dashboard identifica cada relatório pelo título e recalcula tudo.</p></div></div><div class="d-body"><label class="dropzone" id="dropzone"><input type="file" id="fileInput" accept=".csv,text/csv" multiple hidden>'+msym('upload_file')+'<div class="dz-t">Solte os CSVs aqui ou clique para selecionar</div><div class="dz-s">Até 11 relatórios · formato .csv do Google Ads</div></label><div class="file-list" id="fileList"></div><div class="d-foot"><span class="note" id="uNote">Nenhum arquivo novo selecionado.</span><div class="acts"><button class="btn btn-text" id="cancelUp">Fechar</button><button class="btn btn-filled" id="applyUp">Gerar relatório</button></div></div></div></div>';
    document.body.appendChild(ov);
    var staged={},dz=document.getElementById('dropzone'),fi=document.getElementById('fileInput');
    function renderList(){var keys=Object.keys(staged);document.getElementById('fileList').innerHTML=keys.map(function(k){var s=staged[k];return '<div class="file-row '+(s.ok?'ok':'err')+'">'+msym(s.ok?'check_circle':'error')+'<span class="fn">'+esc(s.fileName)+'</span><span class="ft">'+esc(s.ok?typeLabel(k):'não reconhecido')+'</span></div>';}).join('');var okc=keys.filter(function(k){return staged[k].ok;}).length;document.getElementById('uNote').textContent=okc?okc+' relatório(s) reconhecido(s).':'Nenhum arquivo novo selecionado.';}
    function handle(list){var arr=Array.prototype.slice.call(list),pending=arr.length;if(!pending)return;arr.forEach(function(file){var rd=new FileReader();rd.onload=function(){try{var rep=P.parseReport(String(rd.result),file.name);if(rep&&rep.type!=='unknown')staged[rep.type]={report:rep,fileName:file.name,ok:true};else staged['?'+file.name]={fileName:file.name,ok:false};}catch(e){staged['?'+file.name]={fileName:file.name,ok:false};}if(--pending===0)renderList();};rd.onerror=function(){staged['?'+file.name]={fileName:file.name,ok:false};if(--pending===0)renderList();};rd.readAsText(file,'utf-8');});}
    fi.addEventListener('change',function(){handle(fi.files);});
    ['dragenter','dragover'].forEach(function(ev){dz.addEventListener(ev,function(e){e.preventDefault();dz.classList.add('drag');});});
    ['dragleave','drop'].forEach(function(ev){dz.addEventListener(ev,function(e){e.preventDefault();dz.classList.remove('drag');});});
    dz.addEventListener('drop',function(e){if(e.dataTransfer&&e.dataTransfer.files)handle(e.dataTransfer.files);});
    document.getElementById('cancelUp').addEventListener('click',function(){document.body.removeChild(ov);});
    ov.addEventListener('click',function(e){if(e.target===ov)document.body.removeChild(ov);});
    document.getElementById('applyUp').addEventListener('click',function(){var okKeys=Object.keys(staged).filter(function(k){return staged[k].ok;});if(!okKeys.length){document.getElementById('uNote').textContent='Selecione ao menos um CSV válido do Google Ads.';return;}okKeys.forEach(function(k){STATE.reports[k]=staged[k].report;STATE.files.push(staged[k].fileName);});STATE.usingSample=false;STATE.filters.groups=null;document.body.removeChild(ov);refresh();});
  }

  /* ---- Init ---- */
  function b64ToText(b64){var bin=atob(b64),bytes=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return new TextDecoder('utf-8').decode(bytes);}
  function loadSample(){var S=window.SL_SAMPLE||{};Object.keys(S).forEach(function(fn){try{var rep=P.parseReport(b64ToText(S[fn]),fn);if(rep&&rep.type!=='unknown')STATE.reports[rep.type]=rep;}catch(e){}});STATE.usingSample=true;}
  function init(){
    var saved='light';try{saved=localStorage.getItem('sl_theme')||'light';}catch(e){}
    STATE.theme=saved;document.documentElement.setAttribute('data-theme',saved);Object.assign(C,saved==='dark'?DARK:LIGHT);
    renderShell();
    var tb=document.getElementById('themeBtn');if(tb)tb.innerHTML=msym(saved==='dark'?'light_mode':'dark_mode');
    loadSample();refresh();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
