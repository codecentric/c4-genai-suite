export interface UsagesCount {
  total: number;
  date: Date;
}

export interface AssistantsCount {
  total: number;
  date: Date;
  byAssistant: Record<string, number>;
}
