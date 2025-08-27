-- Check if the specific product was actually deleted
-- Replace 'e22f4c35-4a89-4b28-a4fd-7e26ca90d222' with your actual product ID

-- Check the product status
SELECT '=== PRODUCT STATUS ===' as section;
SELECT 
    id,
    name,
    seller_id,
    is_deleted,
    created_at
FROM products 
WHERE id = 'e22f4c35-4a89-4b28-a4fd-7e26ca90d222';

-- Check the conversation status
SELECT '=== CONVERSATION STATUS ===' as section;
SELECT 
    conversation_id,
    product_id,
    product_name,
    product_deleted,
    buyer_id,
    seller_id,
    last_message_at
FROM conversations 
WHERE product_id = 'e22f4c35-4a89-4b28-a4fd-7e26ca90d222';

-- Check if the product exists at all
SELECT '=== PRODUCT EXISTS CHECK ===' as section;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM products WHERE id = 'e22f4c35-4a89-4b28-a4fd-7e26ca90d222') 
        THEN 'Product exists in database'
        ELSE 'Product does NOT exist in database'
    END as product_status;

-- Check if it was hard deleted
SELECT '=== HARD DELETE CHECK ===' as section;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM products WHERE id = 'e22f4c35-4a89-4b28-a4fd-7e26ca90d222') 
        THEN 'Product still exists (soft delete or not deleted)'
        ELSE 'Product was hard deleted (completely removed)'
    END as deletion_type;
