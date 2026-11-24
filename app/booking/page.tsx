import { Suspense } from 'react';
import BookingPage from './BookingView';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BookingPage />
    </Suspense>
  );
}
