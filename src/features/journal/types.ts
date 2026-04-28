export type JournalEntry = {
  id: string;
  createdAt: string;
  startTime: string;
  endTime: string;
  moodEmoji: string;
  text: string;
  updatedAt: string;
};

export type DayGroup = {
  dayKey: string;
  entries: JournalEntry[];
};

export type TimelineBlock = {
  entryId: string;
  startTime: string;
  endTime: string;
  moodEmoji: string;
  text: string;
};
