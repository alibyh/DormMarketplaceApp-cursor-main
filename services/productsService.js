export const fetchProducts = async (filters = {}) => {
  try {
    console.log('Fetching products with filters:', filters);
    
    let query = supabase
      .from('products')
      .select(`
        *,
        seller:seller_id (
          id,
          email,
          profiles (username, avatar_url)
        )
      `)
      .eq('is_deleted', false)
      .eq('is_visible', true)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.condition) {
      query = query.eq('condition', filters.condition);
    }
    if (filters.dorm) {
      query = query.eq('dorm', filters.dorm);
    }
    if (filters.minPrice) {
      query = query.gte('price', filters.minPrice);
    }
    if (filters.maxPrice) {
      query = query.lte('price', filters.maxPrice);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      throw new Error('errorFetchingProducts');
    }

    return data.map(product => ({
      ...product,
      seller: {
        id: product.seller?.id,
        username: product.seller?.profiles?.[0]?.username || 'Unknown User',
        avatar_url: product.seller?.profiles?.[0]?.avatar_url
      }
    }));

  } catch (error) {
    console.error('Products fetch error:', error);
    throw error;
  }
};

export const getProducts = async () => {
  try {
    console.log('Fetching products...');
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        seller:seller_id (
          id,
          profiles (
            username,
            avatar_url
          )
        )
      `)
      .eq('is_available', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      throw new Error('errorFetchingProducts');
    }

    // Handle empty results
    if (!data || data.length === 0) {
      console.log('No products found');
      return [];
    }

    return data.map(product => ({
      ...product,
      seller: {
        id: product.seller?.id,
        username: product.seller?.profiles?.[0]?.username || 'Unknown User',
        avatar_url: product.seller?.profiles?.[0]?.avatar_url
      }
    }));

  } catch (error) {
    console.error('Products fetch error:', error);
    throw error;
  }
};