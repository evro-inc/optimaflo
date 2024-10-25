'use client';

import { ErrorComponent } from '@/src/components/client/Utils/Error';

export default function Error() {
  return <ErrorComponent platform="ga" feature="keyEvents" path="dashboard/ga/properties" />;
}
