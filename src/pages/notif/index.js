import { useState, useEffect } from 'react';
import classes from '../../styles/notif.module.css';

import { useContext } from 'react';
import GlobalContext from "../../pages/store/globalContext"

function NotifPage() {
  const aws_url = "acc16d535ac2743b2863e7a2ef6ee7b8-1367169829.eu-west-1.elb.amazonaws.com";
  const globalCtx = useContext(GlobalContext)
  const username = globalCtx.theGlobalObject.username;
  const [userID, setUserID] = useState(null);
  const [unreadnotif, setUnread] = useState([]);
  const [readnotif, setRead] = useState([]);

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
    fetchRead();
    fetchUnread();
  }, [userID]);

  const fetchUnread = async () => {
    try {
      const response = await fetch(`http://${aws_url}:8003/notifications/unread/${userID}`);
      const data = await response.json();
      setUnread(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchRead = async () => {
    try {
      const response = await fetch(`http://${aws_url}:8003/notifications/read/${userID}`);
      const data = await response.json();
      setRead(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const readNotif = async (entryId) => {
    try {
      const response = await fetch(`http://${aws_url}:8003/notifications/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opened: true
        })
      });
      
      if (response.ok) {
        fetchUnread();
        fetchRead();
      }
    } catch (error) {
      console.error('Error reading notification:', error);
    }
  };

  const deleteNotif = async (entryId) => {
    try {
      const response = await fetch(`http://${aws_url}:8003/notifications/${entryId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchRead();
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const deleteAllNotif = async () => {
    if (!confirm('Delete ALL notifications?')) return;

    try {
      const response = await fetch(`http://${aws_url}:8003/notifications`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchUnread();
        fetchRead();
      }
    } catch (error) {
      console.error('Error deleting all projects:', error);
    }
  };

  return (
      <div className={classes.container}>
        <h1>Notifications</h1>

          <h2>Unread Notifications</h2>
          <div className={classes.ntfs}>
            {unreadnotif.map(notif => (
              <div key={notif.id} className={classes.ntf}>
                <div>
                  <strong>{notif.message}</strong>
                  <p>{new Date(notif.timestamp).toLocaleString()}</p>
                  <button onClick={() => readNotif(notif.id)} className={classes.readBtn}>
                    Read
                  </button>
                </div>
              </div>
            ))}
          </div>

          <h2>Read Notifications</h2>
          <div className={classes.ntfs}>
            {readnotif.map(notif => (
              <div key={notif.id} className={classes.ntf}>
                <div>
                  <strong>{notif.message}</strong>
                  <p>{new Date(notif.timestamp).toLocaleString()}</p>
                  <button onClick={() => deleteNotif(notif.id)} className={classes.deleteBtn}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={deleteAllNotif} className={classes.deleteBtn}>
            Delete All Notifications
          </button>
      </div>
  );
}

export default NotifPage;