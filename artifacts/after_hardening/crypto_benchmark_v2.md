# Crypto Benchmark V2 Report

## Protocol (performPQUpgrade)
- Cold Start (mean): 45.62 ms
- Warm (median): 25.60 ms
- Warm (p95): 49.80 ms
- Success Rate: 100.00%

## ML-KEM-768
- Encap (median): 0.30 ms
- Decap (median): 0.40 ms

## Negative Security Tests
- ephemeralKeyUniqueness: PASS
- aesBitFlip: PASS
- aesWrongTag: PASS
- aesWrongKey: PASS
- hmacModified: PASS
- hkdfDifferentSecret: FAIL
