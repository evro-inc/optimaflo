'use client';
import { useEffect, useState } from 'react';

function FormCreateVariable() {
  const [accountId, setAccountId] = useState('');
  const [containerId, setContainerId] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [type, setType] = useState('');
  const [name, setName] = useState('');
  const [parameters, setParameters] = useState({});
  const [formatValue /* setFormatValue */] = useState({});
  const [variableData, setVariableData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    switch (type) {
      case 'k':
        setParameters({
          decodeCookie: '',
          cookieName: '',
        });
        break;
      case 'aev':
        setParameters({
          variableType: '',
          urlComponentType: '',
          extraParam: '',
          defaultValue: '',
          convertNullToValue: '',
          convertUndefinedToValue: '',
          convertTrueToValue: '',
          convertFalseToValue: '',
        });
        break;
      case 'c':
        setParameters({
          constantValue: '',
          variableName: '',
          convertNull: '',
          convertUndefined: '',
          convertTrue: '',
          convertFalse: '',
        });
        break;

      default:
        setParameters({});
        break;
    }
  }, [type]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(
        `/api/dashboard/gtm/accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId,
            containerId,
            workspaceId,
            name,
            type,
            parameter: parameters, // send the parameters as an array of strings
            formatValue,
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

  const handleParameterChange = (key, value) => {
    setParameters((prevParameters) => ({
      ...prevParameters,
      [key]: value,
    }));
  };

  return (
    <div>
      <p>CREATE BUILT IN VAR call:</p>
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
          WS ID:
          <input
            type="text"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
          />
        </label>

        <label>
          TYPE:
          <input
            type="text"
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
        </label>

        <label>
          name:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        {Object.keys(parameters).map((key) => (
          <label key={key}>
            {key}:
            <input
              type="text"
              value={parameters[key]}
              onChange={(e) => handleParameterChange(key, e.target.value)}
            />
          </label>
        ))}
        {Object.keys(formatValue).map((key) => (
          <label key={key}>
            {key}:
            <input
              type="text"
              value={formatValue[key]}
              onChange={(e) => handleParameterChange(key, e.target.value)}
            />
          </label>
        ))}
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

export default FormCreateVariable;
