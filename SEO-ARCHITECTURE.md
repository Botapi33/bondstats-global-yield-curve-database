# SEO Architecture — Global Yield Curve Database

The database is designed to support a layered BondStats SEO structure.

## 1. Main live database

`/markets/global-yield-curve-database/`

## 2. Country / market pages

Examples:

- `/markets/yield-curves/united-states/`
- `/markets/yield-curves/germany/`
- `/markets/yield-curves/euro-area/`
- `/markets/yield-curves/japan/`
- `/markets/yield-curves/united-kingdom/`
- `/markets/yield-curves/canada/`
- `/markets/yield-curves/australia/`

Each page should contain a live current curve plus substantial evergreen text specific to that sovereign market.

## 3. Historical archive pages

Examples:

- `/markets/yield-curves/united-states/history/`
- `/markets/yield-curves/germany/history/`
- `/markets/yield-curves/japan/history/`

## 4. Year pages

The Action generates available years in `data/seo-manifest.json`.

Examples:

- `/markets/yield-curves/united-states/2026/`
- `/markets/yield-curves/united-states/2022/`
- `/markets/yield-curves/japan/1998/`

Year pages should contain annual curve summaries, representative dates, inversion/steepness statistics and links into the interactive database. Do not generate one thin SEO page for every trading day.

## 5. High-value historical context pages

Later editorial pages can target events such as:

- U.S. yield curve during the 2008 crisis
- U.S. yield curve inversion in 2019
- U.S. yield curve inversion in 2022–2023
- German yield curve during the negative-yield era
- Japan yield curve during yield-curve control
- UK gilt curve during the 2022 LDI crisis

This gives BondStats a combination of live utility, historical data and evergreen search demand.
