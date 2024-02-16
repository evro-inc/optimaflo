'use client';
import { useState } from 'react';

function FormDeleteBuiltInVariable() {
  const [accountId, setAccountId] = useState('');
  const [containerId, setContainerId] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [type, setType] = useState('');
  const [variableData, setVariableData] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(
        `/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables-built-in`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId,
            containerId,
            workspaceId,
            type,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();

      setVariableData(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setVariableData(null);
    }
  };

  return (
    <div>
      <p>CREATE BUILT IN VAR call:</p>
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
          <input type="text" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} />
        </label>

        <label>
          TYPE:
          <input type="text" value={type} onChange={(e) => setType(e.target.value)} />
        </label>

        <button type="submit">Submit</button>
      </form>

      {variableData && (
        <div>
          <h2>Workspace Data:</h2>
          <pre>{JSON.stringify(variableData, null, 2)}</pre>
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

export default FormDeleteBuiltInVariable;
