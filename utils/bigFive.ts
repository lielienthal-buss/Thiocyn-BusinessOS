export const BFI_QUESTIONS = [
  { id: 1, text: '... bin eher zurückhaltend, reserviert' },
  { id: 2, text: '... schenke anderen leicht Vertrauen' },
  { id: 3, text: '... neige zu Bequemlichkeit und Faulheit' },
  {
    id: 4,
    text: '... bin entspannt, lasse mich durch Stress nicht aus der Ruhe bringen',
  },
  { id: 5, text: '... habe nur wenig künstlerisches Interesse' },
  { id: 6, text: '... gehe aus mir heraus, bin gesellig' },
  { id: 7, text: '... neige dazu, andere zu kritisieren' },
  { id: 8, text: '... erledige Aufgaben gründlich' },
  { id: 9, text: '... werde leicht nervös und unsicher' },
  { id: 10, text: '... habe eine aktive Vorstellungskraft, bin phantasievoll' },
];

export const calculateBigFive = (answers: Record<number, number>) => {
  const getScore = (idx: number, reverse: boolean) => {
    const val = answers[idx] || 3;
    return reverse ? 6 - val : val;
  };

  const extraversion = getScore(1, true) + getScore(6, false);
  const agreeableness = getScore(2, false) + getScore(7, true);
  const conscientiousness = getScore(3, true) + getScore(8, false);
  const neuroticism = getScore(4, true) + getScore(9, false);
  const openness = getScore(5, true) + getScore(10, false);

  const normalize = (val: number) => Math.round(((val - 2) / 8) * 100);

  return {
    extraversion: normalize(extraversion),
    agreeableness: normalize(agreeableness),
    conscientiousness: normalize(conscientiousness),
    neuroticism: normalize(neuroticism),
    openness: normalize(openness),
  };
};
