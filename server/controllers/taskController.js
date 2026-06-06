const Task = require('../models/Task');
const Submission = require('../models/Submission');
const User = require('../models/User');

// Helper: validate dueDate string/value. Returns null when valid, or error message when invalid.
const validateDueDate = (dueDate) => {
  if (!dueDate) return null;

  let due;
  if (typeof dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    const [y, m, d] = dueDate.split('-').map(Number);
    due = new Date(y, m - 1, d);
  } else {
    due = new Date(dueDate);
  }

  if (isNaN(due.getTime())) return 'Invalid dueDate format';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (due < today) return 'Due date must not be in the past';

  return null;
};

// @desc  Get all tasks
// @route GET /api/tasks
// @access Admin
const getAllTasks = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const search = (req.query.search || '').trim();
    const status = (req.query.status || 'All').trim();

    const filters = {};

    if (status && status !== 'All') {
      filters.status = status;
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      const matchingUsers = await User.find({ name: regex }).select('_id').lean();
      const matchingUserIds = matchingUsers.map((user) => user._id);

      filters.$or = [
        { title: regex },
        { description: regex },
      ];

      if (matchingUserIds.length > 0) {
        filters.$or.push({ assignedTo: { $in: matchingUserIds } });
      }
    }

    const total = await Task.countDocuments(filters);

    const tasks = await Task.find(filters)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const statusCounts = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {
      total: 0,
      open: 0,
      submitted: 0,
      approved: 0,
    };

    statusCounts.forEach(({ _id, count }) => {
      stats.total += count;
      if (_id === 'Open') stats.open = count;
      if (_id === 'Submitted') stats.submitted = count;
      if (_id === 'Approved') stats.approved = count;
    });

    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);

    res.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
      },
      stats,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Get single task
// @route GET /api/tasks/:id
// @access Admin
const getTaskById = async (req, res) => {
  try {
    // — will throw a CastError from Mongoose instead of a clean 400
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name');

    if (!task) return res.status(404).json({ message: 'Task not found' });

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Create a task
// @route POST /api/tasks
// @access Admin
const createTask = async (req, res) => {
  const { title, description, status, assignedTo, dueDate } = req.body;

  try {
    // Date validation: ensure dueDate is a valid date string and not in the past
    const dueDateError = validateDueDate(dueDate);
    if (dueDateError) return res.status(400).json({ message: dueDateError });

    const task = await Task.create({
      title,
      description,
      status,
      assignedTo: assignedTo || null,
      dueDate,
      createdBy: req.user._id,
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Update a task
// @route PUT /api/tasks/:id
// @access Admin
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (req.body.dueDate) {
      // Date validation: ensure dueDate is a valid date string and not in the past
      const dueDateError = validateDueDate(req.body.dueDate);
      if (dueDateError) return res.status(400).json({ message: dueDateError });
    }
    // including internal fields like createdBy or __v
    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true }
    ).populate('assignedTo', 'name email');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc  Delete a task
// @route DELETE /api/tasks/:id
// @access Admin
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    // Remove any submissions that reference this task to avoid orphaned records.
    // Doing this explicitly here keeps the behavior simple and predictable
    // (Mongoose does not cascade deletes automatically).
    await Submission.deleteMany({ taskId: task._id });

    // Delete the task itself after cleaning up related submissions.
    await Task.findByIdAndDelete(req.params.id);

    res.json({ message: 'Task and related submissions deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllTasks, getTaskById, createTask, updateTask, deleteTask };
