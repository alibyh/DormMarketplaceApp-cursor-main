// cloud/main.js

Parse.Cloud.beforeSave('Conversation', async (request) => {
  const conversation = request.object;

  if (!conversation.existed()) {
    const participants = conversation.get('participants'); // Array of Parse.User pointers

    if (participants.length < 2) {
      throw new Error('Conversations must have at least two participants.');
    }

    const acl = new Parse.ACL();

    participants.forEach((user) => {
      acl.setReadAccess(user.id, true);
      acl.setWriteAccess(user.id, true);
    });

    conversation.setACL(acl);
  }
});

Parse.Cloud.beforeSave('Message', async (request) => {
  const message = request.object;

  if (!message.existed()) {
    const conversationId = message.get('conversationId');
    if (!conversationId) {
      throw new Error('Message must have a conversationId.');
    }

    // Fetch the Conversation object to get participants
    const Conversation = Parse.Object.extend('Conversation');
    const conversationQuery = new Parse.Query(Conversation);
    const conversation = await conversationQuery.equalTo('conversationId', conversationId).first({ useMasterKey: true });

    if (!conversation) {
      throw new Error('Conversation not found.');
    }

    const participants = conversation.get('participants'); // Array of Parse.User pointers

    const acl = new Parse.ACL();

    participants.forEach((user) => {
      acl.setReadAccess(user.id, true);
      acl.setWriteAccess(user.id, user.id === message.get('senderId').id); // Only sender can write
    });

    message.setACL(acl);
  }
});
