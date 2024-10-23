'use client';

import { ErrorComponent } from '@/src/components/client/Utils/Error';

export default function Error() {
  return <ErrorComponent platform="gtm" feature="versions" path="dashboard/gtm/entities" />;
}
