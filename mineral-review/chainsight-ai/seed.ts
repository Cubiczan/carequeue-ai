import { db } from './src/lib/db'

const MANTLE_ADDRESSES = [
  '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  '0xEf1c6E67703c7BD7107eed8303Fbe6EC2554BF6B',
  '0xDEF1ABE...d22C1e',
  '0x1111111254EEB25477B68fb85Ed929f73A960582',
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
]

const WHALE_ADDRESSES = [
  '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8',
  '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B',
  '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  '0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552',
]

const TOKENS = ['MNT', 'USDC', 'USDT', 'WETH', 'WBTC', 'mETH', 'USDY']
const DEXS = ['merchant_moe', 'agni_finance', 'fluxion']
const TX_TYPES = ['swap', 'transfer', 'flash_loan', 'liquidity', 'bridge']
const ANOMALY_TYPES = ['flash_loan', 'sandwich_attack', 'whale_accumulation', 'wash_trading', 'unusual_volume', 'mev_extraction']

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomAddress(): string {
  return '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

function randomTxHash(): string {
  return '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
}

async function seed() {
  console.log('🌱 Seeding database...')

  // Seed monitored addresses
  for (let i = 0; i < WHALE_ADDRESSES.length; i++) {
    await db.monitoredAddress.upsert({
      where: { address: WHALE_ADDRESSES[i] },
      update: {},
      create: {
        address: WHALE_ADDRESSES[i],
        label: i < 3 ? 'Mega Whale' : i < 5 ? 'Active Trader' : 'Smart Contract',
        type: i < 3 ? 'whale' : i < 5 ? 'mev_bot' : 'contract',
        riskScore: Math.floor(randomBetween(10, 85)),
      },
    })
  }
  console.log('✅ Monitored addresses seeded')

  // Seed transactions
  const now = Date.now()
  for (let i = 0; i < 200; i++) {
    const timestamp = new Date(now - randomBetween(0, 72 * 60 * 60 * 1000))
    const amount = randomBetween(0.1, 5000)
    const fromAddr = Math.random() > 0.3 ? randomFrom(WHALE_ADDRESSES) : randomAddress()
    const toAddr = randomFrom(MANTLE_ADDRESSES)
    const token = randomFrom(TOKENS)
    const usdValue = token === 'WBTC' ? amount * 65000 : token === 'WETH' ? amount * 3500 : amount

    try {
      await db.onchainTransaction.create({
        data: {
          txHash: randomTxHash(),
          blockNumber: Math.floor(now / 1000) - Math.floor(randomBetween(0, 50000)),
          fromAddress: fromAddr,
          toAddress: toAddr,
          token,
          amount: Math.round(amount * 1000) / 1000,
          usdValue: Math.round(usdValue * 100) / 100,
          dex: randomFrom(DEXS),
          txType: randomFrom(TX_TYPES),
          gasUsed: Math.round(randomBetween(21000, 500000) * 100) / 100,
          timestamp,
        },
      })
    } catch {
      // skip duplicates
    }
  }
  console.log('✅ Transactions seeded')

  // Seed anomalies
  const allTxs = await db.onchainTransaction.findMany({ take: 50 })
  for (let i = 0; i < 30; i++) {
    const tx = randomFrom(allTxs)
    const type = randomFrom(ANOMALY_TYPES)
    const severity = randomFrom(['low', 'medium', 'high', 'critical'])

    const descriptions: Record<string, string> = {
      flash_loan: `Flash loan of ${tx.amount.toLocaleString()} ${tx.token} ($${tx.usdValue.toLocaleString()}) detected from ${tx.fromAddress.slice(0, 10)}... executed via ${tx.dex}. Loan was borrowed and repaid within a single block.`,
      sandwich_attack: `Potential sandwich attack detected on ${tx.dex}. Transaction ${tx.txHash.slice(0, 10)}... shows front-running behavior with ${tx.token} swap of $${tx.usdValue.toLocaleString()}. Estimated profit extraction: ~$${(tx.usdValue * 0.003).toFixed(2)}.`,
      whale_accumulation: `Whale address ${tx.fromAddress.slice(0, 10)}... accumulated an additional ${tx.amount.toLocaleString()} ${tx.token} ($${tx.usdValue.toLocaleString()}) through ${tx.txType} on ${tx.dex}. 24h total accumulation: $${(tx.usdValue * randomBetween(2, 15)).toFixed(0)}.`,
      wash_trading: `Suspicious wash trading pattern detected on ${tx.dex}. Multiple rapid ${tx.token} trades between related addresses showing consistent price impact. Volume: $${(tx.usdValue * randomBetween(5, 20)).toFixed(0)} in 10 minutes.`,
      unusual_volume: `Unusual trading volume spike on ${tx.dex} for ${tx.token}. 1h volume is ${(randomBetween(300, 2000)).toFixed(0)}% above 24h average. Multiple large transactions detected within short timeframe.`,
      mev_extraction: `MEV bot extraction detected. Transaction ${tx.txHash.slice(0, 10)}... extracted approximately $${(tx.usdValue * 0.005).toFixed(2)} through arbitrage between ${tx.dex} pools. Gas priority: ${(randomBetween(2, 50)).toFixed(1)} Gwei above base.`,
    }

    try {
      const anomaly = await db.anomaly.create({
        data: {
          txId: tx.id,
          txHash: tx.txHash,
          type,
          severity,
          confidence: Math.round(randomBetween(0.6, 0.99) * 100) / 100,
          description: descriptions[type] || `Anomalous ${tx.txType} activity detected.`,
          metadata: JSON.stringify({
            dex: tx.dex,
            token: tx.token,
            amount: tx.amount,
            usdValue: tx.usdValue,
            fromAddress: tx.fromAddress,
          }),
        },
      })

      // Create alert for each anomaly
      await db.alert.create({
        data: {
          anomalyId: anomaly.id,
          title: `${severity.toUpperCase()}: ${type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Detected`,
          message: `${descriptions[type].slice(0, 120)}...`,
          severity,
          isRead: Math.random() > 0.6,
        },
      })
    } catch {
      // skip duplicates
    }
  }
  console.log('✅ Anomalies and alerts seeded')

  // Seed some AI analyses
  const anomalies = await db.anomaly.findMany({ where: { isAnalyzed: false }, take: 8 })
  for (const anomaly of anomalies) {
    const riskLevels = ['low', 'medium', 'high', 'critical']
    const riskLevel = anomaly.severity === 'critical' ? 'critical' : anomaly.severity === 'high' ? 'high' : randomFrom(riskLevels.slice(0, 2))

    const recommendations: Record<string, string> = {
      low: 'Monitor this address for further activity. No immediate action required.',
      medium: 'Consider adding this address to your watchlist. The pattern may escalate.',
      high: 'Recommended to set price alerts and monitor related tokens. This could signal a larger move.',
      critical: 'Immediate attention required. This pattern is consistent with exploitative behavior. Consider reducing exposure to affected pools.',
    }

    await db.aIAnalysis.create({
      data: {
        anomalyId: anomaly.id,
        summary: `This ${anomaly.type.replace(/_/g, ' ')} event on ${anomaly.description.match(/via (\w+)/)?.[1] || 'Mantle'} shows a confidence score of ${(anomaly.confidence * 100).toFixed(0)}%. The transaction originated from ${anomaly.description.match(/0x[0-9a-f]{10}/)?.[0] || 'an address'} with a total value of ${anomaly.description.match(/\$[\d,]+/)?.[0] || 'N/A'}. Pattern analysis suggests this could be part of a coordinated strategy given the timing and execution characteristics.`,
        riskLevel,
        recommendation: recommendations[riskLevel],
        rawResponse: JSON.stringify({
          model: 'chainsight-ai-v1',
          tokens: Math.floor(randomBetween(150, 500)),
          processingTime: `${randomBetween(0.5, 3).toFixed(1)}s`,
        }),
      },
    })

    await db.anomaly.update({
      where: { id: anomaly.id },
      data: { isAnalyzed: true, analyzedAt: new Date() },
    })
  }
  console.log('✅ AI analyses seeded')

  console.log('\n🎉 Database seeded successfully!')
}

seed().catch(console.error)
