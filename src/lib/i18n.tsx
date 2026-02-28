import React, { createContext, useContext, useState } from 'react';

export type Language = 'pt' | 'en';

const translations = {
  pt: {
    // App shell
    appTitle: 'Calculadora IRS — Mais-Valias',
    appSubtitle: 'Plataforma para calcular e declarar mais-valias de investimentos estrangeiros no IRS português.',
    langToggle: 'EN',

    // Steps
    step1: 'Carregar CSV',
    step2: 'Rever Transações',
    step3: 'Resultado Fiscal',
    step4: 'Guia de Preenchimento',
    next: 'Continuar',
    back: 'Voltar',
    restart: 'Recomeçar',

    // Upload
    uploadTitle: 'Carregar histórico de transações',
    uploadDesc: 'Carregue o ficheiro CSV do DeGiro ou o PDF do extrato da Trade Republic. Os dados são processados localmente no seu browser — nunca saem do seu dispositivo.',
    uploadDrop: 'Arraste e largue o ficheiro aqui',
    uploadOr: 'ou',
    uploadBrowse: 'Selecionar ficheiro',
    uploadAccepted: 'Ficheiro aceite',
    uploadRows: 'transações detetadas',
    uploadYears: 'Anos com vendas',
    uploadSplits: 'Eventos de stock split',
    uploadWarnings: 'Avisos',
    uploadContinue: 'Continuar para revisão',
    uploadInvalidFile: 'Ficheiro não reconhecido. Carregue um CSV do DeGiro ou o PDF do extrato vitalício da Trade Republic.',
    uploadProcessing: 'A processar ficheiro…',
    uploadBrokerDeGiro: 'DeGiro CSV',
    uploadBrokerTR: 'Trade Republic PDF',
    uploadSupportedFormats: 'Formatos suportados: DeGiro CSV (.csv) · Trade Republic Extrato de conta (.pdf)',
    uploadAddMore: 'Adicionar outro ficheiro',
    uploadRemoveFile: 'Remover',
    uploadFilesLoaded: 'ficheiro(s) carregado(s)',
    uploadTotalTransactions: 'transações no total',
    uploadDuplicateFile: 'Já existe um ficheiro com este nome. Foi substituído.',

    // Review
    reviewTitle: 'Rever transações',
    reviewDesc: 'Verifique as transações importadas antes de calcular os impostos.',
    reviewFiscalYear: 'Ano fiscal',
    reviewFilter: 'Filtrar por ativo',
    reviewAll: 'Todos',
    reviewDate: 'Data',
    reviewProduct: 'Produto',
    reviewISIN: 'ISIN',
    reviewQty: 'Qtd.',
    reviewPrice: 'Preço',
    reviewEUR: 'Valor EUR',
    reviewFees: 'Custos',
    reviewTotal: 'Total EUR',
    reviewType: 'Tipo',
    reviewBuy: 'Compra',
    reviewSell: 'Venda',
    reviewSplit: 'Split',
    reviewSplitBadge: 'Stock Split — evento não tributável',
    reviewNote: 'Nota: Lotes adquiridos em anos anteriores são considerados para o cálculo FIFO do ano fiscal selecionado.',
    reviewCalc: 'Calcular impostos',
    noSales: 'Não existem vendas no ano fiscal selecionado.',

    // Results
    resultsTitle: 'Resultado fiscal',
    resultsYear: 'Ano fiscal',
    resultsProceeds: 'Valor de realização bruto',
    resultsCost: 'Custo de aquisição',
    resultsFees: 'Custos de transação',
    resultsRawGain: 'Mais-valia bruta',
    resultsTaxableGain: 'Mais-valia tributável',
    resultsTax28: 'Imposto (taxa autónoma 28%)',
    resultsNetLoss: 'Menos-valia líquida',
    resultsLossNote: 'Prejuízo: pode ser reportado nos 5 anos seguintes para compensar mais-valias futuras.',
    resultsTaxMethod: 'Método de tributação',
    resultsAutonomous: 'Taxa autónoma (28%)',
    resultsEnglobamento: 'Englobamento',
    resultsEnglobamentoIncome: 'Rendimento bruto anual (aprox.)',
    resultsEnglobamentoNote: 'O englobamento inclui as mais-valias no rendimento total, aplicando as taxas progressivas. Pode ser mais vantajoso para rendimentos baixos.',
    resultsEnglobamentoNoGain: 'Não aplicável (sem mais-valias tributáveis).',
    resultsIRSJovemToggle: 'Usufruo de IRS Jovem',
    resultsIRSJovemYear: 'Ano do IRS Jovem',
    resultsIRSJovemYearNone: 'Não usufruo',
    resultsIRSJovemExemptionLabel: 'Isenção aplicável',
    resultsIRSJovemEffectiveIncome: 'Rendimento tributável após isenção',
    resultsIRSJovemEnglobamentoNote: '✅ Com IRS Jovem, apenas a fração não isenta do rendimento entra na base do englobamento. As mais-valias somam por cima dessa base.',
    resultsHoldingReduction: 'Reduções por prazo de detenção (CIRS art. 43, n.º 3)',

    resultsHoldingReductionToggle: 'Aplicar reduções por prazo de detenção',
    resultsHoldingReductionWarning: 'Exceção: se deteve as ações menos de 365 dias E o seu rendimento coletável for ≥ €83.696 (ultimo escalão IRS), estas reduções não se aplicam (CIRS art. 43, n.º 3).',
    resultsByAsset: 'Detalhe por ativo',
    resultsExpandLots: 'Ver lotes FIFO',
    resultsCollapseLots: 'Ocultar lotes',
    resultsLotAcqDate: 'Data aquisição',
    resultsLotSaleDate: 'Data venda',
    resultsLotQty: 'Qtd.',
    resultsLotHolding: 'Prazo detenção',
    resultsLotTier: 'Escalão',
    resultsLotExclusion: 'Exclusão',
    resultsLotAcqCost: 'Custo aquis.',
    resultsLotProceeds: 'Valor realiz.',
    resultsLotRawGain: 'Mais-valia bruta',
    resultsLotTaxableGain: 'Tributável',
    resultsContinue: 'Ver guia de preenchimento do IRS',
    resultsIRSJovemNote: 'IRS Jovem (OE2025): 10 anos, até 35 anos. Isenção só se aplica a Cat. A/B — não reduz diretamente o imposto sobre mais-valias (Cat. G). Mas com o rendimento isento, a base de englobamento é mais baixa, podendo tornar o englobamento muito vantajoso. Cap: €28.737,50/ano. Confirme com um TOC/ROC.',

    // Guide
    guideTitle: 'Guia de preenchimento do Anexo J',
    guideSubtitle: 'Siga estes passos para declarar as suas mais-valias no Portal das Finanças.',
    guideDisclaimer: 'Este guia é para fins informativos. Os valores apresentados são calculados automaticamente com base nos dados inseridos. Confirme sempre com um TOC/ROC antes de submeter a sua declaração.',
    guideCopyValue: 'Copiar valor',
    guideCopied: 'Copiado!',
    guideFilingTable: 'Valores para inserir no Quadro 9.2',
    guideColCountry: 'País',
    guideColISIN: 'ISIN',
    guideColDesc: 'Designação',
    guideColAcqDate: 'Data aquis.',
    guideColSaleDate: 'Data aliena.',
    guideColRealization: 'Valor realiz. (€)',
    guideColAcqCost: 'Custo aquis. (€)',
    guideColGain: 'Mais-valia (€)',
    guideMultipleLotsNote: 'Esta venda consumiu vários lotes FIFO com datas de aquisição diferentes. Deverá preencher uma linha por lote no Quadro 9.2.',
    guideSimplifyToggle: 'Vista simplificada (menos linhas)',
    guideSimplifyNote: 'Modo simplificado: lotes com o mesmo escalão de detenção e mesma data de venda são agrupados numa só linha. Usa a data de aquisição mais antiga do grupo e soma os valores de realização e de aquisição. O total final mantém-se idêntico.',
    guideSimplifyRows: (n: number) => `${n} linha${n !== 1 ? 's' : ''} em vez de`,
    guideDetailedRows: (n: number) => `${n} (modo detalhado)`,

    // Guide steps
    guideStep1Title: 'Passo 1 — Aceder ao Portal das Finanças',
    guideStep2Title: 'Passo 2 — Iniciar a declaração de IRS',
    guideStep3Title: 'Passo 3 — Adicionar o Anexo J',
    guideStep4Title: 'Passo 4 — Preencher o Quadro 4 (Identificação do intermediário)',
    guideStep5Title: 'Passo 5 — Preencher o Quadro 9.2 (Alienação de valores mobiliários estrangeiros)',
    guideStep6Title: 'Passo 6 — Quadro 14 — Escolha do método de tributação',
    guideStep7Title: 'Passo 7 — Validação e submissão',

    guideStep1Body: `1. Aceda a https://www.portaldasfinancas.gov.pt
2. Autentique-se com o seu NIF e senha (ou Chave Móvel Digital / Cartão de Cidadão).
3. No menu, selecione: Cidadãos → Situação Fiscal → IRS → Entregar Declaração Modelo 3.`,

    guideStep2Body: `4. Selecione o ano fiscal: 2025.
5. Se tiver uma declaração pré-preenchida, escolha "Confirmar dados automáticos" e avance — ou escolha "Nova declaração".
6. Na página inicial da declaração, confirme a identificação do titular.`,

    guideStep3Body: `7. No separador "Anexos", clique em "Adicionar Anexo".
8. Selecione "Anexo J — Rendimentos Obtidos no Estrangeiro".
   • O Anexo J é usado para rendimentos de fonte estrangeira (broker DeGiro está sedeado nos Países Baixos — NL).
   • Não use o Anexo G (esse é para rendimentos de fonte portuguesa).
9. Se declarar em conjunto, adicione um Anexo J por titular que tenha tido vendas.`,

    guideStep4Body: `10. No Quadro 4 do Anexo J, indique o país de residência do intermediário financeiro:
    → País: NL (Países Baixos / Netherlands) — DeGiro B.V. está sediado nos Países Baixos.
11. Indique o NIF do intermediário (se disponível no seu relatório anual DeGiro). Pode deixar em branco se não tiver.
12. Se tiver ativos negociados em mercados regulamentados portugueses, assinale a respetiva opção. Para ações americanas e ETFs irlandeses, esta opção não se aplica.`,

    guideStep5Body: `13. Vá ao Quadro 9 → Secção 9.2: "Alienação onerosa de partes sociais e outros valores mobiliários".
14. Esta secção destina-se a ações, ETFs e outros valores mobiliários de emitentes estrangeiros.
15. Para cada venda, preencha uma linha com os seguintes campos:

   ┌─────────────────────────────────────────────────────────────────────────┐
   │  Campo                │ O que inserir                                  │
   ├─────────────────────────────────────────────────────────────────────────│
   │  País do emitente     │ 2 primeiras letras do ISIN (ex: US, IE)        │
   │  ISIN                 │ Código ISIN do ativo (ex: US88160R1014)        │
   │  Designação           │ Nome do ativo (ex: TESLA INC)                  │
   │  Data de aquisição    │ Data de compra do lote FIFO (DD-MM-AAAA)       │
   │  Data de alienação    │ Data da venda (DD-MM-AAAA)                     │
   │  Valor de realização  │ Valor EUR bruto da venda (ver tabela abaixo)   │
   │  Valor de aquisição   │ Custo de aquisição EUR (ver tabela abaixo)     │
   └─────────────────────────────────────────────────────────────────────────┘

16. IMPORTANTE — Se uma venda consumiu vários lotes FIFO (comprados em datas diferentes),
    deverá preencher UMA LINHA POR LOTE no Quadro 9.2.
    Distribua o valor de realização proporcionalmente pela quantidade de cada lote.

17. Os valores a usar encontram-se na tabela "Valores para inserir" acima nesta página.`,

    guideStep6Body: `18. No Quadro 14 do Anexo J, tem de indicar se opta por:

   a) Taxa autónoma (28%) — opção por omissão. As mais-valias são tributadas isoladamente
      à taxa fixa de 28%. Não afeta a tributação dos outros rendimentos.

   b) Englobamento — as mais-valias são somadas ao rendimento coletável total e sujeitas
      às taxas progressivas do IRS (12,5% a 48%). Pode ser vantajoso se o seu rendimento
      total (incluindo as mais-valias) se mantiver nos escalões inferiores.

   → Se escolher englobamento, marque "S" no campo "Opta pelo englobamento?" do Quadro 14.
   → Veja a comparação calculada na etapa anterior para decidir qual a opção mais favorável.

19. NOTA sobre IRS Jovem: O regime IRS Jovem aplica-se EXCLUSIVAMENTE a rendimentos
    de trabalho dependente (Categoria A) e independente (Categoria B).
    NÃO se aplica a mais-valias de ações/ETF (Categoria G declaradas no Anexo J).
    As mais-valias são sempre tributadas pelas regras normais da Categoria G.`,

    guideStep7Body: `20. Após preencher todos os campos, clique em "Validar" no topo da declaração.
21. Corrija quaisquer erros assinalados pelo sistema.
22. Reveja o resumo da liquidação para confirmar que o imposto calculado corresponde ao esperado.
23. Clique em "Submeter" e guarde o comprovativo (PDF) para os seus registos.

   ✔  Checklist final:
   □  Quadro 4: país do intermediário = NL
   □  Quadro 9.2: uma linha por lote FIFO, por cada venda ocorrida em 2025
   □  Valores de realização e aquisição em EUR (usar os valores da tabela acima)
   □  Quadro 14: método de tributação escolhido (autónoma ou englobamento)
   □  Declaração validada sem erros
   □  Comprovativo de submissão guardado`,

    days: 'dias',
    exportPDF: 'Exportar PDF',
    darkMode: 'Modo escuro',
    lightMode: 'Modo claro',

    // Prior year losses
    priorLossTitle: 'Perdas reportáveis de anos anteriores',
    priorLossToggle: 'Tenho perdas de anos anteriores a reportar',
    priorLossInput: 'Total de perdas acumuladas (€)',
    priorLossNote: 'As perdas de Cat. G podem ser reportadas durante 5 anos (CIRS art. 55). Consulte as suas declarações anteriores para apurar o valor correto.',
    priorLossAdjustedGain: 'Mais-valia tributável ajustada',
    priorLossSaving: 'Poupança fiscal estimada',

    // Multi-year comparison
    multiYearTitle: 'Comparação multi-ano',
    multiYearShow: 'Mostrar evolução anual',
    multiYearHide: 'Ocultar evolução anual',
    multiYearYear: 'Ano',
    multiYearProceeds: 'Realizações',
    multiYearCost: 'Custo',
    multiYearGain: 'Mais-valia bruta',
    multiYearTaxableGain: 'Tributável',
    multiYearTax: 'Imposto (28%)',
    multiYearCurrent: 'Selecionado',

    validateTitle: 'Validação cruzada (opcional)',
    validateDesc: 'Introduza o total de realizações que o broker reporta para verificar se todos os movimentos foram detetados.',
    validateLabel: 'Total realizações reportado pelo broker (€)',
    validateMatch: 'Totais coincidem',
    validateMismatch: 'Diferença de',
    validateMismatchDetail: '— podem existir movimentos em falta ou duplicados',
    validateBrokerTotal: 'Reportado',
    validateCalcTotal: 'Calculado',
  },
  en: {
    appTitle: 'IRS Calculator — Capital Gains DeGiro',
    appSubtitle: 'Platform to calculate and declare capital gains from foreign investments in Portuguese IRS.',
    langToggle: 'PT',

    step1: 'Upload CSV',
    step2: 'Review Transactions',
    step3: 'Tax Results',
    step4: 'Filing Guide',
    next: 'Next',
    back: 'Back',
    restart: 'Start Over',

    uploadTitle: 'Upload transaction history',
    uploadDesc: 'Upload your DeGiro CSV or Trade Republic account statement PDF. Data is processed locally in your browser — it never leaves your device.',
    uploadDrop: 'Drag and drop your file here',
    uploadOr: 'or',
    uploadBrowse: 'Browse file',
    uploadAccepted: 'File accepted',
    uploadRows: 'transactions detected',
    uploadYears: 'Years with sales',
    uploadSplits: 'Stock split events',
    uploadWarnings: 'Warnings',
    uploadContinue: 'Continue to review',
    uploadInvalidFile: 'Unrecognised file. Please upload a DeGiro CSV or the Trade Republic lifetime account statement PDF.',
    uploadProcessing: 'Processing file…',
    uploadBrokerDeGiro: 'DeGiro CSV',
    uploadBrokerTR: 'Trade Republic PDF',
    uploadSupportedFormats: 'Supported formats: DeGiro CSV (.csv) · Trade Republic Account Statement (.pdf)',
    uploadAddMore: 'Add another file',
    uploadRemoveFile: 'Remove',
    uploadFilesLoaded: 'file(s) loaded',
    uploadTotalTransactions: 'transactions total',
    uploadDuplicateFile: 'A file with this name already existed and was replaced.',

    reviewTitle: 'Review transactions',
    reviewDesc: 'Verify the imported transactions before calculating taxes.',
    reviewFiscalYear: 'Fiscal year',
    reviewFilter: 'Filter by asset',
    reviewAll: 'All',
    reviewDate: 'Date',
    reviewProduct: 'Product',
    reviewISIN: 'ISIN',
    reviewQty: 'Qty.',
    reviewPrice: 'Price',
    reviewEUR: 'EUR Value',
    reviewFees: 'Fees',
    reviewTotal: 'Total EUR',
    reviewType: 'Type',
    reviewBuy: 'Buy',
    reviewSell: 'Sell',
    reviewSplit: 'Split',
    reviewSplitBadge: 'Stock Split — non-taxable event',
    reviewNote: 'Note: Lots acquired in previous years are considered for the FIFO calculation of the selected fiscal year.',
    reviewCalc: 'Calculate taxes',
    noSales: 'No sales found in the selected fiscal year.',

    resultsTitle: 'Tax results',
    resultsYear: 'Fiscal year',
    resultsProceeds: 'Gross realisation value',
    resultsCost: 'Acquisition cost',
    resultsFees: 'Transaction fees',
    resultsRawGain: 'Gross capital gain',
    resultsTaxableGain: 'Taxable capital gain',
    resultsTax28: 'Tax (autonomous rate 28%)',
    resultsNetLoss: 'Net capital loss',
    resultsLossNote: 'Loss: can be carried forward for 5 years to offset future capital gains.',
    resultsTaxMethod: 'Tax method',
    resultsAutonomous: 'Autonomous rate (28%)',
    resultsEnglobamento: 'Englobamento (aggregation)',
    resultsEnglobamentoIncome: 'Approximate gross annual income',
    resultsEnglobamentoNote: 'Englobamento adds capital gains to total income, applying progressive rates. May be more favourable for lower incomes.',
    resultsEnglobamentoNoGain: 'Not applicable (no taxable gains).',
    resultsIRSJovemToggle: 'I benefit from IRS Jovem',
    resultsIRSJovemYear: 'IRS Jovem year',
    resultsIRSJovemYearNone: 'Not applicable',
    resultsIRSJovemExemptionLabel: 'Applicable exemption',
    resultsIRSJovemEffectiveIncome: 'Taxable income after exemption',
    resultsIRSJovemEnglobamentoNote: '✅ With IRS Jovem, only the non-exempt fraction of your income enters the aggregation base. Capital gains are added on top of that base.',
    resultsHoldingReduction: 'Holding period reductions (CIRS art. 43, n.º 3)',
    resultsHoldingReductionToggle: 'Apply holding period reductions',
    resultsHoldingReductionWarning: 'Exception: if you held the shares for less than 365 days AND your taxable income is ≥ €83,696 (top IRS bracket), these reductions do not apply (CIRS art. 43, n.º 3).',
    resultsByAsset: 'Detail by asset',
    resultsExpandLots: 'Show FIFO lots',
    resultsCollapseLots: 'Hide lots',
    resultsLotAcqDate: 'Acq. date',
    resultsLotSaleDate: 'Sale date',
    resultsLotQty: 'Qty.',
    resultsLotHolding: 'Holding period',
    resultsLotTier: 'Tier',
    resultsLotExclusion: 'Exclusion',
    resultsLotAcqCost: 'Acq. cost',
    resultsLotProceeds: 'Sale proceeds',
    resultsLotRawGain: 'Raw gain',
    resultsLotTaxableGain: 'Taxable',
    resultsContinue: 'View IRS filing guide',
    resultsIRSJovemNote: 'IRS Jovem (OE2025): 10 years, up to age 35. Exemption only applies to Cat. A/B income — does not directly reduce tax on capital gains (Cat. G). However, the lower taxable base may make englobamento highly advantageous. Cap: €28,737.50/year. Confirm with a TOC/ROC.',

    guideTitle: 'Annex J Filing Guide',
    guideSubtitle: 'Follow these steps to declare your capital gains on the Portal das Finanças.',
    guideDisclaimer: 'This guide is for informational purposes only. Values shown are automatically calculated from the data you provided. Always confirm with a certified accountant (TOC/ROC) before submitting your declaration.',
    guideCopyValue: 'Copy value',
    guideCopied: 'Copied!',
    guideFilingTable: 'Values to enter in Quadro 9.2',
    guideColCountry: 'Country',
    guideColISIN: 'ISIN',
    guideColDesc: 'Description',
    guideColAcqDate: 'Acq. date',
    guideColSaleDate: 'Sale date',
    guideColRealization: 'Realisation value (€)',
    guideColAcqCost: 'Acq. cost (€)',
    guideColGain: 'Capital gain (€)',
    guideMultipleLotsNote: 'This sale consumed multiple FIFO lots with different acquisition dates. You must enter one row per lot in Quadro 9.2.',
    guideSimplifyToggle: 'Simplified view (fewer rows)',
    guideSimplifyNote: 'Simplified mode: lots with the same holding tier and the same sale date are merged into one row. Uses the earliest acquisition date in the group and sums realization and acquisition values. The final totals remain identical.',
    guideSimplifyRows: (n: number) => `${n} row${n !== 1 ? 's' : ''} instead of`,
    guideDetailedRows: (n: number) => `${n} (detailed mode)`,

    guideStep1Title: 'Step 1 — Access the Portal das Finanças',
    guideStep2Title: 'Step 2 — Start the IRS declaration',
    guideStep3Title: 'Step 3 — Add Annex J',
    guideStep4Title: 'Step 4 — Fill in Quadro 4 (Intermediary identification)',
    guideStep5Title: 'Step 5 — Fill in Quadro 9.2 (Sale of foreign securities)',
    guideStep6Title: 'Step 6 — Quadro 14 — Tax method selection',
    guideStep7Title: 'Step 7 — Validation and submission',

    guideStep1Body: `1. Go to https://www.portaldasfinancas.gov.pt
2. Log in with your NIF and password (or Chave Móvel Digital / Cartão de Cidadão).
3. In the menu, select: Cidadãos → Situação Fiscal → IRS → Entregar Declaração Modelo 3.`,

    guideStep2Body: `4. Select fiscal year: 2025.
5. If you have a pre-filled declaration, choose "Confirm automatic data" and proceed — or choose "New declaration".
6. On the declaration home page, confirm the holder's identification.`,

    guideStep3Body: `7. In the "Annexes" tab, click "Add Annex".
8. Select "Annex J — Income Obtained Abroad".
   • Annex J is used for foreign-source income (DeGiro broker is based in the Netherlands — NL).
   • Do NOT use Annex G (that is for Portuguese-source income).
9. If filing jointly, add one Annex J per holder who had sales.`,

    guideStep4Body: `10. In Quadro 4 of Annex J, indicate the country of residence of the financial intermediary:
    → Country: NL (Netherlands) — DeGiro B.V. is based in the Netherlands.
11. Indicate the intermediary's NIF/tax ID (if available in your annual DeGiro report). Leave blank if unavailable.
12. If you have assets traded on Portuguese regulated markets, tick the relevant option. For US stocks and Irish ETFs, this does not apply.`,

    guideStep5Body: `13. Go to Quadro 9 → Section 9.2: "Onerous transfer of share capital and other securities".
14. This section is for shares, ETFs and other securities of foreign issuers.
15. For each sale, fill in one row with the following fields:

   ┌──────────────────────────────────────────────────────────────────────────┐
   │  Field                │ What to enter                                   │
   ├──────────────────────────────────────────────────────────────────────────│
   │  Issuer country       │ First 2 letters of ISIN (e.g. US, IE)          │
   │  ISIN                 │ ISIN code (e.g. US88160R1014)                   │
   │  Description          │ Asset name (e.g. TESLA INC)                     │
   │  Acquisition date     │ Purchase date of the FIFO lot (DD-MM-YYYY)     │
   │  Alienation date      │ Sale date (DD-MM-YYYY)                          │
   │  Realisation value    │ Gross EUR sale value (see table below)          │
   │  Acquisition value    │ Acquisition cost EUR (see table below)          │
   └──────────────────────────────────────────────────────────────────────────┘

16. IMPORTANT — If a sale consumed multiple FIFO lots (purchased on different dates),
    you must enter ONE ROW PER LOT in Quadro 9.2.
    Distribute the realisation value proportionally by the quantity per lot.

17. The values to use are shown in the "Values to enter" table on this page.`,

    guideStep6Body: `18. In Quadro 14 of Annex J, you must indicate whether you opt for:

   a) Autonomous rate (28%) — default option. Capital gains are taxed separately
      at a flat rate of 28%. Does not affect the taxation of other income.

   b) Englobamento (aggregation) — capital gains are added to total taxable income
      and subject to progressive IRS rates (12.5% to 48%). May be favourable
      if your total income (including gains) remains in lower brackets.

   → If you choose englobamento, mark "S" in the field "Opta pelo englobamento?" in Quadro 14.
   → See the comparison calculated in the previous step to decide which option is more favourable.

19. NOTE on IRS Jovem: The IRS Jovem scheme applies EXCLUSIVELY to employment income
    (Category A) and self-employment income (Category B).
    It does NOT apply to capital gains from stocks/ETFs (Category G declared in Annex J).
    Capital gains are always taxed under normal Category G rules.`,

    guideStep7Body: `20. After filling in all fields, click "Validate" at the top of the declaration.
21. Correct any errors flagged by the system.
22. Review the liquidation summary to confirm the calculated tax matches expectations.
23. Click "Submit" and save the receipt (PDF) for your records.

   ✔  Final checklist:
   □  Quadro 4: intermediary country = NL
   □  Quadro 9.2: one row per FIFO lot, for each sale in 2025
   □  Realisation and acquisition values in EUR (use values from the table above)
   □  Quadro 14: tax method chosen (autonomous or englobamento)
   □  Declaration validated with no errors
   □  Submission receipt saved`,

    days: 'days',
    exportPDF: 'Export PDF',
    darkMode: 'Dark mode',
    lightMode: 'Light mode',

    // Prior year losses
    priorLossTitle: 'Prior year carryforward losses',
    priorLossToggle: 'I have prior year losses to carry forward',
    priorLossInput: 'Total accumulated losses (€)',
    priorLossNote: 'Category G losses can be carried forward for 5 years (CIRS art. 55). Check your previous tax returns for the correct figure.',
    priorLossAdjustedGain: 'Adjusted taxable gain',
    priorLossSaving: 'Estimated tax saving',

    // Multi-year comparison
    multiYearTitle: 'Multi-year comparison',
    multiYearShow: 'Show annual history',
    multiYearHide: 'Hide annual history',
    multiYearYear: 'Year',
    multiYearProceeds: 'Proceeds',
    multiYearCost: 'Cost',
    multiYearGain: 'Gross gain',
    multiYearTaxableGain: 'Taxable',
    multiYearTax: 'Tax (28%)',
    multiYearCurrent: 'Selected',

    validateTitle: 'Cross-validation (optional)',
    validateDesc: "Enter the broker's reported total proceeds to verify all transactions were detected.",
    validateLabel: 'Total proceeds reported by broker (€)',
    validateMatch: 'Totals match',
    validateMismatch: 'Difference of',
    validateMismatchDetail: '— some transactions may be missing or duplicated',
    validateBrokerTotal: 'Reported',
    validateCalcTotal: 'Calculated',
  },
} as const;

export type TranslationKey = keyof typeof translations.pt;

type Translations = typeof translations.pt;

interface I18nContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'pt',
  setLang: () => {},
  t: translations.pt,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('pt');
  const t = translations[lang] as Translations;
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
