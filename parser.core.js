/* =====================================================================
   SL PROCESS — Núcleo de parsing de relatórios do Google Ads (pt-BR)
   Funciona em Node (verificação) e no navegador (embutido no index.html).
   Sem dependências externas.
   ===================================================================== */
(function (root) {
  'use strict';

  /* ---- Normalização de texto (remove acentos, minúsculas, espaços) ---- */
  function norm(s) {
    return String(s == null ? '' : s)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /* ---- Número no formato brasileiro: "1.234,56", "R$ 3,51", "6,06%" ---- */
  function num(v) {
    if (v == null) return 0;
    var s = String(v).trim();
    if (!s) return 0;
    s = s.replace(/%/g, '').replace(/r\$/gi, '').replace(/\s/g, '');
    if (s === '' || s === '--' || s === '-') return 0;
    var neg = false;
    if (s[0] === '-') { neg = true; s = s.slice(1); }
    // remove separador de milhar (.) e troca vírgula decimal por ponto
    s = s.replace(/\./g, '').replace(',', '.');
    var n = parseFloat(s);
    if (isNaN(n)) return 0;
    return neg ? -n : n;
  }

  /* ---- Parser CSV RFC-4180 (aspas, vírgulas e quebras dentro de campo) ---- */
  function parseCSV(text) {
    // remove BOM
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    var rows = [], field = '', row = [], i = 0, inQ = false, c, n;
    var len = text.length;
    while (i < len) {
      c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { inQ = true; i++; continue; }
      if (c === ',') { row.push(field); field = ''; i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      field += c; i++;
    }
    // último campo/linha
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
    return rows;
  }

  /* ---- Aliases das métricas padronizadas do Google Ads ---- */
  var METRIC_ALIASES = {
    impressions: ['impr.', 'impressoes', 'impr'],
    clicks:      ['cliques', 'cliques '],
    ctr:         ['ctr'],
    cpc:         ['cpc med.', 'cpc medio', 'cpc med'],
    cost:        ['custo'],
    conversions: ['conversoes', 'conv.'],
    cpa:         ['custo / conv.', 'custo/conv.', 'custo / conv', 'custo/ conv.', 'custo /conv.'],
    convRate:    ['taxa de conv.', 'taxa de conv', 'taxa conv.']
  };

  /* ---- Identificação do tipo de relatório pelo título (linha 1) ---- */
  var TYPE_MATCHERS = [
    ['campaign',   ['relatorio de campanha']],
    ['adgroup',    ['relatorio do grupo de anuncios', 'relatorio de grupos de anuncios']],
    ['ads',        ['relatorio de anuncios']],
    ['keywords',   ['relatorio de palavras-chave da rede de pesquisa', 'relatorio de palavras-chave']],
    ['searchterms',['relatorio de termos de pesquisa']],
    ['locations',  ['relatorio de locais']],
    ['devices',    ['relatorio de dispositivos']],
    ['schedule',   ['relatorio de programacao de anuncios']],
    ['age',        ['relatorio de idade']],
    ['gender',     ['relatorio por genero', 'relatorio de genero']],
    ['income',     ['relatorio de renda familiar']]
  ];

  function detectType(title, header) {
    var t = norm(title);
    for (var i = 0; i < TYPE_MATCHERS.length; i++) {
      var key = TYPE_MATCHERS[i][0], pats = TYPE_MATCHERS[i][1];
      for (var j = 0; j < pats.length; j++) {
        if (t.indexOf(pats[j]) !== -1) return key;
      }
    }
    // fallback: tenta por coluna dimensão característica no header
    var hn = (header || []).map(norm);
    if (hn.indexOf('dispositivo') !== -1) return 'devices';
    if (hn.indexOf('local') !== -1) return 'locations';
    if (hn.indexOf('idade') !== -1) return 'age';
    if (hn.indexOf('sexo') !== -1) return 'gender';
    if (hn.indexOf('renda familiar') !== -1) return 'income';
    if (hn.indexOf('palavra-chave') !== -1) return 'keywords';
    if (hn.indexOf('termo de pesquisa') !== -1) return 'searchterms';
    if (hn.indexOf('data e hora') !== -1) return 'schedule';
    return 'unknown';
  }

  function isTotalRow(cells) {
    for (var i = 0; i < cells.length; i++) {
      var c = norm(cells[i]);
      if (c.indexOf('total:') === 0 || c === 'total') return true;
    }
    return false;
  }
  function isEmptyRow(cells) {
    for (var i = 0; i < cells.length; i++) {
      if (String(cells[i] == null ? '' : cells[i]).trim() !== '') return false;
    }
    return true;
  }

  /* ---- Encontra a linha de cabeçalho (procura por 'Impr.' ou 'Cliques') ---- */
  function findHeaderIndex(rows) {
    for (var i = 0; i < Math.min(rows.length, 8); i++) {
      var hn = rows[i].map(norm);
      if (hn.indexOf('impr.') !== -1 || hn.indexOf('cliques') !== -1) return i;
    }
    return 2; // padrão do Google Ads: título, período, cabeçalho
  }

  /* ---- Constrói índice de coluna para cada métrica ---- */
  function buildColIndex(header) {
    var hn = header.map(norm), idx = {};
    Object.keys(METRIC_ALIASES).forEach(function (metric) {
      var aliases = METRIC_ALIASES[metric];
      for (var i = 0; i < hn.length; i++) {
        if (aliases.indexOf(hn[i]) !== -1) { idx[metric] = i; break; }
      }
    });
    return idx;
  }
  function colOf(header, name) {
    var hn = header.map(norm), target = norm(name);
    for (var i = 0; i < hn.length; i++) if (hn[i] === target) return i;
    // startsWith fallback
    for (var k = 0; k < hn.length; k++) if (hn[k].indexOf(target) === 0) return k;
    return -1;
  }

  /* ---- Parse principal de um relatório ---- */
  function parseReport(text, fileName) {
    var rows = parseCSV(text).filter(function (r) { return r.length > 1 || (r.length === 1 && r[0].trim() !== ''); });
    if (!rows.length) return null;
    var title = (rows[0] && rows[0][0]) || fileName || '';
    var hIdx = findHeaderIndex(rows);
    var period = hIdx >= 1 ? (rows[1] && rows[1][0]) || '' : '';
    var header = rows[hIdx] || [];
    var type = detectType(title, header);
    var colIndex = buildColIndex(header);

    var body = rows.slice(hIdx + 1);
    var dataRows = [], totalRows = [];
    body.forEach(function (r) {
      if (isEmptyRow(r)) return;
      if (isTotalRow(r)) { totalRows.push(r); return; }
      dataRows.push(r);
    });

    // total canônico da campanha (para o resumo executivo)
    var campaignTotal = null;
    totalRows.forEach(function (r) {
      var joined = r.map(norm).join('|');
      if (joined.indexOf('total: campanha') !== -1 || joined.indexOf('total: conta') !== -1) {
        if (!campaignTotal) campaignTotal = r;
      }
    });
    if (!campaignTotal && totalRows.length) campaignTotal = totalRows[0];

    function metric(row, name) {
      var i = colIndex[name];
      if (i == null || i < 0) return 0;
      return num(row[i]);
    }
    return {
      type: type, title: title, period: period, fileName: fileName || '',
      header: header, colIndex: colIndex,
      rows: dataRows, totalRows: totalRows, campaignTotal: campaignTotal,
      metric: metric,
      col: function (name) { return colOf(header, name); },
      text: function (row, name) { var i = colOf(header, name); return i < 0 ? '' : String(row[i] == null ? '' : row[i]).trim(); }
    };
  }

  /* ---- Métricas derivadas coerentes a partir de somas ---- */
  function derive(m) {
    var imp = m.impressions || 0, cl = m.clicks || 0, co = m.cost || 0, cv = m.conversions || 0;
    return {
      impressions: imp, clicks: cl, cost: co, conversions: cv,
      ctr: imp > 0 ? cl / imp : 0,
      cpc: cl > 0 ? co / cl : 0,
      cpa: cv > 0 ? co / cv : 0,
      convRate: cl > 0 ? cv / cl : 0
    };
  }

  /* ---- Agrega linhas de um relatório por uma coluna-dimensão ---- */
  function aggregateBy(report, dimName, opts) {
    opts = opts || {};
    var di = report.col(dimName);
    var map = {};
    report.rows.forEach(function (row) {
      var key = di >= 0 ? String(row[di] == null ? '' : row[di]).trim() : '(todos)';
      if (!key) key = opts.emptyLabel || '(não informado)';
      if (!map[key]) map[key] = { key: key, impressions: 0, clicks: 0, cost: 0, conversions: 0, count: 0, extra: {} };
      var b = map[key];
      b.impressions += report.metric(row, 'impressions');
      b.clicks      += report.metric(row, 'clicks');
      b.cost        += report.metric(row, 'cost');
      b.conversions += report.metric(row, 'conversions');
      b.count += 1;
      if (opts.keep) opts.keep.forEach(function (colName) {
        if (b.extra[colName] == null) {
          var i = report.col(colName);
          if (i >= 0 && String(row[i]).trim()) b.extra[colName] = String(row[i]).trim();
        }
      });
    });
    return Object.keys(map).map(function (k) {
      var b = map[k], d = derive(b);
      d.key = b.key; d.count = b.count; d.extra = b.extra;
      return d;
    });
  }

  var API = {
    norm: norm, num: num, parseCSV: parseCSV, detectType: detectType,
    parseReport: parseReport, derive: derive, aggregateBy: aggregateBy,
    METRIC_ALIASES: METRIC_ALIASES
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.SLParser = API;
})(typeof window !== 'undefined' ? window : this);
