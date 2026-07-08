export interface DialogueLine {
  speaker: string;
  text: string;
}

export function normalizeDialogue(input: string | DialogueLine[] | undefined, fallbackSpeaker = ''): DialogueLine[] {
  if (!input) return [];
  if (typeof input === 'string') {
    return [{ speaker: fallbackSpeaker, text: input }];
  }
  return input;
}

export function formatDialogueReward(lines: DialogueLine[], reward: number): DialogueLine[] {
  return [...lines, { speaker: '', text: `+$${reward}` }];
}