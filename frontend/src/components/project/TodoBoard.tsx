"use client";

import React from "react";
import {
  Plus,
  Pencil,
  Trash2,
  User,
  Calendar,
  Star,
} from "lucide-react";

export interface TodoItem {
  id: string;
  title: string;
  description: string;
  column: string;
  priority: "low" | "medium" | "high";
  assignee: string;
  due_date: string;
  created_at: string;
  updated_at: string;
  completed_at: string;
  order: number;
  starred?: boolean;
}

interface TodoBoardProps {
  todos: TodoItem[];
  todoColumns: string[];
  addingInColumn: string | null;
  setAddingInColumn: (col: string | null) => void;
  newTodoTitle: string;
  setNewTodoTitle: (v: string) => void;
  newTodoDesc: string;
  setNewTodoDesc: (v: string) => void;
  newTodoPriority: "low" | "medium" | "high";
  setNewTodoPriority: (v: "low" | "medium" | "high") => void;
  newTodoAssignee: string;
  setNewTodoAssignee: (v: string) => void;
  newTodoDueDate: string;
  setNewTodoDueDate: (v: string) => void;
  editingTodo: string | null;
  setEditingTodo: (v: string | null) => void;
  editTodoTitle: string;
  setEditTodoTitle: (v: string) => void;
  editTodoDesc: string;
  setEditTodoDesc: (v: string) => void;
  editTodoPriority: "low" | "medium" | "high";
  setEditTodoPriority: (v: "low" | "medium" | "high") => void;
  editTodoAssignee: string;
  setEditTodoAssignee: (v: string) => void;
  editTodoDueDate: string;
  setEditTodoDueDate: (v: string) => void;
  draggedTodo: string | null;
  createTodo: (column: string) => void;
  updateTodo: (todoId: string) => void;
  deleteTodo: (todoId: string) => void;
  moveTodo: (todoId: string, column: string, order: number) => void;
  handleDragStart: (todoId: string) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDropOnColumn: (column: string) => void;
  handleDropOnCard: (column: string, order: number) => void;
  toggleStar: (todoId: string, starred: boolean) => void;
  columnLabel: (col: string) => string;
  priorityClasses: (p: string) => string;
  priorityLabel: (p: string) => string;
  t: (key: string) => string;
}

export function TodoBoard({
  todos,
  todoColumns,
  addingInColumn,
  setAddingInColumn,
  newTodoTitle,
  setNewTodoTitle,
  newTodoDesc,
  setNewTodoDesc,
  newTodoPriority,
  setNewTodoPriority,
  newTodoAssignee,
  setNewTodoAssignee,
  newTodoDueDate,
  setNewTodoDueDate,
  editingTodo,
  setEditingTodo,
  editTodoTitle,
  setEditTodoTitle,
  editTodoDesc,
  setEditTodoDesc,
  editTodoPriority,
  setEditTodoPriority,
  editTodoAssignee,
  setEditTodoAssignee,
  editTodoDueDate,
  setEditTodoDueDate,
  draggedTodo,
  createTodo,
  updateTodo,
  deleteTodo,
  moveTodo,
  handleDragStart,
  handleDragOver,
  handleDropOnColumn,
  handleDropOnCard,
  toggleStar,
  columnLabel,
  priorityClasses,
  priorityLabel,
  t,
}: TodoBoardProps) {
  return (
    <div className="flex gap-4 h-[calc(100vh-22rem)] overflow-x-auto">
      {todoColumns.map((col) => {
        const columnItems = todos
          .filter((t) => t.column === col)
          .sort((a, b) => a.order - b.order);
        return (
          <div
            key={col}
            className="flex-1 min-w-[280px] flex flex-col bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden"
            onDragOver={handleDragOver}
            onDrop={(e) => {
              e.preventDefault();
              handleDropOnColumn(col);
            }}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {columnLabel(col)}
                </h3>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                  {columnItems.length}
                </span>
              </div>
            </div>

            {/* Column body */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {columnItems.map((todo, idx) => (
                <div
                  key={todo.id}
                  draggable
                  onDragStart={() => handleDragStart(todo.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDropOnCard(col, idx);
                  }}
                  className={`bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow ${
                    draggedTodo === todo.id ? "opacity-50" : ""
                  }`}
                >
                  {editingTodo === todo.id ? (
                    /* Inline edit mode */
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleStar(todo.id, !todo.starred)}
                          className={`flex-shrink-0 p-1 rounded transition-colors ${todo.starred ? "text-amber-400" : "text-neutral-300 dark:text-neutral-600 hover:text-amber-400"}`}
                          title={todo.starred ? "Unstar" : "Star"}
                        >
                          <Star className={`w-4 h-4 ${todo.starred ? "fill-current" : ""}`} />
                        </button>
                        <span className="text-[10px] text-neutral-400">{todo.starred ? "Starred" : "Not starred"}</span>
                      </div>
                      <input
                        type="text"
                        value={editTodoTitle}
                        onChange={(e) => setEditTodoTitle(e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        autoFocus
                      />
                      <textarea
                        value={editTodoDesc}
                        onChange={(e) => setEditTodoDesc(e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                        placeholder={t("todo.description")}
                      />
                      <select
                        value={editTodoPriority}
                        onChange={(e) => setEditTodoPriority(e.target.value as "low" | "medium" | "high")}
                        className="w-full px-2 py-1 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="low">{t("todo.low")}</option>
                        <option value="medium">{t("todo.medium")}</option>
                        <option value="high">{t("todo.high")}</option>
                      </select>
                      <input
                        type="text"
                        value={editTodoAssignee}
                        onChange={(e) => setEditTodoAssignee(e.target.value)}
                        placeholder={t("todo.assignee")}
                        className="w-full px-2 py-1 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <input
                        type="date"
                        value={editTodoDueDate}
                        onChange={(e) => setEditTodoDueDate(e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateTodo(todo.id)}
                          className="flex-1 px-2 py-1 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                          {t("action.save")}
                        </button>
                        <button
                          onClick={() => setEditingTodo(null)}
                          className="flex-1 px-2 py-1 text-xs font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded hover:bg-neutral-300 dark:hover:bg-neutral-600"
                        >
                          {t("action.cancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display mode */
                    <>
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-start gap-2 flex-1">
                          <input
                            type="checkbox"
                            checked={todo.column === "done"}
                            onChange={() => {
                              if (todo.column === "done") {
                                moveTodo(todo.id, "todo", 0);
                              } else {
                                const doneItems = todos.filter((t) => t.column === "done");
                                moveTodo(todo.id, "done", doneItems.length);
                              }
                            }}
                            className="mt-1 w-4 h-4 rounded border-neutral-300 text-green-600 focus:ring-green-500 flex-shrink-0 cursor-pointer"
                          />
                          <p className={`text-sm font-medium flex-1 ${todo.column === "done" ? "line-through text-neutral-400" : "text-neutral-900 dark:text-white"}`}>
                            {todo.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => toggleStar(todo.id, !todo.starred)}
                            className={`p-1 rounded transition-colors ${todo.starred ? "text-amber-400 hover:text-amber-500" : "text-neutral-300 dark:text-neutral-600 hover:text-amber-400"}`}
                            title={todo.starred ? "Unstar" : "Star"}
                          >
                            <Star className={`w-3.5 h-3.5 ${todo.starred ? "fill-current" : ""}`} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingTodo(todo.id);
                              setEditTodoTitle(todo.title);
                              setEditTodoDesc(todo.description);
                              setEditTodoPriority(todo.priority);
                              setEditTodoAssignee(todo.assignee || "");
                              setEditTodoDueDate(todo.due_date || "");
                            }}
                            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded"
                            title={t("action.edit")}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteTodo(todo.id)}
                            className="p-1 text-neutral-400 hover:text-red-500 rounded"
                            title={t("action.delete")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {todo.description && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                          {todo.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${priorityClasses(todo.priority)}`}>
                          {priorityLabel(todo.priority)}
                        </span>
                        {todo.assignee && (
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-0.5">
                            <User className="w-3 h-3" />
                            {todo.assignee}
                          </span>
                        )}
                        {todo.due_date && (
                          <span className="text-xs text-neutral-400 flex items-center gap-0.5">
                            <Calendar className="w-3 h-3" />
                            {todo.due_date}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
                        <span>{todo.created_at}</span>
                        {todo.completed_at && <span className="text-green-500">completed {todo.completed_at}</span>}
                      </div>
                    </>
                  )}
                </div>
              ))}

              {columnItems.length === 0 && addingInColumn !== col && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center py-4">
                  {t("todo.noTasks")}
                </p>
              )}
            </div>

            {/* Add task form or button */}
            <div className="p-2 border-t border-neutral-200 dark:border-neutral-800">
              {addingInColumn === col ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newTodoTitle}
                    onChange={(e) => setNewTodoTitle(e.target.value)}
                    placeholder={t("todo.taskTitle")}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        createTodo(col);
                      }
                      if (e.key === "Escape") setAddingInColumn(null);
                    }}
                  />
                  <textarea
                    value={newTodoDesc}
                    onChange={(e) => setNewTodoDesc(e.target.value)}
                    rows={2}
                    placeholder={t("todo.description")}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                  <select
                    value={newTodoPriority}
                    onChange={(e) => setNewTodoPriority(e.target.value as "low" | "medium" | "high")}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="low">{t("todo.low")}</option>
                    <option value="medium">{t("todo.medium")}</option>
                    <option value="high">{t("todo.high")}</option>
                  </select>
                  <input
                    type="text"
                    value={newTodoAssignee}
                    onChange={(e) => setNewTodoAssignee(e.target.value)}
                    placeholder={t("todo.assignee")}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="date"
                    value={newTodoDueDate}
                    onChange={(e) => setNewTodoDueDate(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={() => createTodo(col)}
                      disabled={!newTodoTitle.trim()}
                      className="flex-1 px-2 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {t("todo.addTask")}
                    </button>
                    <button
                      onClick={() => {
                        setAddingInColumn(null);
                        setNewTodoTitle("");
                        setNewTodoDesc("");
                        setNewTodoPriority("medium");
                      }}
                      className="px-2 py-1.5 text-xs font-medium bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded hover:bg-neutral-300 dark:hover:bg-neutral-600"
                    >
                      {t("action.cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAddingInColumn(col);
                    setNewTodoTitle("");
                    setNewTodoDesc("");
                    setNewTodoPriority("medium");
                  }}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t("todo.addTask")}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
