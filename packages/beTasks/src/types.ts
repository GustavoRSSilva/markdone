export type MarkDoneStatus = "pending" | "in-progress" | "done";
export type TaskCategory = "research" | "writing" | "coding" | "planning" | "general";

export interface MarkDoneItem {
  id: string;
  title: string;
  category?: TaskCategory;
  status: MarkDoneStatus;
  createdAt: string;
  updatedAt: string;
  result?: string;
  subtasks?: string[];
}

export interface MarkDoneStore {
  markDoneItems: MarkDoneItem[];
}
