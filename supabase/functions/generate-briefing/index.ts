import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BRAND_CONTEXT: Record<string, string> = {
  'Thiocyn': 'Hair health brand. Key claim: body-own cysteine sulphoxide molecule (TCS). Personas: women 35-55 (hormonal hair loss), men 25-45 (pattern baldness), health-conscious 20-35. Tone: scientific authority, empathetic. No-gos: no "hair loss cure" claims, no before/after that feel exploitative. Key proof: clinically tested, no silicones, no parabens.',
  'Take A Shot': 'Premium sustainable sunglasses. 44,000+ customers. Bio-TR-90 frames + polarised lenses, min. 2-year guarantee. Audience: outdoor-active 30-38, conscious buyers. Tone: warm, real, no Hochglanz. No-gos: no mass-product feel, no exaggerated claims, sustainability not as marketing hammer.',
  'Dr. Severin': 'Science-backed skincare. Brand pillar: "Science you can feel". Audience: educated 35-55, evidence-driven. Tone: expert, precise, trustworthy. No-gos: no pseudo-science, no vague promises.',
  'Paigh': 'Premium bags/accessories. Audience: style-conscious urban professionals. Tone: understated status, quality-focused. No-gos: no loud luxury signalling.',
  'Wristr': 'Wrist accessories. Audience: style-aware men 25-40. Tone: confident, minimal. No-gos: no overpriced-luxury framing.',
  'Timber & John': 'Seasonal lifestyle brand. Tone: authentic, nature-inspired. No-gos: no generic outdoor clichés.',
};

const SYSTEM_PROMPT = `You are a senior marketing strategist at Hartlimes GmbH, a holding company with 6 D2C brands. Your job is to turn vague raw tasks into production-ready briefings that an intern or freelancer can execute immediately without asking questions.

You use Signal Encoding to structure every task:
- M (Mission): Why does this task exist? Bigger picture context.
- G (Goal): What does measurable success look like?
- T (Task): Exactly what gets produced?
- F (Format): Channel, medium, length, structure.
- W (Weight): Priority, effort, timeline.

Output ONLY valid Markdown. No preamble. No "Here is your briefing". Start directly with the briefing.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { brand, task_raw, assignee, deadline, context } = await req.json();

    if (!brand || !task_raw) {
      return new Response(JSON.stringify({ error: 'brand and task_raw are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const brandCtx = BRAND_CONTEXT[brand] || `Brand: ${brand}`;
    const today = new Date().toISOString().split('T')[0];

    const userPrompt = `Generate a production-ready intern briefing.

RAW TASK: "${task_raw}"
BRAND: ${brand}
BRAND CONTEXT: ${brandCtx}
${assignee ? `ASSIGNEE: ${assignee}` : ''}
${deadline ? `DEADLINE: ${deadline}` : ''}
${context ? `ADDITIONAL CONTEXT: ${context}` : ''}
TODAY: ${today}

Output this exact structure in Markdown:

# Briefing: [short task name]

**Brand:** ${brand}
**Erstellt:** ${today}
**Assignee:** ${assignee || 'TBD'}
**Deadline:** ${deadline || '⚠️ offen'}
**Routing:** [which specialist handles next — UGC/Creative/Copy/Outreach]

---

## Signal

| Dimension | Inhalt |
|-----------|--------|
| **M — Mission** | [why this task exists] |
| **G — Goal** | [measurable success criterion] |
| **T — Task** | [exactly what gets produced] |
| **F — Format** | [channel / medium / length / structure] |
| **W — Weight** | [priority / effort / who does it] |

---

## Was zu liefern ist

[2-3 sentences. Zero ambiguity. Intern can start immediately.]

**Anzahl:** [X pieces / variants]
**Format:** [file format, platform, dimensions if relevant]
**Kanal:** [where it will be used]

---

## Brand & Ton

**Zielgruppe:** [specific — not "everyone"]
**Ton:** [2-3 adjectives]
**No-Gos:** [what must not be said or shown]
**Key Claim:** [one core message to communicate]

---

## Konkrete Anleitung

[Numbered steps. Intern does not need to think, just execute.]

1. [Step 1]
2. [Step 2]
3. [Step 3]
[add more as needed]

---

## Qualitätskriterium

"Gut" bedeutet für diesen Task:
- [criterion 1]
- [criterion 2]
- [criterion 3]

**Vor Abgabe prüfen:** [one specific self-check the intern does before sending]

---

## Offene Punkte

[If fully complete: "Keine — kann sofort gestartet werden." Otherwise list ⚠️ items.]`;

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${err}`);
    }

    const data = await response.json();
    const briefing = data.content?.[0]?.text ?? '';

    return new Response(JSON.stringify({ briefing }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
