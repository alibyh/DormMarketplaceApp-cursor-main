import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const AboutUsModal = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const { getThemeColors } = useTheme();
  const colors = getThemeColors();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Start animations when modal becomes visible
      const animations = [
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.05,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ),
      ];

      Animated.parallel(animations).start();

      // Continuous rotation animation for the icon
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 10000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      // Reset animations when modal closes
      fadeAnim.setValue(0);
      slideAnim.setValue(screenHeight);
      scaleAnim.setValue(0.8);
    }
  }, [visible]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View 
        style={[
          styles.modalOverlay,
          { 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            opacity: fadeAnim 
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.modalContent,
            { 
              backgroundColor: colors.background,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header with animated icon */}
            <Animated.View 
              style={[
                styles.headerContainer,
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY: slideAnim },
                    { scale: scaleAnim },
                  ],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.iconContainer,
                  {
                    transform: [
                      { rotate: rotateInterpolate },
                      { scale: pulseAnim },
                    ],
                  },
                ]}
              >
                <Ionicons 
                  name="information-circle" 
                  size={80} 
                  color={colors.primary} 
                />
              </Animated.View>
              <Text style={[styles.title, { color: colors.text }]}>
                {t('aboutApp')}
              </Text>
            </Animated.View>

            {/* Content sections with staggered animations */}
            <Animated.View 
              style={[
                styles.contentContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* App Logo Section */}
              <View style={[styles.section, { backgroundColor: colors.card }]}>
                <View style={styles.logoContainer}>
                  <Image
                    source={require('../../assets/S.F.U2.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[styles.appName, { color: colors.primary }]}>
                  u-Shop SFU
                </Text>
                <Text style={[styles.tagline, { color: colors.textSecondary }]}>
                  {t('campusMarketplace')}
                </Text>
              </View>

              {/* Features Section */}
              <View style={[styles.section, { backgroundColor: colors.card }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('whatWeOffer')}
                </Text>
                
                <View style={styles.featuresList}>
                  {[
                    { icon: 'storefront', text: t('featureBuySell') },
                    { icon: 'search', text: t('featureSmartFilter') },
                    { icon: 'chatbubbles', text: t('featureSecureMessaging') },
                    { icon: 'shield-checkmark', text: t('featureSafeMarketplace') },
                    { icon: 'location', text: t('featureDormFilter') },
                    { icon: 'heart', text: t('featureCommunity') },
                  ].map((feature, index) => (
                    <Animated.View
                      key={index}
                      style={[
                        styles.featureItem,
                        {
                          opacity: fadeAnim,
                          transform: [
                            { 
                              translateX: slideAnim.interpolate({
                                inputRange: [0, screenHeight],
                                outputRange: [0, -20 * (index + 1)],
                              })
                            },
                          ],
                        },
                      ]}
                    >
                      <View style={[styles.featureIcon, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons name={feature.icon} size={24} color={colors.primary} />
                      </View>
                      <Text style={[styles.featureText, { color: colors.text }]}>
                        {feature.text}
                      </Text>
                    </Animated.View>
                  ))}
                </View>
              </View>

              {/* Mission Section */}
              <View style={[styles.section, { backgroundColor: colors.card }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('ourMission')}
                </Text>
                <Text style={[styles.missionText, { color: colors.textSecondary }]}>
                  {t('aboutAppContent')}
                </Text>
              </View>

              {/* Stats Section */}
              <View style={[styles.section, { backgroundColor: colors.card }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {t('whyChooseUs')}
                </Text>
                
                <View style={styles.statsContainer}>
                  {[
                    { number: '100%', label: t('studentVerified') },
                    { number: '24/7', label: t('alwaysAvailable') },
                    { number: '0%', label: t('noFees') },
                    { number: 'Secure', label: t('secureMessaging') },
                  ].map((stat, index) => (
                    <Animated.View
                      key={index}
                      style={[
                        styles.statItem,
                        {
                          opacity: fadeAnim,
                          transform: [
                            { 
                              scale: scaleAnim.interpolate({
                                inputRange: [0.8, 1],
                                outputRange: [0.8, 1],
                              })
                            },
                          ],
                        },
                      ]}
                    >
                      <Text style={[styles.statNumber, { color: colors.primary }]}>
                        {stat.number}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                        {stat.label}
                      </Text>
                    </Animated.View>
                  ))}
                </View>
              </View>
            </Animated.View>
          </ScrollView>

          {/* Animated OK Button */}
          <Animated.View 
            style={[
              styles.buttonContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.okayButton,
                { 
                  backgroundColor: colors.primary,
                  shadowColor: colors.shadow,
                },
              ]}
              onPress={handleClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.okayButtonText, { color: colors.headerText }]}>
                {t('gotIt')}
              </Text>
              <Ionicons name="checkmark-circle" size={24} color={colors.headerText} />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '90%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  iconContainer: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  featuresList: {
    gap: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureText: {
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  missionText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 15,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  okayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 25,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    gap: 10,
  },
  okayButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AboutUsModal;
