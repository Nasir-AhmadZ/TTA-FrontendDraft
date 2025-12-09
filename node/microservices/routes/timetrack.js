let express = require('express');
let router = express.Router();
let Mongoose = require('mongoose').Mongoose;
let Schema = require('mongoose').Schema;
const RabbitMQHelper = require('../utils/rabbitmq');
require('dotenv').config();

const rabbitMQ = new RabbitMQHelper();

// MongoDB connection
let mongoose = new Mongoose();
mongoose.connect('mongodb+srv://User:Password@cluster0.82ogu5x.mongodb.net/user_db?retryWrites=true&w=majority&appName=Cluster0');

// Schemas
let entrySchema = new Schema({
  name: String,
  project_group_id: { type: Schema.Types.ObjectId, ref: 'Project' },
  user_id: { type: Schema.Types.ObjectId, required: true },
  starttime: Date,
  endtime: Date,
  duration: Number // in seconds
}, { collection: 'entries' });

let projectSchema = new Schema({
  name: String,
  description: String,
  owner_id: Schema.Types.ObjectId
}, { collection: 'projects' });

let Entry = mongoose.model('Entry', entrySchema);
let Project = mongoose.model('Project', projectSchema);

let currentUser = "691c8bf8d691e46d00068bf3";

// Debug endpoint to check current user
router.get('/debug/current-user', (req, res) => {
  res.json({ currentUser });
});

// RabbitMQ setup for user login/logout events
async function setupRabbitMQ() {
  try {
    console.log('Setting up RabbitMQ consumer...');
    
    // Listen for login events
    await rabbitMQ.consumeMessages('user_login', (message) => {
      console.log('Received login message:', message);
      const { user_id } = message;
      currentUser = user_id;
      console.log(`Current user set to: ${currentUser}`);
    });
    
    // Listen for logout events
    await rabbitMQ.consumeMessages('user_logout', (message) => {
      console.log('Received logout message:', message);
      currentUser = "691c8bf8d691e46d00068bf3";
      console.log(`Current user reset to default: ${currentUser}`);
    });
    
    console.log('RabbitMQ consumer setup for user login/logout events');
  } catch (error) {
    console.error('RabbitMQ setup failed:', error);
    // Retry after 5 seconds
    setTimeout(setupRabbitMQ, 5000);
  }
}

// Initialize RabbitMQ consumer
setupRabbitMQ();

// Helper functions
function entryHelper(entry) {
  return {
    id: entry._id.toString(),
    project_group_id: entry.project_group_id.toString(),
    user_id: entry.user_id.toString(),
    name: entry.name,
    starttime: entry.starttime,
    endtime: entry.endtime,
    duration: entry.duration
  };
}

function projectHelper(project) {
  return {
    id: project._id.toString(),
    owner_id: project.owner_id.toString(),
    name: project.name,
    description: project.description
  };
}

// Entry endpoints
// Get entry by id
router.get('/entry/:entry_id', async function (req, res) {
  try {
    const entry = await Entry.findOne({ _id: req.params.entry_id, user_id: currentUser });
    if (!entry) {
      return res.status(404).json({ detail: "Entry not found" });
    }
    res.json(entryHelper(entry));
  } catch (error) {
    res.status(400).json({ detail: "Invalid entry id" });
  }
});

// Delete entry by id
router.delete('/entry/:entry_id', async function (req, res) {
  try {
    const result = await Entry.findOneAndDelete({ _id: req.params.entry_id, user_id: currentUser });
    if (!result) {
      return res.status(404).json({ detail: "Entry not found" });
    }
    res.json({ message: "Entry deleted" });
  } catch (error) {
    res.status(400).json({ detail: "Invalid entry id" });
  }
});

// Start a time entry
router.put('/entries', async function (req, res) {
  try {
    const { name, project_group_id } = req.body;
    
    // Check if project exists
    const project = await Project.findById(project_group_id);
    if (!project) {
      return res.status(404).json({ detail: "Project does not exist" });
    }

    const now = new Date();
    const entry = new Entry({
      name,
      project_group_id,
      user_id: currentUser,
      starttime: now,
      endtime: null,
      duration: null
    });

    const savedEntry = await entry.save();
    res.status(201).json(entryHelper(savedEntry));
  } catch (error) {
    res.status(400).json({ detail: error.message });
  }
});

// Complete a time entry
router.patch('/entries/:entry_id', async function (req, res) {
  try {
    const entry = await Entry.findOne({ _id: req.params.entry_id, user_id: currentUser });
    
    if (!entry) {
      return res.status(404).json({ detail: "Entry not found" });
    }
    
    if (entry.endtime !== null) {
      return res.status(400).json({ detail: "Entry already ended" });
    }
    
    const now = new Date();
    const duration = Math.floor((now - entry.starttime) / 1000);
    
    entry.endtime = now;
    entry.duration = duration;
    await entry.save();
    
    res.json(entryHelper(entry));
  } catch (error) {
    res.status(400).json({ detail: "Invalid entry id" });
  }
});

// Update a time entry
router.patch('/entries/update/:entry_id', async function (req, res) {
  try {
    const entry = await Entry.findOne({ _id: req.params.entry_id, user_id: currentUser });
    if (!entry) {
      return res.status(404).json({ detail: "Entry not found" });
    }

    const updateData = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.project_group_id) {
      // Check if project exists
      const project = await Project.findById(req.body.project_group_id);
      if (!project) {
        return res.status(404).json({ detail: "Project does not exist" });
      }
      updateData.project_group_id = req.body.project_group_id;
    }

    const updatedEntry = await Entry.findOneAndUpdate(
      { _id: req.params.entry_id, user_id: currentUser },
      updateData,
      { new: true }
    );

    res.json(entryHelper(updatedEntry));
  } catch (error) {
    res.status(400).json({ detail: error.message });
  }
});

// List all entries
router.get('/entries', async function (req, res) {
  try {
    const entries = await Entry.find({ user_id: currentUser });
    res.json(entries.map(entryHelper));
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// List entries from project
router.get('/entries/project/:project_id', async function (req, res) {
  try {
    const project = await Project.findOne({ _id: req.params.project_id, owner_id: currentUser });
    if (!project) {
      return res.status(404).json({ detail: "Project not found" });
    }

    const entries = await Entry.find({ project_group_id: req.params.project_id, user_id: currentUser });
    res.json(entries.map(entryHelper));
  } catch (error) {
    res.status(400).json({ detail: "Invalid project id" });
  }
});

// Project endpoints
// Create project
router.put('/projects', async function (req, res) {
  try {
    const { name, description } = req.body;
    
    const project = new Project({
      name,
      description,
      owner_id: currentUser
    });

    const savedProject = await project.save();
    res.status(201).json(projectHelper(savedProject));
  } catch (error) {
    res.status(400).json({ detail: error.message });
  }
});

// List all projects
router.get('/projects', async function (req, res) {
  try {
    const projects = await Project.find({ owner_id: currentUser });
    res.json(projects.map(projectHelper));
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// List user's projects
router.get('/projects/user', async function (req, res) {
  try {
    const projects = await Project.find({ owner_id: currentUser });
    res.json(projects.map(projectHelper));
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

// Delete project and all its entries
router.delete('/project/:project_id', async function (req, res) {
  try {
    const project = await Project.findOne({ _id: req.params.project_id, owner_id: currentUser });
    if (!project) {
      return res.status(404).json({ detail: "Project does not exist" });
    }

    // Delete all entries belonging to the project and user
    await Entry.deleteMany({ project_group_id: req.params.project_id, user_id: currentUser });
    
    // Delete the project
    await Project.findOneAndDelete({ _id: req.params.project_id, owner_id: currentUser });
    
    res.json({ status: "success", message: "Project and all its entries deleted" });
  } catch (error) {
    res.status(400).json({ detail: "Invalid project id" });
  }
});

// Delete all user's projects
router.delete('/user/projects', async function (req, res) {
  try {
    const projects = await Project.find({ owner_id: currentUser });
    
    for (const project of projects) {
      await Entry.deleteMany({ project_group_id: project._id });
      await Project.findByIdAndDelete(project._id);
    }
    
    res.json({ status: "success", message: "Users projects are deleted" });
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
});

module.exports = router;