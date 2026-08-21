import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rateLimit';

export const dynamic = 'force-dynamic';

export interface StrategyCatalogItem {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  belief_plain: string;
  version: string;
  thesis: string;
  tags: string[];
  group: string;
  archetype: string;
  archetype_label: string;
  sub_style: string;
  sub_style_label: string;
  asset_classes: string[];
  asset_scope: string;
  assets: string[];
  direction: 'long_short' | 'long_only' | 'short_only';
  risk_level: 'conservative' | 'moderate' | 'aggressive';
  tier: string;
  leverage_max: number;
  time_horizon: string;
  cadence_seconds: number;
  min_budget: number;
  instance_count: number;
  funding_split: number[];
  max_slots: number;
  sectionIndex?: number;
  sectionName?: string;
}

// 5 Section categories matching the study
const SECTION_NAMES = [
  'Breakout Strikers & Core Majors',
  'Microstructure & Carry',
  'Macro Thematic & Cross-Asset',
  'Single-Asset Alpha & Commodities',
  'Whales & Copy Mirrors',
];

export async function GET(req: NextRequest) {
  const rate = checkRateLimit(req, { limit: 120, windowMs: 60000 });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfter);

  try {
    const filePath = path.join(process.cwd(), 'skills', 'senpi=staregies', 'catalog.json');
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ success: false, error: 'catalog.json not found' }, { status: 404 });
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);

    const rawSkills = Array.isArray(data.skills) ? data.skills : [];

    // Assign 5 sections (approx 20 per section)
    const chunkSize = Math.ceil(rawSkills.length / 5);
    const enrichedSkills: StrategyCatalogItem[] = rawSkills.map((s: any, idx: number) => {
      const sectionIndex = Math.min(Math.floor(idx / chunkSize), 4);
      return {
        ...s,
        sectionIndex,
        sectionName: SECTION_NAMES[sectionIndex],
      };
    });

    return NextResponse.json({
      success: true,
      count: enrichedSkills.length,
      sections: SECTION_NAMES,
      strategies: enrichedSkills,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
