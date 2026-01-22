export const BFI_QUESTIONS = [
  { id: 1, text: '... gründlich arbeitet.' }, // Conscientiousness (+)
  { id: 2, text: '... kommunikativ, gesprächig ist.' }, // Extraversion (+)
  { id: 3, text: '... manchmal etwas grob zu anderen ist.' }, // Agreeableness (-)
  { id: 4, text: '... originell ist, neue Ideen einbringt.' }, // Openness (+)
  { id: 5, text: '... sich oft Sorgen macht.' }, // Neuroticism (+)
  { id: 6, text: '... verzeihen kann.' }, // Agreeableness (+)
  { id: 7, text: '... eher faul ist.' }, // Conscientiousness (-)
  { id: 8, text: '... aus sich herausgehen kann, gesellig ist.' }, // Extraversion (+)
  { id: 9, text: '... künstlerische Erfahrungen schätzt.' }, // Openness (+)
  { id: 10, text: '... leicht nervös wird.' }, // Neuroticism (+)
  { id: 11, text: '... Aufgaben wirksam und effizient erledigt.' }, // Conscientiousness (+)
  { id: 12, text: '... zurückhaltend ist.' }, // Extraversion (-)
  { id: 13, text: '... rücksichtsvoll und freundlich mit anderen umgeht.' }, // Agreeableness (+)
  { id: 14, text: '... eine lebhafte Phantasie, Vorstellungen hat.' }, // Openness (+)
  { id: 15, text: '... entspannt ist, mit Stress gut umgehen kann.' }, // Neuroticism (-)
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