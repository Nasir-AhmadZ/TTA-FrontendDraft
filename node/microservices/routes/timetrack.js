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

let currentUser = "691c8bf8d691e46d00068d3d";

// Debug endpoint to check current user
router.get('/debug/current-user', (req, res) => {
  res.json({ currentUser });
});

// RabbitMQ setup for user login/logout events
async function setupRabbitMQ() {
  try {
    console.log('Setting up RabbitMQ consumer...');
    
    // Listen for login events
    await rabbitMQ.consumeMessages('user_login', async (message) => {
      console.log('Received login message:', message);
      const { user_id } = message;
      
      // Clear default user data when someone logs in
      const defaultUserId = "691c8bf8d691e46d00068d3d";
      try {
        const defaultProjects = await Project.find({ owner_id: defaultUserId });
        const projectIds = defaultProjects.map(p => p._id);
        
        if (projectIds.length > 0) {
          const entriesResult = await Entry.deleteMany({ project_group_id: { $in: projectIds } });
          console.log(`Cleared ${entriesResult.deletedCount} default user entries`);
        }
        
        const projectsResult = await Project.deleteMany({ owner_id: defaultUserId });
        console.log(`Cleared ${projectsResult.deletedCount} default user projects`);
      } catch (error) {
        console.error('Error clearing default user data:', error);
      }
      
      currentUser = user_id;
      console.log(`Current user set to: ${currentUser}`);
    });
    
    // Listen for logout events
    await rabbitMQ.consumeMessages('user_logout', async (message) => {
      console.log('Received logout message:', message);
      const { user_id } = message;
      
      // Clear the logged out user's data
      if (user_id && user_id !== "691c8bf8d691e46d00068d3d") {
        try {
          const userProjects = await Project.find({ owner_id: user_id });
          const projectIds = userProjects.map(p => p._id);
          
          if (projectIds.length > 0) {
            const entriesResult = await Entry.deleteMany({ project_group_id: { $in: projectIds } });
            console.log(`Cleared ${entriesResult.deletedCount} entries for logged out user`);
          }
          
          const projectsResult = await Project.deleteMany({ owner_id: user_id });
          console.log(`Cleared ${projectsResult.deletedCount} projects for logged out user`);
        } catch (error) {
          console.error('Error clearing logged out user data:', error);
        }
      }
      
      currentUser = "691c8bf8d691e46d00068d3d";
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
    const entry = await Entry.findById(req.params.entry_id);
    if (!entry) {
      return res.status(404).json({ detail: "Entry not found" });
    }
    
    // Check if entry belongs to current user's project
    const project = await Project.findOne({ _id: entry.project_group_id, owner_id: currentUser });
    if (!project) {
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
    const entry = await Entry.findById(req.params.entry_id);
    if (!entry) {
      return res.status(404).json({ detail: "Entry not found" });
    }
    
    // Check if entry belongs to current user's project
    const project = await Project.findOne({ _id: entry.project_group_id, owner_id: currentUser });
    if (!project) {
      return res.status(404).json({ detail: "Entry not found" });
    }
    
    await Entry.findByIdAndDelete(req.params.entry_id);
    res.json({ message: "Entry deleted" });
  } catch (error) {
    res.status(400).json({ detail: "Invalid entry id" });
  }
});

// Start a time entry
router.put('/entries', async function (req, res) {
  try {
    const { name, project_group_id } = req.body;
    
    // Check if project exists and belongs to current user
    const project = await Project.findOne({ _id: project_group_id, owner_id: currentUser });
    if (!project) {
      return res.status(404).json({ detail: "Project does not exist" });
    }

    const now = new Date();
    const entry = new Entry({
      name,
      project_group_id,
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
    const entry = await Entry.findById(req.params.entry_id);
    
    if (!entry) {
      return res.status(404).json({ detail: "Entry not found" });
    }
    
    // Check if entry belongs to current user's project
    const project = await Project.findOne({ _id: entry.project_group_id, owner_id: currentUser });
    if (!project) {
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
    const entry = await Entry.findById(req.params.entry_id);
    if (!entry) {
      return res.status(404).json({ detail: "Entry not found" });
    }

    // Check if entry belongs to current user's project
    const project = await Project.findOne({ _id: entry.project_group_id, owner_id: currentUser });
    if (!project) {
      return res.status(404).json({ detail: "Entry not found" });
    }

    const updateData = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.project_group_id) {
      // Check if new project exists and belongs to user
      const newProject = await Project.findOne({ _id: req.body.project_group_id, owner_id: currentUser });
      if (!newProject) {
        return res.status(404).json({ detail: "Project does not exist" });
      }
      updateData.project_group_id = req.body.project_group_id;
    }

    const updatedEntry = await Entry.findByIdAndUpdate(
      req.params.entry_id,
      updateData,
      { new: true }
    );

    res.json(entryHelper(updatedEntry));
  } catch (error) {
    res.status(400).json({ detail: error.message });
  }
});

// List all entries from current user's projects
router.get('/entries', async function (req, res) {
  try {
    const projects = await Project.find({ owner_id: currentUser });
    const projectIds = projects.map(p => p._id);
    const entries = await Entry.find({ project_group_id: { $in: projectIds } });
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

    const entries = await Entry.find({ project_group_id: req.params.project_id });
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
    
    console.log('Creating project with currentUser:', currentUser);
    
    const project = new Project({
      name,
      description,
      owner_id: currentUser
    });

    const savedProject = await project.save();
    console.log('Saved project with owner_id:', savedProject.owner_id);
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

    // Delete all entries belonging to the project
    await Entry.deleteMany({ project_group_id: req.params.project_id });
    
    // Delete the project
    await Project.findOneAndDelete({ _id: req.params.project_id, owner_id: currentUser });
    
    res.json({ status: "success", message: "Project and all its entries deleted" });
  } catch (error) {
    res.status(400).json({ detail: "Invalid project id" });
  }
});

// Update project
router.patch('/project/:project_id', async function (req, res) {
  try {
    const project = await Project.findOne({ _id: req.params.project_id, owner_id: currentUser });
    if (!project) {
      return res.status(404).json({ detail: "Project does not exist" });
    }

    const updateData = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.description) updateData.description = req.body.description;

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.project_id,
      updateData,
      { new: true }
    );

    res.json(projectHelper(updatedProject));
  } catch (error) {
    res.status(400).json({ detail: error.message });
  }
});

// Fix existing projects to use correct default user
router.patch('/fix-projects', async function (req, res) {
  try {
    await Project.updateMany(
      { owner_id: "691c8bf8d691e46d00068bf3" },
      { owner_id: "691c8bf8d691e46d00068d3d" }
    );
    res.json({ message: "Projects updated to correct default user" });
  } catch (error) {
    res.status(500).json({ detail: error.message });
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