# Optimizing Deleted User Handling for Better Performance

## Issue
The iOS bundling is taking forever due to the complex deleted user handling logic we added.

## Optimization Strategies

### 1. Simplify Profile Map Creation
Instead of complex forEach loops, use a more efficient approach:

```javascript
// Current approach (complex)
const profileMap = {};
if (profiles) {
  profiles.forEach(profile => {
    profileMap[profile.id] = profile;
  });
}
otherUserIds.forEach(userId => {
  if (!profileMap[userId]) {
    profileMap[userId] = { /* deleted user data */ };
  }
});

// Optimized approach (simpler)
const profileMap = (profiles || []).reduce((map, profile) => {
  map[profile.id] = profile;
  return map;
}, {});
```

### 2. Reduce Database Queries
Instead of multiple profile queries, batch them:

```javascript
// Current: Multiple queries
const { data: profiles1 } = await supabase.from('profiles').select(...).in('id', otherUserIds);
const { data: profiles2 } = await supabase.from('profiles').select(...).in('id', allParticipantIds);

// Optimized: Single query with all IDs
const allIds = [...new Set([...otherUserIds, ...allParticipantIds])];
const { data: allProfiles } = await supabase.from('profiles').select(...).in('id', allIds);
```

### 3. Use Memoization
Cache profile data to avoid repeated queries:

```javascript
const profileCache = new Map();

const getProfileData = (userId) => {
  if (profileCache.has(userId)) {
    return profileCache.get(userId);
  }
  
  const profile = profileMap[userId];
  const result = profile || {
    id: userId,
    username: 'Deleted Account',
    avatar_url: 'deleted_user_placeholder.png',
    user_deleted: true
  };
  
  profileCache.set(userId, result);
  return result;
};
```

### 4. Lazy Loading
Only load profile data when needed:

```javascript
// Only fetch profiles for conversations that are actually displayed
const visibleConversations = conversations.slice(0, 20); // Limit to first 20
const visibleUserIds = visibleConversations.map(conv => conv.otherUserId);
```

## Implementation Priority
1. **High Priority**: Simplify profile map creation
2. **Medium Priority**: Reduce database queries
3. **Low Priority**: Add memoization and lazy loading

## Testing
After implementing optimizations:
1. Test conversation loading speed
2. Test deleted user display
3. Monitor bundle size and loading time

