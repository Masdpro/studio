import { redirect } from 'next/navigation';

// Requesting and tracking errands now happen on one page; old links land there with the form open.
export default function CreateErrandPage() {
  redirect('/errands?new=1');
}
