import { redirect } from 'next/navigation';

/** Never show a 404 page — send shoppers home. */
export default function NotFound() {
  redirect('/');
}
