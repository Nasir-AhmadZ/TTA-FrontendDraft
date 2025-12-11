import { useState, useEffect, useContext } from 'react';
import GlassWrapper from '../../components/ui/GlassWrapper';
import GlobalContext from '../store/globalContext';
import classes from './goals.module.css';

function GoalsPage() {
  const globalCtx = useContext(GlobalContext);
  const [goals, setGoals] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectTimes, setProjectTimes] = useState({});

  useEffect(() => {
    fetchProjects();
    fetchProjectTimes();
  }, []);

  useEffect(() => {
    loadGoals();
  }, [globalCtx.theGlobalObject.username]);

  const loadGoals = () => {
    const username = globalCtx.theGlobalObject.username;
    if (username) {
      const savedGoals = localStorage.getItem(`goals_${username}`);
      if (savedGoals) {
        setGoals(JSON.parse(savedGoals));
      } else {
        setGoals([]);
      }
    } else {
      setGoals([]);
    }
  };

  const saveGoals = (newGoals) => {
    const username = globalCtx.theGlobalObject.username;
    if (username) {
      localStorage.setItem(`goals_${username}`, JSON.stringify(newGoals));
    }
    setGoals(newGoals);
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/timetrack/projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchProjectTimes = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/timetrack/entries');
      const entries = await response.json();
      
      const today = new Date().toISOString().split('T')[0];
      const times = {};
      
      entries.forEach(entry => {
        const entryDate = entry.date || entry.created_at?.split('T')[0];
        if (entryDate === today) {
          const projectId = entry.project_id;
          const duration = entry.duration_minutes || 0;
          times[projectId] = (times[projectId] || 0) + duration;
        }
      });
      
      setProjectTimes(times);
    } catch (error) {
      console.error('Error fetching project times:', error);
    }
  };

  const addGoal = () => {
    if (!selectedProjectId) {
      alert('Please select a project');
      return;
    }

    const selectedProject = projects.find(p => p.id == selectedProjectId);
    if (!selectedProject) {
      alert('Project not found');
      return;
    }

    const newGoal = {
      id: Date.now(),
      projectId: selectedProjectId,
      projectName: selectedProject.name,
      timeMinutes: 30
    };

    const newGoals = [...goals, newGoal];
    saveGoals(newGoals);
    setSelectedProjectId('');
    setShowAddGoal(false);
  };

  const updateGoalTime = (goalId, increment) => {
    const newGoals = goals.map(goal => {
      if (goal.id === goalId) {
        const newTime = goal.timeMinutes + (increment ? 30 : -30);
        return { ...goal, timeMinutes: Math.max(0, newTime) };
      }
      return goal;
    });
    saveGoals(newGoals);
  };

  const removeGoal = (goalId) => {
    const newGoals = goals.filter(goal => goal.id !== goalId);
    saveGoals(newGoals);
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className={classes.container}>
      <h1>Today's Goals</h1>
      
      <GlassWrapper>
        <div className={classes.header}>
          <h2>Today's Goals</h2>
          <button 
            onClick={() => setShowAddGoal(true)} 
            className={classes.addBtn}
          >
            +
          </button>
        </div>

        {showAddGoal && (
          <div className={classes.addGoalForm}>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className={classes.projectSelect}
            >
              <option value="">Select a project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <div className={classes.formButtons}>
              <button onClick={addGoal} className={classes.confirmBtn}>
                Add Goal
              </button>
              <button 
                onClick={() => setShowAddGoal(false)} 
                className={classes.cancelBtn}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className={classes.goalsList}>
          {goals.map(goal => (
            <div key={goal.id} className={classes.goalItem}>
              <div className={classes.goalInfo}>
                <h3>{goal.projectName}</h3>
                <div className={classes.timeContainer}>
                  <p className={classes.timeDisplay}>Goal: {formatTime(goal.timeMinutes)}</p>
                  <p className={classes.currentTime}>Today: {formatTime(projectTimes[goal.projectId] || 0)}</p>
                </div>
              </div>
              <div className={classes.controls}>
                <button 
                  onClick={() => updateGoalTime(goal.id, false)}
                  className={classes.minusBtn}
                >
                  -
                </button>
                <button 
                  onClick={() => updateGoalTime(goal.id, true)}
                  className={classes.plusBtn}
                >
                  +
                </button>
                <button 
                  onClick={() => removeGoal(goal.id)}
                  className={classes.removeBtn}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          {goals.length === 0 && !showAddGoal && (
            <p className={classes.emptyState}>No goals yet. Click + to add your first goal!</p>
          )}
        </div>
      </GlassWrapper>
    </div>
  );
}

export default GoalsPage;