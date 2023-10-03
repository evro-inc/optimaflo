'use client';
import { useState } from 'react';

function FormUpdateWorkspace() {
  const [accountId, setAccountId] = useState('');
  const [containerId, setContainerId] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [name, setNameContext] = useState('');
  const [description, setDescriptionName] = useState('');
  const [workspaceData, setWorkspaceData] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(
        `/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId,
            description,
            containerId,
            workspaceId,
            name,
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
      <p>UPDATE WS:</p>
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
          Submit Container ID:
          <input
            type="text"
            value={containerId}
            onChange={(e) => setContainerId(e.target.value)}
          />
        </label>
        <label>
          Submit Workspace ID:
          <input
            type="text"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
          />
        </label>

        <label>
          New name:
          <input
            type="text"
            value={name}
            onChange={(e) => setNameContext(e.target.value)}
          />
        </label>

        <label>
          Description:
          <input
            type="text"
            value={description}
            onChange={(e) => setDescriptionName(e.target.value)}
          />
        </label>

        <button type="submit">Submit</button>
      </form>

      {workspaceData && (
        <div>
          <h2>Account Data:</h2>
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

export default FormUpdateWorkspace;
