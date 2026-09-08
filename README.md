# BondStats Global Yield Curve Database

Standalone repository for the **Global Yield Curve Database / Curve Atlas**.

Recommended repository name:

`bondstats-global-yield-curve-database`

## What this is

A historical sovereign yield-curve database rather than another current-yield dashboard.

The standalone app supports:

- historical curve selection
- timeline playback
- ghost-curve comparison
- tenor table
- 2s10s / 5s30s diagnostics where the source curve supports them
- curve-shape classification
- source attribution
- archive-depth display

The UI deliberately uses a **Curve Atlas / archive terminal** visual system: a fixed market rail, one large curve board, a time-machine strip and a narrow curve-anatomy margin. It does not reuse the card/KPI engine of older BondStats tools.

## V1 live market coverage

1. United States
2. Germany
3. Euro Area
4. Japan
5. United Kingdom
6. Canada
7. Australia

The source architecture is modular so Switzerland, New Zealand, Sweden, Norway and additional sovereign curves can be added later without changing the UI.

## APIs / keys required

**No paid API and no API key are required for V1.**

The updater uses public official or central-bank endpoints:

- United States — U.S. Department of the Treasury Daily Treasury Par Yield Curve XML feed
- Germany — Deutsche Bundesbank SDMX REST API
- Euro Area — ECB Data Portal SDMX REST API
- Japan — Ministry of Finance historical JGB constant-maturity CSV
- United Kingdom — Bank of England database CSV interface
- Canada — Bank of Canada Valet API
- Australia — Reserve Bank of Australia F2 CSV

That means there are currently **no GitHub Secrets to configure**.

## GitHub Action

Workflow:

`.github/workflows/update-global-yield-curves.yml`

Schedule:

- 06:25 UTC on weekdays
- 18:25 UTC on weekdays
- manual `workflow_dispatch`

The updater is fail-soft by market. If one official source temporarily fails, the previous valid market file is retained and marked `stale` rather than destroying the database.

## Generated data

- `data/catalog.json`
- `data/markets/us.json`
- `data/markets/de.json`
- `data/markets/ea.json`
- `data/markets/jp.json`
- `data/markets/uk.json`
- `data/markets/ca.json`
- `data/markets/au.json`
- `data/seo-manifest.json`

## First run

After uploading to GitHub:

1. Create the workflow manually if GitHub hides the `.github/workflows` file during your upload workflow.
2. Open **Actions → Update Global Yield Curve Database**
3. Click **Run workflow**
4. Check `data/catalog.json`
5. At least four markets must contain observations for the Action validation step to pass.

## GitHub Pages

Settings → Pages:

- Deploy from branch
- `main`
- `/(root)`

Expected URL:

`https://botapi33.github.io/bondstats-global-yield-curve-database/`

The standalone page is `noindex`. The later BondStats pages should own SEO/canonical indexing.

## Later BondStats integration

Primary indexed hub:

`https://www.bondstats.org/markets/global-yield-curve-database/`

The repository also creates `data/seo-manifest.json` specifically so the later site patch can create real SEO pages without scraping the standalone UI.
