import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postsApi, errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Arrow = ({ up }) => (
  <svg className={`h-5 w-5 ${up ? '' : 'rotate-180'}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M10 4l7 9H3z" />
  </svg>
);

// Optimistic voting: update the UI instantly, roll back if the request fails.
export default function VoteButtons({ postId, score, userVote }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [state, setState] = useState({ score, userVote });
  const [busy, setBusy] = useState(false);

  useEffect(() => setState({ score, userVote }), [score, userVote]);

  const vote = async (clicked) => {
    if (!user) return navigate('/login', { state: { from: window.location.pathname } });
    if (busy) return undefined;
    const next = state.userVote === clicked ? 0 : clicked; // clicking your own vote undoes it
    const previous = state;
    setState({ score: state.score + next - state.userVote, userVote: next });
    setBusy(true);
    try {
      const res = await postsApi.vote(postId, next);
      setState({ score: res.score, userVote: res.userVote });
    } catch (err) {
      setState(previous);
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  const base = 'rounded p-1 transition hover:bg-slate-100 disabled:opacity-50';
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button onClick={() => vote(1)} disabled={busy} aria-label="Upvote" aria-pressed={state.userVote === 1} className={`${base} ${state.userVote === 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
        <Arrow up />
      </button>
      <span className={`text-sm font-semibold tabular-nums ${state.userVote === 1 ? 'text-indigo-600' : state.userVote === -1 ? 'text-rose-600' : 'text-slate-700'}`}>{state.score}</span>
      <button onClick={() => vote(-1)} disabled={busy} aria-label="Downvote" aria-pressed={state.userVote === -1} className={`${base} ${state.userVote === -1 ? 'text-rose-600' : 'text-slate-400'}`}>
        <Arrow />
      </button>
    </div>
  );
}
