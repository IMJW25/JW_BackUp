//server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const excelFile = path.join(__dirname, 'links.xlsx');

function loadLinks() {
  if (!fs.existsSync(excelFile)) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([]);
    XLSX.utils.book_append_sheet(wb, ws, 'Links');
    XLSX.writeFile(wb, excelFile);
  }
  const wb = XLSX.readFile(excelFile);
  const ws = wb.Sheets['Links'];
  return XLSX.utils.sheet_to_json(ws);
}

function saveLink(link, wallet) {
  const data = loadLinks();
  data.push({ link, wallet, time: new Date().toISOString() });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Links');
  XLSX.writeFile(wb, excelFile);
}

// 투표 관련 상태와 함수 추가
let pendingVotes = {}; // { candidateAddr: { votes: {}, timerId, startedAt, neededCount } }

app.use(express.json()); // JSON 바디 파싱 미들웨어 추가

app.post('/vote/init', (req, res) => {
  const { candidate, verifiers, votingPeriodSec } = req.body;
  if (pendingVotes[candidate]) {
    return res.status(400).send('Voting already in progress');
  }
  pendingVotes[candidate] = {
    votes: {},
    startedAt: Date.now(),
    neededCount: verifiers.length,
    timerId: setTimeout(() => completeVote(candidate), votingPeriodSec * 1000)
  };
  verifiers.forEach(v => {
    pendingVotes[candidate].votes[v] = null; // 미응답 상태
  });
  res.send('Voting started');
});

app.post('/vote/submit', (req, res) => {
  const { candidate, verifier, approve } = req.body;
  if (!pendingVotes[candidate] || !(verifier in pendingVotes[candidate].votes)) {
    return res.status(400).send('Invalid voting attempt');
  }
  // 이미 투표한 경우 덮어쓰기 없이 종료하도록 할 수도 있음
  if (pendingVotes[candidate].votes[verifier] !== null) {
    return res.status(400).send('Already voted');
  }
  pendingVotes[candidate].votes[verifier] = !!approve;
  res.send('Vote recorded');
});

function completeVote(candidate) {
  const voteObj = pendingVotes[candidate];
  if (!voteObj) return;
  // 미응답 검증자 자동 반대 처리
  Object.keys(voteObj.votes).forEach(v => {
    if (voteObj.votes[v] === null) voteObj.votes[v] = false;
  });
  const yesVotes = Object.values(voteObj.votes).filter(v => v).length;
  const verifierCount = voteObj.neededCount;
  if (yesVotes * 3 >= verifierCount * 2) {
    console.log(`Candidate ${candidate} approved with ${yesVotes}/${verifierCount} votes.`);
    // 실제 컨트랙트 호출은 별도 처리 필요
    // 예: contract.methods.approveCandidate(candidate, yesVotes, verifierCount).send({from: ownerAddr});
  } else {
    console.log(`Candidate ${candidate} rejected with ${yesVotes}/${verifierCount} votes.`);
  }
  clearTimeout(voteObj.timerId);
  delete pendingVotes[candidate];
}

app.post('/vote/force-complete', (req, res) => {
  const { candidate } = req.body;
  completeVote(candidate);
  res.send('Vote force completed');
});

io.on('connection', (socket) => {
  console.log('클라이언트 연결됨');
  socket.emit('initData', loadLinks());

  socket.on('newLink', ({ link, wallet }) => {
    saveLink(link, wallet);
    io.emit('newLink', { link, wallet, time: new Date().toISOString() });
  });
});

app.use(express.static('public'));

server.listen(3000, () => {
  console.log('서버 실행: http://localhost:3000');
});
