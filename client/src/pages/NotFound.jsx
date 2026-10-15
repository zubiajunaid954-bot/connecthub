import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-6xl font-bold text-indigo-600">404</p>
      <p className="mt-2 text-slate-600">We couldn't find that page.</p>
      <Link to="/" className="btn-primary mt-6">
        Back to the forum
      </Link>
    </div>
  );
}
