# IRS Calculator — Mais-valias de ativos mobiliários

A privacy-first web tool for Portuguese tax residents to calculate capital gains tax (Categoria G) from DeGiro and Trade Republic broker accounts, and generate a step-by-step guide to fill in **Anexo J** of the Modelo 3 IRS declaration.

> **Aviso / Disclaimer:** Este projeto é para fins informativos. Confirme sempre os valores com um contabilista certificado (TOC/ROC) antes de submeter a sua declaração.

---

## Features

- **FIFO calculation** — automatic lot matching per CIRS art. 43
- **Holding-period reductions** — applies OE2024 exclusion tiers (5–10+ year assets)
- **Prior year loss carryforward** — deduct accumulated losses from previous years
- **Englobamento comparison** — compares autonomous 28% rate vs progressive aggregation, with IRS Jovem exemption support
- **Multi-year comparison** — view capital gains/tax across all years in your file
- **Step-by-step Anexo J guide** — interactive filing instructions with a copy-to-clipboard table of values to enter in Portal das Finanças
- **PDF export** — generates a printable tax report (no external server)
- **Bilingual** — Portuguese 🇵🇹 and English 🇬🇧
- **Dark mode**
- **100% local** — no data is ever uploaded or sent anywhere

---

## Supported Brokers

| Broker | Format | Notes |
|--------|--------|-------|
| **DeGiro** | CSV (`Conta_...csv`) | Export from Account → Activity |
| **Trade Republic** | PDF (Account Statement) | Export from app → Documents |

Multiple files from different brokers can be uploaded simultaneously and are merged automatically.

---

## Tech Stack

- **React 19** + **TypeScript ~5.9**
- **Vite 7**
- **Tailwind CSS v4**
- **shadcn/ui** component library
- **pdfjs-dist** — PDF parsing (Trade Republic)

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

---

## How It Works

1. **Upload** — Drop your DeGiro CSV and/or Trade Republic PDF
2. **Review** — Inspect parsed transactions, split events and warnings
3. **Results** — View FIFO-calculated capital gains, tax estimates, englobamento comparison and multi-year breakdown
4. **Guide** — Get a step-by-step walkthrough to fill in Quadro 9.2 of Anexo J, with a pre-filled table of values to copy directly into Portal das Finanças

---

## File Privacy

All parsing and calculation runs entirely in the browser. No files or personal data leave your device.

---

## Project Structure

```
src/
├── components/
│   ├── steps/          # Wizard steps (Upload, Review, Results, Guide)
│   └── ui/             # Reusable UI components (shadcn + custom)
├── lib/
│   ├── brokerParser.ts         # Broker format detection & routing
│   ├── csvParser.ts            # DeGiro CSV parser
│   ├── tradeRepublicParser.ts  # Trade Republic PDF parser
│   ├── fifoCalculator.ts       # FIFO lot matching engine
│   ├── taxCalculator.ts        # Tax summary & englobamento comparison
│   ├── pdfReport.ts            # HTML print report generator
│   └── i18n.tsx                # PT/EN translations
└── types/
    └── transaction.ts          # Shared TypeScript types
```

---

## License

Private repository — all rights reserved.


The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
