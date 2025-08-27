-- Fix the Auto test conversation that was hard deleted
SELECT '=== FIXING AUTO TEST CONVERSATION ===' as section;

-- 1. First check the current state
SELECT 'Current state:' as step;
SELECT 
    c.conversation_id,
    c.product_id,
    c.product_name,
    c.product_deleted,
    CASE 
        WHEN p.id IS NOT NULL THEN 'Product exists'
        ELSE 'Product hard deleted'
    END as product_status
FROM conversations c
LEFT JOIN products p ON c.product_id = p.id
WHERE c.product_id = '62ebf496-6de1-4013-a8a4-45c8b753f835';

-- 2. Update the conversation to mark product as deleted
SELECT 'Updating conversation...' as step;
UPDATE conversations 
SET product_deleted = true 
WHERE product_id = '62ebf496-6de1-4013-a8a4-45c8b753f835';

-- 3. Verify the fix
SELECT 'After fix:' as step;
SELECT 
    c.conversation_id,
    c.product_id,
    c.product_name,
    c.product_deleted,
    CASE 
        WHEN p.id IS NOT NULL THEN 'Product exists'
        ELSE 'Product hard deleted'
    END as product_status
FROM conversations c
LEFT JOIN products p ON c.product_id = p.id
WHERE c.product_id = '62ebf496-6de1-4013-a8a4-45c8b753f835';

SELECT 'Fix completed! The conversation should now show "Deleted Item" in the app.' as result;
