# Crypto Benchmark V2 Report

## Protocol (performPQUpgrade)
- Cold Start (mean): 27.85 ms
- Warm (median): 19.40 ms
- Warm (p95): 48.90 ms
- Success Rate: 100.00%

## ML-KEM-768
- Encap (median): 0.30 ms
- Decap (median): 0.30 ms

## Negative Security Tests
- ephemeralKeyUniqueness: PASS
- aesBitFlip: PASS
- aesWrongTag: PASS
- aesWrongKey: PASS
- hmacModified: PASS
- hkdfDifferentSecret: FAIL
