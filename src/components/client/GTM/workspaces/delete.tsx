'use client';
import { useState } from 'react';

function FormDeleteWorkspace() {
  const [accountId, setAccountId] = useState('');
  const [containerId, setContainerId] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [workspaceData, setWorkspaceData] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(
        `/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();

      setWorkspaceData(data);

      setError(null);
    } catch (err: any) {
      setError(err.message);
      setWorkspaceData(null);
    }
  };

  return (
    <div>
      <p>DELETE WS call:</p>
      <form onSubmit={handleSubmit}>
        <label>
          Submit Account ID:
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          />
        </label>

        <label>
          Container ID:
          <input
            type="text"
            value={containerId}
            onChange={(e) => setContainerId(e.target.value)}
          />
        </label>

        <label>
          Workspace ID:
          <input
            type="text"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
          />
        </label>

        <button type="submit">Submit</button>
      </form>

      {workspaceData && (
        <div>
          <h2>WS Delete Data:</h2>
          <pre>{JSON.stringify(workspaceData, null, 2)}</pre>
        </div>
      )}

      {error && (
        <div>
          <h2>Error:</h2>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}

export default FormDeleteWorkspace;
