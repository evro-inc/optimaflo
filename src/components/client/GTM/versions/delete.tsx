'use client';
import { useState } from 'react';

function FormDELETEeVersion() {
  const [accountId, setAccountId] = useState('');
  const [containerId, setContainerId] = useState('');
  const [versionId, setVersionId] = useState('');
  const [workspaceData, setWorkspaceData] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(
        `/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}/versions/${versionId}/publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId,
            containerId,
            versionId,
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
      <p>DELETE Version:</p>
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
          Version ID:
          <input type="text" value={versionId} onChange={(e) => setVersionId(e.target.value)} />
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

export default FormDELETEeVersion;
