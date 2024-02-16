'use client';
import { useState } from 'react';

function FormSnippetContainer() {
  const [accountId, setAccountId] = useState('');
  const [containerId, setContainerId] = useState('');
  const [containerData, setContainerData] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(
        `/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}/snippet`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();

      setContainerData(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setContainerData(null);
    }
  };

  return (
    <div>
      <p>SNIPPET CONTAINER:</p>
      <form onSubmit={handleSubmit}>
        <label>
          Submit Account ID:
          <input type="text" value={accountId} onChange={(e) => setAccountId(e.target.value)} />
        </label>

        <label>
          Submit Container ID:
          <input type="text" value={containerId} onChange={(e) => setContainerId(e.target.value)} />
        </label>

        <button type="submit">Submit</button>
      </form>

      {containerData && (
        <div>
          <h2>Account Data:</h2>
          <pre>{JSON.stringify(containerData, null, 2)}</pre>
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

export default FormSnippetContainer;
