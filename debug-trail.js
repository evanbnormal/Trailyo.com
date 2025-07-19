// Debug script to recreate test trail data
// Run this in browser console if your trails are missing

const testTrail = {
  id: 'trail-' + Date.now(),
  title: 'Test Trail - Recreated',
  description: 'This is a test trail that was recreated after server restart',
  status: 'published',
  createdAt: new Date().toISOString(),
  views: 0,
  earnings: 0,
  steps: [
    {
      id: 'step-1',
      title: 'Welcome Back!',
      content: 'This trail was recreated after the server restart. Your data should now be visible.',
      type: 'video',
      source: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnailUrl: '',
      isSaved: true
    },
    {
      id: 'step-2',
      title: 'Test Step',
      content: 'This is a test step to verify the trail is working.',
      type: 'video',
      source: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnailUrl: '',
      isSaved: true
    }
  ],
  thumbnailUrl: '',
  shareableLink: '',
  suggestedInvestment: 25,
  trailValue: 100,
  trailCurrency: 'USD',
  creator: 'Evan Brady'
};

// Get current user or create one
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
if (!currentUser) {
  currentUser = {
    id: 'user-' + Date.now(),
    email: 'test@example.com',
    name: 'Test User'
  };
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  
  // Add to users array
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  users.push(currentUser);
  localStorage.setItem('users', JSON.stringify(users));
}

// Add the trail to published trails
const publishedTrails = JSON.parse(localStorage.getItem(`user_${currentUser.id}_published`) || '[]');
publishedTrails.push(testTrail);
localStorage.setItem(`user_${currentUser.id}_published`, JSON.stringify(publishedTrails));

console.log('✅ Test trail created!');
console.log('Trail ID:', testTrail.id);
console.log('User ID:', currentUser.id);
console.log('Published trails:', publishedTrails);

// Refresh the page to see the changes
console.log('🔄 Refreshing page in 2 seconds...');
setTimeout(() => {
  window.location.reload();
}, 2000); 