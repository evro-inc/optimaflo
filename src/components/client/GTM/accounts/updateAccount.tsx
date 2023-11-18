import { revalidatePath } from 'next/cache';
import { getURL } from '@/src/lib/helpers';
import { getAccessToken } from '@/src/lib/fetch/apiUtils';
import { useSession } from '@clerk/nextjs';


function AccountFormUpdate() {
  const HandleSubmit = async (formData: FormData) => {
    'use server';
            const {session} = useSession();

    try {

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
      <form action={HandleSubmit}>
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
