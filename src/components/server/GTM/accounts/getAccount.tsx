// components/GTMListAccounts.server.js
import React from 'react';
import { gtmListAccounts } from '@/src/lib/actions/accounts';

export default async function GTMListAccounts() {
  const listAccountData = await gtmListAccounts();

  if (!listAccountData) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {listAccountData.data && (
        <ul>
          {listAccountData.data.map((account) => (
            <li key={account.accountId}>
              <p>{account.name}</p>
              <p>({account.accountId})</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
