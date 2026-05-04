export interface BfiQuestion {
  id: number;
  de: string;
  en: string;
}

export const BFI_QUESTIONS: BfiQuestion[] = [
  { id: 1,  de: 'Ich arbeite gründlich.',                                   en: 'I work thoroughly.' },                                   // C+
  { id: 2,  de: 'Ich bin gesprächig und kommunikativ.',                     en: 'I am communicative and talkative.' },                    // E+
  { id: 3,  de: 'Ich bin manchmal etwas grob zu anderen.',                  en: 'I am sometimes a bit rude to others.' },                 // A-
  { id: 4,  de: 'Ich bringe oft neue Ideen ein.',                           en: 'I often come up with new ideas.' },                      // O+
  { id: 5,  de: 'Ich mache mir oft Sorgen.',                                en: 'I worry a lot.' },                                       // N+
  { id: 6,  de: 'Ich kann verzeihen.',                                      en: 'I can forgive.' },                                       // A+
  { id: 7,  de: 'Ich bin eher faul.',                                       en: 'I tend to be lazy.' },                                   // C-
  { id: 8,  de: 'Ich kann aus mir herausgehen und bin gesellig.',           en: 'I can come out of myself and am sociable.' },            // E+
  { id: 9,  de: 'Ich schätze künstlerische Erfahrungen.',                   en: 'I value artistic experiences.' },                        // O+
  { id: 10, de: 'Ich werde leicht nervös.',                                 en: 'I get nervous easily.' },                                // N+
  { id: 11, de: 'Ich erledige Aufgaben effektiv und effizient.',            en: 'I complete tasks effectively and efficiently.' },        // C+
  { id: 12, de: 'Ich bin zurückhaltend.',                                   en: 'I am reserved.' },                                       // E-
  { id: 13, de: 'Ich bin rücksichtsvoll und freundlich zu anderen.',        en: 'I am considerate and friendly toward others.' },         // A+
  { id: 14, de: 'Ich habe eine lebhafte Vorstellungskraft.',                en: 'I have a vivid imagination.' },                          // O+
  { id: 15, de: 'Ich bin entspannt und kann mit Stress gut umgehen.',       en: 'I am relaxed and handle stress well.' },                 // N-
];

export const calculateBigFive = (answers: Record<number, number>) => {
  // For a 7-point Likert scale, reverse scoring is 8 - value
  const getScore = (idx: number, reverse: boolean) => {
    const val = answers[idx] || 4; // Default to middle (4) if no answer
    return reverse ? 8 - val : val;
  };

  // Conscientiousness: Item 1 (+), Item 7 (-), Item 11 (+)
  const conscientiousness =
    getScore(1, false) + getScore(7, true) + getScore(11, false);

  // Extraversion: Item 2 (+), Item 8 (+), Item 12 (-)
  const extraversion =
    getScore(2, false) + getScore(8, false) + getScore(12, true);

  // Openness to Experience: Item 4 (+), Item 9 (+), Item 14 (+)
  const openness =
    getScore(4, false) + getScore(9, false) + getScore(14, false);

  // Agreeableness: Item 3 (-), Item 6 (+), Item 13 (+)
  const agreeableness =
    getScore(3, true) + getScore(6, false) + getScore(13, false);

  // Neuroticism: Item 5 (+), Item 10 (+), Item 15 (-)
  const neuroticism =
    getScore(5, false) + getScore(10, false) + getScore(15, true);

  // Normalize scores to a 0-100 range
  // Each trait is a sum of 3 items, with scores from 1-7.
  // Min sum = 3 * 1 = 3
  // Max sum = 3 * 7 = 21
  // Range = 21 - 3 = 18
  const normalize = (val: number) => Math.round(((val - 3) / 18) * 100);

  return {
    conscientiousness: normalize(conscientiousness),
    extraversion: normalize(extraversion),
    openness: normalize(openness),
    agreeableness: normalize(agreeableness),
    neuroticism: normalize(neuroticism),
  };
};
