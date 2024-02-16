'use client';
import { useState } from 'react';

function FormPreviewWorkspace() {
  const [accountId, setAccountId] = useState('');
  const [containerId, setContainerId] = useState('');
  const [workspaceId, setWorkspaceID] = useState('');
  const [workspaceData, setWorkspaceData] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(
        `/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/preview`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId,
            containerId,
            workspaceId,
          }),
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
      <p>CREATE PREVIEW call:</p>
      <form onSubmit={handleSubmit}>
        <label>
          Submit Account ID:
          <input type="text" value={accountId} onChange={(e) => setAccountId(e.target.value)} />
        </label>
        <label>
          Submit Container ID:
          <input type="text" value={containerId} onChange={(e) => setContainerId(e.target.value)} />
        </label>

        <label>
          WS ID:
          <input type="text" value={workspaceId} onChange={(e) => setWorkspaceID(e.target.value)} />
        </label>

        <button type="submit">Submit</button>
      </form>

      {workspaceData && (
        <div>
          <h2>Workspace Data:</h2>
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

export default FormPreviewWorkspace;
