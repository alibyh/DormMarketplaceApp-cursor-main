-- Manual test for "Seven" product
-- This will manually mark the "Seven" product as deleted to test the functionality

-- 1. First, let's see the current state of the "Seven" product
SELECT '=== SEVEN PRODUCT CURRENT STATE ===' as section;
SELECT 
    id,
    name,
    seller_id,
    is_deleted,
    created_at
FROM products 
WHERE id = 'b4e59143-da56-4221-9f36-5dbbb8b6e4cc';

-- 2. Check the conversation for "Seven" product
SELECT '=== SEVEN PRODUCT CONVERSATION ===' as section;
SELECT 
    conversation_id,
    product_id,
    product_name,
    product_deleted,
    buyer_id,
    seller_id
FROM conversations 
WHERE product_id = 'b4e59143-da56-4221-9f36-5dbbb8b6e4cc';

-- 3. Manually mark "Seven" as deleted
SELECT '=== MANUAL DELETION TEST ===' as section;

-- Update the product to be deleted
UPDATE products 
SET is_deleted = true 
WHERE id = 'b4e59143-da56-4221-9f36-5dbbb8b6e4cc';

-- Update the conversation to mark product as deleted
UPDATE conversations 
SET product_deleted = true 
WHERE product_id = 'b4e59143-da56-4221-9f36-5dbbb8b6e4cc';

-- 4. Verify the changes
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
WHERE p.id = 'b4e59143-da56-4221-9f36-5dbbb8b6e4cc';

-- 5. Test instructions
SELECT '=== NEXT STEPS ===' as section;
SELECT 
    '1. Refresh your app' as step1,
    '2. Go to conversations screen' as step2,
    '3. The "Seven" product should now show "Deleted Item"' as step3,
    '4. The product image should show a placeholder' as step4,
    '5. Check console logs - should show isProductDeleted: true' as step5;
