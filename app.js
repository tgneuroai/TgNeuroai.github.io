const userNFTs = [
  { url: 'https://iili.io/FIkdc3x.gif', name: 'Neon Starter', icon: '🎖️', hashRate: 22, price: 0 },
  { url: 'https://iili.io/FIkdhGa.gif', name: 'Quantum Spark', icon: '🥇', hashRate: 44, price: 25 },
  { url: 'https://iili.io/FIkdj6J.gif', name: 'Astro Core', icon: '🥈', hashRate: 54, price: 39 },
  { url: 'https://iili.io/FIkdSjt.gif', name: 'Cosmic Surge', icon: '🥉', hashRate: 74, price: 49 },
  { url: 'https://iili.io/FIkdXCg.gif', name: 'Galactic Prime', icon: '🏆', hashRate: 99, price: 109 },
];

const tasks = [
  { id: 'telegram', name: 'Join Telegram', icon: '✅', reward: 10, link: 'https://t.me/neuroai' },
  { id: 'twitter', name: 'Follow Twitter', icon: '✅', reward: 5, link: 'https://twitter.com/neuroai' },
  { id: 'share', name: 'Share Link', icon: '✅', reward: 3, link: '' },
];

const mockLeaderboard = [
  { walletAddress: '0x1234...abcd', balance: 1000 },
  { walletAddress: '0x5678...efgh', balance: 800 },
  { walletAddress: '0x9012...ijkl', balance: 600 },
];

let userData = {
  walletAddress: null,
  balance: 0,
  nfts: [userNFTs[0].url], // Free NFT by default
  tasksCompleted: [],
  referralCode: 'abc123',
  mining: { nft: null, hashRate: 0, tokensMined: 0, lastUpdated: null, isMining: false },
  referrals: { level1: [], level2: [], level3: [] },
};

let selectedNFT = userNFTs[0].url;
let userAddress = localStorage.getItem('userAddress') || null;

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

// Lazy Load Images
function lazyLoadImages() {
  const images = document.querySelectorAll('img[data-src]');
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.add('loaded');
        observer.unobserve(img);
      }
    });
  });
  images.forEach(img => observer.observe(img));
}

// Section Switch
function showSection(id) {
  ['home', 'mining', 'referral', 'tasks', 'leaderboard', 'nft-selection'].forEach(section => {
    document.getElementById(section).classList.add('hidden');
    const navButton = document.getElementById(`nav-${section}`);
    if (navButton) navButton.classList.remove('active');
  });
  document.getElementById(id).classList.remove('hidden');
  const navButton = document.getElementById(`nav-${id}`);
  if (navButton) navButton.classList.add('active');
  if (id === 'mining') {
    document.getElementById('mining-card').style.backgroundImage = `url('${selectedNFT}')`;
    loadMiningStats();
  }
  if (id === 'referral') loadReferralData();
  if (id === 'nft-selection') loadNFTList();
  if (id === 'tasks') loadTasks();
  if (id === 'leaderboard') loadLeaderboards();
  if (id === 'home') loadHomeData();
  lazyLoadImages();
}

// Copy Referral Link
function copyReferralLink() {
  const link = document.getElementById('referral-link');
  link.select();
  document.execCommand('copy');
  alert('Link copied!');
}

// Show Mining Popup
function showMiningPopup(url) {
  const nft = userNFTs.find(n => n.url === url) || userNFTs[0];
  document.getElementById('popup-nft-image').setAttribute('data-src', nft.url);
  document.getElementById('popup-nft-name').textContent = nft.name;
  document.getElementById('popup-nft-hash').textContent = `Hash Rate: ${nft.hashRate} Hash/s`;
  document.getElementById('start-mining').onclick = () => startMining(nft.url);
  document.getElementById('mining-popup').classList.remove('hidden');
  lazyLoadImages();
}

// Close Popup
function closePopup() {
  document.getElementById('mining-popup').classList.add('hidden');
}

// Start Mining
function startMining(url) {
  if (!userAddress) return alert('Please connect wallet');
  const nft = userNFTs.find(n => n.url === url) || userNFTs[0];
  selectedNFT = url;
  userData.mining = {
    nft: url,
    hashRate: nft.hashRate,
    tokensMined: 0,
    lastUpdated: new Date().toISOString(),
    isMining: true,
  };
  document.getElementById('mining-button').textContent = 'Mining...';
  document.getElementById('mining-button').classList.add('mining-active');
  closePopup();
  showSection('mining');
  loadMiningStats();
}

// Claim Mining Rewards
function claimMining() {
  if (!userData.mining.isMining) return alert('Mining not started');
  const elapsed = (Date.now() - new Date(userData.mining.lastUpdated)) / 1000;
  if (elapsed < 12 * 60 * 60) return alert('You can claim every 12 hours');
  const tokensMined = userData.mining.hashRate * elapsed * 0.0001;
  userData.mining.tokensMined += tokensMined;
  userData.balance += tokensMined;
  userData.mining.isMining = false;
  userData.mining.lastUpdated = null;
  document.getElementById('mining-button').textContent = 'Start Mining';
  document.getElementById('mining-button').classList.remove('mining-active');
  loadMiningStats();
  loadHomeData();
  loadLeaderboards();
}

// Select NFT
function selectNFT(url) {
  if (!userAddress) return alert('Please connect wallet');
  if (!userData.nfts.includes(url)) return alert('You don\'t own this NFT');
  showMiningPopup(url);
}

// Buy/Claim NFT
function buyNFT(url) {
  if (!userAddress) return alert('Please connect wallet');
  const nft = userNFTs.find(n => n.url === url);
  if (userData.nfts.includes(url)) return alert('NFT already owned');
  if (nft.price === 0) {
    userData.nfts.push(url);
    alert('NFT claimed!');
  } else {
    alert(`Buy ${nft.name} for ${nft.price} TON coming soon!`);
  }
  loadNFTList();
  loadHomeData();
}

// Complete Task
function completeTask(taskId) {
  if (!userAddress) return alert('Please connect wallet');
  if (userData.tasksCompleted.includes(taskId)) return;
  const task = tasks.find(t => t.id === taskId);
  if (task.link) window.open(task.link, '_blank');
  userData.tasksCompleted.push(taskId);
  userData.balance += task.reward;
  loadTasks();
  loadHomeData();
}

// Add Referral
function addReferral() {
  if (!userAddress) return alert('Please connect wallet');
  const level = Math.floor(Math.random() * 3) + 1;
  const hashRate = level === 1 ? userData.mining.hashRate * 0.10 : level === 2 ? userData.mining.hashRate * 0.05 : userData.mining.hashRate * 0.02;
  userData.referrals[`level${level}`].push({ wallet: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`, hashRate });
  loadReferralData();
}

// Load Home Data
function loadHomeData() {
  const cachedHome = getCachedData('homeData');
  if (cachedHome) {
    document.getElementById('user-balance').innerHTML = cachedHome.balance;
    document.getElementById('nft-preview').innerHTML = cachedHome.nftPreview;
    document.getElementById('task-preview').innerHTML = cachedHome.taskPreview;
    document.getElementById('leaderboard-preview').innerHTML = cachedHome.leaderboardPreview;
    return;
  }
  document.getElementById('user-balance').innerHTML = `${userData.balance.toFixed(2)} <span class="text-yellow-300">NAI</span>`;
  document.getElementById('nft-preview').innerHTML = userData.nfts.slice(0, 2).map(url => {
    const nft = userNFTs.find(n => n.url === url);
    return `<li class="flex justify-between">${nft.icon} ${nft.name} - <span>${nft.price === 0 ? 'Free' : `${nft.price} TON`}</span></li>`;
  }).join('');
  document.getElementById('task-preview').innerHTML = tasks.map(task => `
    <li>${task.icon} ${task.name} - <span class="text-green-400">+${task.reward} NAI</span></li>
  `).join('');
  const leaderboardPreview = mockLeaderboard.slice(0, 1).map((u, i) => `
    🥇 ${u.walletAddress.slice(0, 4)}...${u.walletAddress.slice(-4)} - ${u.balance.toFixed(2)} NAI
  `).join('');
  document.getElementById('leaderboard-preview').innerHTML = leaderboardPreview;
  cacheData('homeData', {
    balance: document.getElementById('user-balance').innerHTML,
    nftPreview: document.getElementById('nft-preview').innerHTML,
    taskPreview: document.getElementById('task-preview').innerHTML,
    leaderboardPreview,
  });
}

// Load Referral Data
function loadReferralData() {
  const cachedReferral = getCachedData('referralData');
  if (cachedReferral) {
    document.getElementById('referral-link').value = cachedReferral.link;
    document.getElementById('referral-stats').innerHTML = cachedReferral.stats;
    return;
  }
  const referralLink = `https://neuroai.com?ref=${userData.referralCode}`;
  document.getElementById('referral-link').value = referralLink;
  const referralStats = `
    <div class="referral-card bg-gray-800 py-2 px-3 rounded-lg flex justify-between items-center text-sm hover:shadow-lg hover:shadow-purple-500/50 transition-shadow">
      <span class="font-semibold">Level 1 (10%)</span>
      <span>${userData.referrals.level1.length}</span>
      <span>${userData.referrals.level1.reduce((sum, r) => sum + r.hashRate, 0).toFixed(2)} Hash/s</span>
    </div>
    <div class="referral-card bg-gray-800 py-2 px-3 rounded-lg flex justify-between items-center text-sm hover:shadow-lg hover:shadow-purple-500/50 transition-shadow">
      <span class="font-semibold">Level 2 (5%)</span>
      <span>${userData.referrals.level2.length}</span>
      <span>${userData.referrals.level2.reduce((sum, r) => sum + r.hashRate, 0).toFixed(2)} Hash/s</span>
    </div>
    <div class="referral-card bg-gray-800 py-2 px-3 rounded-lg flex justify-between items-center text-sm hover:shadow-lg hover:shadow-purple-500/50 transition-shadow">
      <span class="font-semibold">Level 3 (2%)</span>
      <span>${userData.referrals.level3.length}</span>
      <span>${userData.referrals.level3.reduce((sum, r) => sum + r.hashRate, 0).toFixed(2)} Hash/s</span>
    </div>
    <button onclick="addReferral()" class="mt-2 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-full font-bold text-white transition">Add Mock Referral</button>
  `;
  document.getElementById('referral-stats').innerHTML = referralStats;
  cacheData('referralData', { link: referralLink, stats: referralStats });
}

// Load NFT List
function loadNFTList() {
  const cachedNFTs = getCachedData('nftData');
  if (cachedNFTs) {
    document.getElementById('nft-list').innerHTML = cachedNFTs.nftList;
    document.getElementById('your-nfts').innerHTML = cachedNFTs.yourNFTs;
    return;
  }
  const nftList = userData.nfts.map(url => {
    const nft = userNFTs.find(n => n.url === url) || userNFTs[0];
    return `
      <div class="nft-card bg-gray-800 p-3 rounded-lg flex items-center space-x-4 hover:shadow-lg hover:shadow-purple-500/50 transition-shadow" onclick="selectNFT('${nft.url}')">
        <img data-src="${nft.url}" alt="${nft.name}" class="w-16 h-16 rounded-md border border-purple-500" />
        <div class="flex-1">
          <span class="text-sm font-semibold">${nft.icon} ${nft.name}</span>
          <p class="text-sm text-gray-300">Hash Rate: ${nft.hashRate} Hash/s</p>
        </div>
      </div>
    `;
  }).join('');
  const yourNFTs = userNFTs.map(nft => `
    <div class="nft-card bg-gray-800 p-3 rounded-lg flex items-center space-x-4 hover:shadow-lg hover:shadow-purple-500/50 transition-shadow">
      <img data-src="${nft.url}" alt="${nft.name}" class="w-16 h-16 rounded-md border border-purple-500" />
      <div class="flex-1">
        <span class="text-sm font-semibold">${nft.icon} ${nft.name}</span>
        <p class="text-sm text-gray-300">Hash Rate: ${nft.hashRate} Hash/s</p>
      </div>
      <button onclick="buyNFT('${nft.url}')" class="bg-${nft.price === 0 ? 'blue-500' : 'yellow-500'} text-${nft.price === 0 ? 'white' : 'black'} px-3 py-1 rounded hover:bg-${nft.price === 0 ? 'blue-600' : 'yellow-600'} transition">${nft.price === 0 ? 'Claim' : 'Buy'}</button>
    </div>
  `).join('');
  document.getElementById('nft-list').innerHTML = nftList;
  document.getElementById('your-nfts').innerHTML = yourNFTs;
  cacheData('nftData', { nftList, yourNFTs });
}

// Load Mining Stats
function loadMiningStats() {
  const cachedMining = getCachedData('miningData');
  if (cachedMining) {
    document.getElementById('mining-info').innerHTML = cachedMining.info;
    document.getElementById('user-balance').innerHTML = cachedMining.balance;
    return;
  }
  let miningInfo;
  if (userData.mining.isMining) {
    const elapsed = (Date.now() - new Date(userData.mining.lastUpdated)) / 1000;
    const tokensMined = userData.mining.hashRate * elapsed * 0.0001;
    userData.mining.tokensMined = tokensMined;
    miningInfo = `
      <p class="mt-3 text-sm text-gray-100">Your Mining Power: <strong>${userData.mining.hashRate} Hash/s</strong></p>
      <p class="text-sm text-gray-100">Total Mined: <strong>${userData.mining.tokensMined.toFixed(2)} NAI</strong></p>
      <button onclick="claimMining()" class="mt-2 bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-full font-bold text-black transition">Claim Rewards</button>
    `;
  } else {
    miningInfo = `
      <p class="mt-3 text-sm text-gray-100">Your Mining Power: <strong>0 Hash/s</strong></p>
      <p class="text-sm text-gray-100">Total Mined: <strong>0 NAI</strong></p>
    `;
  }
  document.getElementById('mining-info').innerHTML = miningInfo;
  document.getElementById('user-balance').innerHTML = `${userData.balance.toFixed(2)} <span class="text-yellow-300">NAI</span>`;
  cacheData('miningData', { info: miningInfo, balance: document.getElementById('user-balance').innerHTML });
}

// Load Tasks
function loadTasks() {
  const cachedTasks = getCachedData('taskData');
  if (cachedTasks) {
    document.getElementById('task-list').innerHTML = cachedTasks.list;
    return;
  }
  const taskList = tasks.map(task => `
    <div class="task-card bg-gray-800 p-3 rounded-lg flex justify-between items-center hover:shadow-lg hover:shadow-purple-500/50 transition-shadow">
      <span>${task.icon} ${task.name} - <span class="text-green-400">+${task.reward} NAI</span></span>
      <button onclick="completeTask('${task.id}')" class="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-white transition ${userData.tasksCompleted.includes(task.id) ? 'opacity-50 cursor-not-allowed' : ''}" ${userData.tasksCompleted.includes(task.id) ? 'disabled' : ''}>
        ${userData.tasksCompleted.includes(task.id) ? 'Completed' : 'Complete'}
      </button>
    </div>
  `).join('');
  document.getElementById('task-list').innerHTML = taskList;
  cacheData('taskData', { list: taskList });
}

// Load Leaderboards
function loadLeaderboards() {
  const cachedLeaderboard = getCachedData('leaderboardData');
  if (cachedLeaderboard) {
    document.getElementById('user-rank').innerHTML = cachedLeaderboard.rank;
    document.getElementById('miners-leaderboard').innerHTML = cachedLeaderboard.list;
    return;
  }
  const users = [...mockLeaderboard, { walletAddress: userAddress, balance: userData.balance }].sort((a, b) => b.balance - a.balance);
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
}

// TON Connect
const tonConnect = new TonConnect({
  manifestUrl: 'https://your-netlify-site.netlify.app/tonconnect-manifest.json',
});
document.getElementById('connect-wallet').addEventListener('click', async () => {
  try {
    await tonConnect.connect({
      jsons: [
        { name: 'tonkeeper', url: 'https://app.tonkeeper.com/ton-connect' },
        { name: 'mytonwallet', url: 'https://mytonwallet.io/ton-connect' },
      ],
    });
    const walletInfo = await tonConnect.getWallet();
    if (walletInfo) {
      userAddress = walletInfo.account.address;
      userData.walletAddress = userAddress;
      localStorage.setItem('userAddress', userAddress);
      document.getElementById('wallet-address').classList.remove('hidden');
      document.getElementById('address-text').textContent = `${userAddress.slice(0, 4)}...${userAddress.slice(-4)}`;
      document.getElementById('connect-wallet').textContent = 'Connected';
      document.getElementById('connect-wallet').classList.add('bg-green-500', 'hover:bg-green-600');
      document.getElementById('connect-wallet').classList.remove('bg-gradient-to-r', 'from-blue-500', 'to-purple-500', 'hover:from-blue-600', 'hover:to-purple-600');
      loadHomeData();
      loadReferralData();
      loadNFTList();
      loadTasks();
      loadLeaderboards();
      loadMiningStats();
      setInterval(loadLeaderboards, 7 * 24 * 60 * 60 * 1000); // Weekly leaderboard update
    }
  } catch (error) {
    console.error('Wallet connection failed:', error);
    alert('Failed to connect wallet. Please try again.');
  }
});

// Initial Load
if (userAddress) {
  document.getElementById('wallet-address').classList.remove('hidden');
  document.getElementById('address-text').textContent = `${userAddress.slice(0, 4)}...${userAddress.slice(-4)}`;
  document.getElementById('connect-wallet').textContent = 'Connected';
  document.getElementById('connect-wallet').classList.add('bg-green-500', 'hover:bg-green-600');
  document.getElementById('connect-wallet').classList.remove('bg-gradient-to-r', 'from-blue-500', 'to-purple-500', 'hover:from-blue-600', 'hover:to-purple-600');
  if (userData.mining.isMining) {
    document.getElementById('mining-button').textContent = 'Mining...';
    document.getElementById('mining-button').classList.add('mining-active');
  }
  loadHomeData();
  loadReferralData();
  loadNFTList();
  loadTasks();
  loadLeaderboards();
  loadMiningStats();
}
showSection('home');