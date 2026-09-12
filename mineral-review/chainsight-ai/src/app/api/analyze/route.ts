import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { anomalyId } = body

    if (!anomalyId) {
      return NextResponse.json({ error: 'anomalyId is required' }, { status: 400 })
    }

    const anomaly = await db.anomaly.findUnique({
      where: { id: anomalyId },
    })

    if (!anomaly) {
      return NextResponse.json({ error: 'Anomaly not found' }, { status: 404 })
    }

    // Check if already analyzed
    const existingAnalysis = await db.aIAnalysis.findFirst({
      where: { anomalyId },
    })

    if (existingAnalysis) {
      return NextResponse.json({
        analysis: existingAnalysis,
        message: 'Anomaly already analyzed',
      })
    }

    // Use z-ai-web-dev-sdk for AI analysis
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are ChainSight AI, an expert on-chain analyst specializing in detecting and analyzing blockchain anomalies on the Mantle Network. Provide detailed risk assessments and actionable recommendations. Be specific about amounts, addresses, and patterns. Respond in plain text with clear sections: SUMMARY, RISK LEVEL (low/medium/high/critical), and RECOMMENDATION.',
        },
        {
          role: 'user',
          content: `Analyze this on-chain anomaly:\n\nType: ${anomaly.type}\nSeverity: ${anomaly.severity}\nConfidence: ${(anomaly.confidence * 100).toFixed(0)}%\nDescription: ${anomaly.description}\nMetadata: ${anomaly.metadata}\n\nProvide: 1) A brief summary 2) Risk level assessment 3) Actionable recommendation`,
        },
      ],
      temperature: 0.3,
    })

    const rawResponse = completion.choices?.[0]?.message?.content || 'Analysis unavailable'

    // Parse the response to extract risk level
    let riskLevel = anomaly.severity
    const riskMatch = rawResponse.match(/RISK LEVEL[:\s]*(low|medium|high|critical)/i)
    if (riskMatch) {
      riskLevel = riskMatch[1].toLowerCase()
    }

    // Extract summary and recommendation
    let summary = rawResponse
    let recommendation = ''

    const summaryMatch = rawResponse.match(/SUMMARY[:\s]*([\s\S]*?)(?=RISK LEVEL|$)/i)
    if (summaryMatch) {
      summary = summaryMatch[1].trim()
    }

    const recMatch = rawResponse.match(/RECOMMENDATION[:\s]*([\s\S]*?)$/i)
    if (recMatch) {
      recommendation = recMatch[1].trim()
    }

    // Create AI analysis record
    const analysis = await db.aIAnalysis.create({
      data: {
        anomalyId: anomaly.id,
        summary,
        riskLevel,
        recommendation,
        rawResponse,
      },
    })

    // Mark anomaly as analyzed
    await db.anomaly.update({
      where: { id: anomaly.id },
      data: { isAnalyzed: true, analyzedAt: new Date() },
    })

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Analyze API error:', error)
    return NextResponse.json({ error: 'Failed to analyze anomaly' }, { status: 500 })
  }
}
