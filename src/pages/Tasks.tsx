import React, { useEffect, useState } from 'react';
import { Plus, Trash2, AlertCircle, Loader, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { taskRest, userRest } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Task, User } from '@/types/workos';

const COLUMNS = ['todo', 'in-progress', 'review', 'done'] as const;
const COLUMN_TITLES: Record<typeof COLUMNS[number], string> = {
  'todo': 'To Do',
  'in-progress': 'In Progress',
  'review': 'In Review',
  'done': 'Done',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

type Flash = { type: 'success' | 'error'; text: string };

const Tasks: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'todo' as const,
    priority: 'medium' as const,
    assignee: '',
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
      setTasks(response.data || []);
    } catch (err: any) {
      console.error('Failed to load tasks', err);
      setFlash({ type: 'error', text: 'Failed to load tasks' });
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      setEmployeesLoading(true);
      const response = await userRest.listEmployees();
      const empList = response.data || response.results || [];
      setEmployees(Array.isArray(empList) ? empList : []);
      console.log('✅ Employees loaded:', empList);
    } catch (err: any) {
      console.error('Failed to load employees', err);
      setFlash({ type: 'error', text: 'Failed to load employees list' });
    } finally {
      setEmployeesLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      setFlash({ type: 'error', text: 'Title is required' });
      return;
    }

    if (!newTask.assignee) {
      setFlash({ type: 'error', text: 'Please assign task to someone' });
      return;
    }

    try {
      const assignedEmployee = employees.find(emp => emp.id === newTask.assignee);
      
      const task: Task = {
        id: Date.now().toString(),
        title: newTask.title,
        description: newTask.description,
        status: newTask.status,
        priority: newTask.priority,
        assignee: newTask.assignee,
        assigneeName: assignedEmployee?.name || 'Unknown',
        assigneeAvatar: assignedEmployee?.avatar,
        dueDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        tags: [],
      };

      setTasks([...tasks, task]);
      setNewTask({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assignee: '',
      });
      setShowForm(false);
      setFlash({ type: 'success', text: 'Task created successfully' });
      setTimeout(() => setFlash(null), 3000);
    } catch (err: any) {
      console.error('Failed to create task', err);
      setFlash({ type: 'error', text: 'Failed to create task' });
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    setFlash({ type: 'success', text: 'Task deleted' });
    setTimeout(() => setFlash(null), 2000);
  };

  const updateTaskStatus = (taskId: string, newStatus: typeof COLUMNS[number]) => {
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Tasks</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            New Task
          </button>
        </div>

        {/* Flash Messages */}
        {flash && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-3 p-4 mb-6 rounded-lg border ${
              flash.type === 'success'
                ? 'bg-green-50 text-green-800 border-green-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
            <span>{flash.text}</span>
          </motion.div>
        )}

        {/* Create Task Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Task description..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign To <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newTask.assignee}
                      onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                      disabled={employeesLoading}
                    >
                      <option value="">
                        {employeesLoading ? 'Loading employees...' : 'Select employee'}
                      </option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={newTask.status}
                      onChange={(e) => setNewTask({ ...newTask, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="review">In Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Task
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((column) => (
            <div key={column} className="bg-gray-100 rounded-lg p-4">
              <h2 className="font-semibold text-gray-900 mb-4">
                {COLUMN_TITLES[column]}
              </h2>
              <div className="space-y-3">
                <AnimatePresence>
                  {tasks
                    .filter((task) => task.status === column)
                    .map((task) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium text-gray-900 flex-1">{task.title}</h3>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {task.description && (
                          <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                        )}

                        {/* Assignee */}
                        <div className="flex items-center gap-2 mb-3 p-2 bg-blue-50 rounded">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-medium text-blue-900">
                            {task.assigneeName}
                          </span>
                        </div>

                        <div className="flex gap-2 mb-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${PRIORITY_COLORS[task.priority]}`}>
                            {task.priority}
                          </span>
                          {task.tags && task.tags.length > 0 && (
                            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                              {task.tags[0]}
                            </span>
                          )}
                        </div>

                        {/* Status selector */}
                        <select
                          value={task.status}
                          onChange={(e) => updateTaskStatus(task.id, e.target.value as any)}
                          className="w-full text-xs px-2 py-1 border border-gray-200 rounded bg-white"
                        >
                          {COLUMNS.map(col => (
                            <option key={col} value={col}>
                              {COLUMN_TITLES[col]}
                            </option>
                          ))}
                        </select>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>

        {tasks.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No tasks yet. Create one to get started!</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Tasks;