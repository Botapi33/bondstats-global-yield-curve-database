# Data Sources

## United States
Federal Reserve H.15 constant-maturity Treasury series via FRED graph CSV. The source series are DGS1MO, DGS3MO, DGS6MO, DGS1, DGS2, DGS3, DGS5, DGS7, DGS10, DGS20 and DGS30.

## Germany
Deutsche Bundesbank SDMX Web Service. Daily Svensson-model yield-curve series for listed Federal securities, using residual maturities from six months through thirty years.

## Euro Area
ECB Data Portal `YC` dataset. The V1 adapter uses the all-rated euro government bond nominal par-yield curve (`G_N_C`) with Svensson-model par-yield maturities.

## Japan
Japan Ministry of Finance constant-maturity JGB interest-rate CSV. The official historical file begins in 1974 and contains maturities from 1Y through 40Y.

## United Kingdom
Bank of England nominal par-yield series for British government securities: 5Y, 10Y and 20Y.

## Canada
Bank of Canada Valet API benchmark Government of Canada yields: 2Y, 3Y, 5Y, 7Y, 10Y and long-term.

## Australia
Reserve Bank of Australia statistical table F2, Capital Market Yields — Government Bonds. V1 uses Australian Government 2Y, 3Y, 5Y and 10Y yields.

## Important comparability note
The database preserves each official source's published curve concept. Different jurisdictions do not necessarily use identical construction methods. Some are modeled constant-maturity/par curves, while others are selected benchmark yields. The UI and later BondStats SEO pages should disclose this distinction rather than implying perfect cross-country methodological equivalence.
