// /public/vote.js

export async function startVote(candidate, verifiers, votingPeriodSec = 10) {
  const res = await fetch('/vote/init', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({candidate, verifiers, votingPeriodSec})
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`startVote failed: ${text}`);
  }
  return res.text();
}

export async function submitVote(candidate, verifier, approve) {
  const res = await fetch('/vote/submit', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({candidate, verifier, approve})
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`submitVote failed: ${text}`);
  }
  return res.text();
}

export async function forceCompleteVote(candidate) {
  const res = await fetch('/vote/force-complete', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({candidate})
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`forceCompleteVote failed: ${text}`);
  }
  return res.text();
}
