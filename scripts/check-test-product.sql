-- Check the current state of the Test Product
SELECT '=== CHECKING TEST PRODUCT ===' as section;

-- 1. Check if the product still exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM products WHERE id = 'b1385530-19c3-43aa-9625-141226aaafd0') 
        THEN 'Product EXISTS in database'
        ELSE 'Product was HARD DELETED (completely removed)'
    END as product_status;

-- 2. Check if the conversation exists and its product_deleted status
SELECT 
    c.conversation_id,
    c.product_id,
    c.product_name,
    c.product_deleted,
    CASE 
        WHEN p.id IS NOT NULL THEN 'Product still exists'
        ELSE 'Product was hard deleted'
    END as product_exists
FROM conversations c
LEFT JOIN products p ON c.product_id = p.id
WHERE c.product_id = 'b1385530-19c3-43aa-9625-141226aaafd0';

-- 3. Check if we need to manually set product_deleted for this conversation
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM conversations 
            WHERE product_id = 'b1385530-19c3-43aa-9625-141226aaafd0'
        ) AND NOT EXISTS (
            SELECT 1 FROM products 
            WHERE id = 'b1385530-19c3-43aa-9625-141226aaafd0'
        )
        THEN 'NEEDS FIX: Conversation exists but product was hard deleted - should set product_deleted = true'
        ELSE 'OK: Either conversation doesn''t exist or product still exists'
    END as action_needed;
