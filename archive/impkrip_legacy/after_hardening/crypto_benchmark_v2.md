# Crypto Benchmark V2 Report

## Protocol (performPQUpgrade - 0ms Latency)
- Cold Start (mean): 5.12 ms
- Warm (median): 34.65 ms
- Warm (p95): 50.20 ms
- Success Rate: 100.00%

## Protocol (performPQUpgrade - 5ms Latency)
- Warm (median): 37.80 ms
- Warm (p95): 50.20 ms
- Success Rate: 100.00%

## ML-KEM-768
- Encap (median): 0.40 ms
- Decap (median): 0.40 ms

## Negative Security Tests
- ephemeralKeyUniqueness: PASS
- aesBitFlip: PASS
- aesWrongTag: PASS
- aesWrongKey: PASS
- hmacModified: PASS
- hkdfDifferentSecret: PASS
- hkdfDifferentClassical: PASS
- hkdfDifferentTranscript: PASS
- keysMatchPeers: PASS
- encAndConfirmKeysDiffer: PASS
