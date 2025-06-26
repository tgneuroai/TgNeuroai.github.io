import { ref, get, set, onValue } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js";

// User data
let telegramId = localStorage.getItem('telegramId') || '';
let userData = {
  telegramId: '',
  tokenBalance: 12345.67,
  nfts: [
    { url: 'https://iili.io/FIkdc3x.gif', name: 'Neon Starter #1 - Free', hashRate: 22, owned: false },
    { url: 'https://iili.io/FIkdhGa.gif', name: 'Quantum Spark #2', hashRate: 34, owned: false, stars: 2500 },
    { url: 'https://iili.io/FIkdj6J.gif', name: 'Astro Core #3', hashRate: 54, owned: false, stars: 5000 },
    { url: 'https://iili.io/FIkdSjt.gif', name: 'Cosmic Surge #4', hashRate: 74, owned: false, stars: 9000 },
    { url: 'https://iili.io/FIkdXCg.gif', name: 'Galactic Prime #5', hashRate: 148, owned: false, stars: 25000 }
  ],
  miningData: { power: 22, totalMined: 234.12 },
  referrals: { level1: [], level2: [], level3: [] }
};
let selectedNFTIndex = 0;
let taskStatus = {
  telegram: 'Go',
  group: 'Go',
  share: 'Go'
};

// Hide loading animation after 1 second
window.onload = async () => {
  setTimeout(() => {
    document.getElementById('loading-container').style.display = 'none';
    document.getElementById('content').style.display = 'block';
  }, 1000); // Reduced from 3s to 1s for faster loading

  try {
    const tg = window.Telegram.WebApp;
    tg.ready();
    const savedTaskStatus = localStorage.getItem('taskStatus');
    if (savedTaskStatus) taskStatus = JSON.parse(savedTaskStatus);
    if (telegramId) {
      await fetchUserData();
      document.getElementById('profile-username').textContent = telegramId;
      document.getElementById('connect-telegram').classList.add('hidden');
      document.getElementById('logout-button').classList.remove('hidden');
      document.getElementById('referral-link').value = `https://t.me/NeuroAIBot?start=${telegramId.replace('@', '')}`;
      updateTokenBalance();
      renderNFTWallet();
      renderReferralHistory();
      await updateLeaderboard();
    }
    userData.nfts.forEach((nft, index) => {
      if (nft.owned) {
        if (index === 0) {
          document.getElementById('claim-nft-0').textContent = 'Claimed';
          document.getElementById('claim-nft-0').classList.remove('bg-blue-500', 'hover:bg-blue-600');
          document.getElementById('claim-nft-0').classList.add('bg-gray-500', 'cursor-not-allowed');
          document.getElementById('claim-nft-0').disabled = true;
        } else {
          document.getElementById(`buy-nft-${index}`).textContent = 'Owned';
          document.getElementById(`buy-nft-${index}`).classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
          document.getElementById(`buy-nft-${index}`).classList.add('bg-gray-500', 'cursor-not-allowed');
          document.getElementById(`buy-nft-${index}`).disabled = true;
        }
      }
    });
    Object.keys(taskStatus).forEach(taskId => {
      if (taskStatus[taskId] === 'Done') {
        const button = document.getElementById(`task-${taskId}`);
        button.textContent = 'Done';
        button.classList.remove('bg-blue-500', 'hover:bg-blue-600', 'bg-yellow-500', 'hover:bg-yellow-600', 'text-black');
        button.classList.add('bg-gray-500', 'cursor-not-allowed');
        button.disabled = true;
      } else if (taskStatus[taskId] === 'Check') {
        const button = document.getElementById(`task-${taskId}`);
        button.textContent = 'Check';
        button.classList.remove('bg-blue-500', 'hover:bg-blue-600');
        button.classList.add('bg-yellow-500', 'hover:bg-yellow-600', 'text-black');
      }
    });
    renderNFTSelection();
    showSection('home');
  } catch (error) {
    console.error("Initialization failed:", error);
    alert("Failed to initialize app. Please check console for details.");
  }
};

// Toggle Profile Modal
function toggleProfile() {
  const profileContainer = document.getElementById('profile-container');
  profileContainer.classList.toggle('hidden');
  if (!profileContainer.classList.contains('hidden')) {
    renderNFTWallet();
    updateTokenBalance();
  }
}

// Logout Function
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    telegramId = '';
    localStorage.removeItem('telegramId');
    document.getElementById('profile-username').textContent = 'Not Connected';
    document.getElementById('connect-telegram').classList.add('hidden');
    document.getElementById('logout-button').classList.add('hidden');
    document.getElementById('profile-container').classList.add('hidden');
    document.getElementById('referral-link').value = 'https://t.me/NeuroAIBot?start=you';
    document.getElementById('nft-wallet-list').innerHTML = '';
    document.getElementById('token-balance').textContent = '0';
    document.getElementById('header-token-balance').textContent = '0';
    document.getElementById('user-rank').textContent = 'N/A';
    document.getElementById('leaderboard-user-rank').textContent = 'N/A';
    document.getElementById('leaderboard-user-balance').textContent = '0';
    alert('Logged out successfully!');
  }
}

// Update Token Balance Display
function updateTokenBalance() {
  document.getElementById('token-balance').textContent = userData.tokenBalance.toFixed(2);
  document.getElementById('header-token-balance').textContent = userData.tokenBalance.toFixed(2);
}

// Render NFT Wallet
function renderNFTWallet() {
  const nftWalletList = document.getElementById('nft-wallet-list');
  nftWalletList.innerHTML = '';
  const ownedNFTs = userData.nfts.filter(nft => nft.owned);
  if (ownedNFTs.length === 0) {
    nftWalletList.innerHTML = '<p class="text-sm text-gray-400">No NFTs owned yet.</p>';
  } else {
    ownedNFTs.forEach(nft => {
      const card = document.createElement('div');
      card.className = 'nft-card bg-gray-800 p-3 rounded-lg flex items-center space-x-4';
      card.innerHTML = `
        <img src="${nft.url}" alt="${nft.name}" class="w-16 h-16 rounded-md border border-purple-500" loading="lazy" />
        <div class="flex-1">
          <span class="text-sm font-semibold">${nft.name}</span>
          <p class="text-gray-400 text-xs">${nft.hashRate} Hash/s</p>
        </div>
      `;
      nftWalletList.appendChild(card);
    });
  }
}

// Render Referral History
function renderReferralHistory() {
  const referralHistory = document.getElementById('referral-history');
  referralHistory.innerHTML = '';
  const levels = [
    { level: 'Level 1', data: userData.referrals.level1, rate: '10%' },
    { level: 'Level 2', data: userData.referrals.level2, rate: '5%' },
    { level: 'Level 3', data: userData.referrals.level3, rate: '2%' }
  ];
  levels.forEach(level => {
    const count = level.data.length;
    const hashRate = level.data.reduce((sum, ref) => sum + (ref.hashRate || 0), 0);
    const card = document.createElement('div');
    card.className = 'referral-card bg-gray-800 py-2 px-3 rounded-lg flex justify-between items-center text-sm hover:shadow-lg hover:shadow-purple-500/50 transition-shadow';
    card.innerHTML = `
      <span class="font-semibold">${level.level} (${level.rate})</span>
      <span>${hashRate} Hash/s</span>
      <span>${count} Referrals</span>
    `;
    referralHistory.appendChild(card);
  });
}

// Update Leaderboard
async function updateLeaderboard() {
  if (!window.firebaseDB) return;
  try {
    const dbRef = ref(window.firebaseDB, 'users');
    onValue(dbRef, (snapshot) => {
      const users = [];
      snapshot.forEach((childSnapshot) => {
        users.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });
      users.sort((a, b) => b.tokenBalance - a.tokenBalance);
      const leaderboardList = document.getElementById('leaderboard-list');
      leaderboardList.innerHTML = '';
      let rank = 1;
      let userRank = 'N/A';
      users.slice(0, 50).forEach(user => {
        const li = document.createElement('li');
        li.className = rank <= 3 ? 'bg-gradient-to-r from-purple-600 to-blue-600 p-3 rounded-lg text-base font-semibold shadow-lg shadow-purple-500/50' : 'bg-gray-800 p-3 rounded';
        li.innerHTML = `${rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank + '.'} ${user.telegramId} - ${user.tokenBalance.toFixed(2)} NAI`;
        leaderboardList.appendChild(li);
        if (user.telegramId === telegramId) {
          userRank = rank;
          document.getElementById('user-rank').textContent = rank;
          document.getElementById('leaderboard-user-rank').textContent = rank;
          document.getElementById('leaderboard-user-balance').textContent = user.tokenBalance.toFixed(2);
          document.getElementById('user-rank-section').classList.remove('hidden');
        }
        rank++;
      });
      if (userRank === 'N/A') {
        document.getElementById('user-rank').textContent = 'N/A';
        document.getElementById('leaderboard-user-rank').textContent = 'N/A';
        document.getElementById('leaderboard-user-balance').textContent = '0';
      }
    }, {
      onlyOnce: false // Realtime updates
    });
  } catch (error) {
    console.error('Leaderboard update failed:', error);
    alert('Failed to load leaderboard. Please try again.');
  }
}

// Fetch User Data from Realtime Database
async function fetchUserData() {
  if (!telegramId || !window.firebaseDB) return;
  try {
    const userRef = ref(window.firebaseDB, 'users/' + telegramId);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      userData = snapshot.val();
      userData.miningData = userData.miningData || { power: 22, totalMined: 234.12 };
      userData.referrals = userData.referrals || { level1: [], level2: [], level3: [] };
      updateTokenBalance();
      updateMiningCard();
    } else {
      userData = {
        telegramId,
        tokenBalance: 12345.67,
        nfts: [
          { url: 'https://iili.io/FIkdc3x.gif', name: 'Neon Starter #1 - Free', hashRate: 22, owned: false },
          { url: 'https://iili.io/FIkdhGa.gif', name: 'Quantum Spark #2', hashRate: 34, owned: false, stars: 2500 },
          { url: 'https://iili.io/FIkdj6J.gif', name: 'Astro Core #3', hashRate: 54, owned: false, stars: 5000 },
          { url: 'https://iili.io/FIkdSjt.gif', name: 'Cosmic Surge #4', hashRate: 74, owned: false, stars: 9000 },
          { url: 'https://iili.io/FIkdXCg.gif', name: 'Galactic Prime #5', hashRate: 148, owned: false, stars: 25000 }
        ],
        miningData: { power: 22, totalMined: 234.12 },
        referrals: { level1: [], level2: [], level3: [] }
      };
      await set(userRef, userData);
    }
  } catch (error) {
    console.error('Fetch user data failed:', error);
    alert('Failed to fetch user data. Please try again.');
  }
}

// Save User Data to Realtime Database
async function saveUserData() {
  if (!telegramId || !window.firebaseDB) return;
  try {
    const userRef = ref(window.firebaseDB, 'users/' + telegramId);
    await set(userRef, userData);
  } catch (error) {
    console.error('Save user data failed:', error);
    alert('Failed to save user data. Please try again.');
  }
}

// Telegram Connect
document.getElementById('connect-telegram').addEventListener('click', async () => {
  if (telegramId) return;
  if (confirm('Do you want to connect your Telegram account?')) {
    try {
      const tg = window.Telegram.WebApp;
      tg.ready();
      const user = tg.initDataUnsafe.user;
      if (user) {
        telegramId = `@${user.username || user.id}`;
        localStorage.setItem('telegramId', telegramId);
        await fetchUserData();
        document.getElementById('profile-username').textContent = telegramId;
        document.getElementById('connect-telegram').classList.add('hidden');
        document.getElementById('logout-button').classList.remove('hidden');
        document.getElementById('referral-link').value = `https://t.me/NeuroAIBot?start=${user.id}`;
        if (!userData.nfts[0].owned) {
          await claimFreeNFT();
        }
        updateTokenBalance();
        renderNFTWallet();
        renderReferralHistory();
        await updateLeaderboard();
      } else {
        alert('Please open this app in the Telegram WebApp.');
      }
    } catch (error) {
      console.error('Telegram connection failed:', error);
      alert('Failed to connect Telegram. Please try again.');
    }
  }
});

// Complete Task
async function completeTask(taskId, link) {
  const button = document.getElementById(`task-${taskId}`);
  if (taskStatus[taskId] === 'Done') return;
  if (taskStatus[taskId] === 'Go') {
    window.open(link, '_blank');
    taskStatus[taskId] = 'Check';
    button.textContent = 'Check';
    button.classList.remove('bg-blue-500', 'hover:bg-blue-600');
    button.classList.add('bg-yellow-500', 'hover:bg-yellow-600', 'text-black');
  } else if (taskStatus[taskId] === 'Check') {
    button.textContent = 'Loading...';
    button.disabled = true;
    try {
      const rewards = { telegram: 10, group: 5, share: 3 };
      userData.tokenBalance += rewards[taskId] || 0;
      taskStatus[taskId] = 'Done';
      await saveUserData();
      button.textContent = 'Done';
      button.classList.remove('bg-yellow-500', 'hover:bg-yellow-600', 'text-black');
      button.classList.add('bg-gray-500', 'cursor-not-allowed');
      button.disabled = true;
      localStorage.setItem('taskStatus', JSON.stringify(taskStatus));
      updateTokenBalance();
      alert(`Task ${taskId} completed! +${rewards[taskId]} NAI`);
    } catch (error) {
      console.error('Task completion failed:', error);
      button.textContent = 'Check';
      button.disabled = false;
      alert('Failed to complete task. Please try again.');
    }
  }
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
    updateMiningCard();
    renderNFTSelection();
  }
  if (id === 'leaderboard') {
    updateLeaderboard();
  }
  document.getElementById('profile-container').classList.add('hidden');
}

// Update Mining Card
function updateMiningCard() {
  document.getElementById('mining-card').style.backgroundImage = `url('${userData.nfts[selectedNFTIndex].url}')`;
  document.getElementById('mining-power').textContent = `${userData.miningData.power} Hash/s`;
  document.getElementById('total-mined').textContent = `${userData.miningData.totalMined.toFixed(2)} NAI`;
}

// Render NFT Selection
function renderNFTSelection() {
  const nftList = document.getElementById('nft-selection-list');
  nftList.innerHTML = '';
  userData.nfts.forEach((nft, index) => {
    if (nft.owned) {
      const card = document.createElement('div');
      card.className = 'nft-card bg-gray-800 p-3 rounded-lg flex items-center space-x-4 hover:shadow-lg hover:shadow-purple-500/50';
      card.onclick = () => selectNFT(index);
      card.innerHTML = `
        <img src="${nft.url}" alt="${nft.name}" class="w-16 h-16 rounded-md border border-purple-500" loading="lazy" />
        <div class="flex-1">
          <span class="text-sm font-semibold">${nft.name} <img src="https://iili.io/FTMV4xp.png" alt="Verified" class="inline w-4 h-4 ml-1" loading="lazy" /></span>
          <p class="text-gray-400 text-xs">${nft.hashRate} Hash/s</p>
        </div>
      `;
      nftList.appendChild(card);
    }
  });
}

// Claim Free NFT
async function claimFreeNFT() {
  if (!telegramId) {
    alert('Please connect your Telegram account first.');
    return;
  }
  if (userData.nfts[0].owned) {
    alert('Free NFT already claimed!');
    return;
  }
  try {
    userData.nfts[0].owned = true;
    userData.tokenBalance += 100; // Reward for claiming free NFT
    await saveUserData();
    document.getElementById('claim-nft-0').textContent = 'Claimed';
    document.getElementById('claim-nft-0').classList.remove('bg-blue-500', 'hover:bg-blue-600');
    document.getElementById('claim-nft-0').classList.add('bg-gray-500', 'cursor-not-allowed');
    document.getElementById('claim-nft-0').disabled = true;
    updateTokenBalance();
    renderNFTSelection();
    renderNFTWallet();
    alert('Free NFT Claimed! +100 NAI');
  } catch (error) {
    console.error('Claim NFT failed:', error);
    alert('Failed to claim NFT. Please try again.');
  }
}

// Buy NFT with Stars
async function buyNFT(index, stars) {
  if (!telegramId) {
    alert('Please connect your Telegram account first.');
    return;
  }
  if (userData.nfts[index].owned) {
    alert('NFT already owned!');
    return;
  }
  if (userData.tokenBalance < stars) {
    alert('Insufficient NAI balance to purchase this NFT.');
    return;
  }
  try {
    userData.nfts[index].owned = true;
    userData.tokenBalance -= stars;
    await saveUserData();
    document.getElementById(`buy-nft-${index}`).textContent = 'Owned';
    document.getElementById(`buy-nft-${index}`).classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
    document.getElementById(`buy-nft-${index}`).classList.add('bg-gray-500', 'cursor-not-allowed');
    document.getElementById(`buy-nft-${index}`).disabled = true;
    updateTokenBalance();
    renderNFTSelection();
    renderNFTWallet();
    alert(`NFT Purchased for ${stars} ⭐!`);
  } catch (error) {
    console.error('Buy NFT failed:', error);
    alert('Failed to purchase NFT. Please try again.');
  }
}

// Select NFT for Mining
async function selectNFT(index) {
  if (!userData.nfts[index].owned) {
    alert('You do not own this NFT.');
    return;
  }
  selectedNFTIndex = index;
  userData.miningData.power = userData.nfts[index].hashRate;
  await saveUserData();
  updateMiningCard();
  showSection('mining');
}

// Add Referral
async function addReferral(referrerId, referredId) {
  if (!window.firebaseDB) return;
  try {
    const referrerRef = ref(window.firebaseDB, 'users/' + referrerId);
    const referrerSnapshot = await get(referrerRef);
    if (referrerSnapshot.exists()) {
      const referrerData = referrerSnapshot.val();
      referrerData.referrals = referrerData.referrals || { level1: [], level2: [], level3: [] };
      if (!referrerData.referrals.level1.includes(referredId)) {
        referrerData.referrals.level1.push({ telegramId: referredId, hashRate: 100 });
        referrerData.tokenBalance += 100 * 0.1; // 10% commission for Level 1
        await set(referrerRef, referrerData);
        // Update Level 2 and Level 3
        if (referrerData.referrer) {
          const parentRef = ref(window.firebaseDB, 'users/' + referrerData.referrer);
          const parentSnapshot = await get(parentRef);
          if (parentSnapshot.exists()) {
            const parent = parentSnapshot.val();
            parent.referrals.level2 = parent.referrals.level2 || [];
            parent.referrals.level2.push({ telegramId: referredId, hashRate: 50 });
            parent.tokenBalance += 50 * 0.05; // 5% commission for Level 2
            await set(parentRef, parent);
            // Level 3
            if (parent.referrer) {
              const grandParentRef = ref(window.firebaseDB, 'users/' + parent.referrer);
              const grandParentSnapshot = await get(grandParentRef);
              if (grandParentSnapshot.exists()) {
                const grandParent = grandParentSnapshot.val();
                grandParent.referrals.level3 = grandParent.referrals.level3 || [];
                grandParent.referrals.level3.push({ telegramId: referredId, hashRate: 20 });
                grandParent.tokenBalance += 20 * 0.02; // 2% commission for Level 3
                await set(grandParentRef, grandParent);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Add referral failed:', error);
    alert('Failed to add referral. Please try again.');
  }
}

// Check for Referral
function checkReferral() {
  const urlParams = new URLSearchParams(window.location.search);
  const referrerId = urlParams.get('start');
  if (referrerId && telegramId && referrerId !== telegramId.replace('@', '')) {
    userData.referrer = referrerId;
    addReferral(referrerId, telegramId);
    saveUserData();
  }
}

// Logout Button Event Listener
document.getElementById('logout-button').addEventListener('click', logout);