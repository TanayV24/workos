import React, { useEffect, useState } from "react";
import { Plus, Trash2, AlertCircle, Loader, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { taskRest, userRest } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Task, User } from "@/types/workos";

const COLUMNS = ["pending", "in_progress", "under_review", "completed"] as const;

const COLUMN_TITLES: Record<typeof COLUMNS[number], string> = {
  pending: "To Do",
  in_progress: "In Progress",
  under_review: "In Review",
  completed: "Done",
};

const STATUS_COLORS: Record<typeof COLUMNS[number], string> = {
  pending: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

type Flash = { type: "success" | "error"; text: string };

interface TaskFormData {
  title: string;
  description: string;
  status: typeof COLUMNS[number];
  priority: "low" | "medium" | "high" | "urgent";
  assigned_to: string;
  due_date: string;
  estimated_hours?: number;
}

const Tasks: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [newTask, setNewTask] = useState<TaskFormData>({
    title: "",
    description: "",
    status: "pending",
    priority: "medium",
    assigned_to: "",
    due_date: "",
    estimated_hours: undefined,
  });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadTasks();
    loadEmployees();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await taskRest.getTasks();
      if (response.success) {
        console.log("✅ Tasks loaded:", response.data);
        setTasks(response.data || []);
      } else {
        console.error("❌ Failed to load tasks:", response.error);
        setFlash({ type: "error", text: response.error || "Failed to load tasks" });
      }
    } catch (err: any) {
      console.error("Failed to load tasks", err);
      setFlash({ type: "error", text: "Failed to load tasks" });
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      setEmployeesLoading(true);
      const response = await userRest.listEmployees();
      if (response.success) {
        const empList = response.data || [];
        setEmployees(Array.isArray(empList) ? empList : []);
        console.log("✅ Employees loaded:", empList);
      } else {
        console.error("❌ Failed to load employees:", response.error);
        setFlash({ type: "error", text: "Failed to load employees list" });
      }
    } catch (err: any) {
      console.error("Failed to load employees", err);
      setFlash({ type: "error", text: "Failed to load employees list" });
    } finally {
      setEmployeesLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTask.title.trim()) {
      setFlash({ type: "error", text: "Title is required" });
      return;
    }

    if (!newTask.assigned_to) {
      setFlash({ type: "error", text: "Please assign task to someone" });
      return;
    }

    if (!newTask.due_date) {
      setFlash({ type: "error", text: "Due date is required" });
      return;
    }

    try {
      setSubmitting(true);

      // Send to backend
      const response = await taskRest.createTask({
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        assigned_to: newTask.assigned_to,
        due_date: newTask.due_date,
        estimated_hours: newTask.estimated_hours,
      });

      if (!response.success) {
        setFlash({
          type: "error",
          text: response.error || "Failed to create task",
        });
        return;
      }

      console.log("✅ Task created on backend:", response.data);

      // Add to local state
      const createdTask = response.data as Task;
      setTasks([...tasks, createdTask]);

      // Reset form
      setNewTask({
        title: "",
        description: "",
        status: "pending",
        priority: "medium",
        assigned_to: "",
        due_date: "",
        estimated_hours: undefined,
      });

      setShowForm(false);
      setFlash({ type: "success", text: "Task created successfully" });
      setTimeout(() => setFlash(null), 3000);
    } catch (err: any) {
      console.error("Failed to create task", err);
      setFlash({ type: "error", text: "Failed to create task" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await taskRest.deleteTask(taskId);
      if (response.success) {
        setTasks(tasks.filter((t) => t.id !== taskId));
        setFlash({ type: "success", text: "Task deleted successfully" });
        setTimeout(() => setFlash(null), 2000);
      } else {
        setFlash({ type: "error", text: response.error || "Failed to delete task" });
      }
    } catch (err: any) {
      console.error("Failed to delete task", err);
      setFlash({ type: "error", text: "Failed to delete task" });
    }
  };

  const updateTaskStatus = async (
    taskId: string,
    newStatus: typeof COLUMNS[number]
  ) => {
    try {
      const response = await taskRest.updateTask(taskId, {
        status: newStatus,
      });

      if (response.success) {
        setTasks(
          tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
        console.log("✅ Task status updated on backend");
      } else {
        setFlash({
          type: "error",
          text: response.error || "Failed to update task",
        });
      }
    } catch (err: any) {
      console.error("Failed to update task status", err);
      setFlash({ type: "error", text: "Failed to update task" });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader className="animate-spin text-blue-600" size={32} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            New Task
          </button>
        </div>

        {/* Flash Messages */}
        {flash && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
              flash.type === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {flash.type === "success" ? (
              <span>✅</span>
            ) : (
              <AlertCircle size={20} />
            )}
            {flash.text}
          </motion.div>
        )}

        {/* Create Task Form */}
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleAddTask}
            className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-4"
          >
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Task title..."
                required
              />
            </div>

            {/* Assigned To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign To *
              </label>
              <select
                value={newTask.assigned_to}
                onChange={(e) =>
                  setNewTask({ ...newTask, assigned_to: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                disabled={employeesLoading}
              >
                <option value="">
                  {employeesLoading ? "Loading employees..." : "Select employee"}
                </option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name || emp.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newTask.description}
                onChange={(e) =>
                  setNewTask({ ...newTask, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Task description..."
                rows={3}
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={newTask.priority}
                onChange={(e) =>
                  setNewTask({
                    ...newTask,
                    priority: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                value={newTask.due_date}
                onChange={(e) =>
                  setNewTask({ ...newTask, due_date: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Estimated Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Hours
              </label>
              <input
                type="number"
                step="0.5"
                value={newTask.estimated_hours || ""}
                onChange={(e) =>
                  setNewTask({
                    ...newTask,
                    estimated_hours: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0.5"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 justify-end">
              {submitting ? (
                <button
                  type="button"
                  disabled
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
                >
                  <Loader size={18} className="animate-spin" />
                  Creating...
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Task
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}

        {/* Kanban Board */}
        <div className="grid grid-cols-4 gap-4">
          {COLUMNS.map((column) => (
            <div
              key={column}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <h2 className="font-semibold text-gray-900 mb-4">
                {COLUMN_TITLES[column]}
              </h2>

              <AnimatePresence>
                {tasks
                  .filter((task) => task.status === column)
                  .map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="bg-white rounded-lg p-4 mb-3 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Task Header */}
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900 flex-1 text-sm">
                          {task.title}
                        </h3>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-red-500 hover:text-red-700 ml-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Description */}
                      {task.description && (
                        <p className="text-gray-600 text-xs mb-2">
                          {task.description.substring(0, 50)}
                          {task.description.length > 50 ? "..." : ""}
                        </p>
                      )}

                      {/* Assignee */}
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                        <Users size={14} />
                        {task.assignee_name || "Unassigned"}
                      </div>

                      {/* Priority & Tags */}
                      <div className="flex gap-2 mb-3 flex-wrap">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            PRIORITY_COLORS[task.priority] ||
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {task.priority}
                        </span>
                        {task.tags && task.tags.length > 0 && (
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                            {task.tags[0]}
                          </span>
                        )}
                      </div>

                      {/* Status Selector */}
                      <select
                        value={task.status}
                        onChange={(e) =>
                          updateTaskStatus(task.id, e.target.value as any)
                        }
                        className="w-full text-xs px-2 py-1 border border-gray-200 rounded bg-white text-gray-700"
                      >
                        {COLUMNS.map((col) => (
                          <option key={col} value={col}>
                            {COLUMN_TITLES[col]}
                          </option>
                        ))}
                      </select>
                    </motion.div>
                  ))}
              </AnimatePresence>

              {tasks.filter((t) => t.status === column).length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">
                  No tasks
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {tasks.length === 0 && !showForm && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              No tasks yet. Create one to get started!
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create First Task
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Tasks;