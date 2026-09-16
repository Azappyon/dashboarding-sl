# SL Process · Dashboard de Google Ads

Dashboard profissional de performance da campanha de **Rede de Pesquisa** da SL Process.
Você sobe os relatórios CSV exportados do Google Ads **todo mês** e o dashboard **gera o relatório automaticamente**, com 10 páginas de análise e recomendações.

- 100% estático (um único `index.html`), sem servidor e sem banco de dados.
- Os dados são processados **no próprio navegador** — nada é enviado para nenhum servidor.
- Pronto para hospedar na **Vercel** (ou em qualquer hospedagem estática).
- Interface em **Material Design 3** com a marca SL Process (azul `#003958`, laranja `#E29601`,
  fonte Sora e ícones Material Symbols).
- Gráficos de **rosca/pizza**, funil de conversão e barras **interativos** (tooltip ao passar o
  mouse), com paleta de cores validada para daltonismo, foco de teclado visível, layout
  responsivo (do desktop ao celular) e suporte a `prefers-reduced-motion`.

### Recursos de aplicação (estilo Power BI)

- **Slicer global de Grupo de anúncios** — as pílulas no topo filtram o dashboard inteiro
  (KPIs, gráficos e tabelas recalculam na hora). Selecione um ou vários grupos, ou "Todos".
- **Cross-filtering** — clique numa fatia da rosca, numa barra de grupo ou num item da legenda
  para filtrar todo o painel por aquele grupo; clique de novo (ou em "Limpar filtro") para voltar.
- **Tabelas ordenáveis e pesquisáveis** — clique no título de qualquer coluna para ordenar
  (crescente/decrescente) e use a busca para filtrar linhas (anúncios, termos, grupos…).
- **Modo apresentação** — botão de "slideshow" abre o painel em tela cheia, sem menus, com
  navegação por página (setas ‹ › ou teclado) — ideal para reuniões.
- **Tema claro/escuro** — alternador no topo; a preferência fica salva no navegador.

---

## 1. Como usar no dia a dia

1. Abra o dashboard (o link da Vercel depois de publicado).
2. Clique em **“Atualizar planilhas”** (canto superior direito).
3. Arraste os **11 CSVs do mês** exportados do Google Ads (ou selecione-os).
4. Clique em **“Gerar relatório”**. Pronto — todas as páginas são recalculadas.

O dashboard identifica cada relatório **pelo título do arquivo** (a 1ª linha do CSV),
então a ordem em que você solta os arquivos não importa. Você pode subir só alguns
relatórios — as páginas correspondentes aos que faltarem mostram um aviso amigável.

### Relatórios esperados (11)

| # | Relatório do Google Ads | Página que alimenta |
|---|---|---|
| 1 | Relatório de campanha | 01 Resumo · 02 Campanhas |
| 2 | Relatório do grupo de anúncios | 02 Grupos |
| 3 | Relatório de anúncios | 02 Grupos · 03 Anúncios |
| 4 | Relatório de palavras-chave da rede de pesquisa | 04 Palavras-chave |
| 5 | Relatório de termos de pesquisa | 05 Termos |
| 6 | Relatório de locais | 06 Localização |
| 7 | Relatório de dispositivos | 07 Dispositivos |
| 8 | Relatório de programação de anúncios | 08 Programação |
| 9 | Relatório de idade | 09 Público |
| 10 | Relatório por gênero | 09 Público |
| 11 | Relatório de renda familiar | 09 Público |

> **Dica de exportação:** mantenha o mesmo formato de exportação a cada mês
> (CSV, em português). Para a **Página 08 (Programação)** aparecer com gráficos,
> exporte o relatório de programação com os segmentos **“Dia da semana”** e
> **“Hora do dia”** ativados. Para ranquear **cidades** na Página 06, exporte o
> relatório de locais segmentado por **cidade/região**.

Os números que você abrir pela primeira vez são apenas **dados de exemplo**
(o período 27/07/2026 – 16/09/2026). Assim que você fizer o primeiro upload,
o exemplo é substituído pelos seus dados.

---

## 2. Publicar na Vercel

### Opção A — via GitHub (recomendado)

1. Crie um repositório no GitHub e suba esta pasta.
2. Em [vercel.com](https://vercel.com) → **Add New… → Project** → importe o repositório.
3. Em *Framework Preset*, selecione **Other** (é um site estático).
   - *Build Command:* deixe em branco
   - *Output Directory:* deixe em branco (a raiz já contém o `index.html`)
4. Clique em **Deploy**. Em segundos você terá a URL pública.

A cada `git push`, a Vercel republica automaticamente.

### Opção B — via Vercel CLI

```bash
npm i -g vercel
cd sl-process-dashboard
vercel        # segue o assistente; aceite os padrões
vercel --prod # publica em produção
```

### Opção C — arrastar e soltar

Como é um site estático, você também pode arrastar a pasta inteira para o
painel da Vercel (Deployments → *drag and drop*). O `index.html` já é suficiente.

> **Só o essencial:** para funcionar, basta o arquivo **`index.html`**.
> As pastas `src/`, `data/` e os scripts servem apenas para manutenção.

---

## 3. Estrutura do projeto

```
sl-process-dashboard/
├── index.html          ← o dashboard pronto (autossuficiente) — é o que a Vercel serve
├── vercel.json         ← configuração de hospedagem estática
├── package.json        ← scripts de build/verificação
├── data/               ← os 11 CSVs de exemplo (referência do formato esperado)
├── src/
│   ├── styles.css      ← identidade visual
│   └── app.js          ← interface, gráficos (SVG) e motor de insights
├── parser.core.js      ← leitor de CSV do Google Ads (formato pt-BR)
├── build.js            ← gera o index.html a partir de src/ + data/
└── verify.js           ← testa o parser contra os CSVs de data/
```

## 4. Manutenção (opcional, para quem for editar)

Requer Node.js instalado.

```bash
npm run verify   # confere se o parser lê os CSVs corretamente
npm run build    # regenera o index.html após editar src/ ou trocar os CSVs de data/
```

O `build.js` embute os CSVs de `data/` como **exemplo inicial** dentro do
`index.html`. Para trocar o exemplo exibido “de fábrica”, substitua os arquivos
de `data/` e rode `npm run build`.

---

### Notas técnicas

- **Formato de números:** o parser entende o padrão brasileiro (`1.234,56`),
  `R$`, `%` e o marcador ` --` de célula vazia do Google Ads.
- **Totais:** o Resumo Executivo usa a linha **“Total: Campanha”** do relatório de
  campanha; a performance por grupo é consolidada a partir do relatório de anúncios
  (que soma corretamente por grupo).
- **Privacidade:** todo o processamento é no navegador (client-side). Nenhum dado
  de campanha é transmitido.

Desenvolvido para a **SL Process — Engenharia Industrial**.
