export const BFI_QUESTIONS = [
  { id: 1, text: '... works thoroughly.' }, // Conscientiousness (+)
  { id: 2, text: '... is communicative, talkative.' }, // Extraversion (+)
  { id: 3, text: '... is sometimes a bit rough with others.' }, // Agreeableness (-)
  { id: 4, text: '... is original, brings new ideas.' }, // Openness (+)
  { id: 5, text: '... often worries.' }, // Neuroticism (+)
  { id: 6, text: '... can forgive.' }, // Agreeableness (+)
  { id: 7, text: '... is rather lazy.' }, // Conscientiousness (-)
  { id: 8, text: '... can go out of their way, is sociable.' }, // Extraversion (+)
  { id: 9, text: '... appreciates artistic experiences.' }, // Openness (+)
  { id: 10, text: '... easily gets nervous.' }, // Neuroticism (+)
  { id: 11, text: '... completes tasks effectively and efficiently.' }, // Conscientiousness (+)
  { id: 12, text: '... is reserved.' }, // Extraversion (-)
  { id: 13, text: '... is considerate and friendly with others.' }, // Agreeableness (+)
  { id: 14, text: '... has a vivid imagination, ideas.' }, // Openness (+)
  { id: 15, text: '... is relaxed, can handle stress well.' }, // Neuroticism (-)
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
