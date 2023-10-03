'use client';
import { useState } from 'react';
import AccountFormUpdate from './updateAccount';

function ClientTableRow({ account }) {
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  return (
    <>
      <tr key={account.accountId}>
        <td>{account.accountId}</td>
        <td>{account.name}</td>
        <td>
          <button onClick={() => setShowUpdateForm(true)}>Update</button>
        </td>
      </tr>
      {showUpdateForm && (
        <AccountFormUpdate
          selectedAccount={account}
          onClose={() => setShowUpdateForm(false)}
        />
      )}
    </>
  );
}

export default ClientTableRow;
