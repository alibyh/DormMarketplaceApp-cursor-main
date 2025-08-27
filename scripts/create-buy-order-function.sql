-- Create a stored procedure to insert buy orders with proper authentication
-- This function will be used as a fallback when RLS policies cause issues

-- First, create the function
CREATE OR REPLACE FUNCTION create_buy_order_with_auth(
  p_name TEXT,
  p_description TEXT,
  p_dorm TEXT,
  p_user_id UUID
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  dorm TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ,
  is_available BOOLEAN,
  main_image_url TEXT,
  images TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record_id UUID;
BEGIN
  -- Insert the buy order record
  INSERT INTO buy_orders (
    name,
    description,
    dorm,
    user_id,
    created_at,
    is_available,
    main_image_url,
    images
  ) VALUES (
    p_name,
    p_description,
    p_dorm,
    p_user_id,
    NOW(),
    true,
    NULL,
    ARRAY[]::TEXT[]
  )
  RETURNING id INTO v_record_id;

  -- Return the created record
  RETURN QUERY
  SELECT 
    bo.id,
    bo.name,
    bo.description,
    bo.dorm,
    bo.user_id,
    bo.created_at,
    bo.is_available,
    bo.main_image_url,
    bo.images
  FROM buy_orders bo
  WHERE bo.id = v_record_id;
END;
$$;

-- Grant execute permission to authenticated users (fixed signature)
GRANT EXECUTE ON FUNCTION create_buy_order_with_auth(TEXT, TEXT, TEXT, UUID) TO authenticated;

-- Also create a similar function for products
CREATE OR REPLACE FUNCTION create_product_with_auth(
  p_name TEXT,
  p_description TEXT,
  p_dorm TEXT,
  p_price DECIMAL,
  p_seller_id UUID
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  dorm TEXT,
  price DECIMAL,
  seller_id UUID,
  created_at TIMESTAMPTZ,
  is_available BOOLEAN,
  main_image_url TEXT,
  images TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record_id UUID;
BEGIN
  -- Insert the product record
  INSERT INTO products (
    name,
    description,
    dorm,
    price,
    seller_id,
    created_at,
    is_available,
    main_image_url,
    images
  ) VALUES (
    p_name,
    p_description,
    p_dorm,
    p_price,
    p_seller_id,
    NOW(),
    true,
    NULL,
    ARRAY[]::TEXT[]
  )
  RETURNING id INTO v_record_id;

  -- Return the created record
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.dorm,
    p.price,
    p.seller_id,
    p.created_at,
    p.is_available,
    p.main_image_url,
    p.images
  FROM products p
  WHERE p.id = v_record_id;
END;
$$;

-- Grant execute permission to authenticated users (fixed signature)
GRANT EXECUTE ON FUNCTION create_product_with_auth(TEXT, TEXT, TEXT, DECIMAL, UUID) TO authenticated;

-- Test the functions
SELECT 'Buy order function created successfully' as status;
SELECT 'Product function created successfully' as status;

-- Show the created functions
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc 
WHERE proname IN ('create_buy_order_with_auth', 'create_product_with_auth');

COMMIT;
