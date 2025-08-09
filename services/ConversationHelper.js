// helpers/ConversationHelper.js

import Parse from 'parse/react-native';

/**
 * Ensure a conversation record exists or is updated with the latest message info.
 * 
 * @param {string} conversationId - e.g., "abc123_xyz789"
 * @param {Array<Parse.User>} participants - Array of Parse.User objects, e.g., [user1, user2]
 * @param {string} lastMessage - The text of the last message
 */
export const ensureConversationExists = async (conversationId, participants, lastMessage) => {
  const Conversation = Parse.Object.extend('Conversation');
  const query = new Parse.Query(Conversation);
  query.equalTo('conversationId', conversationId);

  let conversation = await query.first();

  if (!conversation) {
    // Create a new Conversation
    conversation = new Conversation();
    conversation.set('conversationId', conversationId);
    conversation.set('participants', participants); // Array of Parse.User Pointers

    // Set ACL to allow only participants to read/write
    const acl = new Parse.ACL();
    participants.forEach(user => {
      acl.setReadAccess(user, true);
      acl.setWriteAccess(user, true);
    });
    conversation.setACL(acl);
  }

  // Update lastMessage and lastMessageAt
  conversation.set('lastMessage', lastMessage);
  conversation.set('lastMessageAt', new Date());

  // Save the conversation
  try {
    await conversation.save();
    console.log('Conversation saved/updated successfully.');
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
};
