import { useState, useEffect } from 'react';
import classes from '../../styles/timetrack.module.css';

import { useContext } from 'react';
import GlobalContext from "../../pages/store/globalContext"

function GraphPage() {
  const aws_url = "aeb46a8d8259045118b0803bb4bdd0e9-1361539024.eu-west-1.elb.amazonaws.com";
  const globalCtx = useContext(GlobalContext)
  const username = globalCtx.theGlobalObject.username;
  const [projects, setProjects] = useState([]);
  const [userID, setUserID] = useState(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [graphSrc, setGraphSrc] = useState("");

  
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

  const getGraph = () => {
    if (!selectedProject) return;
    setGraphSrc(`http://localhost:8000/graph/proj/${selectedProject}`);
  };

  return (
    <div className={classes.container}>
      <h1>Graphing</h1>

      <h2>Graph by project</h2>
      <div className={classes.inpt}>
        <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
          <option value="">Select Project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <button className={classes.startBtn} onClick={getGraph} disabled={!selectedProject}>
          Get Graph
        </button>
      </div>

      {graphSrc && (
        <img
          src={graphSrc}
          alt="Project graph"
          style={{ marginTop: "1rem", maxWidth: "100%" }}
        />
      )}
    </div>
  );
}

export default GraphPage;