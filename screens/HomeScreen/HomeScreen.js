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
import supabase from '../../services/supabaseConfig';
import ProductCard from '../../components/ProductCard/ProductCard';
import { useTranslation } from 'react-i18next';
import { checkNetworkConnection } from '../../utils/networkUtils'; // Add this import
import ErrorBoundaryWrapper from '../../components/ErrorBoundary/ErrorBoundaryWrapper';
import LoadingState from '../../components/LoadingState/LoadingState';
import RetryView from '../../components/RetryView/RetryView';

// Add these imports at the top
import { Alert } from 'react-native';
import { NativeModules } from 'react-native';
const { YandexAdsModule } = NativeModules;
import YandexBanner from '../../components/YandexBanner/YandexBanner';

// Add this before the HomeScreen component
const handleError = (error, context) => {
  console.error(`Error in ${context}:`, error);
  Alert.alert(
    'Error',
    error?.message || `An error occurred in ${context}`,
    [{ text: 'OK' }]
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
    console.log('about  us');
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
      console.log('Network check:', { isConnected });

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
      console.log('vvk');
      const vkDeepLink = 'vk://id821551765'; // Deep link for VK
      const webURL = 'https://vk.com/id821551765'; // Fallback web URL

      // Check if the VK app is installed
      const isVKAppInstalled = await Linking.canOpenURL(vkDeepLink);

      // Open the VK app if installed, otherwise fall back to the web URL
      if (isVKAppInstalled) {
        console.log('in');
        Linking.openURL(vkDeepLink).catch(err => console.error('Error opening VK app:', err));
      } else {
        console.log('not in');
        Linking.openURL(webURL).catch(err => console.error('Error opening VK web page:', err));
      }
    };
    const { t } = useTranslation();

    return (
      <View style={styles.footer}>
        <View style={styles.footerContent}>
          <View style={styles.footerColumn}>
            <Text style={styles.footerTitle}>{t('quickLinks')}</Text>
            <TouchableOpacity onPress={handleAboutUsClick}>
              <Text style={[styles.footerLink, { textDecorationLine: 'underline' }]}>
                {t('aboutUs')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => Linking.openURL('mailto:dmp@mail.ru')}>
              <Text style={styles.footerLink}>{t('contactUs')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerColumn}>
            <Text style={styles.footerTitle}>{t('support')}</Text>
            <View style={styles.supportInfo}>
              <Ionicons name="mail-outline" size={18} color="#666" style={styles.supportIcon} />
              <Text style={styles.footerText}>{t('supportEmail')}</Text>
            </View>
            <View style={styles.supportInfo}>
              <Ionicons name="call-outline" size={18} color="#666" style={styles.supportIcon} />
              <Text style={styles.footerText}>{t('supportPhone')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footerSocialContainer}>
          <View style={styles.footerSocialIcons}>
            <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMediaClick('https://www.instagram.com/ali__byh/profilecard/?igsh=Mnl3cmRheGNyaGNp')}>
              <Ionicons name="logo-instagram" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIcon} onPress={() => handleSocialMediaClick('https://www.facebook.com/share/15vtL6xpic/?mibextid=wwXIfr')}>
              <Ionicons name="logo-facebook" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialIcon} onPress={openVK}>
              <Ionicons name="logo-vk" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <Text style={styles.copyrightText}>
            © {new Date().getFullYear()} {t('appName')}. {t('allRightsReserved')}
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
          <Text style={styles.adIndicatorText}>Ad</Text>
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
          const currentScrollX = bannerScrollX._value;
          const currentIndex = Math.round(currentScrollX / screenWidth);
          const nextIndex = (currentIndex + 1) % totalItems;

          bannerFlatListRef.current.scrollToOffset({
            offset: nextIndex * screenWidth,
            animated: true,
          });
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
            currentPage === i && styles.activePaginationButton
          ]}
          onPress={() => setCurrentPage(i)}
        >
          <Text style={[
            styles.paginationButtonText,
            currentPage === i && styles.activePaginationButtonText
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
            style={styles.paginationButton}
            onPress={() => setCurrentPage(currentPage - 1)}
          >
            <Text style={styles.paginationButtonText}>{'<'}</Text>
          </TouchableOpacity>
        )}

        {pageNumbers}

        {currentPage < totalPages && (
          <TouchableOpacity
            style={styles.paginationButton}
            onPress={() => setCurrentPage(currentPage + 1)}
          >
            <Text style={styles.paginationButtonText}>{'>'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [currentPage, totalPages]);

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
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsSortModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>{t('sortProducts')}</Text>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sortOptionButton,
                  sortType === option.value && styles.selectedSortOption
                ]}
                onPress={() => {
                  setSortType(option.value);
                  setIsSortModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortType === option.value && styles.selectedSortOptionText
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsSortModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>{t('CancelSort')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  }, [isSortModalVisible, sortType, t]);

  // useEffect(() => {
  //   const initAds = async () => {
  //     try {
  //       await YandexAdsModule.initializeSDK();
  //       await YandexAdsModule.loadBanner('R-M-14841144-1'); // Your banner ad unit ID
  //       setAdLoaded(true);
  //     } catch (error) {
  //       console.error('Ad initialization failed:', error);
  //     }
  //   };

  //   initAds();
  // }, []);

  // Add this function to show interstitial ads
  const showInterstitialAd = async () => {
    try {
      await YandexAdsModule.loadInterstitial('R-M-16546684-1'); // Your interstitial ad unit ID
      await YandexAdsModule.showInterstitial();
    } catch (error) {
      console.error('Interstitial ad failed:', error);
    }
  };

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
        style={styles.container}
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
            <View style={styles.header}>
              <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>{t('appTitle')}</Text>
                <View style={styles.logoContainer}>
                {!isAuthenticated && (
                    <TouchableOpacity
                      style={styles.signInButton}
                      onPress={() => navigation.navigate('Login')}
                    >
                      <Ionicons name="person-circle-outline" size={24} color="#FFFFFF" />
                      <Text style={styles.signInButtonText}>{t('signIn')}</Text>
                    </TouchableOpacity>
                  )}
                  <Image
                    source={require('../../assets/S.F.U2.png')}
                    style={styles.headerLogo}
                    resizeMode="contain"
                  />
                  
                </View>
                
              </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChangeText={handleSearch}
                clearButtonMode="while-editing"
              />
            </View>
            {/* Banner Carousel */}
            {(banners.length > 0 || true) && (
              <FlatList
                data={[{ id: 'yandex-banner' }, ...banners]}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) =>
                  item.id === 'yandex-banner' ? (
                    <YandexBanner />
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
              <Text style={styles.title}>{t('availableProducts')}</Text>

              {/* Sort Button */}
              <TouchableOpacity
                style={styles.sortButton}
                onPress={() => setIsSortModalVisible(true)}
              >
                <Ionicons name="filter" size={24} color="#333" />
                <Text style={styles.sortButtonText}>{t('sort1')}</Text>
              </TouchableOpacity>
            </View>

            {/* Sort Modal */}
            <SortModal />

            {/* Products Rendering */}
            {displayedListings.length === 0 ? (
              <View style={styles.noProductsContainer}>
                <Text style={styles.noProductsText}>
                  {searchQuery ? t('noProductsMatchSearch') : t('noProductsAvailable')}
                </Text>
              </View>
            ) : (
              <View style={styles.productsContainer}>
                {displayedListings.map((listing) => (
                  <TouchableOpacity
                    key={listing.id}
                    onPress={() => {
                      console.log(':', listing.id, t('type'), listing.type);
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
                      price={listing.type === 'sell' ? `₽${listing.price}` : undefined}
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
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#104d59',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerLogo: {
    width: 60,
    height: 60,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    borderColor: '#ddd',
    borderRadius: 5,
  },
  activePaginationButton: {
    backgroundColor: '#ff5722',
    borderColor: '#ff5722',
  },
  paginationButtonText: {
    color: '#333',
  },
  activePaginationButtonText: {
    color: 'white',
  },
  footer: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
    color: '#f4a261',
  },
  footerLink: {
    color: '#666',
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
    color: '#666',
    fontSize: 14,
  },
  footerSocialContainer: {
    alignItems: 'center',
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
    color: 'black',
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
    color: '#333',
  },
  noProductsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noProductsText: {
    fontSize: 18,
    color: '#888',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginHorizontal: 10,
    marginBottom: 15,
    shadowColor: '#000',
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
    color: '#333',
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
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sortButtonText: {
    marginLeft: 5,
    fontSize: 16,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 500,  // Optional: limit width on larger screens
    shadowColor: '#000',
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
    borderBottomColor: '#eee',
  },
  selectedSortOption: {
    backgroundColor: '#f0f0f0',
  },
  sortOptionText: {
    fontSize: 16,
    textAlign: 'center',
  },
  selectedSortOptionText: {
    fontWeight: 'bold',
    color: '#ff5722',
  },
  cancelButton: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#333',
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

