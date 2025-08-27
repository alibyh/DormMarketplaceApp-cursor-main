-- Manual deletion test
-- This will manually mark a product as deleted to test the placeholder functionality

-- 1. First, let's see what products we have
SELECT '=== AVAILABLE PRODUCTS ===' as section;
SELECT 
    id,
    name,
    seller_id,
    is_deleted,
    created_at
FROM products 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Let's manually mark the "Five" product as deleted
SELECT '=== MANUAL DELETION TEST ===' as section;

-- Update the product to be deleted
UPDATE products 
SET is_deleted = true 
WHERE id = 'e22f4c35-4a89-4b28-a4fd-7e26ca90d222';

-- Update the conversation to mark product as deleted
UPDATE conversations 
SET product_deleted = true 
WHERE product_id = 'e22f4c35-4a89-4b28-a4fd-7e26ca90d222';

-- 3. Check the result
SELECT '=== VERIFICATION ===' as section;
SELECT 
    'Product status:' as info,
    p.id,
    p.name,
    p.is_deleted as product_is_deleted,
    c.conversation_id,
    c.product_deleted as conversation_product_deleted
FROM products p
LEFT JOIN conversations c ON p.id = c.product_id
WHERE p.id = 'e22f4c35-4a89-4b28-a4fd-7e26ca90d222';

-- 4. Test instructions
SELECT '=== NEXT STEPS ===' as section;
SELECT 
    '1. Check your app - the "Five" product should now show "Deleted Item"' as step1,
    '2. The product image should show a placeholder' as step2,
    '3. Check console logs - should show isProductDeleted: true' as step3,
    '4. If it works, try deleting another product through the app' as step4;
