# Data Sources

## United States
U.S. Department of the Treasury Daily Treasury Par Yield Curve Rates, obtained directly from the Treasury's official XML feed and archive. The adapter uses 1M, 3M, 6M, 1Y, 2Y, 3Y, 5Y, 7Y, 10Y, 20Y and 30Y maturities where published.

This replaces the earlier FRED relay so BondStats receives the U.S. sovereign curve directly from the original government publisher.

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
