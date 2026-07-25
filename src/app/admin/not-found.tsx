import { redirect } from 'next/navigation';

/** Never show a 404 page in admin — send to the dashboard. */
export default function AdminNotFound() {
  redirect('/admin');
}
