import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';
import { getURL } from '@/src/lib/helpers';

function AccountFormUpdate() {
  const handleSubmit = async (formData: FormData) => {
    'use server';
    try {
      const cookie: any = cookies();
      const cookieHeader: any = headers().get('cookie');
      const baseURL = getURL();

      const name = formData.get('name');
      const accountId = formData.get('accountId');

      // Define headers
      const requestHeaders = {
        'Content-Type': 'application/json',
      };

      // Add Cookie header if it's not null
      if (cookie) {
        requestHeaders['Cookie'] = cookieHeader;
      }

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
