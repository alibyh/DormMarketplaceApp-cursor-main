import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { getBlockedUsers, unblockUser } from '../../services/blockingService';

import supabase from '../../services/supabaseConfig';

// Helper function to get avatar URL
const getAvatarUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return supabase.storage
    .from('avatars')
    .getPublicUrl(url)?.data?.publicUrl;
};
import ErrorBoundaryWrapper from '../../components/ErrorBoundary/ErrorBoundaryWrapper';

const BlockedUsersScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { getThemeColors } = useTheme();
  const colors = getThemeColors();
  
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch blocked users
  const fetchBlockedUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const users = await getBlockedUsers();
      setBlockedUsers(users);
    } catch (err) {
      console.error('Error fetching blocked users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBlockedUsers();
    setRefreshing(false);
  }, [fetchBlockedUsers]);

  // Handle unblock user
  const handleUnblockUser = useCallback(async (userId, username) => {
    Alert.alert(
      t('unblockUser'),
      t('unblockUserConfirmation'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('unblock'),
          style: 'default',
          onPress: async () => {
            try {
              await unblockUser(userId);
              setBlockedUsers(prev => prev.filter(user => user.id !== userId));
              Alert.alert(t('success'), t('userUnblocked'));
            } catch (error) {
              console.error('Error unblocking user:', error);
              Alert.alert(t('error'), error.message || t('unblockUserError'));
            }
          }
        }
      ]
    );
  }, [t]);

  // Render blocked user item
  const renderBlockedUser = useCallback(({ item }) => {
    const avatarUrl = getAvatarUrl(item.avatar_url);
    
    return (
      <View style={[styles.userItem, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatar}
                defaultSource={require('../../assets/default-avatar.png')}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={[styles.avatarText, { color: colors.headerText }]}>
                  {item.username?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.userDetails}>
            <Text style={[styles.username, { color: colors.text }]}>
              {item.username || t('Unknown User')}
            </Text>
            {item.dorm && (
              <Text style={[styles.dorm, { color: colors.textSecondary }]}>
                {item.dorm}
              </Text>
            )}
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.unblockButton, { backgroundColor: colors.primary }]}
          onPress={() => handleUnblockUser(item.id, item.username)}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.headerText} />
          <Text style={[styles.unblockButtonText, { color: colors.headerText }]}>
            {t('unblock')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [colors, t, handleUnblockUser]);

  // Load blocked users on mount
  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  // Update navigation options
  useEffect(() => {
    navigation.setOptions({
      title: t('blockedUsers'),
      headerStyle: {
        backgroundColor: colors.headerBackground,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: colors.headerText,
      headerTitleStyle: {
        fontWeight: 'bold',
        fontSize: 20,
      },
    });
  }, [navigation, t, colors]);

  if (loading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('loadingBlockedUsers')}
        </Text>
      </View>
    );
  }

  return (
    <ErrorBoundaryWrapper
      onRetry={fetchBlockedUsers}
      loadingMessage={t('loadingBlockedUsers')}
      errorMessage={error || t('errorLoadingBlockedUsers')}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={blockedUsers}
          renderItem={renderBlockedUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            blockedUsers.length === 0 && styles.emptyList,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
              title={t('pullToRefresh')}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={60} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {t('noBlockedUsers')}
              </Text>
              <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                {t('noBlockedUsersMessage')}
              </Text>
            </View>
          }
        />
      </View>
    </ErrorBoundaryWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop:60,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  list: {
    flexGrow: 1,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    marginRight: 12,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  dorm: {
    fontSize: 14,
  },
  unblockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  unblockButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginHorizontal: 24,
  },
});

export default BlockedUsersScreen;
