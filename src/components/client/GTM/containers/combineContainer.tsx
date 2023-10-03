'use client';
import { useState } from 'react';

function FormCombineContainer() {
  const [accountId, setAccountId] = useState('');
  const [containerId, setContainerId] = useState('');
  const [containerIdToCombine, setContainerIdToCombine] = useState('');
  const [containerData, setContainerData] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(
        `/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}:combine`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId,
            containerId,
            containerIdToCombine,
          }),
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
      <p>Combine CONTAINER:</p>
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
          Submit Container ID to combine into:
          <input
            type="text"
            value={containerId}
            onChange={(e) => setContainerId(e.target.value)}
          />
        </label>

        <label>
          Combine Container ID from (will be deleted):
          <input
            type="text"
            value={containerIdToCombine}
            onChange={(e) => setContainerIdToCombine(e.target.value)}
          />
        </label>

        <button type="submit">Submit</button>
      </form>

      {containerData && (
        <div>
          <h2>Container Data:</h2>
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

export default FormCombineContainer;
