# Creator Re-Engagement DM Templates

3-Touch Sequenz fuer dormant Creators. Senden via Brand-IG-Account.
Filter-Query: `SELECT * FROM dormant_creators ORDER BY dormancy_reason, brand_slug`

---

## Touch 1 — Check-in (Tag 0)

**Betreff:** Personalisierter Check-in + neue Content Direction

### DE (Thiocyn / Dr. Severin / Paigh)

> Hey [Name]! Hoffe dir geht's gut. Wir haben diesen Monat eine neue Content-Richtung am Start: **[Direction Title]**
>
> Passt perfekt zu deinem Style. Wenn du Lust hast mitzumachen, schick ich dir das Briefing direkt rüber.
>
> Kein Stress — meld dich einfach wenn du dabei bist!

### EN (Thiocyn US / Take A Shot / Wristr)

> Hey [Name]! Hope you're doing well. We've got a new content direction this month: **[Direction Title]**
>
> Totally fits your vibe. Want me to send over the brief?
>
> No pressure — just let me know if you're in!

---

## Touch 2 — Social Proof (Tag +5)

**Betreff:** Top-Creator Showcase + Motivation

### DE

> Hey [Name], kurzes Update: [Top Creator Name] hat letzte Woche ein mega Reel gemacht und damit [X] Sales generiert.
>
> Hier der Link: [submission_url]
>
> Dein Content-Style wuerde genauso gut performen. Soll ich dir das aktuelle Briefing schicken?

### EN

> Hey [Name], quick update: [Top Creator Name] just dropped an amazing reel last week and drove [X] sales.
>
> Check it out: [submission_url]
>
> Your style would perform just as well. Want me to send you the current brief?

---

## Touch 3 — Final / Opt-out (Tag +10)

**Betreff:** Letzte Nachricht, klare Entscheidung

### DE

> Hey [Name], ich wollte einmal kurz nachfragen — bist du noch dabei?
>
> Wenn ja: ich schick dir sofort das naechste Briefing.
> Wenn nein: kein Problem, ich nehm dich aus der aktiven Liste raus.
>
> Kurze Rueckmeldung reicht!

### EN

> Hey [Name], just checking in one last time — are you still in?
>
> If yes: I'll send the next brief right away.
> If no: totally fine, I'll remove you from the active list.
>
> A quick reply is all I need!

---

## Nach Touch 3 (keine Antwort)

Creator Status -> `Paused` via:
```sql
UPDATE creators SET onboarding_status = 'paused'
WHERE id IN (SELECT id FROM dormant_creators WHERE dormancy_reason != 'stalled_onboarding');
```

## Wer sendet was

| Touch | Wer | Von welchem Account |
|-------|-----|---------------------|
| 1 | Intern (zugewiesener Operator) | Brand IG Account |
| 2 | Intern | Brand IG Account |
| 3 | Intern | Brand IG Account |
| Status-Update | Tom (QA) | Supabase direkt |
