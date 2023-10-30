import { revalidatePath } from 'next/cache';
import { getURL } from '@/src/lib/helpers';
import { getAccessToken } from '@/src/lib/fetch/apiUtils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/app/api/auth/[...nextauth]/route';

function AccountFormUpdate() {
  const handleSubmit = async (formData: FormData) => {
    'use server';
    try {
      const session = await getServerSession(authOptions);

      const userId = session?.user?.id;

      const accessToken = await getAccessToken(userId);
      const baseURL = getURL();

      const name = formData.get('name');
      const accountId = formData.get('accountId');

      // Define headers
      const requestHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      };

      const response = await fetch(
        `${baseURL}/api/dashboard/gtm/accounts/${accountId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ name, accountId }),
          headers: requestHeaders,
        }
      );

      const resText = await response.text();

      JSON.parse(resText);

      revalidatePath('/dashboard/gtm/accounts');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <form action={handleSubmit}>
        <label>
          Account ID:
          <input type="text" name="accountId" />
        </label>

        <label>
          New name:
          <input type="text" name="name" />{' '}
        </label>

        <button type="submit">Submit</button>
      </form>
    </div>
  );
}

export default AccountFormUpdate;
