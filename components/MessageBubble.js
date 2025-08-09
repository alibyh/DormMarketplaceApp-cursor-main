import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';

const MessageBubble = ({ message, isCurrentUser }) => {
  return (
    <View style={[
      styles.container,
      isCurrentUser ? styles.rightContainer : styles.leftContainer
    ]}>
      <View style={[
        styles.bubble,
        isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
      ]}>
        <Text style={[
          styles.messageText,
          isCurrentUser ? styles.currentUserText : styles.otherUserText
        ]}>
          {message.content}
        </Text>
        <Text style={styles.timeText}>
          {format(new Date(message.created_at), 'HH:mm')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  rightContainer: {
    justifyContent: 'flex-end',
  },
  leftContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  currentUserBubble: {
    backgroundColor: '#ff5722',
  },
  otherUserBubble: {
    backgroundColor: '#E8E8E8',
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  currentUserText: {
    color: '#FFFFFF',
  },
  otherUserText: {
    color: '#000000',
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
    alignSelf: 'flex-end',
  }
});

export default MessageBubble;