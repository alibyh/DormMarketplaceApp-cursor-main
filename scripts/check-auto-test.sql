-- Check the current state of the Auto test product
SELECT '=== CHECKING AUTO TEST PRODUCT ===' as section;

-- 1. Check if the product still exists and its deletion status
SELECT 
    p.id,
    p.name,
    p.is_deleted,
    CASE 
        WHEN p.id IS NOT NULL THEN 'Product EXISTS in database'
        ELSE 'Product was HARD DELETED (completely removed)'
    END as product_status
FROM products p
WHERE p.id = '62ebf496-6de1-4013-a8a4-45c8b753f835';

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
WHERE c.product_id = '62ebf496-6de1-4013-a8a4-45c8b753f835';

-- 3. Check if we need to manually set product_deleted for this conversation
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM conversations 
            WHERE product_id = '62ebf496-6de1-4013-a8a4-45c8b753f835'
        ) AND NOT EXISTS (
            SELECT 1 FROM products 
            WHERE id = '62ebf496-6de1-4013-a8a4-45c8b753f835'
        )
        THEN 'NEEDS FIX: Conversation exists but product was hard deleted - should set product_deleted = true'
        WHEN EXISTS (
            SELECT 1 FROM conversations 
            WHERE product_id = '62ebf496-6de1-4013-a8a4-45c8b753f835'
        ) AND EXISTS (
            SELECT 1 FROM products 
            WHERE id = '62ebf496-6de1-4013-a8a4-45c8b753f835'
        )
        THEN 'Product exists but conversation product_deleted might not be set correctly'
        ELSE 'OK: Either conversation doesn''t exist or product still exists'
    END as action_needed;
