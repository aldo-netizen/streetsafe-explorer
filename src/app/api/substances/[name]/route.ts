import { NextResponse } from 'next/server';
import { queryBatch } from '@/lib/db';

const DESCRIPTIONS: Record<string, string> = {
  fentanyl: 'A powerful synthetic opioid, 50–100x stronger than morphine. Frequently found as an adulterant in the illicit drug supply.',
  heroin: 'A semi-synthetic opioid derived from morphine. Often adulterated with fentanyl and other cutting agents.',
  xylazine: 'A veterinary sedative increasingly found in the illicit drug supply. Not reversed by naloxone and associated with severe skin wounds.',
  medetomidine: 'A veterinary sedative similar to xylazine. Emerging as an adulterant in the drug supply, particularly in the eastern US.',
  acetaminophen: 'An over-the-counter pain reliever commonly used as a cutting agent in pressed pills and powder drugs.',
  caffeine: 'A stimulant commonly used as a cutting agent to add bulk to drug products.',
  cocaine: 'A stimulant derived from the coca plant. Increasingly found contaminated with fentanyl.',
  methamphetamine: 'A potent synthetic stimulant. Sometimes found co-occurring with opioids in polysubstance samples.',
  '4-anpp': 'A precursor and metabolite of fentanyl. Its presence indicates fentanyl manufacturing or degradation.',
  'phenethyl 4-anpp': 'A fentanyl precursor/byproduct. Indicates illicit fentanyl synthesis.',
  diphenhydramine: 'An antihistamine (Benadryl) used as a cutting agent, particularly in heroin samples.',
  'dimethyl sulfone': 'An industrial solvent commonly used as an inert cutting agent to add bulk.',
  mannitol: 'A sugar alcohol used as a cutting agent, particularly in heroin and cocaine.',
  quinine: 'An antimalarial compound historically used to cut heroin due to its bitter taste.',
  levamisole: 'A veterinary dewormer frequently found as an adulterant in cocaine.',
  benzodiazepine: 'A class of sedatives (e.g., Xanax). Illicit benzodiazepines are increasingly found in the drug supply.',
  'para-fluorofentanyl': 'A fentanyl analogue with similar potency. Classified as a Schedule I substance.',
  progesterone: 'A hormone sometimes used as a cutting agent in illicit drugs.',
  estradiol: 'A hormone occasionally found as a cutting agent in drug samples.',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const substance = decodeURIComponent(name).toLowerCase();

    const [statsRows, totalRows, coRows] = await queryBatch([
      {
        sql: `SELECT sample_count FROM substance_stats WHERE substance = ?`,
        args: [substance],
      },
      {
        sql: `SELECT COUNT(*) as n FROM samples`,
        args: [],
      },
      {
        sql: `SELECT co_substance as substance, count FROM substance_cooccurrences WHERE substance = ? ORDER BY count DESC`,
        args: [substance],
      },
    ]);

    const sCount = Number(statsRows[0]?.sample_count ?? 0);
    const tCount = Number(totalRows[0]?.n ?? 0);
    const frequencyPct = tCount > 0 ? Math.round((sCount / tCount) * 1000) / 10 : 0;

    return NextResponse.json({
      substance,
      description: DESCRIPTIONS[substance] || null,
      frequency_pct: frequencyPct,
      sample_count: sCount,
      total_samples: tCount,
      co_occurrences: coRows,
    });
  } catch (e) {
    console.error('Substance API error:', e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
