export const statuses = ['todo', 'in_progress', 'review', 'done'] as const;
export type Status = (typeof statuses)[number];

export type Task = {
  id: number;
  type: Status;
  startDay: number;
  endDay: number;
  text: string;
};

export type TaskFields = Pick<Task, 'text' | 'startDay' | 'endDay'>;
