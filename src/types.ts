export type TodoStatus = "pending" | "in-progress" | "done";
export type TaskCategory = "research" | "writing" | "coding" | "planning" | "general";

export interface Todo {
  id: string;
  title: string;
  category?: TaskCategory;
  status: TodoStatus;
  createdAt: string;
  updatedAt: string;
  result?: string;
  subtasks?: string[];
}

export interface TodoStore {
  todos: Todo[];
}
