import { Suspense } from 'react';
import BookingConfirmationPage from './ConfirmationView';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BookingConfirmationPage />
    </Suspense>
  );
}
