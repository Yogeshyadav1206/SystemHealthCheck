import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [machines, setMachines] = useState([]);

  useEffect(() => {
    fetch('http://localhost:8000/reports')
      .then(res => res.json())
      .then(data => setMachines(data))
      .catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="heading">🖥️ System Health Dashboard</h1>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Machine ID</th>
              <th>Platform</th>
              <th>Disk Encrypted</th>
              <th>Antivirus</th>
              <th>OS Update</th>
              <th>Sleep Timeout</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {machines.map((m, i) => {
              const sleepOk = m.sleep_timeout !== 'Too long';
              const updateOk = m.os_update_status === 'Up-to-date';
              const rowStatusOk = m.disk_encryption && sleepOk && updateOk;

              return (
                <tr
                  key={i}
                  className={rowStatusOk ? 'bg-safe' : 'bg-danger'}
                >
                  <td>{m.machine_id}</td>
                  <td>{m.platform}</td>
                  <td>{m.disk_encryption ? '✅ Yes' : '❌ No'}</td>
                  <td>{m.antivirus_status}</td>
                  <td>
                    {m.os_update_status === 'Up-to-date' ? '✅ Up-to-date' : '⚠️ Outdated'}
                  </td>
                  <td>{sleepOk ? `${m.sleep_timeout} min` : '⚠️ Too long'}</td>
                  <td>{new Date(m.last_checkin).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
