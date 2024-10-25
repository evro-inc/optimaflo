'use server';
import { CardTitle, CardHeader, CardContent, Card, CardFooter } from '@/components/ui/card';
import { AvatarImage, AvatarFallback, Avatar } from '@/components/ui/avatar';
import ProfileInformation from './modalProfileData';
import { currentUser } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { getSubscription } from '@/src/lib/fetch/subscriptions';
import { ButtonCustomerPortal } from '@/src/components/client/Button/Button';
import { Button } from '@/src/components/ui/button';
import Link from 'next/link';

export default async function Profile() {
  const user = await currentUser();
  if (!user) return notFound();

  const subscription = await getSubscription(user.id);

  if (!subscription) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <Card className="md:col-span-6">
          <CardHeader>
            <CardTitle>Subscription Details No membership</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="font-medium">Sign Up Today</div>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/pricing">Subscribe</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }


  const invoices = subscription.Invoice;

  const mostRecentInvoice = invoices.reduce((latest, invoice) => {
    const currentDueDate = new Date(invoice.dueDate);
    return currentDueDate > new Date(latest.dueDate) ? invoice : latest;
  }, invoices[0]);

  // Convert the dueDate of the most recent invoice to a Date object
  const renewalDate = new Date(mostRecentInvoice.dueDate);

  return (
    <div className="flex flex-col justify-center items-center min-h-screen">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <Card className="md:col-span-6">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24">
              <AvatarImage alt="User avatar" src={user?.imageUrl} />
              <AvatarFallback>{user?.username}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div className="text-lg font-semibold">
                <span className="pr-1">{user?.firstName}</span>
                <span>{user?.lastName}</span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Email:{' '}
                {user?.emailAddresses.map((email) => (
                  <div key={email.id}>{email.emailAddress}</div>
                ))}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                User Name: {user?.username}
              </div>
            </div>
            <ProfileInformation />
          </CardContent>
        </Card>

        <Card className="md:col-span-6">
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="font-medium">Current Plan</div>
              <div>{subscription.Product.name}</div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Status</div>
              <div>{subscription.status}</div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Renewal Date</div>
              <div>{renewalDate.toLocaleDateString()}</div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Plan Features</div>
              <ul className="list-disc list-inside space-y-1">
                <li>Unlimited access to all features</li>
                <li>Priority customer support</li>
                <li>Access to beta features</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <ButtonCustomerPortal text="Change Plan" variant="create" />
          </CardFooter>
        </Card>

        {/* <Card className="md:col-span-12">
          <CardHeader>
            <CardTitle>Tier Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableCaption>Tier Limits</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Feature</TableHead>
                  <TableHead>Create Usage</TableHead>
                  <TableHead>Create Limit</TableHead>
                  <TableHead>Update Usage</TableHead>
                  <TableHead>Update Limit</TableHead>
                  <TableHead>Delete Usage</TableHead>
                  <TableHead>Delete Limit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tierLimits.map((data) => (
                  <TableRow key={data.id}>
                    <TableCell className="font-medium">{data.Feature.name}</TableCell>
                    <TableCell>{data.createUsage}</TableCell>
                    <TableCell>{data.createLimit}</TableCell>
                    <TableCell>{data.updateUsage}</TableCell>
                    <TableCell>{data.updateLimit}</TableCell>
                    <TableCell>{data.deleteUsage}</TableCell>
                    <TableCell>{data.deleteLimit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
}
