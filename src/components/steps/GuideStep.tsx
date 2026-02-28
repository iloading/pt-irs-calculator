import { useState, type ReactNode } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  AlertTriangle,
  FileDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/lib/i18n';
import { formatEUR, formatDate } from '@/lib/taxCalculator';
import { openPdfReport } from '@/lib/pdfReport';
import { cn } from '@/lib/utils';
import type { TaxableSale, TaxSummary } from '@/types/transaction';

interface GuideStepProps {
  summary: TaxSummary;
  onBack: () => void;
  onRestart: () => void;
}

// ─── Filing rows: one per FIFO lot per sale ──────────────────────────────────
interface FilingRow {
  saleDate: Date;
  countryCode: string;
  isin: string;
  product: string;
  acquisitionDate: Date;
  realizationValue: number;
  acquisitionCost: number;
  rawGain: number;
  quantityMatched: number;
  totalSaleQty: number;
  holdingTierLabel: string;
  exclusionRate: number;
}

function buildFilingRows(sales: TaxableSale[]): FilingRow[] {
  const rows: FilingRow[] = [];
  for (const sale of sales) {
    if (sale.fifoMatches.length === 1) {
      const m = sale.fifoMatches[0];
      rows.push({
        saleDate: sale.saleDate,
        countryCode: sale.countryCode,
        isin: sale.isin,
        product: sale.product,
        acquisitionDate: m.lotAcquisitionDate,
        realizationValue: m.saleValueEUR,
        acquisitionCost: m.acquisitionCostEUR,
        rawGain: m.rawGainEUR,
        quantityMatched: m.quantityMatched,
        totalSaleQty: sale.totalQuantitySold,
        holdingTierLabel: m.holdingTier.labelPT,
        exclusionRate: m.holdingTier.exclusionRate,
      });
    } else {
      // Multiple FIFO lots → one row per lot
      for (const m of sale.fifoMatches) {
        rows.push({
          saleDate: sale.saleDate,
          countryCode: sale.countryCode,
          isin: sale.isin,
          product: sale.product,
          acquisitionDate: m.lotAcquisitionDate,
          realizationValue: m.saleValueEUR,
          acquisitionCost: m.acquisitionCostEUR,
          rawGain: m.rawGainEUR,
          quantityMatched: m.quantityMatched,
          totalSaleQty: sale.totalQuantitySold,
          holdingTierLabel: m.holdingTier.labelPT,
          exclusionRate: m.holdingTier.exclusionRate,
        });
      }
    }
  }
  return rows;
}

// ─── Build simplified rows: group by (ISIN + saleDate + exclusionRate) ────────
function buildSimplifiedRows(sales: TaxableSale[]): FilingRow[] {
  const groupMap = new Map<string, FilingRow>();
  const groupOrder: string[] = [];

  for (const sale of sales) {
    for (const m of sale.fifoMatches) {
      const key = `${sale.isin}__${sale.saleDate.toISOString().slice(0, 10)}__${m.holdingTier.exclusionRate}`;
      if (!groupMap.has(key)) {
        groupOrder.push(key);
        groupMap.set(key, {
          saleDate: sale.saleDate,
          countryCode: sale.countryCode,
          isin: sale.isin,
          product: sale.product,
          acquisitionDate: m.lotAcquisitionDate,
          realizationValue: 0,
          acquisitionCost: 0,
          rawGain: 0,
          quantityMatched: 0,
          totalSaleQty: sale.totalQuantitySold,
          holdingTierLabel: m.holdingTier.labelPT,
          exclusionRate: m.holdingTier.exclusionRate,
        });
      }
      const row = groupMap.get(key)!;
      row.realizationValue += m.saleValueEUR;
      row.acquisitionCost += m.acquisitionCostEUR;
      row.rawGain += m.rawGainEUR;
      row.quantityMatched += m.quantityMatched;
      // Keep earliest acquisition date in the group
      if (m.lotAcquisitionDate < row.acquisitionDate) {
        row.acquisitionDate = m.lotAcquisitionDate;
      }
    }
  }

  return groupOrder.map((k) => groupMap.get(k)!);
}

// ─── Copy-to-clipboard cell helper ───────────────────────────────────────────
function CopyCell({ value }: { value: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <td className="px-3 py-2 group relative">
      <div className="flex items-center justify-end gap-1">
        <span className="font-mono tabular-nums">{value}</span>
        <button
          onClick={copy}
          className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-0.5 rounded hover:bg-muted"
          title={t.guideCopyValue}
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-500" />
          ) : (
            <Copy className="w-3 h-3 text-muted-foreground" />
          )}
        </button>
      </div>
    </td>
  );
}

// ─── Collapsible guide step ───────────────────────────────────────────────────
function GuideAccordion({
  stepNumber,
  title,
  body,
  defaultOpen = false,
}: {
  stepNumber: number;
  title: string;
  body: string | ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
          {stepNumber}
        </span>
        <span className="font-semibold text-sm flex-1">{title}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="px-4 py-4">
          {typeof body === 'string' ? (
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground">
              {body}
            </pre>
          ) : (
            body
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function GuideStep({ summary, onBack, onRestart }: GuideStepProps) {
  const { t, lang } = useI18n();
  const [simplified, setSimplified] = useState(false);
  const allFilingRows = buildFilingRows(summary.sales);
  const simplifiedFilingRows = buildSimplifiedRows(summary.sales);
  const filingRows = simplified ? simplifiedFilingRows : allFilingRows;
  const hasMultipleLots = summary.sales.some((s) => s.fifoMatches.length > 1);

  const isPT = lang === 'pt';

  const step5Fields = isPT
    ? [
        ['País do emitente',    '2 primeiras letras do ISIN (ex: US, IE)'],
        ['ISIN',                'Código ISIN do ativo (ex: US88160R1014)'],
        ['Designação',          'Nome do ativo (ex: TESLA INC)'],
        ['Data de aquisição',   'Data de compra do lote FIFO (DD-MM-AAAA)'],
        ['Data de alienação',   'Data da venda (DD-MM-AAAA)'],
        ['Valor de realização', 'Valor EUR bruto da venda (ver tabela acima)'],
        ['Valor de aquisição',  'Custo de aquisição EUR (ver tabela acima)'],
      ]
    : [
        ['Issuer country',      'First 2 letters of ISIN (e.g. US, IE)'],
        ['ISIN',                'ISIN code (e.g. US88160R1014)'],
        ['Description',         'Asset name (e.g. TESLA INC)'],
        ['Acquisition date',    'Purchase date of the FIFO lot (DD-MM-YYYY)'],
        ['Alienation date',     'Sale date (DD-MM-YYYY)'],
        ['Realisation value',   'Gross EUR sale value (see table above)'],
        ['Acquisition value',   'Acquisition cost EUR (see table above)'],
      ];

  const step5Body = (
    <div className="space-y-4 text-sm">
      {/* Numbered instructions 13–15 */}
      <ol className="space-y-2 list-none">
        <li className="flex gap-2">
          <span className="font-bold text-primary shrink-0">13.</span>
          <span>
            {isPT ? (
              <><strong>Quadro 9 → Secção 9.2:</strong> &quot;Alienação onerosa de partes sociais e outros valores mobiliários&quot;.</>)
              : (<><strong>Quadro 9 → Section 9.2:</strong> &quot;Onerous transfer of share capital and other securities&quot;.</>)}
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary shrink-0">14.</span>
          <span>
            {isPT
              ? 'Esta secção destina-se a ações, ETFs e outros valores mobiliários de emitentes estrangeiros.'
              : 'This section is for shares, ETFs and other securities of foreign issuers.'}
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary shrink-0">15.</span>
          <span>
            {isPT ? 'Para cada venda, preencha uma linha com os seguintes campos:' : 'For each sale, fill in one row with the following fields:'}
          </span>
        </li>
      </ol>

      {/* Field mapping table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                {isPT ? 'Campo' : 'Field'}
              </th>
              <th className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                {isPT ? 'O que inserir' : 'What to enter'}
              </th>
            </tr>
          </thead>
          <tbody>
            {step5Fields.map(([field, value], i) => (
              <tr key={i} className={cn('border-b last:border-0', i % 2 === 0 ? 'bg-muted/10' : '')}>
                <td className="px-3 py-2 font-medium whitespace-nowrap">{field}</td>
                <td className="px-3 py-2 text-muted-foreground">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* IMPORTANT: multi-lot rule */}
      <div className="flex gap-3 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
            {isPT ? 'IMPORTANTE — Vendas com múltiplos lotes FIFO' : 'IMPORTANT — Sales with multiple FIFO lots'}
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {isPT
              ? 'Se uma venda consumiu vários lotes FIFO (comprados em datas diferentes), deverá preencher '
              : 'If a sale consumed multiple FIFO lots (purchased on different dates), you must fill in '}
            <strong>{isPT ? 'UMA LINHA POR LOTE' : 'ONE ROW PER LOT'}</strong>
            {isPT
              ? ' no Quadro 9.2. Distribua o valor de realização proporcionalmente pela quantidade de cada lote.'
              : ' in Quadro 9.2. Distribute the realisation value proportionally by the quantity per lot.'}
          </p>
        </div>
      </div>

      {/* Step 17 */}
      <div className="flex gap-2">
        <span className="font-bold text-primary shrink-0">17.</span>
        <span className="text-muted-foreground">
          {isPT
            ? 'Os valores a usar encontram-se na tabela "Valores para inserir" no topo desta página.'
            : 'The values to use are shown in the "Values to enter" table at the top of this page.'}
        </span>
      </div>
    </div>
  );

  const step1Body = (
    <div className="space-y-3 text-sm">
      <ol className="space-y-3 list-none">
        <li className="flex gap-2">
          <span className="font-bold text-primary shrink-0">1.</span>
          <span>
            {isPT ? 'Aceda a ' : 'Go to '}
            <a href="https://www.portaldasfinancas.gov.pt" target="_blank" rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:opacity-80 font-medium">
              portaldasfinancas.gov.pt
            </a>
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary shrink-0">2.</span>
          <span>
            {isPT
              ? 'Autentique-se com o seu NIF e senha — ou use '
              : 'Log in with your NIF and password — or use '}
            <span className="inline-flex gap-1 flex-wrap">
              <span className="px-1.5 py-0.5 rounded bg-muted border text-xs font-medium">Chave Móvel Digital</span>
              <span className="text-muted-foreground">/</span>
              <span className="px-1.5 py-0.5 rounded bg-muted border text-xs font-medium">Cartão de Cidadão</span>
            </span>
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary shrink-0">3.</span>
          <div className="flex flex-col gap-1.5">
            <span>{isPT ? 'No menu, navegue até:' : 'In the menu, navigate to:'}</span>
            <div className="flex items-center gap-1 flex-wrap text-xs">
              {(isPT
                ? ['Cidadãos', 'Situação Fiscal', 'IRS', 'Entregar Declaração Modelo 3']
                : ['Cidadãos', 'Situação Fiscal', 'IRS', 'Entregar Declaração Modelo 3']
              ).map((step, i, arr) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 font-medium text-primary">{step}</span>
                  {i < arr.length - 1 && <span className="text-muted-foreground">→</span>}
                </span>
              ))}
            </div>
          </div>
        </li>
      </ol>
    </div>
  );

  const step2Body = (
    <div className="space-y-3 text-sm">
      <ol className="space-y-3 list-none">
        <li className="flex gap-2">
          <span className="font-bold text-primary shrink-0">4.</span>
          <span>
            {isPT ? 'Selecione o ano fiscal: ' : 'Select fiscal year: '}
            <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 font-bold text-primary">{summary.fiscalYear}</span>
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary shrink-0">5.</span>
          <span>
            {isPT
              ? 'Se tiver uma declaração pré-preenchida, escolha '
              : 'If you have a pre-filled declaration, choose '}
            <span className="px-1.5 py-0.5 rounded bg-muted border text-xs font-medium">
              {isPT ? 'Confirmar dados automáticos' : 'Confirm automatic data'}
            </span>
            {isPT ? ' e avance — ou escolha ' : ' and proceed — or choose '}
            <span className="px-1.5 py-0.5 rounded bg-muted border text-xs font-medium">
              {isPT ? 'Nova declaração' : 'New declaration'}
            </span>
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary shrink-0">6.</span>
          <span>{isPT ? 'Na página inicial da declaração, confirme a identificação do titular.' : 'On the declaration home page, confirm the holder\'s identification.'}</span>
        </li>
      </ol>
    </div>
  );

  const step3Body = (
    <div className="space-y-3 text-sm">
      <ol className="space-y-3 list-none">
        <li className="flex gap-2">
          <span className="font-bold text-primary shrink-0">7.</span>
          <span>
            {isPT ? 'No separador ' : 'In the '}
            <span className="px-1.5 py-0.5 rounded bg-muted border text-xs font-medium">{isPT ? 'Anexos' : 'Annexes'}</span>
            {isPT ? ', clique em ' : ' tab, click '}
            <span className="px-1.5 py-0.5 rounded bg-muted border text-xs font-medium">{isPT ? 'Adicionar Anexo' : 'Add Annex'}</span>
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary shrink-0">8.</span>
          <div className="space-y-2 flex-1">
            <span>
              {isPT ? 'Selecione ' : 'Select '}
              <span className="px-1.5 py-0.5 rounded bg-muted border text-xs font-medium">Anexo J — {isPT ? 'Rendimentos Obtidos no Estrangeiro' : 'Income Obtained Abroad'}</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex gap-2 p-2.5 rounded-lg bg-green-500/10 border border-green-500/30">
                <span className="text-green-600 dark:text-green-400 font-bold shrink-0">✓</span>
                <span className="text-xs text-green-800 dark:text-green-300">
                  <strong>Anexo J</strong> — {isPT ? 'rendimentos de fonte estrangeira (DeGiro / Trade Republic)' : 'foreign-source income (DeGiro / Trade Republic)'}
                </span>
              </div>
              <div className="flex gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30">
                <span className="text-red-600 dark:text-red-400 font-bold shrink-0">✗</span>
                <span className="text-xs text-red-800 dark:text-red-300">
                  <strong>Anexo G</strong> — {isPT ? 'apenas para fonte portuguesa' : 'Portuguese-source only'}
                </span>
              </div>
            </div>
          </div>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary shrink-0">9.</span>
          <span>{isPT ? 'Se declarar em conjunto, adicione um Anexo J por titular que tenha tido vendas.' : 'If filing jointly, add one Annex J per holder who had sales.'}</span>
        </li>
      </ol>
    </div>
  );

  const step4Body = (
    <div className="space-y-3 text-sm">
      <ol className="space-y-3 list-none">
        <li className="flex gap-2">
          <span className="font-bold text-primary shrink-0">10.</span>
          <div className="flex-1 space-y-2">
            <span>{isPT ? 'No Quadro 4 do Anexo J, indique o país de residência do intermediário financeiro. Use um Anexo J separado por broker se tiver contas em ambos:' : 'In Quadro 4 of Annex J, indicate the country of residence of the financial intermediary. Use a separate Annex J per broker if you have accounts with both:'}</span>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{isPT ? 'Broker' : 'Broker'}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{isPT ? 'País (Quadro 4)' : 'Country (Quadro 4)'}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{isPT ? 'Entidade' : 'Entity'}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-muted/10">
                    <td className="px-3 py-2 font-semibold">DeGiro</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 font-bold text-blue-700 dark:text-blue-300 text-sm">NL</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">DeGiro B.V. — {isPT ? 'Países Baixos' : 'Netherlands'}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold">Trade Republic</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 font-bold text-blue-700 dark:text-blue-300 text-sm">DE</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">Trade Republic Bank GmbH — {isPT ? 'Alemanha' : 'Germany'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary shrink-0">11.</span>
          <span>{isPT ? 'Indique o NIF do intermediário (se disponível no relatório anual do broker). Pode deixar em branco se não tiver.' : 'Indicate the intermediary\'s NIF/tax ID (if available in your annual broker report). Leave blank if unavailable.'}</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold text-primary shrink-0">12.</span>
          <span>{isPT ? 'Para ações americanas e ETFs irlandeses, a opção de mercados regulamentados portugueses não se aplica.' : 'For US stocks and Irish ETFs, the Portuguese regulated markets option does not apply.'}</span>
        </li>
      </ol>
    </div>
  );

  const step6Body = (
    <div className="space-y-4 text-sm">
      <div className="flex gap-2">
        <span className="font-bold text-primary shrink-0">18.</span>
        <span>{isPT ? 'No Quadro 14 do Anexo J, indique o método de tributação:' : 'In Quadro 14 of Annex J, indicate your tax method:'}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 rounded-lg border-2 border-muted bg-muted/10 space-y-1.5">
          <div className="font-semibold flex items-center gap-2">
            <span className="text-base">A</span>
            <span>{isPT ? 'Taxa autónoma (28%)' : 'Autonomous rate (28%)'}</span>
            <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted border">{isPT ? 'padrão' : 'default'}</span>
          </div>
          <p className="text-xs text-muted-foreground">{isPT ? 'Mais-valias tributadas à taxa fixa de 28%, isoladas dos restantes rendimentos.' : 'Capital gains taxed at a flat 28%, isolated from other income.'}</p>
        </div>
        <div className="p-3 rounded-lg border-2 border-muted bg-muted/10 space-y-1.5">
          <div className="font-semibold flex items-center gap-2">
            <span className="text-base">B</span>
            <span>Englobamento</span>
          </div>
          <p className="text-xs text-muted-foreground">{isPT ? 'Mais-valias somadas ao rendimento total, sujeitas às taxas progressivas (12,5%–48%). Pode ser vantajoso em escalões baixos.' : 'Gains added to total income, subject to progressive rates (12.5%–48%). May be favourable in lower brackets.'}</p>
        </div>
      </div>
      <div className="flex gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
        <span className="text-primary font-bold shrink-0">→</span>
        <span>{isPT ? 'Se optar por englobamento, marque ' : 'If choosing englobamento, mark '}
          <span className="px-1.5 py-0.5 rounded bg-muted border text-xs font-bold">S</span>
          {isPT ? ' no campo "Opta pelo englobamento?" do Quadro 14.' : ' in the "Opta pelo englobamento?" field in Quadro 14.'}
        </span>
      </div>
      <div className="flex gap-2">
        <span className="font-bold text-primary shrink-0">19.</span>
        <div className="flex gap-2 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 flex-1">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-800 dark:text-amber-300 text-xs uppercase tracking-wide">
              {isPT ? 'Nota: IRS Jovem' : 'Note: IRS Jovem'}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {isPT
                ? 'O regime IRS Jovem aplica-se EXCLUSIVAMENTE a Cat. A e B (trabalho). NÃO se aplica a mais-valias de ações/ETF (Cat. G — Anexo J).'
                : 'IRS Jovem applies EXCLUSIVELY to Cat. A & B (employment). Does NOT apply to capital gains from stocks/ETFs (Cat. G — Annex J).'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const checklistItems = isPT
    ? [
        `Quadro 4: país do intermediário = NL (DeGiro) ou DE (Trade Republic)`,
        `Quadro 9.2: uma linha por lote FIFO, por cada venda ocorrida em ${summary.fiscalYear}`,
        `Valores de realização e aquisição em EUR (usar os valores da tabela acima)`,
        `Quadro 14: método de tributação escolhido (autónoma ou englobamento)`,
        `Declaração validada sem erros`,
        `Comprovativo de submissão guardado`,
      ]
    : [
        `Quadro 4: intermediary country = NL (DeGiro) or DE (Trade Republic)`,
        `Quadro 9.2: one row per FIFO lot, for each sale in ${summary.fiscalYear}`,
        `Realisation and acquisition values in EUR (use values from the table above)`,
        `Quadro 14: tax method chosen (autonomous or englobamento)`,
        `Declaration validated with no errors`,
        `Submission receipt saved`,
      ];

  const step7Body = (
    <div className="space-y-4 text-sm">
      <ol className="space-y-2 list-none">
        {(isPT
          ? [
              'Após preencher todos os campos, clique em "Validar" no topo da declaração.',
              'Corrija quaisquer erros assinalados pelo sistema.',
              'Reveja o resumo da liquidação para confirmar que o imposto calculado corresponde ao esperado.',
              'Clique em "Submeter" e guarde o comprovativo (PDF) para os seus registos.',
            ]
          : [
              'After filling in all fields, click "Validate" at the top of the declaration.',
              'Correct any errors flagged by the system.',
              'Review the liquidation summary to confirm the calculated tax matches expectations.',
              'Click "Submit" and save the receipt (PDF) for your records.',
            ]
        ).map((text, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-bold text-primary shrink-0">{20 + i}.</span>
            <span>{text}</span>
          </li>
        ))}
      </ol>
      <div className="rounded-lg border border-green-500/40 bg-green-500/5 overflow-hidden">
        <div className="px-3 py-2 bg-green-500/10 border-b border-green-500/30">
          <span className="text-xs font-bold uppercase tracking-wide text-green-700 dark:text-green-400">
            ✔ {isPT ? 'Checklist final' : 'Final checklist'}
          </span>
        </div>
        <ul className="divide-y divide-green-500/10">
          {checklistItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 px-3 py-2">
              <span className="mt-0.5 w-4 h-4 shrink-0 rounded border-2 border-green-500/50" />
              <span className="text-xs text-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const guideSteps: { title: string; body: string | ReactNode }[] = [
    { title: t.guideStep1Title, body: step1Body },
    { title: t.guideStep2Title, body: step2Body },
    { title: t.guideStep3Title, body: step3Body },
    { title: t.guideStep4Title, body: step4Body },
    { title: t.guideStep5Title, body: step5Body },
    { title: t.guideStep6Title, body: step6Body },
    { title: t.guideStep7Title, body: step7Body },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t.guideTitle}</h2>
        <p className="text-muted-foreground mt-1">{t.guideSubtitle}</p>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 text-sm p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        {t.guideDisclaimer}
      </div>

      {/* Multiple lots note */}
      {hasMultipleLots && (
        <div className="flex items-start gap-2 text-sm p-3 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {t.guideMultipleLotsNote}
        </div>
      )}

      {/* Quick reference filing table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h3 className="font-semibold">{t.guideFilingTable}</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 cursor-pointer select-none">
              <Switch
                id="simplified-toggle"
                checked={simplified}
                onCheckedChange={setSimplified}
              />
              <Label htmlFor="simplified-toggle" className="text-sm font-medium cursor-pointer">
                {t.guideSimplifyToggle}
              </Label>
              {simplified && (
                <span className="text-xs text-muted-foreground">
                  {t.guideSimplifyRows(simplifiedFilingRows.length)}{' '}
                  {t.guideDetailedRows(allFilingRows.length)}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openPdfReport(summary, lang)}
              className="gap-1 print:hidden"
            >
              <FileDown className="w-3.5 h-3.5" />
              {t.exportPDF}
            </Button>

          </div>
        </div>
        {simplified && (
          <div className="flex items-start gap-2 text-xs p-3 rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {t.guideSimplifyNote}
          </div>
        )}
        <div className="overflow-x-auto rounded-xl border print:border-black">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{t.guideColCountry}</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{t.guideColISIN}</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{t.guideColDesc}</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{t.guideColAcqDate}</th>
                <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{t.guideColSaleDate}</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">{t.guideColRealization}</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">{t.guideColAcqCost}</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">{t.guideColGain}</th>
                <th className="px-3 py-2 text-right font-medium whitespace-nowrap">{t.resultsLotQty}</th>
              </tr>
            </thead>
            <tbody>
              {filingRows.map((row, idx) => (
                <tr key={idx} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 font-semibold">{row.countryCode}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.isin}</td>
                  <td className="px-3 py-2 max-w-[140px] truncate" title={row.product}>
                    {row.product}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.acquisitionDate)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.saleDate)}</td>
                  <CopyCell value={row.realizationValue.toFixed(2)} />
                  <CopyCell value={row.acquisitionCost.toFixed(2)} />
                  <td
                    className={cn(
                      'px-3 py-2 text-right font-semibold',
                      row.rawGain >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {formatEUR(row.rawGain)}
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{row.quantityMatched}</td>
                </tr>
              ))}
            </tbody>
            {/* Footer totals */}
            <tfoot>
              <tr className="border-t bg-muted/40 font-semibold">
                <td colSpan={5} className="px-3 py-2">
                  Total
                </td>
                <td className="px-3 py-2 text-right">
                  {filingRows.reduce((s, r) => s + r.realizationValue, 0).toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right">
                  {filingRows.reduce((s, r) => s + r.acquisitionCost, 0).toFixed(2)}
                </td>
                <td
                  className={cn(
                    'px-3 py-2 text-right',
                    filingRows.reduce((s, r) => s + r.rawGain, 0) >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {formatEUR(filingRows.reduce((s, r) => s + r.rawGain, 0))}
                </td>
                <td className="px-3 py-2 text-right">
                  {filingRows.reduce((s, r) => s + r.quantityMatched, 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          💡 {lang === 'pt' ? 'Passe o cursor sobre os valores para os copiar directamente para a área de transferência.' : 'Hover over values to copy them directly to clipboard.'}
        </p>
      </div>

      {/* Step-by-step accordion */}
      <div className="space-y-2">
        {guideSteps.map((step, idx) => (
          <GuideAccordion
            key={idx}
            stepNumber={idx + 1}
            title={step.title}
            body={step.body}
            defaultOpen={idx === 0}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between print:hidden">
        <Button variant="outline" onClick={onBack}>
          {t.back}
        </Button>
        <Button variant="outline" onClick={onRestart}>
          {t.restart}
        </Button>
      </div>
    </div>
  );
}
