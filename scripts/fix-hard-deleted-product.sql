-- Fix conversation for hard-deleted product
-- This will update the conversation to show the product as deleted

-- 1. First, let's see the current conversation state
SELECT '=== CURRENT CONVERSATION STATE ===' as section;
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

-- 2. Update the conversation to mark the product as deleted
SELECT '=== UPDATING CONVERSATION ===' as section;

-- Update the conversation to mark product as deleted
UPDATE conversations 
SET product_deleted = true 
WHERE product_id = 'e22f4c35-4a89-4b28-a4fd-7e26ca90d222';

-- 3. Verify the update
SELECT '=== VERIFICATION ===' as section;
SELECT 
    conversation_id,
    product_id,
    product_name,
    product_deleted,
    buyer_id,
    seller_id
FROM conversations 
WHERE product_id = 'e22f4c35-4a89-4b28-a4fd-7e26ca90d222';

-- 4. Test instructions
SELECT '=== TEST INSTRUCTIONS ===' as section;
SELECT 
    '1. Refresh your app' as step1,
    '2. Go to conversations screen' as step2,
    '3. The "Five" product should now show "Deleted Item"' as step3,
    '4. The product image should show a placeholder' as step4,
    '5. Check console logs - should show isProductDeleted: true' as step5;
