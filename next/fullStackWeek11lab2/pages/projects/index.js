import { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import classes from './projects.module.css';

function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDescription, setEditProjectDescription] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/timetrack/projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const createProject = async () => {
    if (!projectName || !projectDescription) {
      alert('Please fill in both project name and description');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/timetrack/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          description: projectDescription
        })
      });
      
      if (response.ok) {
        setProjectName('');
        setProjectDescription('');
        fetchProjects();
        alert('Project created successfully!');
      } else {
        const result = await response.json();
        alert('Error creating project: ' + result.detail);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Network error creating project');
    }
  };

  const deleteProject = async (projectId) => {
    if (!confirm('Delete project and all its entries?')) return;

    try {
      const response = await fetch(`http://localhost:8000/api/timetrack/project/${projectId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchProjects();
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const updateProject = async () => {
    if (!selectedProjectId || !editProjectName || !editProjectDescription) return;

    try {
      const response = await fetch(`http://localhost:8000/api/timetrack/project/${selectedProjectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editProjectName,
          description: editProjectDescription
        })
      });
      
      if (response.ok) {
        setSelectedProjectId('');
        setEditProjectName('');
        setEditProjectDescription('');
        fetchProjects();
      }
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const deleteAllUserProjects = async () => {
    if (!confirm('Delete ALL your projects and entries?')) return;

    try {
      const response = await fetch('http://localhost:8000/api/timetrack/user/projects', {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchProjects();
      }
    } catch (error) {
      console.error('Error deleting all projects:', error);
    }
  };

  return (
    <div className={classes.container}>
      <h1>Project Management</h1>
      
      <Card>
        <h2>Create Project</h2>
        <div className={classes.form}>
          <input
            type="text"
            placeholder="Project name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Project description"
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
          />
          <button onClick={createProject} className={classes.createBtn}>
            Create Project
          </button>
        </div>
      </Card>

      <Card>
        <h2>Update Project</h2>
        <div className={classes.form}>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            <option value="">Select Project to Edit</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="New project name"
            value={editProjectName}
            onChange={(e) => setEditProjectName(e.target.value)}
          />
          <input
            type="text"
            placeholder="New project description"
            value={editProjectDescription}
            onChange={(e) => setEditProjectDescription(e.target.value)}
          />
          <button onClick={updateProject} className={classes.updateBtn}>
            Update Project
          </button>
        </div>
      </Card>

      <Card>
        <h2>Your Projects</h2>
        <div className={classes.projects}>
          {projects.map(project => (
            <div key={project.id} className={classes.project}>
              <div>
                <strong>{project.name}</strong>
                <p>{project.description}</p>
              </div>
              <button onClick={() => deleteProject(project.id)} className={classes.deleteBtn}>
                Delete
              </button>
            </div>
          ))}
        </div>
        <button onClick={deleteAllUserProjects} className={classes.deleteAllBtn}>
          Delete All My Projects
        </button>
      </Card>
    </div>
  );
}

export default ProjectsPage;