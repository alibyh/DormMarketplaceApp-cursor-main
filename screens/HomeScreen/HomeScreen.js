import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  FlatList,
  Animated,
  RefreshControl,
  TextInput,
  Modal,
  Platform,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import supabase from '../../services/supabaseConfig';
import ProductCard from '../../components/ProductCard/ProductCard';
import { useTranslation } from 'react-i18next';
import { checkNetworkConnection } from '../../utils/networkUtils'; // Add this import
import ErrorBoundaryWrapper from '../../components/ErrorBoundary/ErrorBoundaryWrapper';
import LoadingState from '../../components/LoadingState/LoadingState';
import RetryView from '../../components/RetryView/RetryView';
import { useTheme } from '../../context/ThemeContext';

// Add these imports at the top
import { Alert } from 'react-native';
// import YandexBanner from '../../components/YandexBanner/YandexBanner';

// Telegram SVG icon content
const telegramSvg = `<svg width="18" height="18" viewBox="0 0 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid">
		<g>
				<path d="M128,0 C57.307,0 0,57.307 0,128 L0,128 C0,198.693 57.307,256 128,256 L128,256 C198.693,256 256,198.693 256,128 L256,128 C256,57.307 198.693,0 128,0 L128,0 Z" fill="#40B3E0"></path>
				<path d="M190.2826,73.6308 L167.4206,188.8978 C167.4206,188.8978 164.2236,196.8918 155.4306,193.0548 L102.6726,152.6068 L83.4886,143.3348 L51.1946,132.4628 C51.1946,132.4628 46.2386,130.7048 45.7586,126.8678 C45.2796,123.0308 51.3546,120.9528 51.3546,120.9528 L179.7306,70.5928 C179.7306,70.5928 190.2826,65.9568 190.2826,73.6308" fill="#FFFFFF"></path>
				<path d="M98.6178,187.6035 C98.6178,187.6035 97.0778,187.4595 95.1588,181.3835 C93.2408,175.3085 83.4888,143.3345 83.4888,143.3345 L161.0258,94.0945 C161.0258,94.0945 165.5028,91.3765 165.3428,94.0945 C165.3428,94.0945 166.1418,94.5735 163.7438,96.8115 C161.3458,99.0505 102.8328,151.6475 102.8328,151.6475" fill="#D2E5F1"></path>
				<path d="M122.9015,168.1154 L102.0335,187.1414 C102.0335,187.1414 100.4025,188.3794 98.6175,187.6034 L102.6135,152.2624" fill="#B5CFE4"></path>
		</g>
</svg>`;

// Add this before the HomeScreen component
const handleError = (error, context) => {
  console.error(`Error in ${context}:`, error);
  Alert.alert(
    t('error'),
    error?.message || t('errorTryAgain'),
    [{ text: t('ok') }]
  );
};



// Add these error type constants
const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  FETCH_PRODUCTS: 'FETCH_PRODUCTS',
  FETCH_BANNERS: 'FETCH_BANNERS',
  FETCH_DATA: 'FETCH_DATA',
  UNKNOWN: 'UNKNOWN'
};

const handleHomeError = (error, t, type = ERROR_TYPES.UNKNOWN) => {
  let message = '';
  switch (type) {
    case ERROR_TYPES.NETWORK:
      message = t('networkError');
      break;
    case ERROR_TYPES.FETCH_PRODUCTS:
      message = t('errorFetchingProducts');
      break;
    case ERROR_TYPES.FETCH_BANNERS:
      message = t('errorFetchingBanners');
      break;
    default:
      message = t('unknownError');
  }
  handleError({ message }, 'HomeScreen');
};

const { width: screenWidth } = Dimensions.get('window');

// Add this helper function at the top of the file, after the imports
const getImageUrl = (path, bucket) => {
  if (!path) return null;

  // If it's already a full URL, return it
  if (path.startsWith('http')) {
    return path;
  }

  try {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data?.publicUrl;
  } catch (error) {
    console.error('Error generating image URL:', {
      bucket,
      path,
      error
    });
    return null;
  }
};

const HomeScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { currentTheme, changeTheme, getThemeColors } = useTheme();
  const colors = getThemeColors();
  const [listings, setListings] = useState([]); // Keep this as main data source
  const [filteredListings, setFilteredListings] = useState([]); // Rename for clarity
  const [banners, setBanners] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  // Add error state
  const [error, setError] = useState(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const productsPerPage = 6;

  // Check authentication status
  const checkAuthStatus = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      setIsAuthenticated(!!user && !error);
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    }
  };

  const bannerScrollX = useRef(new Animated.Value(0)).current;
  const bannerFlatListRef = useRef(null);
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);
  const handleAboutUsClick = () => {
    Alert.alert(
      t('aboutUs'), // Assuming `t` is for translation
      t('aboutContent'),
      [{ text: t('ok') }]
    );
  };

  // Memoized sorting function
  const sortListings = useCallback((listingsToSort, type = 'newest') => {
    return [...listingsToSort].sort((a, b) => {
      switch (type) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'priceAsc':
          // Handle items without price (buy orders)
          if (!a.price) return 1;
          if (!b.price) return -1;
          return a.price - b.price;
        case 'priceDesc':
          // Handle items without price (buy orders)
          if (!a.price) return 1;
          if (!b.price) return -1;
          return b.price - a.price;
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
  }, []);

  // Compute total products and displayed products
  const totalListings = useMemo(() => {
    const baseListings = searchQuery ? filteredListings : listings;
    return sortListings(baseListings, sortType);
  }, [searchQuery, listings, filteredListings, sortType, sortListings]);

  const totalPages = Math.ceil(totalListings.length / productsPerPage);

  const displayedListings = useMemo(() => {
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    return totalListings.slice(startIndex, endIndex);
  }, [totalListings, currentPage, productsPerPage]);

  // Fetch Banners
  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw { type: ERROR_TYPES.FETCH_BANNERS, error };
      }

      const fetchedBanners = data.map(banner => ({
        id: banner.id,
        image: banner.image_url,
        isAd: banner.is_ad,
        adUrl: banner.ad_url,
        adType: banner.ad_type
      }));

      setBanners(fetchedBanners);
    } catch (error) {
      handleHomeError(error.error || error, t, error.type || ERROR_TYPES.FETCH_BANNERS);
    }
  };

  // Update the fetchListings function
  const fetchListings = async () => {
    try {
      const isConnected = await checkNetworkConnection();

      if (!isConnected) {
        throw { type: ERROR_TYPES.NETWORK };
      }

      // Fetch products

      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          profiles!inner (
            id,
            username,
            avatar_url
          )
        `)
        .eq('is_available', true)
        .order('created_at', { ascending: false });


      if (productsError) {
        console.error('Products fetch error:', productsError);
        throw { type: ERROR_TYPES.FETCH_PRODUCTS, error: productsError };
      }

      // Process products
      const processedProducts = (products || []).map(product => {
        let photoUrl = null;
        if (product.main_image_url) {
          const { data } = supabase.storage
            .from('product_images') // Changed from 'products' to 'product_images'
            .getPublicUrl(product.main_image_url);
          photoUrl = data?.publicUrl;
        }

        return {
          id: product.id,
          type: 'sell',
          name: product.name,
          price: product.price,
          dorm: product.dorm,
          createdAt: product.created_at,
          seller: {
            id: product.profiles.id,
            username: product.profiles.username,
            avatar_url: product.profiles.avatar_url
          },
          photoUrl
        };
      });

      // Fetch buy orders
      const { data: buyOrders, error: buyOrdersError } = await supabase
        .from('buy_orders')
        .select(`
          *,
          profiles!inner (
            id,
            username,
            avatar_url
          )
        `)
        .eq('is_visible', true)
        .order('created_at', { ascending: false });

      if (buyOrdersError) {
        console.error('Buy orders fetch error:', buyOrdersError);
        throw { type: ERROR_TYPES.FETCH_PRODUCTS, error: buyOrdersError };
      }

      // Process buy orders
      const processedBuyOrders = (buyOrders || []).map(order => {
        let photoUrl = null;
        if (order.main_image_url) {
          const { data } = supabase.storage
            .from('buy-orders-images')
            .getPublicUrl(order.main_image_url);
          photoUrl = data?.publicUrl;
        }

        return {
          id: order.id,
          type: 'buy',
          name: order.name,
          dorm: order.dorm,
          createdAt: order.created_at,
          seller: {
            id: order.profiles.id,
            username: order.profiles.username,
            avatar_url: order.profiles.avatar_url
          },
          photoUrl
        };
      });

      // Combine and sort all listings
      const allListings = [...processedProducts, ...processedBuyOrders]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));



      // Update state
      setListings(allListings);
      setFilteredListings(allListings);

    } catch (error) {
      console.error('Fetch listings error:', error);
      setError(error);
      handleHomeError(error.error || error, t, error.type || ERROR_TYPES.UNKNOWN);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialMediaClick = (url) => {
    Linking.openURL(url).catch(err => console.error("Error opening URL", err));
  };

  const Footer = () => {
    const openVK = async () => {
      const vkDeepLink = 'vk://id821551765'; // Deep link for VK
      const webURL = 'https://vk.com/id821551765'; // Fallback web URL

      // Check if the VK app is installed
      const isVKAppInstalled = await Linking.canOpenURL(vkDeepLink);

      // Open the VK app if installed, otherwise fall back to the web URL
      if (isVKAppInstalled) {
        Linking.openURL(vkDeepLink).catch(err => console.error('Error opening VK app:', err));
      } else {
        Linking.openURL(webURL).catch(err => console.error('Error opening VK web page:', err));
      }
    };

    const openTelegramBot = () => {
      const telegramBotURL = 'https://t.me/ushopsfubot';
      Linking.openURL(telegramBotURL).catch(err => console.error('Error opening Telegram bot:', err));
    };

    const { t } = useTranslation();

    return (
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={styles.footerContent}>
          <View style={styles.footerColumn}>
            <Text style={[styles.footerTitle, { color: colors.primary }]}>{t('quickLinks')}</Text>
            <TouchableOpacity onPress={handleAboutUsClick}>
              <Text style={[styles.footerLink, { color: colors.textSecondary, textDecorationLine: 'underline' }]}>
                {t('aboutUs')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => Linking.openURL('mailto:dmp@mail.ru')}>
              <Text style={[styles.footerLink, { color: colors.textSecondary }]}>{t('contactUs')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerColumn}>
            <Text style={[styles.footerTitle, { color: colors.primary }]}>{t('support')}</Text>
            <View style={styles.supportInfo}>
              <Ionicons name="call-outline" size={18} color={colors.textSecondary} style={styles.supportIcon} />
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t('supportPhone')}</Text>
            </View>
            <View style={styles.supportInfo}>
              <SvgXml xml={telegramSvg} width={18} height={18} style={styles.supportIcon} />
              <TouchableOpacity onPress={openTelegramBot}>
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t('telegramBot')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.footerSocialContainer}>
          <Text style={[styles.followDeveloperTitle, { color: colors.primary }]}>{t('followDeveloper')}</Text>
          <View style={styles.footerSocialIcons}>
            <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMediaClick('https://www.instagram.com/ali__byh/profilecard/?igsh=Mnl3cmRheGNyaGNp')}>
              <Ionicons name="logo-instagram" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMediaClick('https://www.facebook.com/share/15vtL6xpic/?mibextid=wwXIfr')}>
              <Ionicons name="logo-facebook" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIcon} onPress={openVK}>
              <Ionicons name="logo-vk" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.copyrightText, { color: colors.textSecondary }]}>
            © {new Date().getFullYear()} {t('appTitle')}. {t('allRightsReserved')}
          </Text>
        </View>
      </View>
    );
  };

  // Handle Refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const isConnected = await checkNetworkConnection();
      if (!isConnected) {
        throw { type: ERROR_TYPES.NETWORK };
      }

      await Promise.all([fetchBanners(), fetchListings()]);
    } catch (error) {
      setError(error);
      handleHomeError(error.error || error, t, error.type || ERROR_TYPES.FETCH_DATA);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, []);

  // Add this function to handle banner clicks
  const handleBannerPress = useCallback((banner) => {
    if (banner.isAd && banner.adUrl) {
      // Track ad click if needed
      console.log('Ad clicked:', banner.adType);

      // Open the ad URL
      Linking.openURL(banner.adUrl).catch(err => {
        console.error('Error opening ad URL:', err);
        Alert.alert(t('error'), t('unableToOpenLink'));
      });
    }
  }, [t]);

  // Update the renderBannerItem function
  const renderBannerItem = ({ item }) => (
    <TouchableOpacity
      style={styles.bannerContainer}
      onPress={() => handleBannerPress(item)}
      activeOpacity={item.isAd ? 0.8 : 1}
    >
      <Image
        source={{ uri: item.image }}
        style={styles.bannerImage}
        resizeMode="cover"
      />
      {item.isAd && (
        <View style={styles.adIndicator}>
          <Text style={styles.adIndicatorText}>{t('adLabel')}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // Render Banner Pagination
  const renderBannerPagination = () => (
    <View style={styles.paginationContainer}>
      {[{ id: 'yandex-banner' }, ...banners].map((_, index) => {
        const inputRange = [
          (index - 1) * screenWidth,
          index * screenWidth,
          (index + 1) * screenWidth,
        ];
        const opacity = bannerScrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={index}
            style={[styles.paginationDot, { opacity }]}
          />
        );
      })}
    </View>
  );


  // Handle Search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setCurrentPage(1);

    if (query) {
      const filtered = listings.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.dorm.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredListings(filtered);
    } else {
      setFilteredListings(listings);
    }
  }, [listings]);

  // Check auth status on mount and when screen focuses
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Initial Data Load
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        await handleRefresh();
      } catch (error) {
        console.error('Initial load error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [handleRefresh]);

  // Banner Auto-slide Effect
  useEffect(() => {
    let intervalId;

    const startAutoSlide = () => {
      
      intervalId = setInterval(() => {
        if ((banners.length > 0 || adLoaded) && bannerFlatListRef.current) {
          const totalItems = banners.length + (adLoaded ? 1 : 0);
          const currentScrollX = bannerScrollX._value || 0;
          const currentIndex = Math.round(currentScrollX / screenWidth);
          const nextIndex = (currentIndex + 1) % totalItems;
          try {
            bannerFlatListRef.current.scrollToOffset({
              offset: nextIndex * screenWidth,
              animated: true,
            });
          } catch (error) {
            console.error('[HomeScreen] Error during auto-slide:', error);
          }
        } else {
        }
      }, 3000);

      return intervalId;
    };

    if (banners.length > 0 || adLoaded) {
      const intervalId = startAutoSlide();
      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    } else {
    }
  }, [banners.length, screenWidth, adLoaded]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Check auth status when screen comes into focus
      checkAuthStatus();
      
      // Use route.params instead of navigation.getParam
      if (route?.params?.refresh) {
        handleRefresh();
        // Clear the refresh parameter
        navigation.setParams({ refresh: null });
      }
    });

    return unsubscribe;
  }, [navigation, handleRefresh]);

  // Pagination Component
  const PaginationComponent = useCallback(() => {
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(
        <TouchableOpacity
          key={i}
          style={[
            styles.paginationButton,
            { 
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text 
            },
            currentPage === i && { 
              backgroundColor: colors.primary,
              borderColor: colors.primary
            }
          ]}
          onPress={() => setCurrentPage(i)}
        >
          <Text style={[
            styles.paginationButtonText,
            { color: colors.text },
            currentPage === i && { color: colors.headerText }
          ]}>
            {i}
          </Text>
        </TouchableOpacity>
      );
    }
    return (
      <View style={styles.paginationContainer}>
        {currentPage > 1 && (
          <TouchableOpacity
            style={[
              styles.paginationButton, 
              { 
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text 
              }
            ]}
            onPress={() => setCurrentPage(currentPage - 1)}
          >
            <Text style={[styles.paginationButtonText, { color: colors.text }]}>{t('previous')}</Text>
          </TouchableOpacity>
        )}

        {pageNumbers}

        {currentPage < totalPages && (
          <TouchableOpacity
            style={[
              styles.paginationButton, 
              { 
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text 
              }
            ]}
            onPress={() => setCurrentPage(currentPage + 1)}
          >
            <Text style={[styles.paginationButtonText, { color: colors.text }]}>{t('next')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [currentPage, totalPages, colors]);

  // Sort Modal Component
  const SortModal = useCallback(() => {
    const sortOptions = [
      { label: t('newest'), value: 'newest' },
      { label: t('oldest'), value: 'oldest' },
      { label: t('priceLowToHigh'), value: 'priceAsc' },
      { label: t('priceHighToLow'), value: 'priceDesc' }
    ];

    return (
      <Modal
        transparent={true}
        visible={isSortModalVisible}
        animationType="fade"
        onRequestClose={() => setIsSortModalVisible(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}
          activeOpacity={1}
          onPress={() => setIsSortModalVisible(false)}
        >
          <TouchableOpacity
            style={[styles.modalContainer, { backgroundColor: colors.modalBackground, shadowColor: colors.shadow }]}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('sortProducts')}</Text>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sortOptionButton,
                  { borderBottomColor: colors.border },
                  sortType === option.value && { backgroundColor: colors.surface }
                ]}
                onPress={() => {
                  setSortType(option.value);
                  setIsSortModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    { color: colors.text },
                    sortType === option.value && { color: colors.primary }
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.surface }]}
              onPress={() => setIsSortModalVisible(false)}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>{t('CancelSort')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  }, [isSortModalVisible, sortType, t]);

  // Removed conflicting ad initialization - now handled in YandexBanner component

  // Removed unused interstitial ad function

  if (isLoading) {
    return <LoadingState message={t('loadingProducts')} />;
  }

  return (
    <ErrorBoundaryWrapper
      onRetry={fetchListings}
      loadingMessage={t('loadingProducts')}
      errorMessage={error?.message || t('errorLoadingProducts')}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.contentContainer]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#ff5722']}
            tintColor="#ff5722"
            title={t('pullToRefresh')}
            progressViewOffset={50}
          />
        }
      >
        {error ? (
          <RetryView
            onRetry={handleRefresh}
            message={t('errorLoadingProducts')}
          />
        ) : (
          <>
            {/* Existing content */}
            <View style={[styles.header, { backgroundColor: colors.headerBackground }]}>
              <View style={styles.headerContent}>
                {/* Left side - Theme button and Sign In button */}
                <View style={styles.headerLeft}>
                  {/* Theme Toggle Button */}
                  <TouchableOpacity
                    style={[styles.themeButton, { backgroundColor: colors.buttonSecondary }]}
                    onPress={() => {
                      const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
                      changeTheme(nextTheme);
                    }}
                  >
                    <Ionicons 
                      name={currentTheme === 'light' ? 'moon' : 'sunny'} 
                      size={20} 
                      color="#FFFFFF" 
                    />
                  </TouchableOpacity>
                  
                  {/* Sign In Button - only show when not authenticated */}
                  {!isAuthenticated && (
                    <TouchableOpacity
                      style={styles.signInButton}
                      onPress={() => navigation.navigate('Login')}
                    >
                      <Ionicons name="person-circle-outline" size={24} color="#FFFFFF" />
                      <Text style={styles.signInButtonText}>{t('signIn')}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Center - App Title */}
                <Text style={[styles.headerTitle, { color: colors.primary }]}>{t('appTitle')}</Text>

                {/* Right side - Logo */}
                <View style={styles.headerRight}>
                  <Image
                    source={require('../../assets/S.F.U2.png')}
                    style={styles.headerLogo}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
              <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={t('searchPlaceholder')}
                placeholderTextColor={colors.placeholder}
                value={searchQuery}
                onChangeText={handleSearch}
                clearButtonMode="while-editing"
              />
            </View>
            {/* Banner Carousel */}
            {(banners.length > 0 || true) && (
              <FlatList
                ref={bannerFlatListRef}
                data={[...banners]} // Temporarily removed yandex-banner
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) =>
                  item.id === 'yandex-banner' ? (
                    // <YandexBanner onAdLoaded={() => {
                    //   console.log('[HomeScreen] Yandex banner loaded, setting adLoaded to true');
                    //   setAdLoaded(true);
                    // }} />
                    null // Temporarily commenting out YandexBanner
                  ) : (
                    renderBannerItem({ item })
                  )
                }
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToAlignment="center"
                snapToInterval={screenWidth}
                decelerationRate="fast"
                style={styles.bannerList}
                contentContainerStyle={{ paddingHorizontal: 0 }}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: bannerScrollX } } }],
                  { useNativeDriver: false }
                )}
                getItemLayout={(data, index) => ({
                  length: screenWidth,
                  offset: screenWidth * index,
                  index,
                })}
              />
            )}



            {/* Products Section */}
            <View style={styles.productHeaderContainer}>
              <Text style={[styles.title, { color: colors.primary }]}>{t('availableProducts')}</Text>

              {/* Sort Button */}
              <TouchableOpacity
                style={[styles.sortButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setIsSortModalVisible(true)}
              >
                <Ionicons name="filter" size={24} color={colors.text} />
                <Text style={[styles.sortButtonText, { color: colors.text }]}>{t('sort1')}</Text>
              </TouchableOpacity>
            </View>

            {/* Sort Modal */}
            <SortModal />

            {/* Products Rendering */}
            {displayedListings.length === 0 ? (
              <View style={styles.noProductsContainer}>
                <Text style={[styles.noProductsText, { color: colors.textSecondary }]}>
                  {searchQuery ? t('noProductsMatchSearch') : t('noProductsAvailable')}
                </Text>
              </View>
            ) : (
              <View style={styles.productsContainer}>
                {displayedListings.map((listing) => (
                  <TouchableOpacity
                    key={listing.id}
                    onPress={() => {
                      navigation.navigate(
                        listing.type === 'sell' ? 'ProductDetails' : 'BuyOrderDetails', // Changed from 'BuyOrder'
                        {
                          productId: listing.id,
                          type: listing.type
                        }
                      );
                    }}
                  >
                    <ProductCard
                      productName={listing.name}
                      price={listing.type === 'sell' ? `₽${Math.round(listing.price)}` : undefined}
                      dormNumber={listing.dorm}
                      productImage={listing.photoUrl}
                      type={listing.type}
                      isWantToBuy={listing.type === 'buy'}
                      createdAt={listing.createdAt}  // Add this line
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Pagination Component */}
            {totalPages > 1 && <PaginationComponent />}

            {/* Footer */}
            <Footer />
          </>
        )}
      </ScrollView>
    </ErrorBoundaryWrapper>
  );
};





const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  headerRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerLogo: {
    width: 50,
    height: 50,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  themeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  signInDescription: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
    marginTop: 4,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  paginationButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderWidth: 1,
    borderRadius: 5,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    marginTop: 15,
    alignItems: 'center',

  },
  footerContent: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',

  },
  footerColumn: {
    flex: 1,
    marginHorizontal: 10,
    alignItems: 'right',
  },

  footerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  footerLink: {
    marginBottom: 10,
    fontSize: 14,
  },
  supportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  supportIcon: {
    marginRight: 8,
  },
  footerText: {
    fontSize: 14,
  },
  footerSocialContainer: {
    alignItems: 'center',
  },
  followDeveloperTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'left',
  },
  footerSocialIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  socialIcon: {
    marginHorizontal: 50,
  },

  copyrightText: {
    textAlign: 'center',
    fontSize: 12,
  },
  bannerWrapper: {
    marginBottom: 20,
  },
  bannerList: {
    marginBottom: 10,
  },
  bannerContainer: {
    width: screenWidth,
    paddingHorizontal: 0,
  },
  bannerImage: {
    width: screenWidth - 20,
    height: 180,
    borderRadius: 15,
    alignSelf: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
    marginHorizontal: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  noProductsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noProductsText: {
    fontSize: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginHorizontal: 10,
    marginBottom: 15,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  productHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 10,
    marginBottom: 10,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
  },
  sortButtonText: {
    marginLeft: 5,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 500,  // Optional: limit width on larger screens
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  sortOptionButton: {
    padding: 15,
    borderBottomWidth: 1,
  },
  selectedSortOption: {
  },
  sortOptionText: {
    fontSize: 16,
    textAlign: 'center',
  },
  selectedSortOptionText: {
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 15,
    padding: 15,
    borderRadius: 10,
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  productsContainer: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  adIndicator: {
    position: 'absolute',
    top: 10,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  adIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  yandexBannerWrapper: {
    width: screenWidth,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    marginVertical: 10
  },
});


export default HomeScreen;

