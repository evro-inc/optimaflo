'use client';

import { ErrorComponent } from '@/src/components/client/Utils/Error';

export default function Error() {
  return <ErrorComponent platform="gtm" feature="containers" path="dashboard/gtm/entities" />;
}
