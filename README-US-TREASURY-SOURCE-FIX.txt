Global Yield Curve Database — U.S. source hardening

The U.S. curve no longer uses FRED as an intermediary.
It now reads the official U.S. Treasury Daily Treasury Par Yield Curve XML feed
directly from home.treasury.gov.

Changed:
- scripts/update-yield-curves.mjs
- README.md
- DATA-SOURCES.md
