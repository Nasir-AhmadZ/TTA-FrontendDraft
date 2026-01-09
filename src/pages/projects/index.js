import { useState, useEffect } from 'react';
import classes from '../../styles/projects.module.css';

import { useContext } from 'react';
import GlobalContext from "../../pages/store/globalContext"

function ProjectsPage() {
  const aws_url = "aeb46a8d8259045118b0803bb4bdd0e9-1361539024.eu-west-1.elb.amazonaws.com";
  const globalCtx = useContext(GlobalContext)
  const username = globalCtx.theGlobalObject.username;
  const [projects, setProjects] = useState([]);
  const [userID, setUserID] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  useEffect(() => {
        if (!username) return;

    const fetchUserID = async () => {
      try {
        // NOTE: likely /users/ not /user/
        const res = await fetch(
          `http://a256d1d89ae1341afafcc5c58023daea-1034684740.eu-west-1.elb.amazonaws.com:8000/users/${username}`
        );

        const text = await res.text();
        const data = JSON.parse(text);

        if (!res.ok) throw new Error(data.detail || text);

        setUserID(data.id);
      } catch (e) {
        console.error("Error fetching user id:", e);
        setUserID(null);
      }
    };

    fetchUserID();
  }, [username]);

  useEffect(() => {
    if (!userID) return;
    fetchProjects();
  }, [userID]);

  const fetchProjects = async () => {
    try {
      const res = await fetch(
        `http://${aws_url}:8002/projects/user/${userID}`
      );

      const text = await res.text();
      const data = JSON.parse(text);

      if (!res.ok) throw new Error(data.detail || text);

      setProjects(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error fetching projects:", e);
      setProjects([]);
    }
  };

  const createProject = async () => {
    if (!projectName || !projectDescription) {
      alert('Fill in both project name and description');
      return;
    }

    const response = await fetch(`http://${aws_url}:8002/projects/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: projectName,
        description: projectDescription,
        owner_id: userID
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
  };

  const deleteProject = async (projectId) => {
    if (!confirm('Delete project and all its entries?')) return;

    try {
      const response = await fetch(`http://${aws_url}:8002/project/${projectId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchProjects();
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const deleteAllUserProjects = async () => {
    if (!confirm('Delete ALL your projects and entries?')) return;

    try {
      const response = await fetch(`http://${aws_url}:8002/user/projects/${userID}`, {
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
      
        <h2>Create Project</h2>
        <div className={classes.inpt}>
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
        <button onClick={deleteAllUserProjects} className={classes.deleteBtn}>
          Delete All My Projects
        </button>
    </div>
  );
}

export default ProjectsPage;