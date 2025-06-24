import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { getDatabase, ref, onValue, set } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyA0AXNFqkyr1KbWOv0mtHemU1fGsQIStHU",
  authDomain: "tgneuroai.firebaseapp.com",
  projectId: "tgneuroai",
  storageBucket: "tgneuroai.firebasestorage.app",
  messagingSenderId: "681917491498",
  appId: "1:681917491498:web:3e99a66a721f152dbb1653"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);

const userNFTs = [
  { url: 'https://iili.io/FIkdc3x.gif', name: 'NFT #1 - Free', icon: '🎖️', hashRate: 15 },
  { url: 'https://iili.io/FIkdhGa.gif', name: 'NFT #2 - 5 TON', icon: '🥇', hashRate: 20 },
  { url: 'https://iili.io/FIkdj6J.gif', name: 'NFT #3 - 12 TON', icon: '🥈', hashRate: 25 },
  { url: 'https://iili.io/FIkdSjt.gif', name: 'NFT #4 - 25 TON', icon: '🥉', hashRate: 30 },
  { url: 'https://iili.io/FIkdXCg.gif', name: 'NFT #5 - 50 TON', icon: '🏆', hashRate: 50 },
];

const tasks = [
  { id: 'telegram', name: 'Join Telegram', icon: '✅', reward: 10, link: 'https://t.me/neuroai' },
  { id: 'twitter', name: 'Follow Twitter', icon: '✅', reward: 5, link: 'https://twitter.com/neuroai' },
  { id: 'share', name: 'Share Link', icon: '✅', reward: 3, link: '' },
];

// Cache Data
function cacheData(key, data, expiryMinutes = 10) {
  const item = { data, timestamp: Date.now() + expiryMinutes * 60 * 1000 };
  localStorage.setItem(key, JSON.stringify(item));
}
function getCachedData(key) {
  const item = localStorage.getItem(key);
  if (!item) return null;
  const { data, timestamp } = JSON.parse(item);
  if (Date.now() > timestamp) {
    localStorage.removeItem(key);
    return null;
  }
  return data;
}

// Load Home Data
async function loadHomeData() {
  const userAddress = localStorage.getItem('userAddress');
  if (!userAddress) return;
  const cachedHome = getCachedData('homeData');
  if (cachedHome) {
    document.getElementById('user-balance').innerHTML = cachedHome.balance;
    document.getElementById('nft-preview').innerHTML = cachedHome.nftPreview;
    document.getElementById('task-preview').innerHTML = cachedHome.taskPreview;
    document.getElementById('leaderboard-preview').innerHTML = cachedHome.leaderboardPreview;
    return;
  }
  const userDoc = await getDoc(doc(db, 'users', userAddress));
  const user = userDoc.data() || { balance: 0, nfts: [userNFTs[0].url] };
  document.getElementById('user-balance').innerHTML = `${user.balance.toFixed(2)} <span class="text-yellow-300">NAI</span>`;
  document.getElementById('nft-preview').innerHTML = user.nfts.slice(0, 2).map(url => {
    const nft = userNFTs.find(n => n.url === url);
    return `<li class="flex justify-between">${nft.icon} ${nft.name} - <span>${nft.name.includes('Free') ? 'Free' : nft.name.split('-')[1]}</span></li>`;
  }).join('');
  document.getElementById('task-preview').innerHTML = tasks.map(task => `
    <li>${task.icon} ${task.name} - <span class="text-green-400">+${task.reward} NAI</span></li>
  `).join('');
  const leaderboardRef = ref(rtdb, 'leaderboard');
  onValue(leaderboardRef, snapshot => {
    const data = snapshot.val() || {};
    const leaderboardPreview = Object.values(data).slice(0, 1).map((u, i) => `
      🥇 ${u.walletAddress.slice(0, 4)}...${u.walletAddress.slice(-4)} - ${u.balance.toFixed(2)} NAI
    `).join('');
    document.getElementById('leaderboard-preview').innerHTML = leaderboardPreview;
    cacheData('homeData', {
      balance: document.getElementById('user-balance').innerHTML,
      nftPreview: document.getElementById('nft-preview').innerHTML,
      taskPreview: document.getElementById('task-preview').innerHTML,
      leaderboardPreview,
    });
  }, { onlyOnce: true });
}

// Load Referral Data
async function loadReferralData() {
  const userAddress = localStorage.getItem('userAddress');
  if (!userAddress) return;
  const cachedReferral = getCachedData('referralData');
  if (cachedReferral) {
    document.getElementById('referral-link').value = cachedReferral.link;
    document.getElementById('referral-stats').innerHTML = cachedReferral.stats;
    return;
  }
  const userDoc = await getDoc(doc(db, 'users', userAddress));
  let user = userDoc.data();
  if (!user) {
    user = { walletAddress: userAddress, referralCode: Math.random().toString(36).substring(2, 8), balance: 0, nfts: [userNFTs[0].url], tasksCompleted: [] };
    await setDoc(doc(db, 'users', userAddress), user);
  }
  const referralLink = `https://neuroai.com?ref=${user.referralCode}`;
  document.getElementById('referral-link').value = referralLink;
  const referrals = await getDocs(collection(db, 'referrals'));
  const userReferrals = referrals.docs.filter(doc => doc.data().referrer === userAddress);
  const totalCommission = userReferrals.reduce((sum, doc) => sum + doc.data().commission, 0);
  const referralStats = `
    <div class="referral-card bg-gray-800 py-2 px-3 rounded-lg flex justify-between items-center text-sm hover:shadow-lg hover:shadow-purple-500/50 transition-shadow">
      <span class="font-semibold">Total Referrals</span>
      <span>${userReferrals.length}</span>
      <span>${totalCommission.toFixed(2)} NAI</span>
    </div>
  `;
  document.getElementById('referral-stats').innerHTML = referralStats;
  cacheData('referralData', { link: referralLink, stats: referralStats });
}

// Load NFT List
async function loadNFTList() {
  const userAddress = localStorage.getItem('userAddress');
  if (!userAddress) return;
  const cachedNFTs = getCachedData('nftData');
  if (cachedNFTs) {
    document.getElementById('nft-list').innerHTML = cachedNFTs.nftList;
    document.getElementById('your-nfts').innerHTML = cachedNFTs.yourNFTs;
    return;
  }
  const userDoc = await getDoc(doc(db, 'users', userAddress));
  const user = userDoc.data() || { nfts: [userNFTs[0].url] };
  const nftList = user.nfts.map(url => {
    const nft = userNFTs.find(n => n.url === url) || userNFTs[0];
    return `
      <div class="nft-card bg-gray-800 p-3 rounded-lg flex items-center space-x-4 hover:shadow-lg hover:shadow-purple-500/50 transition-shadow" onclick="selectNFT('${nft.url}')">
        <img data-src="${nft.url}" alt="${nft.name}" class="w-16 h-16 rounded-md border border-purple-500" />
        <div class="flex-1">
          <span class="text-sm font-semibold">${nft.icon} ${nft.name}</span>
        </div>
      </div>
    `;
  }).join('');
  const yourNFTs = userNFTs.map(nft => `
    <div class="nft-card bg-gray-800 p-3 rounded-lg flex items-center space-x-4 hover:shadow-lg hover:shadow-purple-500/50 transition-shadow">
      <img data-src="${nft.url}" alt="${nft.name}" class="w-16 h-16 rounded-md border border-purple-500" />
      <div class="flex-1">
        <span class="text-sm font-semibold">${nft.icon} ${nft.name}</span>
      </div>
      <button onclick="buyNFT('${nft.url}')" class="bg-${nft.name.includes('Free') ? 'blue-500' : 'yellow-500'} text-${nft.name.includes('Free') ? 'white' : 'black'} px-3 py-1 rounded hover:bg-${nft.name.includes('Free') ? 'blue-600' : 'yellow-600'} transition">${nft.name.includes('Free') ? 'Claim' : 'Buy'}</button>
    </div>
  `).join('');
  document.getElementById('nft-list').innerHTML = nftList;
  document.getElementById('your-nfts').innerHTML = yourNFTs;
  cacheData('nftData', { nftList, yourNFTs });
}

// Buy/Claim NFT
async function buyNFT(url) {
  const userAddress = localStorage.getItem('userAddress');
  if (!userAddress) return;
  const userDoc = await getDoc(doc(db, 'users', userAddress));
  let user = userDoc.data();
  const nft = userNFTs.find(n => n.url === url);
  if (user.nfts.includes(url)) return alert('NFT already owned');
  if (nft.name.includes('Free')) {
    user.nfts.push(url);
    await updateDoc(doc(db, 'users', userAddress), { nfts: user.nfts });
    alert('NFT claimed!');
  } else {
    alert('Buy functionality coming soon!');
  }
  await loadNFTList();
}

// Select NFT
async function selectNFT(url) {
  const userAddress = localStorage.getItem('userAddress');
  if (!userAddress) return;
  const nft = userNFTs.find(n => n.url === url) || userNFTs[0];
  await updateDoc(doc(db, 'mining', userAddress), {
    user: userAddress,
    nft: url,
    hashRate: nft.hashRate,
    lastUpdated: new Date().toISOString(),
  });
}

// Load Mining Stats
async function loadMiningStats() {
  const userAddress = localStorage.getItem('userAddress');
  if (!userAddress) return;
  const cachedMining = getCachedData('miningData');
  if (cachedMining) {
    document.getElementById('mining-info').innerHTML = cachedMining.info;
    document.getElementById('user-balance').innerHTML = cachedMining.balance;
    return;
  }
  const miningDoc = await getDoc(doc(db, 'mining', userAddress));
  let mining = miningDoc.data();
  if (!mining) {
    mining = { user: userAddress, nft: userNFTs[0].url, hashRate: userNFTs[0].hashRate, tokensMined: 0, lastUpdated: new Date().toISOString() };
    await setDoc(doc(db, 'mining', userAddress), mining);
  }
  const elapsed = (Date.now() - new Date(mining.lastUpdated)) / 1000;
  const tokensMined = mining.hashRate * elapsed * 0.0001;
  mining.tokensMined += tokensMined;
  mining.lastUpdated = new Date().toISOString();
  await updateDoc(doc(db, 'mining', userAddress), mining);
  const userDoc = await getDoc(doc(db, 'users', userAddress));
  let user = userDoc.data();
  user.balance += tokensMined;
  await updateDoc(doc(db, 'users', userAddress), { balance: user.balance });
  const miningInfo = `
    <p class="mt-3 text-sm text-gray-100">Your Mining Power: <strong>${mining.hashRate} Hash/s</strong></p>
    <p class="text-sm text-gray-100">Total Mined: <strong>${mining.tokensMined.toFixed(2)} NAI</strong></p>
  `;
  document.getElementById('mining-info').innerHTML = miningInfo;
  document.getElementById('user-balance').innerHTML = `${user.balance.toFixed(2)} <span class="text-yellow-300">NAI</span>`;
  cacheData('miningData', { info: miningInfo, balance: document.getElementById('user-balance').innerHTML });
  set(ref(rtdb, `leaderboard/${userAddress}`), {
    walletAddress: userAddress,
    balance: user.balance,
  });
}

// Load Tasks
async function loadTasks() {
  const userAddress = localStorage.getItem('userAddress');
  if (!userAddress) return;
  const cachedTasks = getCachedData('taskData');
  if (cachedTasks) {
    document.getElementById('task-list').innerHTML = cachedTasks.list;
    return;
  }
  const userDoc = await getDoc(doc(db, 'users', userAddress));
  const user = userDoc.data() || { tasksCompleted: [] };
  const taskList = tasks.map(task => `
    <div class="task-card bg-gray-800 p-3 rounded-lg flex justify-between items-center hover:shadow-lg hover:shadow-purple-500/50 transition-shadow">
      <span>${task.icon} ${task.name} - <span class="text-green-400">+${task.reward} NAI</span></span>
      <button onclick="completeTask('${task.id}')" class="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-white transition ${user.tasksCompleted.includes(task.id) ? 'opacity-50 cursor-not-allowed' : ''}" ${user.tasksCompleted.includes(task.id) ? 'disabled' : ''}>
        ${user.tasksCompleted.includes(task.id) ? 'Completed' : 'Complete'}
      </button>
    </div>
  `).join('');
  document.getElementById('task-list').innerHTML = taskList;
  cacheData('taskData', { list: taskList });
}

// Complete Task
async function completeTask(taskId) {
  const userAddress = localStorage.getItem('userAddress');
  if (!userAddress) return;
  const userDoc = await getDoc(doc(db, 'users', userAddress));
  let user = userDoc.data();
  if (user.tasksCompleted.includes(taskId)) return;
  const task = tasks.find(t => t.id === taskId);
  if (task.link) window.open(task.link, '_blank');
  user.tasksCompleted.push(taskId);
  user.balance += task.reward;
  await updateDoc(doc(db, 'users', userAddress), { tasksCompleted: user.tasksCompleted, balance: user.balance });
  await loadTasks();
  await loadHomeData();
  set(ref(rtdb, `leaderboard/${userAddress}`), {
    walletAddress: userAddress,
    balance: user.balance,
  });
}

// Load Leaderboards
async function loadLeaderboards() {
  const userAddress = localStorage.getItem('userAddress');
  if (!userAddress) return;
  const cachedLeaderboard = getCachedData('leaderboardData');
  if (cachedLeaderboard) {
    document.getElementById('user-rank').innerHTML = cachedLeaderboard.rank;
    document.getElementById('miners-leaderboard').innerHTML = cachedLeaderboard.list;
    return;
  }
  const leaderboardRef = ref(rtdb, 'leaderboard');
  onValue(leaderboardRef, snapshot => {
    const data = snapshot.val() || {};
    const users = Object.values(data).sort((a, b) => b.balance - a.balance);
    const userRank = users.findIndex(u => u.walletAddress === userAddress) + 1;
    const rankText = `Your Rank: ${userRank || 'Not ranked'}`;
    const leaderboardList = users.slice(0, 50).map((u, i) => `
      <div class="bg-${i < 3 ? 'gradient-to-r from-purple-600 to-blue-600' : 'gray-800'} p-3 rounded ${i < 3 ? 'text-base font-semibold shadow-lg shadow-purple-500/50' : ''}">
        ${i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i+1}.`} ${u.walletAddress.slice(0, 4)}...${u.walletAddress.slice(-4)} - ${u.balance.toFixed(2)} NAI
      </div>
    `).join('');
    document.getElementById('user-rank').innerHTML = rankText;
    document.getElementById('miners-leaderboard').innerHTML = leaderboardList;
    cacheData('leaderboardData', { rank: rankText, list: leaderboardList });
  }, { onlyOnce: true });
}

// Initialize User
async function initializeUser(userAddress) {
  const userDoc = await getDoc(doc(db, 'users', userAddress));
  if (!userDoc.exists()) {
    await setDoc(doc(db, 'users', userAddress), {
      walletAddress: userAddress,
      referralCode: Math.random().toString(36).substring(2, 8),
      balance: 0,
      nfts: [userNFTs[0].url],
      tasksCompleted: [],
    });
  }
  await updateDoc(doc(db, 'users', userAddress), { lastActive: new Date().toISOString() });
  const user = (await getDoc(doc(db, 'users', userAddress))).data();
  set(ref(rtdb, `leaderboard/${userAddress}`), {
    walletAddress: userAddress,
    balance: user.balance,
  });
}

// Export functions
window.loadHomeData = loadHomeData;
window.loadReferralData = loadReferralData;
window.loadNFTList = loadNFTList;
window.buyNFT = buyNFT;
window.selectNFT = selectNFT;
window.loadMiningStats = loadMiningStats;
window.loadTasks = loadTasks;
window.completeTask = completeTask;
window.loadLeaderboards = loadLeaderboards;
window.initializeUser = initializeUser;